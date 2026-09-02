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
  const currentState = new Map(
    currentNodes.map((node) => [
      node.id,
      {
        position: {
          x: node.position.x,
          y: node.position.y,
        } satisfies XYPosition,
        selected: Boolean(node.selected),
      },
    ]),
  );

  return nextNodes.map((node) => {
    const preserved =
      currentState.get(node.id);

    return preserved
      ? {
          ...node,
          position: preserved.position,
          selected:
            node.selected ??
            preserved.selected,
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
