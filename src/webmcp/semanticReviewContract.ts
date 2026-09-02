import type { KnowledgeItem, Workspace } from "../domain/schema";

export const MAX_SEMANTIC_REVIEW_TARGETS = 25;

const REVIEWABLE_TYPES = new Set<KnowledgeItem["type"]>([
  "CLAIM",
  "COUNTERCLAIM",
  "ASSUMPTION",
  "EVIDENCE",
  "CONCLUSION",
]);

function stableSourceMetadata(item: KnowledgeItem) {
  if (!item.source_metadata) return null;

  return Object.fromEntries(
    Object.entries(item.source_metadata).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  );
}

function canonicalSemanticState(workspace: Workspace): string {
  const items = workspace.items
    .filter((item) => item.state === "ACCEPTED")
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => ({
      id: item.id,
      type: item.type,
      state: item.state,
      text: item.text,
      tags: [...(item.tags ?? [])].sort(),
      source_metadata: stableSourceMetadata(item),
    }));

  const relations = workspace.relations
    .filter((relation) => {
      const accepted = new Set(items.map((item) => item.id));
      return accepted.has(relation.from_id) && accepted.has(relation.to_id);
    })
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((relation) => ({
      id: relation.id,
      from_id: relation.from_id,
      to_id: relation.to_id,
      type: relation.type,
    }));

  return JSON.stringify({
    workspace_id: workspace.workspace_id,
    question_id: workspace.question_id,
    accepted_conclusion_id: workspace.accepted_conclusion_id,
    items,
    relations,
  });
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildSemanticReviewToken(
  workspace: Workspace,
): string {
  return `SRV-${fnv1a32(canonicalSemanticState(workspace))}`;
}

export function getSemanticReviewTargets(
  workspace: Workspace,
): KnowledgeItem[] {
  return workspace.items
    .filter(
      (item) =>
        item.state === "ACCEPTED" &&
        REVIEWABLE_TYPES.has(item.type),
    )
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getSemanticReviewTargetIds(
  workspace: Workspace,
): string[] {
  return getSemanticReviewTargets(workspace).map((item) => item.id);
}

export function isSemanticReviewCoverageComplete(
  workspace: Workspace,
): boolean {
  const targets = getSemanticReviewTargetIds(workspace);
  const triaged = new Set(
    workspace.triage_records.map((record) => record.item_id),
  );

  return targets.length > 0 && targets.every((id) => triaged.has(id));
}

export function semanticReviewContract(workspace: Workspace) {
  const targetItemIds = getSemanticReviewTargetIds(workspace);

  return {
    review_token: buildSemanticReviewToken(workspace),
    target_item_ids: targetItemIds,
    target_count: targetItemIds.length,
    capacity: MAX_SEMANTIC_REVIEW_TARGETS,
    coverage_complete: isSemanticReviewCoverageComplete(workspace),
    requires_full_batch: true,
  };
}
