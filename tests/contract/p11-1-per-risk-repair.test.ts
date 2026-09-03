import { beforeEach, describe, expect, it } from "vitest";

import {
  getP111SeededNextTarget,
  installP111RepairLifecycle,
  isP111AnalysisFresh,
  isP111SeededCycleComplete,
} from "../../src/state/p111RepairLifecycle";
import { useWorkspaceStore } from "../../src/state/workspaceStore";

installP111RepairLifecycle();

function latestRevision() {
  const revisions = useWorkspaceStore.getState().workspace.revisions;
  return revisions[revisions.length - 1];
}

function runFreshPass() {
  useWorkspaceStore.getState().runSeededAnalysis();
  expect(
    isP111AnalysisFresh(useWorkspaceStore.getState().workspace),
  ).toBe(true);
}

function proposeCurrentRisk() {
  useWorkspaceStore.getState().focusPrimaryRisk();
  useWorkspaceStore.getState().proposeSeededRevision();
  return latestRevision();
}

describe("P11.1 per-risk repair lifecycle", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().startDemo();
  });

  it("repairs A-001 itself instead of redirecting the first repair to CONC-001", () => {
    runFreshPass();

    expect(
      getP111SeededNextTarget(useWorkspaceStore.getState().workspace),
    ).toBe("A-001");

    const proposal = proposeCurrentRisk();

    expect(proposal?.target_item_id).toBe("A-001");
    expect(proposal?.state).toBe("PROPOSED");
    expect(useWorkspaceStore.getState().workspace.accepted_conclusion_id).toBe(
      "CONC-001",
    );
  });

  it("accepting a risk repair creates same-type lineage and invalidates downstream analysis without semantic rewiring", () => {
    runFreshPass();
    const proposal = proposeCurrentRisk();
    expect(proposal?.target_item_id).toBe("A-001");

    useWorkspaceStore.getState().acceptLatestRevision();

    const workspace = useWorkspaceStore.getState().workspace;
    const oldAssumption = workspace.items.find((item) => item.id === "A-001");
    const replacement = workspace.items.find(
      (item) => item.supersedes_id === "A-001" && item.state === "ACCEPTED",
    );

    expect(oldAssumption?.state).toBe("SUPERSEDED");
    expect(replacement?.type).toBe("ASSUMPTION");
    expect(workspace.accepted_conclusion_id).toBe("CONC-001");
    expect(isP111AnalysisFresh(workspace)).toBe(false);

    expect(
      workspace.triage_records.some((record) => record.item_id === "C-001"),
    ).toBe(false);
    expect(
      workspace.triage_records.some((record) => record.item_id === "CONC-001"),
    ).toBe(false);

    const replacementRelations = workspace.relations.filter(
      (relation) =>
        relation.from_id === replacement?.id ||
        relation.to_id === replacement?.id,
    );

    expect(replacementRelations).toHaveLength(1);
    expect(replacementRelations[0]?.type).toBe("SUPERSEDES");
  });

  it("requires a fresh pass before advancing from A-001 to C-001 and then CONC-001", () => {
    runFreshPass();
    proposeCurrentRisk();
    useWorkspaceStore.getState().acceptLatestRevision();

    expect(
      getP111SeededNextTarget(useWorkspaceStore.getState().workspace),
    ).toBeNull();

    runFreshPass();
    expect(
      getP111SeededNextTarget(useWorkspaceStore.getState().workspace),
    ).toBe("C-001");

    const claimProposal = proposeCurrentRisk();
    expect(claimProposal?.target_item_id).toBe("C-001");
    useWorkspaceStore.getState().acceptLatestRevision();

    expect(
      getP111SeededNextTarget(useWorkspaceStore.getState().workspace),
    ).toBeNull();

    runFreshPass();
    expect(
      getP111SeededNextTarget(useWorkspaceStore.getState().workspace),
    ).toBe("CONC-001");
  });

  it("completes the seeded walkthrough only after all three original critical items receive review outcomes", () => {
    runFreshPass();
    proposeCurrentRisk();
    useWorkspaceStore.getState().acceptLatestRevision();
    expect(isP111SeededCycleComplete(useWorkspaceStore.getState().workspace)).toBe(false);

    runFreshPass();
    proposeCurrentRisk();
    useWorkspaceStore.getState().acceptLatestRevision();
    expect(isP111SeededCycleComplete(useWorkspaceStore.getState().workspace)).toBe(false);

    runFreshPass();
    const conclusionProposal = proposeCurrentRisk();
    expect(conclusionProposal?.target_item_id).toBe("CONC-001");
    useWorkspaceStore.getState().acceptLatestRevision();

    const workspace = useWorkspaceStore.getState().workspace;
    expect(isP111SeededCycleComplete(workspace)).toBe(true);
    expect(workspace.accepted_conclusion_id).not.toBe("CONC-001");

    const acceptedConclusion = workspace.items.find(
      (item) => item.id === workspace.accepted_conclusion_id,
    );
    expect(acceptedConclusion?.type).toBe("CONCLUSION");
    expect(acceptedConclusion?.supersedes_id).toBe("CONC-001");
  });
});
