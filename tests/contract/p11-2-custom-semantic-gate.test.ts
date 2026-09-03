import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  buildEvaluationRecord,
  type ReasonCode,
} from "../../src/domain/evaluation";
import { installP111RepairLifecycle } from "../../src/state/p111RepairLifecycle";
import {
  getP112CustomNextTarget,
  getP112CustomStructuralReviewTarget,
  installP112CustomSemanticGate,
  isP112CustomSemanticAnalysisFresh,
  isP112CustomStructuralFallbackAllowed,
} from "../../src/state/p112CustomSemanticGate";
import { useWorkspaceStore } from "../../src/state/workspaceStore";

const input = {
  question:
    "Should our team fully replace tier-1 support with an autonomous agent?",
  conclusion:
    "Yes, replace tier-1 support next quarter.",
  reason:
    "The pilot resolved most common tickets quickly.",
  assumption:
    "The pilot reflects production edge cases.",
  evidence:
    "A 30-day pilot covered 5,000 interactions.",
};

function evaluation(
  itemId: string,
  reasonCodes: ReasonCode[],
) {
  return buildEvaluationRecord({
    evaluationId: `EVAL-P112-${itemId}`,
    itemId,
    ratings: {
      evidence_strength: "LOW",
      source_quality: "MODERATE",
      contradiction: "MODERATE",
      assumption_burden: "HIGH",
      generalization_risk: "HIGH",
      downstream_impact: "HIGH",
    },
    reasonCodes,
    referencedItemIds: [itemId],
    generatedBy: "AGENT",
    createdAt: "2026-09-03T00:00:00+07:00",
  });
}

describe("P11.2 custom semantic gate with P08.8 interaction parity", () => {
  beforeAll(() => {
    installP111RepairLifecycle();
    installP112CustomSemanticGate();
  });

  beforeEach(() => {
    useWorkspaceStore
      .getState()
      .createCustomWorkspace(input);
  });

  it("allows a deterministic structural first pass without fabricating semantic triage", () => {
    const before =
      useWorkspaceStore.getState().workspace;

    expect(before.triage_records).toHaveLength(0);
    expect(
      isP112CustomSemanticAnalysisFresh(before),
    ).toBe(false);
    expect(
      isP112CustomStructuralFallbackAllowed(before),
    ).toBe(true);

    const focus =
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk();

    expect(focus).toEqual(
      expect.objectContaining({
        basis: "STRUCTURAL_FALLBACK",
      }),
    );

    const focusedWorkspace =
      useWorkspaceStore.getState().workspace;

    expect(focusedWorkspace.triage_records).toHaveLength(0);
    expect(
      getP112CustomStructuralReviewTarget(
        focusedWorkspace,
      ),
    ).toBe(focus?.targetId);

    const repair =
      useWorkspaceStore
        .getState()
        .proposeCustomRepair();

    expect(repair?.targetId).toBe(focus?.targetId);

    const after =
      useWorkspaceStore.getState().workspace;
    const proposal = after.revisions.at(-1);

    expect(after.triage_records).toHaveLength(0);
    expect(proposal).toEqual(
      expect.objectContaining({
        state: "PROPOSED",
        target_item_id: focus?.targetId,
        reason_codes: ["STRUCTURAL_REVIEW_TARGET"],
      }),
    );

    const proposalEvent = [...after.audit_events]
      .reverse()
      .find(
        (event) =>
          event.event_type === "PROPOSE_REVISION",
      );

    expect(
      proposalEvent?.metadata?.proposal_source,
    ).toBe("LOCAL_DETERMINISTIC_PER_RISK_REPAIR");
  });

  it("uses fresh semantic CRITICAL or REVIEW triage instead of the structural fallback when agent results exist", () => {
    useWorkspaceStore
      .getState()
      .applyAgentEvaluations([
        evaluation(
          "C-USER-001",
          ["OVERGENERALIZATION"],
        ),
        evaluation(
          "CONC-USER-001",
          ["DEPENDENCY_ON_UNASSESSED_NODE"],
        ),
      ]);

    const analyzed =
      useWorkspaceStore.getState().workspace;

    expect(
      isP112CustomSemanticAnalysisFresh(analyzed),
    ).toBe(true);
    expect(
      isP112CustomStructuralFallbackAllowed(analyzed),
    ).toBe(false);
    expect(
      getP112CustomNextTarget(analyzed),
    ).toBe("C-USER-001");

    const focus =
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk();

    expect(focus).toEqual(
      expect.objectContaining({
        targetId: "C-USER-001",
        basis: "SEMANTIC_TRIAGE",
      }),
    );

    const repair =
      useWorkspaceStore
        .getState()
        .proposeCustomRepair();

    expect(repair?.targetId).toBe("C-USER-001");

    const proposal =
      useWorkspaceStore
        .getState()
        .workspace.revisions.at(-1);

    expect(proposal).toEqual(
      expect.objectContaining({
        state: "PROPOSED",
        target_item_id: "C-USER-001",
      }),
    );
  });

  it("allows Run analysis to start a fresh structural cycle after an accepted repair invalidates old triage", () => {
    useWorkspaceStore
      .getState()
      .focusCustomPrimaryRisk();
    useWorkspaceStore
      .getState()
      .proposeCustomRepair();
    useWorkspaceStore
      .getState()
      .acceptLatestRevision();

    const afterAcceptance =
      useWorkspaceStore.getState().workspace;
    const replacementId =
      afterAcceptance.accepted_conclusion_id;

    expect(
      isP112CustomSemanticAnalysisFresh(
        afterAcceptance,
      ),
    ).toBe(false);
    expect(afterAcceptance.triage_records).toEqual([]);
    expect(
      isP112CustomStructuralFallbackAllowed(
        afterAcceptance,
      ),
    ).toBe(true);

    const next =
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk();

    expect(next).toEqual(
      expect.objectContaining({
        targetId: replacementId,
        basis: "STRUCTURAL_FALLBACK",
      }),
    );
    expect(
      getP112CustomStructuralReviewTarget(
        useWorkspaceStore.getState().workspace,
      ),
    ).toBe(replacementId);
  });

  it("continues through semantic triage after a fresh agent pass", () => {
    useWorkspaceStore
      .getState()
      .focusCustomPrimaryRisk();
    useWorkspaceStore
      .getState()
      .proposeCustomRepair();
    useWorkspaceStore
      .getState()
      .acceptLatestRevision();

    useWorkspaceStore
      .getState()
      .applyAgentEvaluations([
        evaluation(
          "C-USER-001",
          ["OVERGENERALIZATION"],
        ),
        evaluation(
          "CONC-USER-001",
          ["DEPENDENCY_ON_UNASSESSED_NODE"],
        ),
      ]);

    const refreshed =
      useWorkspaceStore.getState().workspace;

    expect(
      isP112CustomSemanticAnalysisFresh(refreshed),
    ).toBe(true);

    const next =
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk();

    expect(next?.basis).toBe("SEMANTIC_TRIAGE");
    expect(next?.targetId).toBe("C-USER-001");
  });
});
