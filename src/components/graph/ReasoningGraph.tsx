import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  SelectionMode,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import "@xyflow/react/dist/style.css";

import type {
  KnowledgeItem,
  TriageRecord,
  Workspace,
} from "../../domain/schema";
import {
  applyGraphNodeChanges,
  getSelectedNodeIds,
  mergePreservedPositions,
  setAllGraphNodesSelected,
  selectSingleGraphNode,
} from "./graphInteraction";
import type {
  GraphSelectionRequest,
} from "../../state/workspaceStore";

interface ReasoningGraphProps {
  workspace: Workspace;
  selectedItemId: string | null;
  focusedItemIds: string[];
  graphSelectionRequest?: GraphSelectionRequest;
  onSelectItem: (itemId: string | null) => void;
}

const TYPE_LAYER: Record<KnowledgeItem["type"], number> = {
  QUESTION: 0,
  CONCLUSION: 1,
  CLAIM: 2,
  COUNTERCLAIM: 2,
  ASSUMPTION: 3,
  EVIDENCE: 4,
  SOURCE: 5,
};

const TYPE_LABEL: Record<KnowledgeItem["type"], string> = {
  QUESTION: "QUESTION",
  CLAIM: "CLAIM",
  COUNTERCLAIM: "COUNTERCLAIM",
  EVIDENCE: "EVIDENCE",
  ASSUMPTION: "ASSUMPTION",
  SOURCE: "SOURCE",
  CONCLUSION: "CONCLUSION",
};

function getTriageRecord(
  records: TriageRecord[],
  itemId: string,
): TriageRecord | undefined {
  return records.find((record) => record.item_id === itemId);
}

function getLayeredPosition(
  item: KnowledgeItem,
  index: number,
): { x: number; y: number } {
  const layer = TYPE_LAYER[item.type];

  const baseX =
    item.type === "QUESTION"
      ? 220
      : item.type === "CONCLUSION"
        ? 350
        : 120;

  const horizontalGap =
    item.type === "SOURCE" || item.type === "EVIDENCE"
      ? 300
      : 330;

  return {
    x:
      baseX +
      index * horizontalGap +
      (layer % 2 === 0 ? 0 : 90),
    y: 32 + layer * 170,
  };
}

function buildNodes(
  workspace: Workspace,
  focusedItemIds: string[],
  selectedItemId: string | null,
): Node[] {
  const countsByLayer = new Map<number, number>();

  return workspace.items.map((item) => {
    const layer = TYPE_LAYER[item.type];
    const index = countsByLayer.get(layer) ?? 0;
    countsByLayer.set(layer, index + 1);

    const triage = getTriageRecord(
      workspace.triage_records,
      item.id,
    );

    const focused = focusedItemIds.includes(item.id);

    return {
      id: item.id,
      position: getLayeredPosition(item, index),
      data: {
        label: (
          <div
            className="reasoning-node__inner"
            data-item-id={item.id}
          >
            <div className="reasoning-node__meta">
              <span>{TYPE_LABEL[item.type]}</span>
              <span>{item.id}</span>
            </div>

            <div className="reasoning-node__text">
              {item.text}
            </div>

            <div className="reasoning-node__footer">
              <span className="knowledge-state">
                {item.state}
              </span>

              {triage ? (
                <span
                  className={`triage-badge triage-badge--${triage.state.toLowerCase()}`}
                >
                  {triage.state}
                </span>
              ) : (
                <span className="triage-badge triage-badge--unassessed">
                  UNASSESSED
                </span>
              )}
            </div>
          </div>
        ),
      },
      className: [
        "reasoning-node",
        `reasoning-node--${item.type.toLowerCase()}`,
        focused ? "reasoning-node--focused" : "",
        item.id === selectedItemId
          ? "reasoning-node--app-selected"
          : "",
        item.state === "SUPERSEDED"
          ? "reasoning-node--superseded"
          : "",
      ]
        .filter(Boolean)
        .join(" "),
      draggable: true,
      selectable: true,
    };
  });
}

function buildEdges(workspace: Workspace): Edge[] {
  return workspace.relations.map((relation) => ({
    id: relation.id,
    source: relation.from_id,
    target: relation.to_id,
    label: relation.type,
    type: "smoothstep",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
    },
    className: `reasoning-edge reasoning-edge--${relation.type.toLowerCase()}`,
    labelStyle: {
      fontSize: 10,
      letterSpacing: "0.08em",
    },
  }));
}

export function ReasoningGraph({
  workspace,
  selectedItemId,
  focusedItemIds,
  graphSelectionRequest,
  onSelectItem,
}: ReasoningGraphProps) {
  const structuralNodes = useMemo(
    () =>
      buildNodes(
        workspace,
        focusedItemIds,
        selectedItemId,
      ),
    [
      workspace,
      focusedItemIds,
      selectedItemId,
    ],
  );

  const [nodes, setNodes] = useState<Node[]>(
    structuralNodes,
  );

  useEffect(() => {
    setNodes((current) =>
      mergePreservedPositions(
        current,
        structuralNodes,
      ),
    );
  }, [structuralNodes]);

  const effectiveGraphSelectionRequest =
    graphSelectionRequest ?? {
      itemId: null,
      version: 0,
    };

  useEffect(() => {
    setNodes((current) =>
      selectSingleGraphNode(
        current,
        effectiveGraphSelectionRequest.itemId,
      ),
    );
  }, [
    effectiveGraphSelectionRequest.version,
    effectiveGraphSelectionRequest.itemId,
  ]);

  const edges = useMemo(
    () => buildEdges(workspace),
    [workspace],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((current) =>
        applyGraphNodeChanges(current, changes),
      );
    },
    [],
  );

  const selectedNodeCount = nodes.filter(
    (node) => node.selected,
  ).length;

  const selectAllNodes = useCallback(() => {
    setNodes((current) =>
      setAllGraphNodesSelected(current, true),
    );
  }, []);

  const clearNodeSelection = useCallback(() => {
    setNodes((current) =>
      setAllGraphNodesSelected(current, false),
    );
    onSelectItem(null);
  }, [onSelectItem]);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      const ids = getSelectedNodeIds(selectedNodes);

      if (ids.length === 1) {
        onSelectItem(ids[0]);
        return;
      }

      if (
        selectedItemId &&
        ids.includes(selectedItemId)
      ) {
        return;
      }

      onSelectItem(ids.at(-1) ?? null);
    },
    [onSelectItem, selectedItemId],
  );

  return (
    <section
      className="graph-panel"
      aria-label="Groundline reasoning graph"
    >
      <div className="graph-help">
        <div className="graph-help__copy">
          <span>Drag one card to move only that card.</span>
          <span>Ctrl/Shift-click selects multiple.</span>
          <span>Drag any selected card to move the group.</span>
        </div>

        <div className="graph-help__actions">
          <button
            type="button"
            onClick={selectAllNodes}
          >
            Select all
          </button>

          {selectedNodeCount > 0 ? (
            <button
              type="button"
              onClick={clearNodeSelection}
            >
              Clear selection
            </button>
          ) : null}

          <span>
            {selectedNodeCount > 0
              ? `${selectedNodeCount} selected`
              : "Nothing selected"}
          </span>
        </div>
      </div>

      <div className="strata-labels" aria-hidden="true">
        <span>QUESTION</span>
        <span>CONCLUSION</span>
        <span>CLAIMS</span>
        <span>ASSUMPTIONS</span>
        <span>EVIDENCE</span>
        <span>SOURCES</span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        minZoom={0.45}
        maxZoom={1.6}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={["Control", "Shift"]}
        panOnDrag={[1, 2]}
        onNodesChange={handleNodesChange}
        onSelectionChange={handleSelectionChange}
        onNodeClick={(_, node) => onSelectItem(node.id)}
        onPaneClick={() => onSelectItem(null)}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={28} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </section>
  );
}
