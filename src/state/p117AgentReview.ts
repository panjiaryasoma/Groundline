import { create } from "zustand";

import type { Relation } from "../domain/schema";

export type P117RelationProposalType = Extract<
  Relation["type"],
  "SUPPORTS" | "CHALLENGES" | "DEPENDS_ON" | "QUALIFIES"
>;

export type P117ProposalSource =
  | "WEBMCP_AGENT"
  | "LOCAL_DETERMINISTIC";

export interface P117ConnectionProposal<
  TType extends P117RelationProposalType | null = P117RelationProposalType,
> {
  from_id: string;
  to_id: string;
  type: TType;
  rationale: string;
  source?: P117ProposalSource;
  candidate_score?: number;
  matched_terms?: string[];
}

export type P117AnyConnectionProposal =
  | P117ConnectionProposal
  | P117ConnectionProposal<null>;

export interface P117RelationProposalBatch {
  reviewToken: string;
  proposedAt: string;
  proposals: P117AnyConnectionProposal[];
  source?: P117ProposalSource;
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
