import { create } from "zustand";

import type { Relation } from "../domain/schema";

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

export interface P117RelationProposalBatch {
  reviewToken: string;
  proposedAt: string;
  proposals: P117ConnectionProposal[];
}

interface P117AgentReviewState {
  proposalBatch: P117RelationProposalBatch | null;
}

export const useP117AgentReviewStore = create<P117AgentReviewState>(() => ({
  proposalBatch: null,
}));

export function setP117RelationProposalBatch(
  batch: P117RelationProposalBatch,
): void {
  useP117AgentReviewStore.setState({ proposalBatch: batch });
}

export function clearP117RelationProposalBatch(): void {
  useP117AgentReviewStore.setState({ proposalBatch: null });
}

export function clearP117AgentReviewState(): void {
  useP117AgentReviewStore.setState({ proposalBatch: null });
}
