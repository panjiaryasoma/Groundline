import type { WebMCPToolDefinition } from "../modelContext";
import {
  EvaluationRecordSchema,
  type EvaluationRecord,
} from "../../domain/schema";
import { useWorkspaceStore } from "../../state/workspaceStore";
import { assertActiveGroundlineWorkspace } from "../activeWorkspace";

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

export function createTriageWorkspaceTool(): WebMCPToolDefinition {
  return {
    name: "triage_workspace",
    title: "Triage Groundline workspace",
    description:
      "Attach agent-supplied evaluation dimensions for existing items, then let Groundline deterministically compute review priority and triage. Do not use scores as truth or confidence.",
    inputSchema: {
      type: "object",
      properties: {
        evaluations: {
          type: "array",
          minItems: 1,
          maxItems: 25,
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
                properties:
                  Object.fromEntries(
                    DIMENSIONS.map(
                      (name) => [
                        name,
                        dimensionSchema(),
                      ],
                    ),
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
      assertActiveGroundlineWorkspace();

      const timestamp =
        new Date().toISOString();

      const rawEvaluations = Array.isArray(
        input.evaluations,
      )
        ? input.evaluations
        : [];

      const evaluations:
        EvaluationRecord[] =
        rawEvaluations.map(
          (raw: any, index: number) => {
            const record = {
              ...raw,
              evaluation_id:
                `EVAL-AGENT-${Date.now()}-${index + 1}`,
              created_at: timestamp,
              generated_by: "AGENT",
            };

            const parsed =
              EvaluationRecordSchema.safeParse(
                record,
              );

            if (!parsed.success) {
              throw new Error(
                "Agent evaluation input violates the active evaluation schema.",
              );
            }

            return parsed.data;
          },
        );

      useWorkspaceStore
        .getState()
        .applyAgentEvaluations(
          evaluations,
        );

      const workspace =
        useWorkspaceStore.getState().workspace;

      return {
        triage: workspace.triage_records
          .slice()
          .sort(
            (a, b) =>
              (b.priority_score_internal ?? -1) -
              (a.priority_score_internal ?? -1),
          )
          .slice(0, 12),
        audit_events_added: [
          "EVALUATE",
          "TRIAGE",
        ],
      };
    },
  };
}
