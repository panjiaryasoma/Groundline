import { buildEvaluationRecord } from "../domain/evaluation";

const createdAt = "2026-09-02T00:00:00+07:00";

export const integration001Evaluations = [
  buildEvaluationRecord({
    evaluationId: "EVAL-INT-A-001",
    itemId: "A-001",
    ratings: {
      evidence_strength: "LOW",
      source_quality: "UNASSESSED",
      contradiction: "MODERATE",
      assumption_burden: "HIGH",
      generalization_risk: "HIGH",
      downstream_impact: "HIGH",
    },
    reasonCodes: [
      "UNSUPPORTED_ASSUMPTION",
      "OVERGENERALIZATION",
    ],
    referencedItemIds: [
      "A-001",
      "C-001",
      "CONC-001",
      "E-AGG-001",
      "E-SUB-001",
    ],
    generatedBy: "SYSTEM",
    createdAt,
  }),
  buildEvaluationRecord({
    evaluationId: "EVAL-INT-C-001",
    itemId: "C-001",
    ratings: {
      evidence_strength: "MODERATE",
      source_quality: "MODERATE",
      contradiction: "HIGH",
      assumption_burden: "HIGH",
      generalization_risk: "HIGH",
      downstream_impact: "HIGH",
    },
    reasonCodes: [
      "CONTRADICTED",
      "OVERGENERALIZATION",
      "SCOPE_MISMATCH",
    ],
    referencedItemIds: [
      "C-001",
      "E-AGG-001",
      "CC-001",
      "E-SUB-001",
      "CONC-001",
    ],
    generatedBy: "SYSTEM",
    createdAt,
  }),
  buildEvaluationRecord({
    evaluationId: "EVAL-INT-CC-001",
    itemId: "CC-001",
    ratings: {
      evidence_strength: "HIGH",
      source_quality: "HIGH",
      contradiction: "LOW",
      assumption_burden: "LOW",
      generalization_risk: "LOW",
      downstream_impact: "MODERATE",
    },
    reasonCodes: [],
    referencedItemIds: [
      "CC-001",
      "E-SUB-001",
      "SRC-NIST-001",
      "C-001",
    ],
    generatedBy: "SYSTEM",
    createdAt,
  }),
  buildEvaluationRecord({
    evaluationId: "EVAL-INT-CONC-001",
    itemId: "CONC-001",
    ratings: {
      evidence_strength: "LOW",
      source_quality: "MODERATE",
      contradiction: "HIGH",
      assumption_burden: "HIGH",
      generalization_risk: "HIGH",
      downstream_impact: "HIGH",
    },
    reasonCodes: [
      "DEPENDENCY_ON_UNASSESSED_NODE",
      "CONTRADICTED",
      "OVERGENERALIZATION",
    ],
    referencedItemIds: [
      "CONC-001",
      "A-001",
      "C-001",
      "CC-001",
    ],
    generatedBy: "SYSTEM",
    createdAt,
  }),
];
