import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
  KnowledgeItem,
  TriageRecord,
  Workspace,
} from "../../domain/schema";

interface ReasoningGraphProps {
  workspace: Workspace;
  selectedItemId: string | null;
  focusedItemIds: string[];
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

function buildNodes(
  workspace: Workspace,
  selectedItemId: string | null,
  focusedItemIds: string[],
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
    const selected = selectedItemId === item.id;

    const x =
      40 +
      index * 300 +
      (layer % 2 === 0 ? 0 : 130);

    const y = 40 + layer * 165;

    return {
      id: item.id,
      position: { x, y },
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
        selected ? "reasoning-node--selected" : "",
        item.state === "SUPERSEDED"
          ? "reasoning-node--superseded"
          : "",
      ]
        .filter(Boolean)
        .join(" "),
      draggable: false,
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
  onSelectItem,
}: ReasoningGraphProps) {
  const nodes = buildNodes(
    workspace,
    selectedItemId,
    focusedItemIds,
  );
  const edges = buildEdges(workspace);

  return (
    <section
      className="graph-panel"
      aria-label="Groundline reasoning graph"
    >
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
        maxZoom={1.4}
        nodesDraggable={false}
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
