import { describe, expect, it } from "vitest";
import { buildEvaluationRecord } from "../../src/domain/evaluation";
import {
  calculateImpactScore,
  calculatePriorityScore,
  calculateWeaknessScore,
  deriveTriageState,
  triageEvaluation,
} from "../../src/domain/triage";

const baseRatings = {
  evidence_strength: "HIGH",
  source_quality: "HIGH",
  contradiction: "LOW",
  assumption_burden: "LOW",
  generalization_risk: "LOW",
  downstream_impact: "LOW",
} as const;

function evaluation(
  ratings: Parameters<typeof buildEvaluationRecord>[0]["ratings"],
) {
  return buildEvaluationRecord({
    evaluationId: "EVAL-UNIT",
    itemId: "C-UNIT",
    ratings,
    reasonCodes: [],
    referencedItemIds: ["C-UNIT"],
    generatedBy: "SYSTEM",
    createdAt: "2026-09-02T00:00:00+07:00",
  });
}

describe("P-03 deterministic evaluation and triage contract", () => {
  it("maps positive-quality dimensions to weakness correctly", () => {
    expect(calculateWeaknessScore(evaluation(baseRatings))).toBe(0);

    expect(
      calculateWeaknessScore(
        evaluation({ ...baseRatings, evidence_strength: "MODERATE" }),
      ),
    ).toBe(1);

    expect(
      calculateWeaknessScore(
        evaluation({ ...baseRatings, source_quality: "LOW" }),
      ),
    ).toBe(3);
  });

  it("maps risk dimensions to weakness correctly", () => {
    expect(
      calculateWeaknessScore(
        evaluation({ ...baseRatings, contradiction: "HIGH" }),
      ),
    ).toBe(3);

    expect(
      calculateWeaknessScore(
        evaluation({ ...baseRatings, assumption_burden: "MODERATE" }),
      ),
    ).toBe(1);
  });

  it("maps downstream impact to 1, 2, 3, or null", () => {
    expect(calculateImpactScore(evaluation(baseRatings))).toBe(1);
    expect(
      calculateImpactScore(
        evaluation({ ...baseRatings, downstream_impact: "MODERATE" }),
      ),
    ).toBe(2);
    expect(
      calculateImpactScore(
        evaluation({ ...baseRatings, downstream_impact: "HIGH" }),
      ),
    ).toBe(3);
    expect(
      calculateImpactScore(
        evaluation({ ...baseRatings, downstream_impact: "UNASSESSED" }),
      ),
    ).toBeNull();
  });

  it("uses weakness × impact as operational priority", () => {
    expect(calculatePriorityScore(3, 3)).toBe(9);
    expect(calculatePriorityScore(3, 2)).toBe(6);
    expect(calculatePriorityScore(0, 3)).toBe(0);
    expect(calculatePriorityScore(null, 3)).toBeNull();
  });

  it("keeps direct low-impact weakness at REVIEW instead of manufacturing CRITICAL", () => {
    const record = evaluation({
      ...baseRatings,
      evidence_strength: "LOW",
      downstream_impact: "LOW",
    });

    expect(
      deriveTriageState(record, {
        directToAcceptedConclusion: true,
      }),
    ).toBe("REVIEW");
  });

  it("marks high-weakness high-impact direct reasoning as CRITICAL", () => {
    const record = evaluation({
      ...baseRatings,
      evidence_strength: "LOW",
      downstream_impact: "HIGH",
    });

    expect(
      deriveTriageState(record, {
        directToAcceptedConclusion: true,
      }),
    ).toBe("CRITICAL");
  });

  it("keeps low-impact weakness at REVIEW when it is not direct", () => {
    const record = evaluation({
      ...baseRatings,
      evidence_strength: "LOW",
      downstream_impact: "LOW",
    });

    expect(
      deriveTriageState(record, {
        directToAcceptedConclusion: false,
      }),
    ).toBe("REVIEW");
  });

  it("does not allow unassessed material context to default to STABLE", () => {
    const record = evaluation({
      ...baseRatings,
      source_quality: "UNASSESSED",
      downstream_impact: "LOW",
    });

    expect(record.status).toBe("PARTIAL");
    expect(deriveTriageState(record, {})).toBe("REVIEW");
  });

  it("returns UNASSESSED when all dimensions are unassessed", () => {
    const record = evaluation({
      evidence_strength: "UNASSESSED",
      source_quality: "UNASSESSED",
      contradiction: "UNASSESSED",
      assumption_burden: "UNASSESSED",
      generalization_risk: "UNASSESSED",
      downstream_impact: "UNASSESSED",
    });

    const triage = triageEvaluation(record);

    expect(record.status).toBe("UNASSESSED");
    expect(triage.weakness_score_internal).toBeNull();
    expect(triage.impact_score_internal).toBeNull();
    expect(triage.priority_score_internal).toBeNull();
    expect(triage.state).toBe("UNASSESSED");
  });
});
