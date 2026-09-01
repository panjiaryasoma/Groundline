import { GroundlineError } from "./errors";
import {
  RevisionSchema,
  WorkspaceSchema,
  type ActorTypeSchema,
  type KnowledgeItem,
  type Revision,
  type Workspace,
} from "./schema";
import type { z } from "zod";

type ActorType = z.infer<typeof ActorTypeSchema>;

export interface ProposeRevisionInput {
  workspace: Workspace;
  revisionId: string;
  targetItemId: string;
  proposedText: string;
  reasonCodes: string[];
  affectedItemIds: string[];
  createdBy: "AGENT" | "HUMAN";
  createdAt: string;
  auditEventId: string;
}

export interface ReviewRevisionBaseInput {
  workspace: Workspace;
  revisionId: string;
  actor: ActorType;
  reviewedAt: string;
  auditEventId: string;
}

export interface AcceptRevisionInput extends ReviewRevisionBaseInput {
  acceptedItemId: string;
}

export interface EditAndAcceptRevisionInput extends ReviewRevisionBaseInput {
  acceptedItemId: string;
  editedText: string;
}

function cloneWorkspace(workspace: Workspace): Workspace {
  return structuredClone(workspace);
}

function getRevision(workspace: Workspace, revisionId: string): Revision {
  const revision = workspace.revisions.find(
    (candidate) => candidate.revision_id === revisionId,
  );

  if (!revision) {
    throw new GroundlineError(
      "NOT_FOUND",
      `Revision "${revisionId}" was not found.`,
      { revision_id: revisionId },
    );
  }

  return revision;
}

function getKnowledgeItem(
  workspace: Workspace,
  itemId: string,
): KnowledgeItem {
  const item = workspace.items.find((candidate) => candidate.id === itemId);

  if (!item) {
    throw new GroundlineError(
      "NOT_FOUND",
      `Knowledge item "${itemId}" was not found.`,
      { item_id: itemId },
    );
  }

  return item;
}

function assertHuman(actor: ActorType): void {
  if (actor !== "HUMAN") {
    throw new GroundlineError(
      "HUMAN_APPROVAL_REQUIRED",
      "Only an explicit HUMAN action may review a proposed revision.",
      { actor },
    );
  }
}

function assertProposed(revision: Revision): void {
  if (revision.state !== "PROPOSED") {
    throw new GroundlineError(
      "INVALID_INPUT",
      `Revision "${revision.revision_id}" is not in PROPOSED state.`,
      {
        revision_id: revision.revision_id,
        current_state: revision.state,
      },
    );
  }
}

function assertUniqueItemId(
  workspace: Workspace,
  acceptedItemId: string,
): void {
  if (workspace.items.some((item) => item.id === acceptedItemId)) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `Knowledge item ID "${acceptedItemId}" already exists.`,
      { accepted_item_id: acceptedItemId },
    );
  }
}

function validateWorkspace(workspace: Workspace): Workspace {
  const parsed = WorkspaceSchema.safeParse(workspace);

  if (!parsed.success) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Workspace violates the active schema after revision transition.",
      { issues: parsed.error.issues },
    );
  }

  return parsed.data;
}

export function proposeRevision(
  input: ProposeRevisionInput,
): Workspace {
  const next = cloneWorkspace(input.workspace);
  const target = getKnowledgeItem(next, input.targetItemId);

  if (target.state !== "ACCEPTED") {
    throw new GroundlineError(
      "INVALID_INPUT",
      "P-04 revision proposals target ACCEPTED knowledge only.",
      {
        target_item_id: target.id,
        target_state: target.state,
      },
    );
  }

  if (
    next.revisions.some(
      (revision) => revision.revision_id === input.revisionId,
    )
  ) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `Revision ID "${input.revisionId}" already exists.`,
      { revision_id: input.revisionId },
    );
  }

  const revision: Revision = {
    revision_id: input.revisionId,
    target_item_id: input.targetItemId,
    proposed_text: input.proposedText,
    state: "PROPOSED",
    reason_codes: [...new Set(input.reasonCodes)],
    affected_item_ids: [...new Set(input.affectedItemIds)],
    created_by: input.createdBy,
    created_at: input.createdAt,
    reviewed_by: null,
    reviewed_at: null,
  };

  const parsedRevision = RevisionSchema.safeParse(revision);

  if (!parsedRevision.success) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Revision proposal violates the active schema.",
      { issues: parsedRevision.error.issues },
    );
  }

  next.revisions.push(parsedRevision.data);
  next.audit_events.push({
    event_id: input.auditEventId,
    event_type: "PROPOSE_REVISION",
    timestamp: input.createdAt,
    actor_type: input.createdBy,
    entity_ids: [input.revisionId, input.targetItemId],
    metadata: {
      target_state_at_proposal: target.state,
    },
  });

  return validateWorkspace(next);
}

function acceptWithText(
  input: AcceptRevisionInput | EditAndAcceptRevisionInput,
  acceptedText: string,
  revisionState: "ACCEPTED" | "EDITED_AND_ACCEPTED",
): Workspace {
  assertHuman(input.actor);

  const next = cloneWorkspace(input.workspace);
  const revision = getRevision(next, input.revisionId);
  assertProposed(revision);
  assertUniqueItemId(next, input.acceptedItemId);

  const target = getKnowledgeItem(next, revision.target_item_id);

  if (target.state !== "ACCEPTED") {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Revision target must still be ACCEPTED at review time.",
      {
        target_item_id: target.id,
        target_state: target.state,
      },
    );
  }

  target.state = "SUPERSEDED";
  target.updated_at = input.reviewedAt;

  const replacement: KnowledgeItem = {
    ...structuredClone(target),
    id: input.acceptedItemId,
    text: acceptedText,
    state: "ACCEPTED",
    created_at: input.reviewedAt,
    updated_at: input.reviewedAt,
    created_by: "HUMAN",
    supersedes_id: target.id,
  };

  next.items.push(replacement);

  revision.state = revisionState;
  revision.reviewed_by = "HUMAN";
  revision.reviewed_at = input.reviewedAt;

  next.relations.push({
    id: `${input.auditEventId}-SUPERSEDES`,
    from_id: replacement.id,
    to_id: target.id,
    type: "SUPERSEDES",
    created_at: input.reviewedAt,
    created_by: "HUMAN",
  });

  if (next.accepted_conclusion_id === target.id) {
    next.accepted_conclusion_id = replacement.id;
  }

  next.audit_events.push(
    {
      event_id: `${input.auditEventId}-SUPERSEDE`,
      event_type: "SUPERSEDE",
      timestamp: input.reviewedAt,
      actor_type: "HUMAN",
      entity_ids: [target.id, replacement.id],
      metadata: {
        revision_id: revision.revision_id,
      },
    },
    {
      event_id: input.auditEventId,
      event_type: "ACCEPT_REVISION",
      timestamp: input.reviewedAt,
      actor_type: "HUMAN",
      entity_ids: [revision.revision_id, target.id, replacement.id],
      metadata: {
        revision_state: revisionState,
      },
    },
  );

  return validateWorkspace(next);
}

export function acceptRevision(
  input: AcceptRevisionInput,
): Workspace {
  const revision = getRevision(input.workspace, input.revisionId);

  return acceptWithText(
    input,
    revision.proposed_text,
    "ACCEPTED",
  );
}

export function editAndAcceptRevision(
  input: EditAndAcceptRevisionInput,
): Workspace {
  if (!input.editedText.trim()) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Edited accepted text must not be empty.",
    );
  }

  return acceptWithText(
    input,
    input.editedText,
    "EDITED_AND_ACCEPTED",
  );
}

function reviewWithoutAcceptance(
  input: ReviewRevisionBaseInput,
  state: "REJECTED" | "DEFERRED",
): Workspace {
  assertHuman(input.actor);

  const next = cloneWorkspace(input.workspace);
  const revision = getRevision(next, input.revisionId);
  assertProposed(revision);

  revision.state = state;
  revision.reviewed_by = "HUMAN";
  revision.reviewed_at = input.reviewedAt;

  next.audit_events.push({
    event_id: input.auditEventId,
    event_type: "REJECT_REVISION",
    timestamp: input.reviewedAt,
    actor_type: "HUMAN",
    entity_ids: [revision.revision_id, revision.target_item_id],
    metadata: {
      review_state: state,
    },
  });

  return validateWorkspace(next);
}

export function rejectRevision(
  input: ReviewRevisionBaseInput,
): Workspace {
  return reviewWithoutAcceptance(input, "REJECTED");
}

export function deferRevision(
  input: ReviewRevisionBaseInput,
): Workspace {
  return reviewWithoutAcceptance(input, "DEFERRED");
}
