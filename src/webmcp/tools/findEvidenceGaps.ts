import type { WebMCPToolDefinition } from "../modelContext";
import { GroundlineError } from "../../domain/errors";
import {
  getIncomingRelations,
  getItem,
} from "../../domain/dependencies";
import { assertActiveGroundlineWorkspace } from "../activeWorkspace";

const DEFAULT_MAX_FINDINGS = 8;
const MAX_FINDINGS = 12;
const GAP_ELIGIBLE_TYPES = new Set([
  "CLAIM",
  "COUNTERCLAIM",
  "ASSUMPTION",
  "CONCLUSION",
]);

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

export function createFindEvidenceGapsTool(): WebMCPToolDefinition {
  return {
    name: "find_evidence_gaps",
    title: "Find represented evidence gaps",
    description:
      "Find bounded missing or weak support already represented by Groundline structure or structured evaluations. A gap means insufficient represented support; it does not mean the claim is false or contradicted.",
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
      // Frozen FEATURE_SCHEMA_FINAL keeps this analysis tool non-read-only.
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

      const candidates = workspace.items.filter(
        (item) =>
          item.state === "ACCEPTED" &&
          GAP_ELIGIBLE_TYPES.has(item.type) &&
          (!itemId || item.id === itemId),
      );

      const findings: Array<{
        finding_type:
          | "MISSING_DIRECT_EVIDENCE"
          | "WEAK_SUPPORT";
        item_id: string;
        item_type: string;
        bases: string[];
        reason_codes: string[];
        direct_support_item_ids: string[];
        direct_evidence_item_ids: string[];
        support_relation_ids: string[];
        challenge_relation_ids: string[];
        declares_false: false;
      }> = [];

      for (const item of candidates) {
        const supportRelations =
          getIncomingRelations(
            workspace,
            item.id,
            ["SUPPORTS"],
          );

        const challengeRelations =
          getIncomingRelations(
            workspace,
            item.id,
            ["CHALLENGES"],
          );

        const directSupportIds = [
          ...new Set(
            supportRelations.map(
              (relation) =>
                relation.from_id,
            ),
          ),
        ];

        const directEvidenceIds =
          directSupportIds.filter((id) =>
            workspace.items.some(
              (candidate) =>
                candidate.id === id &&
                candidate.type === "EVIDENCE",
            ),
          );

        const evaluation =
          [...workspace.evaluations]
            .reverse()
            .find(
              (candidate) =>
                candidate.item_id === item.id,
            );

        const evidenceDimension =
          evaluation?.dimensions.evidence_strength;

        const evaluationCodes = [
          ...new Set([
            ...(evaluation?.reason_codes ?? []),
            ...(evidenceDimension
              ?.reason_codes ?? []),
          ]),
        ];

        const bases: string[] = [];
        const reasonCodes: string[] = [];

        if (supportRelations.length === 0) {
          bases.push(
            "NO_REPRESENTED_SUPPORT_RELATION",
          );
          reasonCodes.push(
            "MISSING_DIRECT_EVIDENCE",
          );
        }

        if (
          evaluationCodes.includes(
            "MISSING_DIRECT_EVIDENCE",
          )
        ) {
          bases.push(
            "EVALUATION_MISSING_DIRECT_EVIDENCE",
          );
          reasonCodes.push(
            "MISSING_DIRECT_EVIDENCE",
          );
        }

        if (
          evaluationCodes.includes(
            "WEAK_SUPPORT",
          ) ||
          evidenceDimension?.rating === "LOW"
        ) {
          bases.push(
            "EVALUATION_WEAK_SUPPORT",
          );
          reasonCodes.push("WEAK_SUPPORT");
        }

        const uniqueReasonCodes = [
          ...new Set(reasonCodes),
        ];

        if (uniqueReasonCodes.length === 0) {
          continue;
        }

        findings.push({
          finding_type:
            uniqueReasonCodes.includes(
              "MISSING_DIRECT_EVIDENCE",
            )
              ? "MISSING_DIRECT_EVIDENCE"
              : "WEAK_SUPPORT",
          item_id: item.id,
          item_type: item.type,
          bases: [...new Set(bases)],
          reason_codes:
            uniqueReasonCodes,
          direct_support_item_ids:
            directSupportIds,
          direct_evidence_item_ids:
            directEvidenceIds,
          support_relation_ids:
            supportRelations.map(
              (relation) => relation.id,
            ),
          challenge_relation_ids:
            challengeRelations.map(
              (relation) => relation.id,
            ),
          declares_false: false,
        });
      }

      const bounded =
        findings.slice(0, maxFindings);

      return {
        findings: bounded,
        count: bounded.length,
        truncated:
          findings.length > maxFindings,
        missing_evidence_is_not_contradiction:
          true,
        semantic_inference_performed:
          false,
        interpretation:
          bounded.length > 0
            ? "These findings describe represented support gaps only. They do not declare any claim false."
            : "No represented evidence gap was found under the available structural/evaluation signals. This is not proof that the evidence is sufficient.",
      };
    },
  };
}
