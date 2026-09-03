import type {
  Relation,
  Workspace,
} from "../domain/schema";
import { WorkspaceSchema } from "../domain/schema";
import { buildSemanticReviewToken } from "../webmcp/semanticReviewContract";
import { getP114UnlinkedReasoningItemIds } from "./p114AddReasoningItem";
import {
  type P117ConnectionProposal,
} from "./p117AgentReview";
import { useWorkspaceStore } from "./workspaceStore";

const ALLOWED_TYPES = new Set<Relation["type"]>([
  "SUPPORTS",
  "CHALLENGES",
  "DEPENDS_ON",
  "QUALIFIES",
]);

function nowIso(): string {
  return new Date().toISOString();
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

function relationKey(
  relation: Pick<Relation, "from_id" | "to_id" | "type">,
): string {
  return `${relation.from_id}|${relation.type}|${relation.to_id}`;
}

function validateWorkspace(workspace: Workspace): Workspace {
  const parsed = WorkspaceSchema.safeParse(workspace);

  if (!parsed.success) {
    throw new Error(
      "P11.7 relation approval produced an invalid workspace.",
    );
  }

  return parsed.data;
}

export function applyP117ApprovedRelations(
  proposals: P117ConnectionProposal[],
  expectedReviewToken: string,
): string[] {
  const state = useWorkspaceStore.getState();

  if (state.experienceMode !== "CUSTOM") {
    throw new Error(
      "P11.7 relation proposals may only be accepted in a custom workspace.",
    );
  }

  if (
    state.workspace.revisions.some(
      (revision) => revision.state === "PROPOSED",
    )
  ) {
    throw new Error(
      "Finish the current revision review before accepting semantic connections.",
    );
  }

  if (!expectedReviewToken.trim()) {
    throw new Error(
      "Semantic connection proposals are missing the review token that produced them. Run analysis again.",
    );
  }

  const current = state.workspace;
  const currentToken = buildSemanticReviewToken(current);

  if (currentToken !== expectedReviewToken) {
    throw new Error(
      "The reasoning changed after these semantic connections were proposed. Run analysis again before accepting connections.",
    );
  }

  if (proposals.length === 0) {
    return [];
  }

  const acceptedIds = new Set(
    current.items
      .filter((item) => item.state === "ACCEPTED")
      .map((item) => item.id),
  );
  const currentlyUnlinked = new Set(
    getP114UnlinkedReasoningItemIds(current),
  );
  const existingRelationKeys = new Set(
    current.relations.map(relationKey),
  );
  const ids = new Set([
    ...current.items.map((item) => item.id),
    ...current.relations.map((relation) => relation.id),
    ...current.audit_events.map((event) => event.event_id),
  ]);
  const timestamp = nowIso();
  const created: Relation[] = [];
  const seen = new Set<string>();

  for (const proposal of proposals) {
    if (
      !acceptedIds.has(proposal.from_id) ||
      !acceptedIds.has(proposal.to_id)
    ) {
      throw new Error(
        "A proposed connection references knowledge that is not currently ACCEPTED.",
      );
    }

    if (proposal.from_id === proposal.to_id) {
      throw new Error("Self-relations are not allowed.");
    }

    if (!ALLOWED_TYPES.has(proposal.type)) {
      throw new Error(
        `Relation type "${proposal.type}" cannot be accepted from a P11.7 semantic proposal.`,
      );
    }

    if (
      !currentlyUnlinked.has(proposal.from_id) &&
      !currentlyUnlinked.has(proposal.to_id)
    ) {
      throw new Error(
        "A P11.7 semantic connection must involve at least one currently UNLINKED human-authored card.",
      );
    }

    const key = relationKey(proposal);
    if (
      existingRelationKeys.has(key) ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);
    const relationId = nextUniqueId("R-USER", ids);
    ids.add(relationId);

    created.push({
      id: relationId,
      from_id: proposal.from_id,
      to_id: proposal.to_id,
      type: proposal.type,
      created_at: timestamp,
      created_by: "HUMAN",
    });
  }

  if (created.length === 0) {
    return [];
  }

  const next = structuredClone(current);
  next.relations.push(...created);

  const linkedIds = new Set(
    created.flatMap((relation) => [
      relation.from_id,
      relation.to_id,
    ]),
  );

  next.items = next.items.map((item) => {
    if (
      !linkedIds.has(item.id) ||
      !item.tags?.includes("user-added")
    ) {
      return item;
    }

    const stillUnlinked = !next.relations.some(
      (relation) =>
        relation.from_id === item.id ||
        relation.to_id === item.id,
    );

    return {
      ...item,
      tags: (item.tags ?? []).filter(
        (tag) => tag !== "unlinked" || stillUnlinked,
      ),
      updated_at: timestamp,
    };
  });

  next.evaluations = [];
  next.triage_records = [];

  const auditId = nextUniqueId("AUD-CREATE-REL-USER", ids);
  next.audit_events.push({
    event_id: auditId,
    event_type: "CREATE",
    timestamp,
    actor_type: "HUMAN",
    entity_ids: created.map((relation) => relation.id),
    metadata: {
      requested_action: "ACCEPT_AGENT_RELATION_PROPOSALS",
      proposal_source: "WEBMCP_AGENT",
      proposal_review_token: expectedReviewToken,
      human_approved: true,
      relation_count: created.length,
      semantic_analysis_invalidated: true,
      semantic_relations_inherited: false,
      p11_7_relation_review: true,
    },
  });

  const validated = validateWorkspace(next);
  const firstNewlyLinkedItem = created
    .flatMap((relation) => [relation.from_id, relation.to_id])
    .find((itemId) => currentlyUnlinked.has(itemId)) ??
    created[0]?.from_id ??
    null;
  const ui = state.ui;

  useWorkspaceStore.setState({
    workspace: validated,
    ui: {
      ...ui,
      selectedItemId: firstNewlyLinkedItem,
      focusedItemIds: [],
      graphSelectionRequest: {
        itemId: firstNewlyLinkedItem,
        version: (ui.graphSelectionRequest?.version ?? 0) + 1,
      },
    },
  });

  return created.map((relation) => relation.id);
}
