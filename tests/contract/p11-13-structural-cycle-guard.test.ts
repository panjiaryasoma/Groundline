import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { installP111RepairLifecycle } from "../../src/state/p111RepairLifecycle";
import { installP112CustomSemanticGate } from "../../src/state/p112CustomSemanticGate";
import {
  getP113NextStructuralTarget,
  hasP113StructuralCycleCandidate,
  installP113StructuralCycleGuard,
} from "../../src/state/p113StructuralCycleGuard";
import { addP114ReasoningItem } from "../../src/state/p114AddReasoningItem";
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
  source: "Internal pilot report",
};

describe("P11 structural review lineage cycle guard", () => {
  beforeAll(() => {
    installP111RepairLifecycle();
    installP112CustomSemanticGate();
    installP113StructuralCycleGuard();
  });

  beforeEach(() => {
    useWorkspaceStore.getState().createCustomWorkspace(input);
  });

  it("moves re-analysis to another unresolved UNLINKED card instead of repairing the accepted replacement again", () => {
    const counterclaimId = addP114ReasoningItem({
      type: "COUNTERCLAIM",
      text: "Complex escalations still require human judgment.",
    });
    const evidenceId = addP114ReasoningItem({
      type: "EVIDENCE",
      text: "Escalated cases had substantially lower autonomous resolution rates.",
    });

    const first =
      useWorkspaceStore.getState().focusCustomPrimaryRisk();

    expect(first?.basis).toBe("STRUCTURAL_FALLBACK");
    expect(first?.targetId).toBeTruthy();

    const firstTargetId = first!.targetId;

    useWorkspaceStore.getState().proposeCustomRepair();
    useWorkspaceStore.getState().acceptLatestRevision();

    const afterFirstAcceptance =
      useWorkspaceStore.getState().workspace;
    const firstReplacement = afterFirstAcceptance.items.find(
      (item) => item.supersedes_id === firstTargetId && item.state === "ACCEPTED",
    );

    expect(firstReplacement).toBeDefined();
    expect(hasP113StructuralCycleCandidate(afterFirstAcceptance)).toBe(true);
    expect(getP113NextStructuralTarget(afterFirstAcceptance)).toBe(counterclaimId);

    const second =
      useWorkspaceStore.getState().focusCustomPrimaryRisk();

    expect(second).toEqual(
      expect.objectContaining({
        targetId: counterclaimId,
        basis: "STRUCTURAL_FALLBACK",
      }),
    );
    expect(second?.targetId).not.toBe(firstReplacement?.id);

    useWorkspaceStore.getState().proposeCustomRepair();
    useWorkspaceStore.getState().acceptLatestRevision();

    expect(getP113NextStructuralTarget(
      useWorkspaceStore.getState().workspace,
    )).toBe(evidenceId);

    const third =
      useWorkspaceStore.getState().focusCustomPrimaryRisk();

    expect(third?.targetId).toBe(evidenceId);
  });

  it("stops the local structural cycle once no unresolved UNLINKED card remains", () => {
    useWorkspaceStore.getState().focusCustomPrimaryRisk();
    useWorkspaceStore.getState().proposeCustomRepair();
    useWorkspaceStore.getState().acceptLatestRevision();

    const workspace = useWorkspaceStore.getState().workspace;

    expect(getP113NextStructuralTarget(workspace)).toBeNull();
    expect(hasP113StructuralCycleCandidate(workspace)).toBe(false);
    expect(
      useWorkspaceStore.getState().focusCustomPrimaryRisk(),
    ).toBeNull();
  });
});
