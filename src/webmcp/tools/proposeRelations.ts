import { GroundlineError } from "../../domain/errors";
import type { Relation } from "../../domain/schema";
import {
  getP114UnlinkedReasoningItemIds,
} from "../../state/p114AddReasoningItem";
import {
  setP117RelationProposalBatch,
  type P117ConnectionProposal,
  type P117RelationProposalType,
} from "../../state/p117AgentReview";
import { assertActiveGroundlineWorkspace } from "../activeWorkspace";
import type { WebMCPToolDefinition } from "../modelContext";
import { buildSemanticReviewToken } from "../semanticReviewContract";

const MAX_PROPOSALS = 24;
const MAX_RATIONALE_CHARS = 800;

const ALLOWED_TYPES = new Set<P117RelationProposalType>([
  "SUPPORTS",
  "CHALLENGES",
  "DEPENDS_ON",
  "QUALIFIES",
]);

function relationKey(
  value: Pick<Relation, "from_id" | "to_id" | "type">,
): string {
  return `${value.from_id}|${value.type}|${value.to_id}`;
}

function requiredString(
  value: unknown,
  field: string,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `propose_relations requires a non-empty ${field}.`,
    );
  }

  return value.trim();
}

function parseProposal(
  raw: any,
  acceptedIds: Set<string>,
  unlinkedIds: Set<string>,
  existingKeys: Set<string>,
): P117ConnectionProposal {
  const fromId = requiredString(raw?.from_id, "from_id");
  const toId = requiredString(raw?.to_id, "to_id");
  const type = requiredString(raw?.type, "type") as P117RelationProposalType;
  const rationale = requiredString(raw?.rationale, "rationale");

  if (!acceptedIds.has(fromId) || !acceptedIds.has(toId)) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "propose_relations may only reference currently ACCEPTED knowledge items.",
    );
  }

  if (fromId === toId) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "propose_relations does not allow self-relations.",
    );
  }

  if (!ALLOWED_TYPES.has(type)) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `Relation type "${type}" is not proposal-safe. Use SUPPORTS, CHALLENGES, DEPENDS_ON, or QUALIFIES.`,
    );
  }

  if (!unlinkedIds.has(fromId) && !unlinkedIds.has(toId)) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Each proposed relation must involve at least one currently UNLINKED human-authored card.",
    );
  }

  if (rationale.length > MAX_RATIONALE_CHARS) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `Relation rationale exceeds the ${MAX_RATIONALE_CHARS}-character bound.`,
    );
  }

  const proposal: P117ConnectionProposal = {
    from_id: fromId,
    to_id: toId,
    type,
    rationale,
  };

  if (existingKeys.has(relationKey(proposal))) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "The proposed semantic relation already exists in the canonical graph.",
    );
  }

  return proposal;
}

export function createProposeRelationsTool(): WebMCPToolDefinition {
  return {
    name: "propose_relations",
    title: "Propose Groundline semantic relations",
    description:
      "Propose bounded SUPPORTS, CHALLENGES, DEPENDS_ON, or QUALIFIES links for currently UNLINKED human-authored cards. This never changes the canonical graph. Human approval is required before any line is created. Use the latest inspect_workspace semantic_review.review_token; stale proposals are rejected. After proposing, STOP. Never operate Accept selected connections or Reject all through browser automation, even when the user asks you to connect cards automatically.",
    inputSchema: {
      type: "object",
      properties: {
        review_token: {
          type: "string",
          minLength: 1,
        },
        proposals: {
          type: "array",
          minItems: 1,
          maxItems: MAX_PROPOSALS,
          items: {
            type: "object",
            properties: {
              from_id: { type: "string", minLength: 1 },
              to_id: { type: "string", minLength: 1 },
              type: {
                type: "string",
                enum: [
                  "SUPPORTS",
                  "CHALLENGES",
                  "DEPENDS_ON",
                  "QUALIFIES",
                ],
              },
              rationale: {
                type: "string",
                minLength: 1,
                maxLength: MAX_RATIONALE_CHARS,
              },
            },
            required: ["from_id", "to_id", "type", "rationale"],
            additionalProperties: false,
          },
        },
      },
      required: ["review_token", "proposals"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
    },
    execute(input: any) {
      const state = assertActiveGroundlineWorkspace();

      if (state.experienceMode !== "CUSTOM") {
        throw new GroundlineError(
          "INVALID_INPUT",
          "propose_relations is only available for a CUSTOM workspace.",
        );
      }

      const currentToken = buildSemanticReviewToken(state.workspace);
      const suppliedToken = requiredString(input?.review_token, "review_token");

      if (suppliedToken !== currentToken) {
        throw new GroundlineError(
          "INVALID_INPUT",
          "Semantic relation proposals are stale because the accepted reasoning changed. Call inspect_workspace again before proposing connections.",
          {
            expected_review_token: currentToken,
            received_review_token: suppliedToken,
          },
        );
      }

      if (!Array.isArray(input?.proposals) || input.proposals.length === 0) {
        throw new GroundlineError(
          "INVALID_INPUT",
          "propose_relations requires at least one proposal.",
        );
      }

      if (input.proposals.length > MAX_PROPOSALS) {
        throw new GroundlineError(
          "INVALID_INPUT",
          `propose_relations accepts at most ${MAX_PROPOSALS} proposals per review batch.`,
        );
      }

      const acceptedIds = new Set(
        state.workspace.items
          .filter((item) => item.state === "ACCEPTED")
          .map((item) => item.id),
      );
      const unlinkedIds = new Set(
        getP114UnlinkedReasoningItemIds(state.workspace),
      );

      if (unlinkedIds.size === 0) {
        throw new GroundlineError(
          "INVALID_INPUT",
          "The current workspace has no UNLINKED human-authored cards requiring relation proposals.",
        );
      }

      const existingKeys = new Set(
        state.workspace.relations.map(relationKey),
      );
      const parsed = input.proposals.map((raw: any) =>
        parseProposal(raw, acceptedIds, unlinkedIds, existingKeys),
      );
      const seen = new Set<string>();
      const unique: P117ConnectionProposal[] = [];

      for (const proposal of parsed) {
        const key = relationKey(proposal);
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(proposal);
      }

      setP117RelationProposalBatch({
        reviewToken: currentToken,
        proposedAt: new Date().toISOString(),
        proposals: unique,
      });

      return {
        status: "AWAITING_HUMAN_APPROVAL",
        review_token: currentToken,
        proposal_count: unique.length,
        proposals: unique,
        canonical_relations_changed: false,
        accepted_knowledge_changed: false,
        human_approval_required: true,
        browser_automation_must_stop: true,
        semantic_inference_committed: false,
        next_step:
          "STOP. Leave the visible relation proposals pending. Do not click, hold, or otherwise operate Accept selected connections or Reject all. A real human must make the UI decision. If the human accepts any relation, call inspect_workspace again because the review token changes before fresh triage.",
      };
    },
  };
}
