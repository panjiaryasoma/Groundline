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
  addP114ReasoningItem,
  getP114UnlinkedReasoningItemIds,
  isP114ReasoningItemUnlinked,
  type P114AddReasoningItemInput,
} from "../../state/p114AddReasoningItem";
import {
  useP117AgentReviewStore,
  type P117AnyConnectionProposal,
} from "../../state/p117AgentReview";
import {
  deleteSelectedReasoningItem,
  getDeleteSelectedItemBlockReason,
} from "../../state/deleteReasoningItem";
import {
  useWorkspaceStore,
  type GraphSelectionRequest,
} from "../../state/workspaceStore";
import { buildSemanticReviewToken } from "../../webmcp/semanticReviewContract";
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
    x: baseX + index * horizontalGap + (layer % 2 === 0 ? 0 : 90),
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

    const triage = getTriageRecord(workspace.triage_records, item.id);
    const focused = focusedItemIds.includes(item.id);
    const faulted = triage?.state === "CRITICAL";
    const unlinked = isP114ReasoningItemUnlinked(workspace, item.id);

    return {
      id: item.id,
      position: getLayeredPosition(item, index),
      data: {
        label: (
          <div className="reasoning-node__inner" data-item-id={item.id}>
            <div className="reasoning-node__meta">
              <span>{TYPE_LABEL[item.type]}</span>
              <span>{item.id}</span>
            </div>

            <div className="reasoning-node__text">{item.text}</div>

            <div className="reasoning-node__footer">
              <span className="knowledge-state">{item.state}</span>

              {unlinked ? (
                <span className="p115-unlinked-badge">UNLINKED</span>
              ) : null}

              {triage ? (
                <span
                  className={`triage-badge triage-badge--${triage.state.toLowerCase()}`}
                >
                  {triage.state}
                </span>
              ) : !unlinked ? (
                <span className="triage-badge triage-badge--unassessed">
                  UNASSESSED
                </span>
              ) : null}
            </div>
          </div>
        ),
      },
      className: [
        "reasoning-node",
        `reasoning-node--${item.type.toLowerCase()}`,
        faulted ? "reasoning-node--faulted" : "",
        unlinked ? "reasoning-node--unlinked" : "",
        focused ? "reasoning-node--focused" : "",
        item.id === selectedItemId ? "reasoning-node--app-selected" : "",
        item.state === "SUPERSEDED" ? "reasoning-node--superseded" : "",
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

function buildSuggestedEdges(
  proposals: P117AnyConnectionProposal[],
): Edge[] {
  return proposals.map((proposal, index) => ({
    id: `P15-SUGGESTED-${index}-${proposal.from_id}-${proposal.to_id}`,
    source: proposal.from_id,
    target: proposal.to_id,
    label: proposal.type ?? "SUGGESTED",
    type: "smoothstep",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
    },
    selectable: false,
    focusable: false,
    className: "reasoning-edge reasoning-edge--suggested",
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
  const proposalBatch = useP117AgentReviewStore(
    (state) => state.proposalBatch,
  );
  const [addComposerOpen, setAddComposerOpen] = useState(false);
  const [addType, setAddType] = useState<
    P114AddReasoningItemInput["type"]
  >("CLAIM");
  const [addText, setAddText] = useState("");

  const structuralNodes = useMemo(
    () => buildNodes(workspace, focusedItemIds, selectedItemId),
    [workspace, focusedItemIds, selectedItemId],
  );

  const [nodes, setNodes] = useState<Node[]>(structuralNodes);

  const hasPendingRevision = workspace.revisions.some(
    (revision) => revision.state === "PROPOSED",
  );

  const unlinkedItemIds = useMemo(
    () => getP114UnlinkedReasoningItemIds(workspace),
    [workspace],
  );

  useEffect(() => {
    setNodes((current) =>
      mergePreservedPositions(current, structuralNodes),
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

  const currentReviewToken = useMemo(
    () => buildSemanticReviewToken(workspace),
    [workspace],
  );
  const pendingProposals = useMemo(
    () =>
      proposalBatch?.reviewToken === currentReviewToken
        ? proposalBatch.proposals
        : [],
    [proposalBatch, currentReviewToken],
  );
  const edges = useMemo(
    () => [
      ...buildEdges(workspace),
      ...buildSuggestedEdges(pendingProposals),
    ],
    [workspace, pendingProposals],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((current) => applyGraphNodeChanges(current, changes));
    },
    [],
  );

  const selectedNodeCount = nodes.filter((node) => node.selected).length;
  const deleteBlockReason =
    experienceMode === "CUSTOM" &&
    selectedNodeCount === 1 &&
    selectedItemId
      ? getDeleteSelectedItemBlockReason(workspace, selectedItemId)
      : null;

  const selectAllNodes = useCallback(() => {
    setNodes((current) => setAllGraphNodesSelected(current, true));
  }, []);

  const clearNodeSelection = useCallback(() => {
    setNodes((current) => setAllGraphNodesSelected(current, false));
    onSelectItem(null);
  }, [onSelectItem]);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      const ids = getSelectedNodeIds(selectedNodes);

      if (ids.length === 1) {
        onSelectItem(ids[0]);
        return;
      }

      if (selectedItemId && ids.includes(selectedItemId)) {
        return;
      }

      onSelectItem(ids.at(-1) ?? null);
    },
    [onSelectItem, selectedItemId],
  );

  function submitAddedReasoningItem() {
    if (!addText.trim()) return;

    addP114ReasoningItem({
      type: addType,
      text: addText,
    });

    setAddText("");
  }

  function handleDeleteSelectedItem() {
    if (
      experienceMode !== "CUSTOM" ||
      selectedNodeCount !== 1 ||
      !selectedItemId ||
      deleteBlockReason
    ) {
      return;
    }

    const selectedItem = workspace.items.find(
      (item) => item.id === selectedItemId,
    );
    if (!selectedItem) return;

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Delete ${selectedItem.type.toLowerCase()} ${selectedItem.id}? This removes only this selected card and its represented connections. Decision history remains auditable.`,
      )
    ) {
      return;
    }

    deleteSelectedReasoningItem();
  }

  return (
    <section className="graph-panel" aria-label="Groundline reasoning graph">
      <div className="graph-help">
        <div className="graph-help__copy">
          <span>Drag one card to move only that card.</span>
          <span>Ctrl/Shift-click selects multiple.</span>
          <span>Drag any selected card to move the group.</span>
          <span>Dashed gold = suggested connection; dashed rust = challenge.</span>
        </div>

        <div className="graph-help__actions">
          {experienceMode === "CUSTOM" ? (
            <button
              type="button"
              className="graph-add-trigger"
              onClick={() => setAddComposerOpen(true)}
              disabled={hasPendingRevision}
              title={
                hasPendingRevision
                  ? "Finish the pending human revision review first."
                  : "Add another human-authored reasoning item without inventing a semantic link."
              }
            >
              + Add reasoning item
            </button>
          ) : null}

          {experienceMode === "CUSTOM" && unlinkedItemIds.length > 0 ? (
            <span className="graph-unlinked-status">
              {unlinkedItemIds.length} unlinked
            </span>
          ) : null}

          <button type="button" onClick={selectAllNodes}>
            Select all
          </button>

          {selectedNodeCount > 0 ? (
            <button type="button" onClick={clearNodeSelection}>
              Clear selection
            </button>
          ) : null}

          {experienceMode === "CUSTOM" &&
          selectedNodeCount === 1 &&
          selectedItemId ? (
            <button
              type="button"
              onClick={handleDeleteSelectedItem}
              disabled={Boolean(deleteBlockReason)}
              title={
                deleteBlockReason ??
                "Delete only the currently selected reasoning item."
              }
            >
              Delete selected item
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
              <strong>New human-authored card</strong>
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
                onChange={(event) =>
                  setAddType(
                    event.target.value as P114AddReasoningItemInput["type"],
                  )
                }
              >
                {P114_ADDABLE_KNOWLEDGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ADD_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </label>

            <label className="graph-add-composer__text">
              <span>Argument / evidence text</span>
              <textarea
                value={addText}
                onChange={(event) => setAddText(event.target.value)}
                rows={4}
                placeholder="Add another claim, counterclaim, assumption, or piece of evidence."
              />
            </label>
          </div>

          <div className="graph-add-composer__notice">
            <span>UNLINKED UNTIL REVIEW</span>
            <p>
              Add as many cards as you need. Groundline will not guess SUPPORTS,
              CHALLENGES, DEPENDS_ON, or QUALIFIES while you are mapping the
              reasoning. Run analysis can surface likely attachment points as
              dashed candidates without committing semantic meaning.
            </p>
          </div>

          <div className="graph-add-composer__footer">
            <p>
              New cards are selected immediately for inspection. They remain
              explicit UNLINKED reasoning until you approve a connection. A local
              candidate matcher may suggest where a card belongs, while a WebMCP
              agent may propose typed semantic relations; neither changes the
              canonical graph without your approval.
            </p>
            <div className="graph-add-composer__actions">
              <button type="submit" disabled={!addText.trim()}>
                Add card
              </button>
              <button
                type="button"
                onClick={() => setAddComposerOpen(false)}
              >
                Done mapping
              </button>
            </div>
          </div>

          <small className="graph-add-composer__resize-hint">
            Resize this panel from the corner if it covers a card.
          </small>
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
      >
        <Background gap={18} size={0.8} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </section>
  );
}
