import type { Node, NodeChange, XYPosition } from "@xyflow/react";
import { applyNodeChanges } from "@xyflow/react";

export interface GraphSelectionState {
  selectedIds: string[];
  primaryId: string | null;
}

export function applyGraphNodeChanges(
  nodes: Node[],
  changes: NodeChange<Node>[],
): Node[] {
  return applyNodeChanges(changes, nodes);
}

export function getSelectedNodeIds(nodes: Node[]): string[] {
  return nodes
    .filter((node) => node.selected)
    .map((node) => node.id);
}

export function mergePreservedPositions(
  currentNodes: Node[],
  nextNodes: Node[],
): Node[] {
  const currentPositions = new Map<string, XYPosition>(
    currentNodes.map((node) => [
      node.id,
      {
        x: node.position.x,
        y: node.position.y,
      },
    ]),
  );

  return nextNodes.map((node) => {
    const preserved = currentPositions.get(node.id);

    return preserved
      ? {
          ...node,
          position: preserved,
        }
      : node;
  });
}


export function setAllGraphNodesSelected(
  nodes: Node[],
  selected: boolean,
): Node[] {
  return nodes.map((node) => ({
    ...node,
    selected,
  }));
}
