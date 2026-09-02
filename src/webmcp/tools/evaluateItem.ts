import type { WebMCPToolDefinition } from "../modelContext";
import {
  DIMENSION_NAMES,
  REASON_CODES,
  buildEvaluationRecord,
  type DimensionName,
  type DimensionRatings,
  type ReasonCode,
} from "../../domain/evaluation";
import { GroundlineError } from "../../domain/errors";
import {
  WorkspaceSchema,
  type EvaluationRecord,
} from "../../domain/schema";
import { getItem } from "../../domain/dependencies";
import { useWorkspaceStore } from "../../state/workspaceStore";
import { assertActiveGroundlineWorkspace } from "../activeWorkspace";

const RATINGS = [
  "LOW",
  "MODERATE",
  "HIGH",
  "UNASSESSED",
] as const;

type Rating = (typeof RATINGS)[number];

function dimensionSchema() {
  return {
    type: "object",
    properties: {
      rating: {
        type: "string",
        enum: [...RATINGS],
      },
      reason_codes: {
        type: "array",
        items: {
          type: "string",
          enum: [...REASON_CODES],
        },
      },
      referenced_item_ids: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: [
      "rating",
      "reason_codes",
      "referenced_item_ids",
    ],
    additionalProperties: false,
  };
}

function requireItemId(input: any): string {
  const value = input?.item_id;

  if (typeof value !== "string" || !value.trim()) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "evaluate_item requires a non-empty item_id.",
    );
  }

  return value.trim();
}

function parseReasonCodes(value: unknown): ReasonCode[] {
  if (!Array.isArray(value)) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "reason_codes must be an array.",
    );
  }

  const allowed = new Set<string>(REASON_CODES);

  for (const code of value) {
    if (typeof code !== "string" || !allowed.has(code)) {
      throw new GroundlineError(
        "INVALID_INPUT",
        `Unknown evaluation reason code: ${String(code)}.`,
      );
    }
  }

  return [...new Set(value)] as ReasonCode[];
}

function parseReferences(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "referenced_item_ids must be an array.",
    );
  }

  if (
    value.some(
      (id) =>
        typeof id !== "string" ||
        !id.trim(),
    )
  ) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "referenced_item_ids must contain only non-empty strings.",
    );
  }

  return [
    ...new Set(
      value.map((id) => id.trim()),
    ),
  ];
}

function parseDimensions(input: any): {
  ratings: DimensionRatings;
  reasonCodes: Partial<
    Record<DimensionName, ReasonCode[]>
  >;
  references: Partial<
    Record<DimensionName, string[]>
  >;
} {
  if (
    !input?.dimensions ||
    typeof input.dimensions !== "object"
  ) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "evaluate_item requires all evaluation dimensions.",
    );
  }

  const ratings = {} as DimensionRatings;
  const reasonCodes: Partial<
    Record<DimensionName, ReasonCode[]>
  > = {};
  const references: Partial<
    Record<DimensionName, string[]>
  > = {};

  const allowedRatings =
    new Set<string>(RATINGS);

  for (const name of DIMENSION_NAMES) {
    const dimension =
      input.dimensions[name];

    if (
      !dimension ||
      typeof dimension !== "object" ||
      !allowedRatings.has(
        dimension.rating,
      )
    ) {
      throw new GroundlineError(
        "INVALID_INPUT",
        `Invalid or missing dimension: ${name}.`,
      );
    }

    ratings[name] =
      dimension.rating as Rating;
    reasonCodes[name] =
      parseReasonCodes(
        dimension.reason_codes,
      );
    references[name] =
      parseReferences(
        dimension.referenced_item_ids,
      );
  }

  return {
    ratings,
    reasonCodes,
    references,
  };
}

function nextEvaluationId(): string {
  return `EVAL-AGENT-${Date.now()}`;
}

function appendEvaluationOnly(
  evaluation: EvaluationRecord,
): void {
  const state =
    useWorkspaceStore.getState();
  const current = state.workspace;
  const next = structuredClone(current);

  next.evaluations = [
    ...next.evaluations.filter(
      (candidate) =>
        candidate.item_id !==
        evaluation.item_id,
    ),
    evaluation,
  ];

  next.audit_events.push({
    event_id:
      `AUD-EVALUATE-${next.audit_events.length + 1}`,
    event_type: "EVALUATE",
    timestamp: evaluation.created_at,
    actor_type: "AGENT",
    entity_ids: [evaluation.item_id],
    metadata: {
      evaluation_id:
        evaluation.evaluation_id,
      item_scoped: true,
      triage_recompute_required: true,
    },
  });

  const parsed =
    WorkspaceSchema.safeParse(next);

  if (!parsed.success) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Workspace violates the active schema after item evaluation.",
      { issues: parsed.error.issues },
    );
  }

  useWorkspaceStore.setState({
    workspace: parsed.data,
  });
}

export function createEvaluateItemTool(): WebMCPToolDefinition {
  return {
    name: "evaluate_item",
    title: "Evaluate Groundline item",
    description:
      "Write one agent-supplied structured evaluation for an existing reasoning item. This tool does not change accepted knowledge and does not recompute triage; call triage_workspace after evaluation when prioritization is needed.",
    inputSchema: {
      type: "object",
      properties: {
        item_id: {
          type: "string",
          minLength: 1,
        },
        dimensions: {
          type: "object",
          properties:
            Object.fromEntries(
              DIMENSION_NAMES.map(
                (name) => [
                  name,
                  dimensionSchema(),
                ],
              ),
            ),
          required: [...DIMENSION_NAMES],
          additionalProperties: false,
        },
        reason_codes: {
          type: "array",
          items: {
            type: "string",
            enum: [...REASON_CODES],
          },
        },
        referenced_item_ids: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "item_id",
        "dimensions",
        "reason_codes",
        "referenced_item_ids",
      ],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
    },
    execute(input) {
      const { workspace } =
        assertActiveGroundlineWorkspace();
      const itemId = requireItemId(input);
      getItem(workspace, itemId);

      const parsedDimensions =
        parseDimensions(input);
      const globalReasonCodes =
        parseReasonCodes(
          input.reason_codes,
        );
      const referencedItemIds =
        parseReferences(
          input.referenced_item_ids,
        );

      for (const reference of [
        ...referencedItemIds,
        ...Object.values(
          parsedDimensions.references,
        ).flatMap(
          (ids) => ids ?? [],
        ),
      ]) {
        getItem(workspace, reference);
      }

      const evaluation =
        buildEvaluationRecord({
          evaluationId:
            nextEvaluationId(),
          itemId,
          ratings:
            parsedDimensions.ratings,
          reasonCodes:
            globalReasonCodes,
          referencedItemIds,
          dimensionReasonCodes:
            parsedDimensions.reasonCodes,
          dimensionReferencedItemIds:
            parsedDimensions.references,
          createdAt:
            new Date().toISOString(),
          generatedBy: "AGENT",
        });

      const existingTriage =
        workspace.triage_records.find(
          (record) =>
            record.item_id === itemId,
        ) ?? null;

      appendEvaluationOnly(evaluation);

      return {
        evaluation,
        accepted_knowledge_changed: false,
        triage_recompute_required: true,
        previous_triage:
          existingTriage,
        audit_event: "EVALUATE",
      };
    },
  };
}
