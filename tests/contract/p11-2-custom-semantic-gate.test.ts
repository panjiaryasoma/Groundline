import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { buildEvaluationRecord } from "../../src/domain/evaluation";
import { installP111RepairLifecycle } from "../../src/state/p111RepairLifecycle";
import {
  getP112CustomNextTarget,
  installP112CustomSemanticGate,
  isP112CustomSemanticAnalysisFresh,
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
  reasonCodes: string[],
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

describe("P11.2 custom semantic gate", () => {
  beforeAll(() => {
    installP111RepairLifecycle();
    installP112CustomSemanticGate();
  });

  beforeEach(() => {
    useWorkspaceStore
      .getState()
      .createCustomWorkspace(input);
  });

  it("does not invent a primary risk or repair from structural readiness alone", () => {
    const before =
      useWorkspaceStore.getState().workspace;

    expect(before.triage_records).toHaveLength(0);
    expect(
      isP112CustomSemanticAnalysisFresh(before),
    ).toBe(false);
    expect(
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk(),
    ).toBeNull();
    expect(
      useWorkspaceStore
        .getState()
        .proposeCustomRepair(),
    ).toBeNull();

    const after =
      useWorkspaceStore.getState().workspace;

    expect(after.revisions).toHaveLength(0);
    expect(
      after.audit_events.filter(
        (event) => event.event_type === "FOCUS",
      ),
    ).toHaveLength(0);
  });

  it("focuses and repairs only a CRITICAL or REVIEW item from fresh agent triage", () => {
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
      getP112CustomNextTarget(analyzed),
    ).toBe("C-USER-001");

    const focus =
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk();

    expect(focus?.targetId).toBe("C-USER-001");

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

  it("blocks another focus or repair after acceptance until fresh semantic triage arrives", () => {
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
    const revisionCount =
      afterAcceptance.revisions.length;

    expect(
      isP112CustomSemanticAnalysisFresh(
        afterAcceptance,
      ),
    ).toBe(false);
    expect(
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk(),
    ).toBeNull();
    expect(
      useWorkspaceStore
        .getState()
        .proposeCustomRepair(),
    ).toBeNull();
    expect(
      useWorkspaceStore
        .getState()
        .workspace.revisions,
    ).toHaveLength(revisionCount);
  });

  it("moves to another unresolved item only after a new semantic triage pass", () => {
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
          "CONC-USER-001",
          ["OVERGENERALIZATION"],
        ),
      ]);

    expect(
      isP112CustomSemanticAnalysisFresh(
        useWorkspaceStore.getState().workspace,
      ),
    ).toBe(true);

    const next =
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk();

    expect(next?.targetId).toBe("CONC-USER-001");
  });
});
