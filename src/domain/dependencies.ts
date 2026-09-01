import type { Relation, Workspace } from "./schema";
import { GroundlineError } from "./errors";

export const REASONING_RELATION_TYPES = [
  "SUPPORTS",
  "CHALLENGES",
  "DEPENDS_ON",
  "SOURCED_FROM",
  "QUALIFIES",
] as const;

export type TraversalDirection = "UPSTREAM" | "DOWNSTREAM";

export interface TraversalOptions {
  /**
   * Maximum number of relation hops from the origin.
   * Contract requirement: dependency traversal must be bounded.
   */
  maxDepth?: number;

  /**
   * Maximum number of unique non-origin nodes returned.
   * Contract requirement: large graphs must not produce unbounded output.
   */
  maxNodes?: number;

  /**
   * By default reasoning traversal ignores SUPERSEDES because that relation
   * represents history/version lineage rather than support dependency.
   */
  relationTypes?: Relation["type"][];
}

export interface TraversalResult {
  origin_id: string;
  direction: TraversalDirection;
  node_ids: string[];
  relation_ids: string[];
  cycle_detected: boolean;
  truncated: boolean;
  max_depth_reached: number;
}

const DEFAULT_MAX_DEPTH = 12;
const DEFAULT_MAX_NODES = 100;

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `${field} must be a positive integer.`,
      { [field]: value },
    );
  }
}

export function getItem(workspace: Workspace, itemId: string) {
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

export function getIncomingRelations(
  workspace: Workspace,
  itemId: string,
  relationTypes?: Relation["type"][],
): Relation[] {
  getItem(workspace, itemId);

  const allowed = relationTypes ? new Set(relationTypes) : null;

  return workspace.relations.filter(
    (relation) =>
      relation.to_id === itemId &&
      (!allowed || allowed.has(relation.type)),
  );
}

export function getOutgoingRelations(
  workspace: Workspace,
  itemId: string,
  relationTypes?: Relation["type"][],
): Relation[] {
  getItem(workspace, itemId);

  const allowed = relationTypes ? new Set(relationTypes) : null;

  return workspace.relations.filter(
    (relation) =>
      relation.from_id === itemId &&
      (!allowed || allowed.has(relation.type)),
  );
}

export function getAcceptedConclusion(workspace: Workspace) {
  if (!workspace.accepted_conclusion_id) {
    return null;
  }

  const item = getItem(workspace, workspace.accepted_conclusion_id);

  if (item.type !== "CONCLUSION" || item.state !== "ACCEPTED") {
    throw new GroundlineError(
      "INVALID_INPUT",
      "accepted_conclusion_id must reference an ACCEPTED CONCLUSION.",
      {
        accepted_conclusion_id: workspace.accepted_conclusion_id,
        referenced_type: item.type,
        referenced_state: item.state,
      },
    );
  }

  return item;
}

function traverse(
  workspace: Workspace,
  originId: string,
  direction: TraversalDirection,
  options: TraversalOptions = {},
): TraversalResult {
  getItem(workspace, originId);

  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  assertPositiveInteger(maxDepth, "maxDepth");
  assertPositiveInteger(maxNodes, "maxNodes");

  const relationTypes =
    options.relationTypes ?? [...REASONING_RELATION_TYPES];
  const allowedTypes = new Set<Relation["type"]>(relationTypes);

  const resultNodeIds: string[] = [];
  const resultRelationIds: string[] = [];
  const seenResultNodes = new Set<string>();
  const seenRelations = new Set<string>();

  // Path-local visited sets detect cycles without incorrectly treating
  // converging dependency paths as cycles.
  const queue: Array<{
    itemId: string;
    depth: number;
    path: Set<string>;
  }> = [
    {
      itemId: originId,
      depth: 0,
      path: new Set([originId]),
    },
  ];

  let cycleDetected = false;
  let truncated = false;
  let maxDepthReached = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    maxDepthReached = Math.max(maxDepthReached, current.depth);

    if (current.depth >= maxDepth) {
      const hasMore = workspace.relations.some((relation) => {
        if (!allowedTypes.has(relation.type)) return false;
        return direction === "DOWNSTREAM"
          ? relation.from_id === current.itemId
          : relation.to_id === current.itemId;
      });

      if (hasMore) {
        truncated = true;
      }
      continue;
    }

    const relations = workspace.relations.filter((relation) => {
      if (!allowedTypes.has(relation.type)) return false;
      return direction === "DOWNSTREAM"
        ? relation.from_id === current.itemId
        : relation.to_id === current.itemId;
    });

    for (const relation of relations) {
      const nextId =
        direction === "DOWNSTREAM" ? relation.to_id : relation.from_id;

      if (!seenRelations.has(relation.id)) {
        resultRelationIds.push(relation.id);
        seenRelations.add(relation.id);
      }

      if (current.path.has(nextId)) {
        cycleDetected = true;
        continue;
      }

      if (!seenResultNodes.has(nextId)) {
        if (resultNodeIds.length >= maxNodes) {
          truncated = true;
          continue;
        }

        resultNodeIds.push(nextId);
        seenResultNodes.add(nextId);
      }

      const nextPath = new Set(current.path);
      nextPath.add(nextId);

      queue.push({
        itemId: nextId,
        depth: current.depth + 1,
        path: nextPath,
      });
    }
  }

  return {
    origin_id: originId,
    direction,
    node_ids: resultNodeIds,
    relation_ids: resultRelationIds,
    cycle_detected: cycleDetected,
    truncated,
    max_depth_reached: maxDepthReached,
  };
}

export function getDownstreamDependencies(
  workspace: Workspace,
  itemId: string,
  options?: TraversalOptions,
): TraversalResult {
  return traverse(workspace, itemId, "DOWNSTREAM", options);
}

export function getUpstreamDependencies(
  workspace: Workspace,
  itemId: string,
  options?: TraversalOptions,
): TraversalResult {
  return traverse(workspace, itemId, "UPSTREAM", options);
}

export function getDownstreamAcceptedIds(
  workspace: Workspace,
  itemId: string,
  options?: TraversalOptions,
): string[] {
  const traversal = getDownstreamDependencies(workspace, itemId, options);

  return traversal.node_ids.filter((id) => {
    const item = getItem(workspace, id);
    return item.state === "ACCEPTED";
  });
}

export function hasDirectRelationToAcceptedConclusion(
  workspace: Workspace,
  itemId: string,
): boolean {
  const conclusion = getAcceptedConclusion(workspace);

  if (!conclusion) {
    return false;
  }

  return getOutgoingRelations(
    workspace,
    itemId,
    [...REASONING_RELATION_TYPES],
  ).some((relation) => relation.to_id === conclusion.id);
}
