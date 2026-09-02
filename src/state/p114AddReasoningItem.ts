import {
  WorkspaceSchema,
  type KnowledgeItem,
  type Relation,
  type Workspace,
} from "../domain/schema";
import { useWorkspaceStore } from "./workspaceStore";

export const P114_ADDABLE_KNOWLEDGE_TYPES = [
  "CLAIM",
  "COUNTERCLAIM",
  "ASSUMPTION",
  "EVIDENCE",
] as const;

export const P114_ADDABLE_RELATION_TYPES = [
  "SUPPORTS",
  "CHALLENGES",
  "DEPENDS_ON",
  "QUALIFIES",
] as const;

export type P114AddableKnowledgeType =
  (typeof P114_ADDABLE_KNOWLEDGE_TYPES)[number];

export type P114AddableRelationType =
  (typeof P114_ADDABLE_RELATION_TYPES)[number];

export interface P114AddReasoningItemInput {
  type: P114AddableKnowledgeType;
  text: string;
  relationType: P114AddableRelationType;
  targetItemId: string;
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
      "P11.4 add reasoning item produced an invalid workspace.",
    );
  }

  return parsed.data;
}

export function addP114ReasoningItem(
  input: P114AddReasoningItemInput,
): string {
  const state = useWorkspaceStore.getState();

  if (state.experienceMode !== "CUSTOM") {
    throw new Error(
      "P11.4 reasoning items may only be added in a custom workspace.",
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
    throw new Error("Unsupported P11.4 knowledge type.");
  }

  if (!P114_ADDABLE_RELATION_TYPES.includes(input.relationType)) {
    throw new Error("Unsupported P11.4 relation type.");
  }

  const current = state.workspace;
  const target = current.items.find(
    (item) =>
      item.id === input.targetItemId &&
      item.state === "ACCEPTED",
  );

  if (!target) {
    throw new Error(
      `Connection target "${input.targetItemId}" is not an ACCEPTED knowledge item.`,
    );
  }

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
  const relationId = nextUniqueId("R-USER", existingIds);
  existingIds.add(relationId);
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
    tags: ["user-added"],
  };

  const relation: Relation = {
    id: relationId,
    from_id: itemId,
    to_id: target.id,
    type: input.relationType,
    created_at: timestamp,
    created_by: "HUMAN",
  };

  const next = structuredClone(current);
  next.items.push(item);
  next.relations.push(relation);

  // Human accepted knowledge changed. Existing semantic evaluation and triage
  // are no longer current for the workspace, so the next agent pass must
  // evaluate the new structure instead of inheriting stale risk labels.
  next.evaluations = [];
  next.triage_records = [];

  next.audit_events.push({
    event_id: auditEventId,
    event_type: "CREATE",
    timestamp,
    actor_type: "HUMAN",
    entity_ids: [itemId, relationId],
    metadata: {
      requested_action: "ADD_REASONING_ITEM",
      target_item_id: target.id,
      relation_type: input.relationType,
      knowledge_type: input.type,
      semantic_analysis_invalidated: true,
      semantic_inference_performed: false,
      p11_4_add_reasoning_item: true,
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
