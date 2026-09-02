import type { WebMCPToolDefinition } from "../modelContext";
import { GroundlineError } from "../../domain/errors";
import {
  getIncomingRelations,
  getItem,
} from "../../domain/dependencies";
import { assertActiveGroundlineWorkspace } from "../activeWorkspace";

const DEFAULT_MAX_FINDINGS = 8;
const MAX_FINDINGS = 12;

function parseOptionalItemId(input: any): string | null {
  const value = input?.item_id;

  if (value == null) {
    return null;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "item_id must be a non-empty string when provided.",
    );
  }

  return value.trim();
}

function parseMaxFindings(input: any): number {
  const raw =
    input?.max_findings ??
    DEFAULT_MAX_FINDINGS;

  if (
    !Number.isInteger(raw) ||
    raw < 1 ||
    raw > MAX_FINDINGS
  ) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `max_findings must be an integer between 1 and ${MAX_FINDINGS}.`,
    );
  }

  return raw;
}

export function createFindContradictionsTool(): WebMCPToolDefinition {
  return {
    name: "find_contradictions",
    title: "Find represented contradictions",
    description:
      "Find bounded contradiction signals already represented by Groundline relations or structured evaluations. This does not perform universal semantic contradiction detection over arbitrary prose.",
    inputSchema: {
      type: "object",
      properties: {
        item_id: {
          type: "string",
          minLength: 1,
        },
        max_findings: {
          type: "integer",
          minimum: 1,
          maximum: MAX_FINDINGS,
        },
      },
      additionalProperties: false,
    },
    annotations: {
      // Frozen FEATURE_SCHEMA_FINAL keeps this analysis tool non-read-only
      // even though P-09 returns findings without mutating accepted knowledge.
      readOnlyHint: false,
      untrustedContentHint: true,
    },
    execute(input) {
      const { workspace } =
        assertActiveGroundlineWorkspace();
      const itemId =
        parseOptionalItemId(input);
      const maxFindings =
        parseMaxFindings(input);

      if (itemId) {
        getItem(workspace, itemId);
      }

      const findings: Array<{
        finding_type: "CONTRADICTED";
        basis:
          | "EXPLICIT_CHALLENGES_RELATION"
          | "EVALUATION_SIGNAL";
        subject_item_id: string;
        challenger_item_ids: string[];
        evidence_item_ids: string[];
        source_item_ids: string[];
        relation_ids: string[];
        reason_codes: string[];
        referenced_item_ids: string[];
      }> = [];

      const explicitSubjects =
        new Set<string>();

      for (const relation of workspace.relations) {
        if (relation.type !== "CHALLENGES") {
          continue;
        }

        const challenger =
          getItem(workspace, relation.from_id);
        const subject =
          getItem(workspace, relation.to_id);

        const supportingEvidenceRelations =
          getIncomingRelations(
            workspace,
            challenger.id,
            ["SUPPORTS"],
          ).filter((candidate) =>
            workspace.items.some(
              (item) =>
                item.id === candidate.from_id &&
                item.type === "EVIDENCE",
            ),
          );

        const evidenceIds = [
          ...new Set(
            supportingEvidenceRelations.map(
              (candidate) =>
                candidate.from_id,
            ),
          ),
        ];

        // Frozen fixture direction is SOURCE -> EVIDENCE for SOURCED_FROM.
        const sourceRelations =
          evidenceIds.flatMap(
            (evidenceId) =>
              getIncomingRelations(
                workspace,
                evidenceId,
                ["SOURCED_FROM"],
              ).filter((candidate) =>
                workspace.items.some(
                  (item) =>
                    item.id === candidate.from_id &&
                    item.type === "SOURCE",
                ),
              ),
          );

        const sourceIds = [
          ...new Set(
            sourceRelations.map(
              (candidate) =>
                candidate.from_id,
            ),
          ),
        ];

        const referencedItemIds = [
          subject.id,
          challenger.id,
          ...evidenceIds,
          ...sourceIds,
        ];

        if (
          itemId &&
          !referencedItemIds.includes(
            itemId,
          )
        ) {
          continue;
        }

        explicitSubjects.add(subject.id);

        findings.push({
          finding_type: "CONTRADICTED",
          basis:
            "EXPLICIT_CHALLENGES_RELATION",
          subject_item_id: subject.id,
          challenger_item_ids: [
            challenger.id,
          ],
          evidence_item_ids:
            evidenceIds,
          source_item_ids: sourceIds,
          relation_ids: [
            relation.id,
            ...supportingEvidenceRelations.map(
              (candidate) =>
                candidate.id,
            ),
            ...sourceRelations.map(
              (candidate) =>
                candidate.id,
            ),
          ],
          reason_codes: ["CONTRADICTED"],
          referenced_item_ids:
            referencedItemIds,
        });
      }

      for (const evaluation of workspace.evaluations) {
        if (
          explicitSubjects.has(
            evaluation.item_id,
          )
        ) {
          continue;
        }

        const contradictionDimension =
          evaluation.dimensions.contradiction;
        const codes = [
          ...new Set([
            ...evaluation.reason_codes,
            ...contradictionDimension.reason_codes,
          ]),
        ];

        const hasSignal =
          contradictionDimension.rating ===
            "HIGH" ||
          contradictionDimension.rating ===
            "MODERATE" ||
          codes.includes("CONTRADICTED") ||
          codes.includes("SOURCE_CONFLICT");

        if (!hasSignal) {
          continue;
        }

        const references = [
          ...new Set([
            evaluation.item_id,
            ...evaluation.referenced_item_ids,
            ...contradictionDimension.referenced_item_ids,
          ]),
        ];

        if (
          itemId &&
          !references.includes(itemId)
        ) {
          continue;
        }

        const evidenceIds =
          references.filter((id) =>
            workspace.items.some(
              (candidate) =>
                candidate.id === id &&
                candidate.type === "EVIDENCE",
            ),
          );

        const sourceIds =
          references.filter((id) =>
            workspace.items.some(
              (candidate) =>
                candidate.id === id &&
                candidate.type === "SOURCE",
            ),
          );

        findings.push({
          finding_type: "CONTRADICTED",
          basis: "EVALUATION_SIGNAL",
          subject_item_id:
            evaluation.item_id,
          challenger_item_ids: [],
          evidence_item_ids:
            evidenceIds,
          source_item_ids: sourceIds,
          relation_ids: [],
          reason_codes: codes.filter(
            (code) =>
              code === "CONTRADICTED" ||
              code === "SOURCE_CONFLICT",
          ),
          referenced_item_ids:
            references,
        });
      }

      const bounded =
        findings.slice(0, maxFindings);

      return {
        findings: bounded,
        count: bounded.length,
        truncated:
          findings.length > maxFindings,
        semantic_inference_performed:
          false,
        interpretation:
          bounded.length > 0
            ? "These are contradiction signals already represented by explicit CHALLENGES relations or structured evaluation records."
            : "No represented contradiction signal was found. This is not proof that no semantic contradiction exists.",
      };
    },
  };
}
