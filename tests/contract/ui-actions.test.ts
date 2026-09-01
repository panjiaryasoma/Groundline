import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspaceStore } from "../../src/state/workspaceStore";
import { integration001 } from "../../src/fixtures/integration001";

function resetStore() {
  useWorkspaceStore.setState({
    workspace: structuredClone(integration001),
    ui: {
      selectedItemId: null,
      focusedItemIds: [],
    },
  });
}

describe("P-06 workspace UI actions", () => {
  beforeEach(() => {
    resetStore();
  });

  it("runs the frozen seeded analysis through the domain engine", () => {
    useWorkspaceStore.getState().runSeededAnalysis();

    const state = useWorkspaceStore.getState();

    expect(state.workspace.triage_records).toHaveLength(4);
    expect(state.ui.selectedItemId).toBe("A-001");
  });

  it("focuses the critical dependency path in ephemeral UI state only", () => {
    useWorkspaceStore.getState().runSeededAnalysis();

    const knowledgeBefore = JSON.stringify(
      useWorkspaceStore.getState().workspace,
    );

    useWorkspaceStore.getState().focusPrimaryRisk();

    const state = useWorkspaceStore.getState();

    expect(state.ui.focusedItemIds).toEqual(
      expect.arrayContaining([
        "A-001",
        "C-001",
        "CONC-001",
      ]),
    );

    expect(JSON.stringify(state.workspace)).toBe(
      knowledgeBefore,
    );
  });

  it("creates an agent proposal without changing accepted conclusion", () => {
    useWorkspaceStore.getState().runSeededAnalysis();
    useWorkspaceStore.getState().proposeSeededRevision();

    const state = useWorkspaceStore.getState();

    expect(
      state.workspace.revisions.at(-1)?.state,
    ).toBe("PROPOSED");
    expect(
      state.workspace.revisions.at(-1)?.created_by,
    ).toBe("AGENT");
    expect(
      state.workspace.accepted_conclusion_id,
    ).toBe("CONC-001");
  });

  it("accepts a proposal only through the HUMAN UI action", () => {
    useWorkspaceStore.getState().runSeededAnalysis();
    useWorkspaceStore.getState().proposeSeededRevision();
    useWorkspaceStore.getState().acceptLatestRevision();

    const state = useWorkspaceStore.getState();

    expect(
      state.workspace.accepted_conclusion_id,
    ).not.toBe("CONC-001");

    expect(
      state.workspace.items.find(
        (item) => item.id === "CONC-001",
      )?.state,
    ).toBe("SUPERSEDED");

    expect(
      state.workspace.revisions.at(-1)?.reviewed_by,
    ).toBe("HUMAN");
  });

  it("reject keeps the accepted conclusion unchanged", () => {
    useWorkspaceStore.getState().runSeededAnalysis();
    useWorkspaceStore.getState().proposeSeededRevision();
    useWorkspaceStore.getState().rejectLatestRevision();

    const state = useWorkspaceStore.getState();

    expect(
      state.workspace.accepted_conclusion_id,
    ).toBe("CONC-001");
    expect(
      state.workspace.revisions.at(-1)?.state,
    ).toBe("REJECTED");
  });

  it("reset restores the original deterministic fixture", () => {
    useWorkspaceStore.getState().runSeededAnalysis();
    useWorkspaceStore.getState().proposeSeededRevision();
    useWorkspaceStore.getState().resetDemo();

    const state = useWorkspaceStore.getState();

    expect(state.workspace).toEqual(integration001);
    expect(state.ui.selectedItemId).toBeNull();
    expect(state.ui.focusedItemIds).toEqual([]);
  });
  it("does not create duplicate seeded proposals after a human review", () => {
    useWorkspaceStore.getState().runSeededAnalysis();
    useWorkspaceStore.getState().proposeSeededRevision();
    useWorkspaceStore.getState().acceptLatestRevision();

    const reviewed = useWorkspaceStore.getState().workspace;
    expect(reviewed.revisions).toHaveLength(1);

    useWorkspaceStore.getState().runSeededAnalysis();
    useWorkspaceStore.getState().proposeSeededRevision();

    const afterRetry = useWorkspaceStore.getState().workspace;

    expect(afterRetry.revisions).toHaveLength(1);
    expect(afterRetry.accepted_conclusion_id).not.toBe("CONC-001");
  });

  it("marks seeded analysis as stale after accepted conclusion changes", async () => {
    const {
      isSeededAnalysisFresh,
      isSeededDemoCycleComplete,
    } = await import("../../src/state/workspaceStore");

    useWorkspaceStore.getState().runSeededAnalysis();

    expect(
      isSeededAnalysisFresh(
        useWorkspaceStore.getState().workspace,
      ),
    ).toBe(true);

    useWorkspaceStore.getState().proposeSeededRevision();
    useWorkspaceStore.getState().acceptLatestRevision();

    const workspace = useWorkspaceStore.getState().workspace;

    expect(isSeededAnalysisFresh(workspace)).toBe(false);
    expect(isSeededDemoCycleComplete(workspace)).toBe(true);
  });

});
