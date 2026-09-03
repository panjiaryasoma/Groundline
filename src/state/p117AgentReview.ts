import { create } from "zustand";

import type { Relation } from "../domain/schema";
import {
  getP114UnlinkedReasoningItemIds,
} from "./p114AddReasoningItem";
import { useWorkspaceStore } from "./workspaceStore";
import {
  buildSemanticReviewToken,
  getSemanticReviewTargetIds,
} from "../webmcp/semanticReviewContract";

export type P117RelationProposalType = Extract<
  Relation["type"],
  "SUPPORTS" | "CHALLENGES" | "DEPENDS_ON" | "QUALIFIES"
>;

export interface P117ConnectionProposal {
  from_id: string;
  to_id: string;
  type: P117RelationProposalType;
  rationale: string;
}

export interface P117AgentReviewRequest {
  reviewToken: string;
  requestedAt: string;
  targetItemIds: string[];
  unlinkedItemIds: string[];
}

export interface P117RelationProposalBatch {
  reviewToken: string;
  proposedAt: string;
  proposals: P117ConnectionProposal[];
}

interface P117AgentReviewState {
  request: P117AgentReviewRequest | null;
  proposalBatch: P117RelationProposalBatch | null;
}

export const useP117AgentReviewStore = create<P117AgentReviewState>(() => ({
  request: null,
  proposalBatch: null,
}));

export function requestP117AgentReview(): P117AgentReviewRequest {
  const state = useWorkspaceStore.getState();

  if (state.experienceMode !== "CUSTOM") {
    throw new Error(
      "Agent semantic review may only be requested from a custom Groundline workspace.",
    );
  }

  if (
    state.workspace.revisions.some(
      (revision) => revision.state === "PROPOSED",
    )
  ) {
    throw new Error(
      "Finish the current human revision review before requesting another semantic review.",
    );
  }

  const request: P117AgentReviewRequest = {
    reviewToken: buildSemanticReviewToken(state.workspace),
    requestedAt: new Date().toISOString(),
    targetItemIds: getSemanticReviewTargetIds(state.workspace),
    unlinkedItemIds: getP114UnlinkedReasoningItemIds(state.workspace),
  };

  useP117AgentReviewStore.setState({
    request,
    proposalBatch: null,
  });

  return request;
}

export function setP117RelationProposalBatch(
  batch: P117RelationProposalBatch,
): void {
  useP117AgentReviewStore.setState({ proposalBatch: batch });
}

export function clearP117RelationProposalBatch(): void {
  useP117AgentReviewStore.setState({ proposalBatch: null });
}

export function clearP117AgentReviewState(): void {
  useP117AgentReviewStore.setState({
    request: null,
    proposalBatch: null,
  });
}
