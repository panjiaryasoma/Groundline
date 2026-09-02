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
import "../../styles/p11-4.css";

import type {
  KnowledgeItem,
  TriageRecord,
  Workspace,
} from "../../domain/schema";
import {
  P114_ADDABLE_KNOWLEDGE_TYPES,
  P114_ADDABLE_RELATION_TYPES,
  addP114ReasoningItem,
  type P114AddReasoningItemInput,
} from "../../state/p114AddReasoningItem";
import {
  useWorkspaceStore,
  type GraphSelectionRequest,
} from "../../state/workspaceStore";
import {
  applyGraphNodeChanges,
  getSelectedNodeIds,
  mergePreservedPositions,
  setAllGraphNodesSelected,
  selectSingleGraphNode,
} from "./graphInteraction";

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

const ADD_TYPE_LABEL: Record<
  P114AddReasoningItemInput["type"],
  string
> = {
  CLAIM: "Claim",
  COUNTERCLAIM: "Counterclaim",
  ASSUMPTION: "Assumption",
  EVIDENCE: "Evidence",
};

const RELATION_LABEL: Record<
  P114AddReasoningItemInput["relationType"],
  string
> = {
  SUPPORTS: "supports",
  CHALLENGES: "challenges",
  DEPENDS_ON: "depends on",
  QUALIFIES: "qualifies",
};

function defaultRelationForType(
  type: P114AddReasoningItemInput["type"],
): P114AddReasoningItemInput["relationType"] {
  return type === "COUNTERCLAIM"
    ? "CHALLENGES"
    : "SUPPORTS";
}

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
    const faulted = triage?.state === "CRITICAL";

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
        faulted ? "reasoning-node--faulted" : "",
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
  const experienceMode = useWorkspaceStore(
    (state) => state.experienceMode,
  );
  const [addComposerOpen, setAddComposerOpen] =
    useState(false);
  const [addType, setAddType] = useState<
    P114AddReasoningItemInput["type"]
  >("CLAIM");
  const [addText, setAddText] = useState("");
  const [relationType, setRelationType] = useState<
    P114AddReasoningItemInput["relationType"]
  >("SUPPORTS");
  const [targetItemId, setTargetItemId] = useState("");

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

  const acceptedTargets = useMemo(
    () =>
      workspace.items.filter(
        (item) => item.state === "ACCEPTED",
      ),
    [workspace.items],
  );

  const hasPendingRevision = workspace.revisions.some(
    (revision) => revision.state === "PROPOSED",
  );

  useEffect(() => {
    setNodes((current) =>
      mergePreservedPositions(
        current,
        structuralNodes,
      ),
    );
  }, [structuralNodes]);

  useEffect(() => {
    if (!addComposerOpen) return;

    const selectedAccepted = selectedItemId
      ? acceptedTargets.some(
          (item) => item.id === selectedItemId,
        )
      : false;

    if (selectedAccepted && selectedItemId) {
      setTargetItemId(selectedItemId);
      return;
    }

    if (
      !acceptedTargets.some(
        (item) => item.id === targetItemId,
      )
    ) {
      setTargetItemId(acceptedTargets[0]?.id ?? "");
    }
  }, [
    acceptedTargets,
    addComposerOpen,
    selectedItemId,
    targetItemId,
  ]);

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

  function openAddComposer() {
    const preferredTarget =
      selectedItemId &&
      acceptedTargets.some(
        (item) => item.id === selectedItemId,
      )
        ? selectedItemId
        : acceptedTargets[0]?.id ?? "";

    setTargetItemId(preferredTarget);
    setAddComposerOpen(true);
  }

  function submitAddedReasoningItem() {
    if (!addText.trim() || !targetItemId) {
      return;
    }

    addP114ReasoningItem({
      type: addType,
      text: addText,
      relationType,
      targetItemId,
    });

    setAddText("");
    setAddComposerOpen(false);
  }

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
          <span>Rust mark = critical review fault; dashed rust = challenge.</span>
        </div>

        <div className="graph-help__actions">
          {experienceMode === "CUSTOM" ? (
            <button
              type="button"
              className="graph-add-trigger"
              onClick={openAddComposer}
              disabled={hasPendingRevision}
              title={
                hasPendingRevision
                  ? "Finish the pending human revision review first."
                  : "Add another human-authored reasoning item."
              }
            >
              + Add reasoning item
            </button>
          ) : null}

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

      {experienceMode === "CUSTOM" && addComposerOpen ? (
        <form
          className="graph-add-composer"
          aria-label="Add reasoning item"
          onSubmit={(event) => {
            event.preventDefault();
            submitAddedReasoningItem();
          }}
        >
          <div className="graph-add-composer__heading">
            <div>
              <span>Add to this reasoning</span>
              <strong>
                New human-authored card
              </strong>
            </div>
            <button
              type="button"
              className="graph-add-composer__close"
              onClick={() => setAddComposerOpen(false)}
              aria-label="Close add reasoning item"
            >
              ×
            </button>
          </div>

          <div className="graph-add-composer__fields">
            <label>
              <span>Card type</span>
              <select
                value={addType}
                onChange={(event) => {
                  const nextType =
                    event.target.value as P114AddReasoningItemInput["type"];
                  setAddType(nextType);
                  setRelationType(
                    defaultRelationForType(nextType),
                  );
                }}
              >
                {P114_ADDABLE_KNOWLEDGE_TYPES.map(
                  (type) => (
                    <option key={type} value={type}>
                      {ADD_TYPE_LABEL[type]}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span>Relationship</span>
              <select
                value={relationType}
                onChange={(event) =>
                  setRelationType(
                    event.target.value as P114AddReasoningItemInput["relationType"],
                  )
                }
              >
                {P114_ADDABLE_RELATION_TYPES.map(
                  (relation) => (
                    <option key={relation} value={relation}>
                      {RELATION_LABEL[relation]}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="graph-add-composer__target">
              <span>Connect to</span>
              <select
                value={targetItemId}
                onChange={(event) =>
                  setTargetItemId(event.target.value)
                }
              >
                {acceptedTargets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.type} · {item.id} · {item.text.slice(0, 72)}
                  </option>
                ))}
              </select>
            </label>

            <label className="graph-add-composer__text">
              <span>Argument / evidence text</span>
              <textarea
                value={addText}
                onChange={(event) =>
                  setAddText(event.target.value)
                }
                rows={3}
                placeholder="Add another claim, counterclaim, assumption, or piece of evidence."
              />
            </label>
          </div>

          <div className="graph-add-composer__footer">
            <p>
              Groundline will connect the new card using the relationship you chose, select it immediately, and clear stale semantic triage. It does not infer a hidden relationship for you.
            </p>
            <button
              type="submit"
              disabled={!addText.trim() || !targetItemId}
            >
              Add and inspect
            </button>
          </div>
        </form>
      ) : null}

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
