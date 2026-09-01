import { GroundlineError } from "./errors";
import type {
  EvaluationRecord,
  TriageRecord,
} from "./schema";
import { TriageRecordSchema } from "./schema";
import { getUnassessedDimensions } from "./evaluation";

export interface TriageContext {
  downstreamAcceptedIds?: string[];
  directToAcceptedConclusion?: boolean;
}

const POSITIVE_QUALITY_WEAKNESS = {
  HIGH: 0,
  MODERATE: 1,
  LOW: 3,
  UNASSESSED: null,
} as const;

const RISK_WEAKNESS = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 3,
  UNASSESSED: null,
} as const;

const IMPACT_SCORE = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  UNASSESSED: null,
} as const;

export function calculateWeaknessScore(
  evaluation: EvaluationRecord,
): number | null {
  const rawComponents: Array<number | null> = [
    POSITIVE_QUALITY_WEAKNESS[
      evaluation.dimensions.evidence_strength.rating
    ],
    POSITIVE_QUALITY_WEAKNESS[
      evaluation.dimensions.source_quality.rating
    ],
    RISK_WEAKNESS[evaluation.dimensions.contradiction.rating],
    RISK_WEAKNESS[evaluation.dimensions.assumption_burden.rating],
    RISK_WEAKNESS[evaluation.dimensions.generalization_risk.rating],
  ];

  const components = rawComponents.filter(
    (value): value is number => value !== null,
  );

  if (components.length === 0) {
    return null;
  }

  return Math.max(...components);
}

export function calculateImpactScore(
  evaluation: EvaluationRecord,
): number | null {
  return IMPACT_SCORE[evaluation.dimensions.downstream_impact.rating];
}

export function calculatePriorityScore(
  weaknessScore: number | null,
  impactScore: number | null,
): number | null {
  if (weaknessScore === null || impactScore === null) {
    return null;
  }

  return weaknessScore * impactScore;
}

export function deriveTriageState(
  evaluation: EvaluationRecord,
  context: TriageContext,
): TriageRecord["state"] {
  const weakness = calculateWeaknessScore(evaluation);
  const impact = calculateImpactScore(evaluation);
  const priority = calculatePriorityScore(weakness, impact);
  const direct = context.directToAcceptedConclusion ?? false;
  const unassessedDimensions = getUnassessedDimensions(evaluation);

  // Contract: weakness=3 with direct accepted-conclusion dependency is
  // CRITICAL even if the normal priority threshold is not what triggers it.
  if (weakness === 3 && direct) {
    return "CRITICAL";
  }

  if (evaluation.status === "UNASSESSED" || weakness === null) {
    return "UNASSESSED";
  }

  if (priority !== null && priority >= 7) {
    return "CRITICAL";
  }

  if (priority !== null && priority >= 3) {
    return "REVIEW";
  }

  // Contract: a material unassessed dimension with enough context is REVIEW,
  // not a falsely optimistic STABLE result.
  if (
    evaluation.status === "PARTIAL" &&
    unassessedDimensions.length > 0
  ) {
    return "REVIEW";
  }

  if (impact === null) {
    return evaluation.status === "PARTIAL" ? "REVIEW" : "UNASSESSED";
  }

  if (priority !== null && priority <= 2) {
    return "STABLE";
  }

  return "UNASSESSED";
}

export function triageEvaluation(
  evaluation: EvaluationRecord,
  context: TriageContext = {},
): TriageRecord {
  const weakness = calculateWeaknessScore(evaluation);
  const impact = calculateImpactScore(evaluation);
  const priority = calculatePriorityScore(weakness, impact);

  const record: TriageRecord = {
    item_id: evaluation.item_id,
    state: deriveTriageState(evaluation, context),
    weakness_score_internal: weakness,
    impact_score_internal: impact,
    priority_score_internal: priority,
    reason_codes: [...evaluation.reason_codes],
    downstream_accepted_ids: [
      ...new Set(context.downstreamAcceptedIds ?? []),
    ],
    direct_to_accepted_conclusion:
      context.directToAcceptedConclusion ?? false,
  };

  const parsed = TriageRecordSchema.safeParse(record);

  if (!parsed.success) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Triage record violates the active schema.",
      { issues: parsed.error.issues },
    );
  }

  return parsed.data;
}
