import {
  WorkspaceSchema,
  type Workspace,
} from "../domain/schema";
import { useWorkspaceStore } from "./workspaceStore";

function nowIso(): string {
  return new Date().toISOString();
}

function nextUniqueAuditId(workspace: Workspace): string {
  const existing = new Set(
    workspace.audit_events.map((event) => event.event_id),
  );
  let number = workspace.audit_events.length + 1;

  while (true) {
    const candidate = `AUD-DELETE-USER-${number
      .toString()
      .padStart(3, "0")}`;

    if (!existing.has(candidate)) {
      return candidate;
    }

    number += 1;
  }
}

function validateWorkspace(workspace: Workspace): Workspace {
  const parsed = WorkspaceSchema.safeParse(workspace);

  if (!parsed.success) {
    throw new Error(
      "Deleting the selected reasoning item produced an invalid workspace.",
    );
  }

  return parsed.data;
}

export function getDeleteSelectedItemBlockReason(
  workspace: Workspace,
  itemId: string | null,
): string | null {
  if (!itemId) {
    return "Select exactly one reasoning item first.";
  }

  if (
    workspace.revisions.some(
      (revision) => revision.state === "PROPOSED",
    )
  ) {
    return "Finish the pending revision decision before deleting a reasoning item.";
  }

  const item = workspace.items.find(
    (candidate) => candidate.id === itemId,
  );

  if (!item) {
    return "The selected reasoning item no longer exists.";
  }

  if (itemId === workspace.question_id) {
    return "The workspace question is a required anchor. Edit the inputs instead of deleting it.";
  }

  if (itemId === workspace.accepted_conclusion_id) {
    return "The current accepted conclusion is a required anchor. Revise it instead of deleting it.";
  }

  if (item.state === "SUPERSEDED") {
    return "Superseded cards are preserved as decision history and cannot be deleted.";
  }

  return null;
}

export function deleteSelectedReasoningItem(): string | null {
  const state = useWorkspaceStore.getState();

  if (state.experienceMode !== "CUSTOM") {
    throw new Error(
      "Reasoning items may only be deleted from a custom workspace.",
    );
  }

  const itemId = state.ui.selectedItemId;
  const blockReason = getDeleteSelectedItemBlockReason(
    state.workspace,
    itemId,
  );

  if (blockReason) {
    throw new Error(blockReason);
  }

  if (!itemId) return null;

  const current = state.workspace;
  const item = current.items.find(
    (candidate) => candidate.id === itemId,
  );

  if (!item) return null;

  const removedRelationIds = current.relations
    .filter(
      (relation) =>
        relation.from_id === itemId || relation.to_id === itemId,
    )
    .map((relation) => relation.id);
  const timestamp = nowIso();
  const next = structuredClone(current);

  next.items = next.items.filter(
    (candidate) => candidate.id !== itemId,
  );
  next.relations = next.relations.filter(
    (relation) =>
      relation.from_id !== itemId && relation.to_id !== itemId,
  );

  // Removing accepted reasoning changes the semantic object being reviewed.
  // Existing evaluations and triage therefore become stale immediately.
  next.evaluations = [];
  next.triage_records = [];

  next.audit_events.push({
    event_id: nextUniqueAuditId(next),
    event_type: "EDIT",
    timestamp,
    actor_type: "HUMAN",
    entity_ids: [itemId],
    metadata: {
      requested_action: "DELETE_REASONING_ITEM",
      mutation: "DELETE",
      deleted_item_type: item.type,
      deleted_item_text: item.text,
      deleted_item_state: item.state,
      removed_relation_ids: removedRelationIds,
      semantic_analysis_invalidated: true,
    },
  });

  const validated = validateWorkspace(next);
  const currentRequest = state.ui.graphSelectionRequest;

  useWorkspaceStore.setState({
    workspace: validated,
    ui: {
      ...state.ui,
      selectedItemId: null,
      focusedItemIds: [],
      graphSelectionRequest: {
        itemId: null,
        version: (currentRequest?.version ?? 0) + 1,
      },
    },
  });

  return itemId;
}
