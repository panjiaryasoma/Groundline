import type { KnowledgeItem, Workspace } from "../domain/schema";
import { buildSemanticReviewToken } from "../webmcp/semanticReviewContract";
import {
  getP114UnlinkedReasoningItemIds,
  isP114ReasoningItemUnlinked,
} from "./p114AddReasoningItem";
import {
  setP117RelationProposalBatch,
  type P117ConnectionProposal,
} from "./p117AgentReview";
import { useWorkspaceStore } from "./workspaceStore";

const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "also",
  "among",
  "because",
  "before",
  "being",
  "between",
  "could",
  "does",
  "doing",
  "from",
  "have",
  "having",
  "into",
  "more",
  "most",
  "other",
  "should",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "using",
  "very",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
  "ours",
  "were",
  "will",
  "without",
  "only",
  "same",
  "current",
  "accepted",
  "reasoning",
]);

const TARGET_TYPES: Record<
  Extract<KnowledgeItem["type"], "CLAIM" | "COUNTERCLAIM" | "ASSUMPTION" | "EVIDENCE">,
  KnowledgeItem["type"][]
> = {
  CLAIM: ["CONCLUSION", "CLAIM", "COUNTERCLAIM"],
  COUNTERCLAIM: ["CLAIM", "CONCLUSION", "COUNTERCLAIM"],
  ASSUMPTION: ["CLAIM", "CONCLUSION", "COUNTERCLAIM"],
  EVIDENCE: ["CLAIM", "COUNTERCLAIM", "CONCLUSION"],
};

const TYPE_BONUS: Record<string, number> = {
  "EVIDENCE>CLAIM": 0.26,
  "EVIDENCE>COUNTERCLAIM": 0.24,
  "EVIDENCE>CONCLUSION": 0.18,
  "ASSUMPTION>CLAIM": 0.24,
  "ASSUMPTION>COUNTERCLAIM": 0.2,
  "ASSUMPTION>CONCLUSION": 0.22,
  "COUNTERCLAIM>CLAIM": 0.25,
  "COUNTERCLAIM>CONCLUSION": 0.22,
  "COUNTERCLAIM>COUNTERCLAIM": 0.12,
  "CLAIM>CONCLUSION": 0.24,
  "CLAIM>CLAIM": 0.14,
  "CLAIM>COUNTERCLAIM": 0.12,
};

interface ScoredCandidate {
  source: KnowledgeItem;
  target: KnowledgeItem;
  score: number;
  matchedTerms: string[];
}

function normalizeToken(value: string): string {
  let token = value.toLowerCase();

  if (token.length > 6 && token.endsWith("ing")) token = token.slice(0, -3);
  else if (token.length > 5 && token.endsWith("ed")) token = token.slice(0, -2);
  else if (token.length > 5 && token.endsWith("es")) token = token.slice(0, -2);
  else if (token.length > 4 && token.endsWith("s")) token = token.slice(0, -1);

  return token;
}

function tokenize(text: string): Set<string> {
  const matches = text.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? [];

  return new Set(
    matches
      .map(normalizeToken)
      .filter((token) => token.length >= 4 && !STOPWORDS.has(token)),
  );
}

function sharedTerms(left: Set<string>, right: Set<string>): string[] {
  return [...left]
    .filter((token) => right.has(token))
    .sort((a, b) => b.length - a.length || a.localeCompare(b));
}

function lexicalScore(
  sourceTokens: Set<string>,
  targetTokens: Set<string>,
  shared: string[],
): number {
  if (shared.length === 0) return 0;

  const denominator = Math.sqrt(
    Math.max(1, sourceTokens.size) * Math.max(1, targetTokens.size),
  );
  const longTermBonus = shared.filter((term) => term.length >= 7).length * 0.035;

  return Math.min(0.62, shared.length / denominator + longTermBonus);
}

function scoreCandidate(
  workspace: Workspace,
  source: KnowledgeItem,
  target: KnowledgeItem,
): ScoredCandidate | null {
  if (source.id === target.id || target.state !== "ACCEPTED") return null;
  if (isP114ReasoningItemUnlinked(workspace, target.id)) return null;

  const allowedTargets = TARGET_TYPES[
    source.type as keyof typeof TARGET_TYPES
  ];
  if (!allowedTargets?.includes(target.type)) return null;

  const sourceTokens = tokenize(source.text);
  const targetTokens = tokenize(target.text);
  const matched = sharedTerms(sourceTokens, targetTokens);

  // A local matcher may identify likely attachment points, but it must not
  // fabricate a semantic relation when there is no textual signal at all.
  if (matched.length === 0) return null;

  const typeBonus = TYPE_BONUS[`${source.type}>${target.type}`] ?? 0;
  const conclusionBonus =
    target.id === workspace.accepted_conclusion_id ? 0.045 : 0;
  const score = lexicalScore(sourceTokens, targetTokens, matched) +
    typeBonus +
    conclusionBonus;

  if (score < 0.18) return null;

  return {
    source,
    target,
    score: Math.min(1, score),
    matchedTerms: matched.slice(0, 5),
  };
}

function candidatesForItem(
  workspace: Workspace,
  source: KnowledgeItem,
): ScoredCandidate[] {
  return workspace.items
    .map((target) => scoreCandidate(workspace, source, target))
    .filter((candidate): candidate is ScoredCandidate => Boolean(candidate))
    .sort((left, right) =>
      right.score - left.score || left.target.id.localeCompare(right.target.id),
    )
    .slice(0, 2);
}

export function buildP15LocalConnectionCandidates(
  workspace: Workspace,
): P117ConnectionProposal<null>[] {
  const unlinkedIds = new Set(getP114UnlinkedReasoningItemIds(workspace));
  const unlinkedItems = workspace.items.filter(
    (item) => unlinkedIds.has(item.id),
  );
  const proposals: P117ConnectionProposal<null>[] = [];

  for (const source of unlinkedItems) {
    for (const candidate of candidatesForItem(workspace, source)) {
      const matchedText = candidate.matchedTerms
        .map((term) => `“${term}”`)
        .join(", ");

      proposals.push({
        from_id: candidate.source.id,
        to_id: candidate.target.id,
        type: null,
        source: "LOCAL_DETERMINISTIC",
        candidate_score: Number(candidate.score.toFixed(3)),
        matched_terms: candidate.matchedTerms,
        rationale:
          `Local deterministic candidate based on shared terms ${matchedText} and compatible reasoning-object types. ` +
          "Groundline has not assigned semantic meaning to this line; choose SUPPORTS, CHALLENGES, DEPENDS_ON, or QUALIFIES before accepting it.",
      });
    }
  }

  return proposals.slice(0, 12);
}

export function proposeP15LocalConnectionCandidates(): number {
  const state = useWorkspaceStore.getState();

  if (state.experienceMode !== "CUSTOM") return 0;
  if (state.workspace.revisions.some((revision) => revision.state === "PROPOSED")) {
    return 0;
  }

  const proposals = buildP15LocalConnectionCandidates(state.workspace);
  if (proposals.length === 0) return 0;

  setP117RelationProposalBatch({
    reviewToken: buildSemanticReviewToken(state.workspace),
    proposedAt: new Date().toISOString(),
    proposals,
    source: "LOCAL_DETERMINISTIC",
  });

  return proposals.length;
}
