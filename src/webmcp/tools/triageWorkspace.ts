import type { WebMCPToolDefinition } from "../modelContext";
import {
  EvaluationRecordSchema,
  type EvaluationRecord,
} from "../../domain/schema";
import { GroundlineError } from "../../domain/errors";
import { useWorkspaceStore } from "../../state/workspaceStore";
import { assertActiveGroundlineWorkspace } from "../activeWorkspace";
import {
  MAX_SEMANTIC_REVIEW_TARGETS,
  buildSemanticReviewToken,
  getSemanticReviewTargetIds,
} from "../semanticReviewContract";

const DIMENSIONS = [
  "evidence_strength",
  "source_quality",
  "contradiction",
  "assumption_burden",
  "generalization_risk",
  "downstream_impact",
] as const;

function dimensionSchema() {
  return {
    type: "object",
    properties: {
      rating: {
        type: "string",
        enum: [
          "LOW",
          "MODERATE",
          "HIGH",
          "UNASSESSED",
        ],
      },
      reason_codes: {
        type: "array",
        items: { type: "string" },
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

function validateCustomReviewHandshake(
  input: any,
  rawEvaluations: any[],
): {
  reviewToken: string;
  targetItemIds: string[];
} {
  const state = useWorkspaceStore.getState();
  const workspace = state.workspace;
  const targetItemIds = getSemanticReviewTargetIds(workspace);
  const expectedToken = buildSemanticReviewToken(workspace);
  const suppliedToken = input?.review_token;

  if (typeof suppliedToken !== "string" || !suppliedToken.trim()) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "CUSTOM triage_workspace requires review_token from the latest inspect_workspace semantic_review packet.",
    );
  }

  if (suppliedToken.trim() !== expectedToken) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Semantic review is stale because the accepted reasoning changed. Call inspect_workspace again and review the current target set before triage.",
      {
        expected_review_token: expectedToken,
        received_review_token: suppliedToken.trim(),
      },
    );
  }

  if (targetItemIds.length === 0) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "CUSTOM workspace has no accepted semantic review targets.",
    );
  }

  if (targetItemIds.length > MAX_SEMANTIC_REVIEW_TARGETS) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `CUSTOM workspace has ${targetItemIds.length} review targets, exceeding the bounded semantic review capacity of ${MAX_SEMANTIC_REVIEW_TARGETS}.`,
    );
  }

  const suppliedIds = rawEvaluations.map((raw) => raw?.item_id);

  if (
    suppliedIds.some(
      (id) => typeof id !== "string" || !id.trim(),
    )
  ) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Every custom semantic evaluation requires a non-empty item_id.",
    );
  }

  const normalizedIds = suppliedIds.map((id) => id.trim());
  const uniqueIds = new Set(normalizedIds);

  if (uniqueIds.size !== normalizedIds.length) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "CUSTOM semantic review contains duplicate item evaluations.",
    );
  }

  const expected = new Set(targetItemIds);
  const missing = targetItemIds.filter((id) => !uniqueIds.has(id));
  const unexpected = normalizedIds.filter((id) => !expected.has(id));

  if (missing.length > 0 || unexpected.length > 0) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "CUSTOM semantic review must contain exactly one evaluation for every current semantic review target.",
      {
        missing_item_ids: missing,
        unexpected_item_ids: unexpected,
        required_item_ids: targetItemIds,
      },
    );
  }

  return {
    reviewToken: expectedToken,
    targetItemIds,
  };
}

export function createTriageWorkspaceTool(): WebMCPToolDefinition {
  return {
    name: "triage_workspace",
    title: "Triage Groundline workspace",
    description:
      "Commit one fresh semantic review batch and let Groundline deterministically compute review priority. For CUSTOM workspaces, first call inspect_workspace, inspect every semantic_review.target_item_id, then call this tool once with semantic_review.review_token and exactly one evaluation per target. A stale or partial custom review is rejected. Scores are review mechanics, never truth or confidence.",
    inputSchema: {
      type: "object",
      properties: {
        review_token: {
          type: "string",
          minLength: 1,
          description:
            "Required for CUSTOM workspaces. Copy semantic_review.review_token from the latest inspect_workspace result.",
        },
        evaluations: {
          type: "array",
          minItems: 1,
          maxItems: MAX_SEMANTIC_REVIEW_TARGETS,
          items: {
            type: "object",
            properties: {
              item_id: {
                type: "string",
              },
              status: {
                type: "string",
                enum: [
                  "COMPLETE",
                  "PARTIAL",
                  "UNASSESSED",
                ],
              },
              dimensions: {
                type: "object",
                properties: Object.fromEntries(
                  DIMENSIONS.map((name) => [name, dimensionSchema()]),
                ),
                required: [...DIMENSIONS],
                additionalProperties: false,
              },
              reason_codes: {
                type: "array",
                items: { type: "string" },
              },
              referenced_item_ids: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: [
              "item_id",
              "status",
              "dimensions",
              "reason_codes",
              "referenced_item_ids",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["evaluations"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
    },
    execute(input) {
      const active = assertActiveGroundlineWorkspace();
      const timestamp = new Date().toISOString();

      const rawEvaluations = Array.isArray(input.evaluations)
        ? input.evaluations
        : [];

      let reviewToken: string | null = null;
      let reviewedTargetIds: string[] = [];

      if (active.experienceMode === "CUSTOM") {
        const handshake = validateCustomReviewHandshake(
          input,
          rawEvaluations,
        );
        reviewToken = handshake.reviewToken;
        reviewedTargetIds = handshake.targetItemIds;
      }

      const evaluations: EvaluationRecord[] = rawEvaluations.map(
        (raw: any, index: number) => {
          const record = {
            ...raw,
            evaluation_id: `EVAL-AGENT-${Date.now()}-${index + 1}`,
            created_at: timestamp,
            generated_by: "AGENT",
          };

          const parsed = EvaluationRecordSchema.safeParse(record);

          if (!parsed.success) {
            throw new GroundlineError(
              "INVALID_INPUT",
              "Agent evaluation input violates the active evaluation schema.",
              { issues: parsed.error.issues },
            );
          }

          return parsed.data;
        },
      );

      useWorkspaceStore.getState().applyAgentEvaluations(evaluations);

      const workspace = useWorkspaceStore.getState().workspace;
      const orderedTriage = workspace.triage_records
        .slice()
        .sort(
          (a, b) =>
            (b.priority_score_internal ?? -1) -
            (a.priority_score_internal ?? -1),
        );
      const primaryRisk =
        orderedTriage.find(
          (record) =>
            record.state === "CRITICAL" ||
            record.state === "REVIEW",
        ) ?? null;

      return {
        semantic_review: {
          review_token: reviewToken,
          reviewed_target_ids:
            active.experienceMode === "CUSTOM"
              ? reviewedTargetIds
              : evaluations.map((evaluation) => evaluation.item_id),
          coverage_complete:
            active.experienceMode === "CUSTOM" ? true : null,
          accepted_knowledge_changed: false,
        },
        triage: orderedTriage.slice(0, 12),
        primary_risk: primaryRisk,
        counts: {
          evaluations: evaluations.length,
          critical: orderedTriage.filter(
            (record) => record.state === "CRITICAL",
          ).length,
          review: orderedTriage.filter(
            (record) => record.state === "REVIEW",
          ).length,
          stable: orderedTriage.filter(
            (record) => record.state === "STABLE",
          ).length,
          unassessed: orderedTriage.filter(
            (record) => record.state === "UNASSESSED",
          ).length,
        },
        audit_events_added: ["EVALUATE", "TRIAGE"],
      };
    },
  };
}
