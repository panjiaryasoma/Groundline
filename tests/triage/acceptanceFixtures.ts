import type { DimensionRatings, ReasonCode } from "../../src/domain/evaluation";

export interface TriageAcceptanceFixture {
  id: string;
  itemId: string;
  ratings: DimensionRatings;
  reasonCodes: ReasonCode[];
  referencedItemIds: string[];
  downstreamAcceptedIds: string[];
  directToAcceptedConclusion: boolean;
  expected: {
    evaluationStatus: "COMPLETE" | "PARTIAL" | "UNASSESSED";
    weakness: number | null;
    impact: number | null;
    priority: number | null;
    state: "CRITICAL" | "REVIEW" | "STABLE" | "UNASSESSED";
  };
  forbiddenReasonCodes?: ReasonCode[];
}

export const TRIAGE_ACCEPTANCE_FIXTURES: Record<
  string,
  TriageAcceptanceFixture
> = {
  "TRIAGE-001": {
    id: "TRIAGE-001",
    itemId: "A-001",
    ratings: {
      evidence_strength: "LOW",
      source_quality: "UNASSESSED",
      contradiction: "LOW",
      assumption_burden: "HIGH",
      generalization_risk: "MODERATE",
      downstream_impact: "HIGH",
    },
    reasonCodes: [
      "UNSUPPORTED_ASSUMPTION",
      "DEPENDENCY_ON_UNASSESSED_NODE",
    ],
    referencedItemIds: ["A-001", "CLAIM-001", "CONCLUSION-001"],
    downstreamAcceptedIds: ["CLAIM-001", "CONCLUSION-001"],
    directToAcceptedConclusion: true,
    expected: {
      evaluationStatus: "PARTIAL",
      weakness: 3,
      impact: 3,
      priority: 9,
      state: "CRITICAL",
    },
  },

  "TRIAGE-002": {
    id: "TRIAGE-002",
    itemId: "C-001",
    ratings: {
      evidence_strength: "MODERATE",
      source_quality: "HIGH",
      contradiction: "HIGH",
      assumption_burden: "MODERATE",
      generalization_risk: "HIGH",
      downstream_impact: "HIGH",
    },
    reasonCodes: [
      "OVERGENERALIZATION",
      "SCOPE_MISMATCH",
      "CONTRADICTED",
    ],
    referencedItemIds: [
      "C-001",
      "E-AGG",
      "E-SUBGROUP",
      "CONCLUSION-001",
    ],
    downstreamAcceptedIds: ["CONCLUSION-001"],
    directToAcceptedConclusion: true,
    expected: {
      evaluationStatus: "COMPLETE",
      weakness: 3,
      impact: 3,
      priority: 9,
      state: "CRITICAL",
    },
  },

  "TRIAGE-003": {
    id: "TRIAGE-003",
    itemId: "C-002",
    ratings: {
      evidence_strength: "LOW",
      source_quality: "UNASSESSED",
      contradiction: "LOW",
      assumption_burden: "MODERATE",
      generalization_risk: "LOW",
      downstream_impact: "MODERATE",
    },
    reasonCodes: ["MISSING_DIRECT_EVIDENCE"],
    referencedItemIds: ["C-002", "C-003", "CONCLUSION-001"],
    downstreamAcceptedIds: ["C-003", "CONCLUSION-001"],
    directToAcceptedConclusion: false,
    expected: {
      evaluationStatus: "PARTIAL",
      weakness: 3,
      impact: 2,
      priority: 6,
      state: "REVIEW",
    },
    forbiddenReasonCodes: ["CONTRADICTED"],
  },

  "TRIAGE-004": {
    id: "TRIAGE-004",
    itemId: "SOURCE-001",
    ratings: {
      evidence_strength: "MODERATE",
      source_quality: "LOW",
      contradiction: "MODERATE",
      assumption_burden: "MODERATE",
      generalization_risk: "LOW",
      downstream_impact: "MODERATE",
    },
    reasonCodes: ["SOURCE_QUALITY_UNCLEAR", "SOURCE_CONFLICT"],
    referencedItemIds: ["SOURCE-001", "SOURCE-002", "E-001", "C-004"],
    downstreamAcceptedIds: [],
    directToAcceptedConclusion: false,
    expected: {
      evaluationStatus: "COMPLETE",
      weakness: 3,
      impact: 2,
      priority: 6,
      state: "REVIEW",
    },
  },

  "TRIAGE-005": {
    id: "TRIAGE-005",
    itemId: "C-005",
    ratings: {
      evidence_strength: "MODERATE",
      source_quality: "HIGH",
      contradiction: "HIGH",
      assumption_burden: "LOW",
      generalization_risk: "LOW",
      downstream_impact: "HIGH",
    },
    reasonCodes: ["CONTRADICTED", "SOURCE_CONFLICT"],
    referencedItemIds: ["C-005", "E-001", "E-002", "CONCLUSION-001"],
    downstreamAcceptedIds: ["CONCLUSION-001"],
    directToAcceptedConclusion: true,
    expected: {
      evaluationStatus: "COMPLETE",
      weakness: 3,
      impact: 3,
      priority: 9,
      state: "CRITICAL",
    },
  },

  "TRIAGE-006": {
    id: "TRIAGE-006",
    itemId: "C-SIDE",
    ratings: {
      evidence_strength: "LOW",
      source_quality: "MODERATE",
      contradiction: "LOW",
      assumption_burden: "LOW",
      generalization_risk: "LOW",
      downstream_impact: "LOW",
    },
    reasonCodes: ["WEAK_SUPPORT"],
    referencedItemIds: ["C-SIDE"],
    downstreamAcceptedIds: [],
    directToAcceptedConclusion: false,
    expected: {
      evaluationStatus: "COMPLETE",
      weakness: 3,
      impact: 1,
      priority: 3,
      state: "REVIEW",
    },
  },

  "TRIAGE-007": {
    id: "TRIAGE-007",
    itemId: "C-STABLE",
    ratings: {
      evidence_strength: "HIGH",
      source_quality: "HIGH",
      contradiction: "LOW",
      assumption_burden: "LOW",
      generalization_risk: "LOW",
      downstream_impact: "HIGH",
    },
    reasonCodes: [],
    referencedItemIds: ["C-STABLE", "E-001", "E-002", "CONCLUSION-001"],
    downstreamAcceptedIds: ["CONCLUSION-001"],
    directToAcceptedConclusion: true,
    expected: {
      evaluationStatus: "COMPLETE",
      weakness: 0,
      impact: 3,
      priority: 0,
      state: "STABLE",
    },
  },

  "TRIAGE-008": {
    id: "TRIAGE-008",
    itemId: "C-UNKNOWN",
    ratings: {
      evidence_strength: "UNASSESSED",
      source_quality: "UNASSESSED",
      contradiction: "UNASSESSED",
      assumption_burden: "UNASSESSED",
      generalization_risk: "UNASSESSED",
      downstream_impact: "UNASSESSED",
    },
    reasonCodes: ["DEPENDENCY_ON_UNASSESSED_NODE"],
    referencedItemIds: ["C-UNKNOWN"],
    downstreamAcceptedIds: [],
    directToAcceptedConclusion: false,
    expected: {
      evaluationStatus: "UNASSESSED",
      weakness: null,
      impact: null,
      priority: null,
      state: "UNASSESSED",
    },
  },
};
