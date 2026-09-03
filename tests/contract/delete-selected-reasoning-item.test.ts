import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  deleteSelectedReasoningItem,
  getDeleteSelectedItemBlockReason,
} from "../../src/state/deleteReasoningItem";
import { useWorkspaceStore } from "../../src/state/workspaceStore";

const input = {
  question: "Should the team expand the pilot next quarter?",
  conclusion: "Yes, expand the pilot next quarter.",
  reason: "The initial pilot produced promising results.",
  assumption: "The initial conditions reflect the next phase.",
  evidence: "The pilot recorded five thousand interactions.",
  sourceUrl: "https://example.com/pilot",
};

describe("delete one selected reasoning item", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().createCustomWorkspace(input);
  });

  it("deletes only the selected item, removes its represented relations, clears review state, and records an auditable mutation", () => {
    const before = useWorkspaceStore.getState().workspace;
    const beforeIds = before.items.map((item) => item.id);

    useWorkspaceStore.getState().selectItem("C-USER-001");

    const deletedId = deleteSelectedReasoningItem();
    const state = useWorkspaceStore.getState();
    const afterIds = state.workspace.items.map((item) => item.id);

    expect(deletedId).toBe("C-USER-001");
    expect(afterIds).toEqual(
      beforeIds.filter((itemId) => itemId !== "C-USER-001"),
    );
    expect(
      state.workspace.relations.some(
        (relation) =>
          relation.from_id === "C-USER-001" ||
          relation.to_id === "C-USER-001",
      ),
    ).toBe(false);
    expect(state.workspace.evaluations).toEqual([]);
    expect(state.workspace.triage_records).toEqual([]);
    expect(state.ui.selectedItemId).toBeNull();
    expect(state.ui.focusedItemIds).toEqual([]);
    expect(state.ui.graphSelectionRequest?.itemId).toBeNull();

    const deleteEvent = [...state.workspace.audit_events]
      .reverse()
      .find(
        (event) =>
          event.metadata?.requested_action ===
          "DELETE_REASONING_ITEM",
      );

    expect(deleteEvent).toEqual(
      expect.objectContaining({
        event_type: "EDIT",
        actor_type: "HUMAN",
        entity_ids: ["C-USER-001"],
        metadata: expect.objectContaining({
          mutation: "DELETE",
          deleted_item_type: "CLAIM",
          deleted_item_text: input.reason,
          semantic_analysis_invalidated: true,
        }),
      }),
    );
  });

  it("protects the required question and current accepted conclusion anchors", () => {
    const workspace = useWorkspaceStore.getState().workspace;

    expect(
      getDeleteSelectedItemBlockReason(
        workspace,
        workspace.question_id,
      ),
    ).toMatch(/required anchor/i);
    expect(
      getDeleteSelectedItemBlockReason(
        workspace,
        workspace.accepted_conclusion_id,
      ),
    ).toMatch(/required anchor/i);

    useWorkspaceStore
      .getState()
      .selectItem(workspace.accepted_conclusion_id);

    expect(() => deleteSelectedReasoningItem()).toThrow(
      /required anchor/i,
    );
  });
});
