import { GroundlineError } from "./errors";
import {
  EvaluationRecordSchema,
  type EvaluationRecord,
} from "./schema";

export const DIMENSION_NAMES = [
  "evidence_strength",
  "source_quality",
  "contradiction",
  "assumption_burden",
  "generalization_risk",
  "downstream_impact",
] as const;

export type DimensionName = (typeof DIMENSION_NAMES)[number];
export type DimensionRating =
  EvaluationRecord["dimensions"][DimensionName]["rating"];

export type DimensionRatings = {
  [K in DimensionName]: DimensionRating;
};

export const REASON_CODES = [
  "WEAK_SUPPORT",
  "MISSING_DIRECT_EVIDENCE",
  "SOURCE_QUALITY_UNCLEAR",
  "SOURCE_CONFLICT",
  "UNSUPPORTED_ASSUMPTION",
  "OVERGENERALIZATION",
  "CONTRADICTED",
  "STALE_EVIDENCE",
  "SCOPE_MISMATCH",
  "DEPENDENCY_ON_UNASSESSED_NODE",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

export interface BuildEvaluationInput {
  evaluationId: string;
  itemId: string;
  ratings: DimensionRatings;
  reasonCodes?: ReasonCode[];
  referencedItemIds?: string[];
  dimensionReasonCodes?: Partial<Record<DimensionName, ReasonCode[]>>;
  dimensionReferencedItemIds?: Partial<Record<DimensionName, string[]>>;
  createdAt?: string;
  generatedBy?: "SYSTEM" | "AGENT";
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function deriveEvaluationStatus(
  ratings: DimensionRatings,
): EvaluationRecord["status"] {
  const values = DIMENSION_NAMES.map((name) => ratings[name]);
  const unassessedCount = values.filter(
    (rating) => rating === "UNASSESSED",
  ).length;

  if (unassessedCount === values.length) {
    return "UNASSESSED";
  }

  if (unassessedCount > 0) {
    return "PARTIAL";
  }

  return "COMPLETE";
}

export function buildEvaluationRecord(
  input: BuildEvaluationInput,
): EvaluationRecord {
  const globalReasonCodes = unique(input.reasonCodes ?? []);
  const referencedItemIds = unique([
    input.itemId,
    ...(input.referencedItemIds ?? []),
  ]);

  const dimensions = Object.fromEntries(
    DIMENSION_NAMES.map((name) => [
      name,
      {
        rating: input.ratings[name],
        reason_codes: unique(input.dimensionReasonCodes?.[name] ?? []),
        referenced_item_ids: unique(
          input.dimensionReferencedItemIds?.[name] ?? referencedItemIds,
        ),
      },
    ]),
  ) as EvaluationRecord["dimensions"];

  const record: EvaluationRecord = {
    evaluation_id: input.evaluationId,
    item_id: input.itemId,
    status: deriveEvaluationStatus(input.ratings),
    dimensions,
    reason_codes: globalReasonCodes,
    referenced_item_ids: referencedItemIds,
    created_at: input.createdAt ?? new Date().toISOString(),
    generated_by: input.generatedBy ?? "SYSTEM",
  };

  const parsed = EvaluationRecordSchema.safeParse(record);

  if (!parsed.success) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Evaluation record violates the active schema.",
      { issues: parsed.error.issues },
    );
  }

  return parsed.data;
}

export function getDimensionRatings(
  evaluation: EvaluationRecord,
): DimensionRatings {
  return {
    evidence_strength: evaluation.dimensions.evidence_strength.rating,
    source_quality: evaluation.dimensions.source_quality.rating,
    contradiction: evaluation.dimensions.contradiction.rating,
    assumption_burden: evaluation.dimensions.assumption_burden.rating,
    generalization_risk: evaluation.dimensions.generalization_risk.rating,
    downstream_impact: evaluation.dimensions.downstream_impact.rating,
  };
}

export function getUnassessedDimensions(
  evaluation: EvaluationRecord,
): DimensionName[] {
  return DIMENSION_NAMES.filter(
    (name) => evaluation.dimensions[name].rating === "UNASSESSED",
  );
}

/**
 * P-03 deliberately does not infer semantic ratings from arbitrary prose.
 *
 * The deterministic layer validates structured dimension ratings, provenance,
 * reason codes, and downstream prioritization. A future agent/tool may propose
 * semantic findings, but those findings still pass through this contract layer.
 *
 * This avoids inventing a hidden "truth oracle" that the schema never approved.
 */
export const SEMANTIC_TEXT_INFERENCE_MODE = "NOT_IN_P03" as const;
