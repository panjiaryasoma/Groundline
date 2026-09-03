import {
  WorkspaceSchema,
  type KnowledgeItem,
  type Workspace,
} from "../domain/schema";
import { useWorkspaceStore } from "./workspaceStore";

export const P114_ADDABLE_KNOWLEDGE_TYPES = [
  "CLAIM",
  "COUNTERCLAIM",
  "ASSUMPTION",
  "EVIDENCE",
] as const;

export type P114AddableKnowledgeType =
  (typeof P114_ADDABLE_KNOWLEDGE_TYPES)[number];

export interface P114AddReasoningItemInput {
  type: P114AddableKnowledgeType;
  text: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function prefixForType(type: P114AddableKnowledgeType): string {
  switch (type) {
    case "CLAIM":
      return "C-USER";
    case "COUNTERCLAIM":
      return "CC-USER";
    case "ASSUMPTION":
      return "A-USER";
    case "EVIDENCE":
      return "E-USER";
  }
}

function nextUniqueId(
  prefix: string,
  existingIds: Set<string>,
): string {
  let number = 1;

  while (true) {
    const candidate = `${prefix}-${number
      .toString()
      .padStart(3, "0")}`;

    if (!existingIds.has(candidate)) {
      return candidate;
    }

    number += 1;
  }
}

function validateWorkspace(workspace: Workspace): Workspace {
  const parsed = WorkspaceSchema.safeParse(workspace);

  if (!parsed.success) {
    throw new Error(
      "P11.5 add reasoning item produced an invalid workspace.",
    );
  }

  return parsed.data;
}

export function isP114ReasoningItemUnlinked(
  workspace: Workspace,
  itemId: string,
): boolean {
  const item = workspace.items.find(
    (candidate) => candidate.id === itemId,
  );

  if (
    !item ||
    item.state !== "ACCEPTED" ||
    !item.tags?.includes("user-added")
  ) {
    return false;
  }

  return !workspace.relations.some(
    (relation) =>
      relation.from_id === itemId ||
      relation.to_id === itemId,
  );
}

export function getP114UnlinkedReasoningItemIds(
  workspace: Workspace,
): string[] {
  return workspace.items
    .filter((item) =>
      isP114ReasoningItemUnlinked(workspace, item.id),
    )
    .map((item) => item.id);
}

export function addP114ReasoningItem(
  input: P114AddReasoningItemInput,
): string {
  const state = useWorkspaceStore.getState();

  if (state.experienceMode !== "CUSTOM") {
    throw new Error(
      "P11.5 reasoning items may only be added in a custom workspace.",
    );
  }

  if (
    state.workspace.revisions.some(
      (revision) => revision.state === "PROPOSED",
    )
  ) {
    throw new Error(
      "Finish the current revision review before adding another reasoning item.",
    );
  }

  const text = input.text.trim();

  if (!text) {
    throw new Error("Reasoning item text is required.");
  }

  if (!P114_ADDABLE_KNOWLEDGE_TYPES.includes(input.type)) {
    throw new Error("Unsupported P11.5 knowledge type.");
  }

  const current = state.workspace;
  const existingIds = new Set([
    ...current.items.map((item) => item.id),
    ...current.relations.map((relation) => relation.id),
    ...current.audit_events.map((event) => event.event_id),
  ]);
  const itemId = nextUniqueId(
    prefixForType(input.type),
    existingIds,
  );
  existingIds.add(itemId);
  const auditEventId = nextUniqueId(
    "AUD-CREATE-USER",
    existingIds,
  );
  const timestamp = nowIso();

  const item: KnowledgeItem = {
    id: itemId,
    type: input.type,
    text,
    state: "ACCEPTED",
    created_at: timestamp,
    created_by: "HUMAN",
    updated_at: timestamp,
    tags: ["user-added", "unlinked"],
  };

  const next = structuredClone(current);
  next.items.push(item);

  // The human added accepted knowledge, but no semantic relation has been
  // asserted yet. Existing evaluation and triage therefore cannot remain
  // current. The next WebMCP review must inspect the expanded workspace and
  // propose/establish semantic structure explicitly rather than inheriting it.
  next.evaluations = [];
  next.triage_records = [];

  next.audit_events.push({
    event_id: auditEventId,
    event_type: "CREATE",
    timestamp,
    actor_type: "HUMAN",
    entity_ids: [itemId],
    metadata: {
      requested_action: "ADD_REASONING_ITEM",
      knowledge_type: input.type,
      connection_state: "UNLINKED",
      semantic_analysis_invalidated: true,
      semantic_inference_performed: false,
      p11_5_unlinked_reasoning: true,
    },
  });

  const validated = validateWorkspace(next);
  const currentRequest = state.ui.graphSelectionRequest;

  useWorkspaceStore.setState({
    workspace: validated,
    ui: {
      ...state.ui,
      selectedItemId: itemId,
      focusedItemIds: [],
      graphSelectionRequest: {
        itemId,
        version: (currentRequest?.version ?? 0) + 1,
      },
    },
  });

  return itemId;
}
