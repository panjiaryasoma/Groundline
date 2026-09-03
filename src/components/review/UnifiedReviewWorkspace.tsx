import { useEffect, useMemo, useRef } from "react";

import { getDownstreamDependencies } from "../../domain/dependencies";
import type {
  KnowledgeItem,
  Revision,
  Workspace,
} from "../../domain/schema";
import { rankTriageRecords } from "../../domain/workspaceAnalysis";
import {
  getP112CustomStructuralReviewTarget,
  isP112CustomStructuralFallbackAllowed,
} from "../../state/p112CustomSemanticGate";
import type { GraphSelectionRequest } from "../../state/workspaceStore";
import { ExpandedReasoningMap } from "../focus/ExpandedReasoningMap";

export type UnifiedReviewMode = "DEMO" | "CUSTOM";

export interface UnifiedReviewWorkspaceProps {
  mode: UnifiedReviewMode;
  workspace: Workspace;
  selectedItemId: string | null;
  focusedItemIds: string[];
  graphSelectionRequest?: GraphSelectionRequest;
  onSelectItem: (itemId: string | null) => void;
  onAccept: () => void;
  onEditAndAccept: (editedText: string) => void;
  onReject: () => void;
  onDefer: () => void;
  onExit: () => void;
  onEditInput?: () => void;
  onResetDemo?: () => void;
  onRunAnalysis?: () => void;
  onFocusPrimaryRisk?: () => unknown;
  onProposeRepair?: () => unknown;
}

function itemById(
  workspace: Workspace,
  itemId: string | null | undefined,
): KnowledgeItem | undefined {
  if (!itemId) return undefined;
  return workspace.items.find((item) => item.id === itemId);
}

function latestProposedRevision(
  workspace: Workspace,
): Revision | undefined {
  return [...workspace.revisions]
    .reverse()
    .find((revision) => revision.state === "PROPOSED");
}

function lastEventIndex(
  workspace: Workspace,
  eventType: Workspace["audit_events"][number]["event_type"],
): number {
  return workspace.audit_events
    .map((event) => event.event_type)
    .lastIndexOf(eventType);
}

function semanticReviewIsFresh(workspace: Workspace): boolean {
  if (workspace.triage_records.length === 0) return false;

  const lastTriageIndex = lastEventIndex(workspace, "TRIAGE");
  const lastAcceptedRevisionIndex = lastEventIndex(
    workspace,
    "ACCEPT_REVISION",
  );

  return (
    lastTriageIndex >= 0 &&
    lastTriageIndex > lastAcceptedRevisionIndex
  );
}

function acceptedKnowledgeChangedAfterLastTriage(
  workspace: Workspace,
): boolean {
  const lastAcceptedRevisionIndex = lastEventIndex(
    workspace,
    "ACCEPT_REVISION",
  );

  return (
    lastAcceptedRevisionIndex >= 0 &&
    lastAcceptedRevisionIndex >
      lastEventIndex(workspace, "TRIAGE")
  );
}

function reviewedRiskIds(workspace: Workspace): Set<string> {
  const reviewed = new Set<string>();

  for (const revision of workspace.revisions) {
    if (revision.state === "PROPOSED") continue;

    const proposalEvent = workspace.audit_events.find(
      (event) =>
        event.event_type === "PROPOSE_REVISION" &&
        event.entity_ids.includes(revision.revision_id),
    );
    const primaryRiskId =
      proposalEvent?.metadata?.primary_risk_id;

    if (typeof primaryRiskId === "string") {
      reviewed.add(primaryRiskId);
    } else {
      reviewed.add(revision.target_item_id);
    }
  }

  return reviewed;
}

function nextReviewTargetId(
  workspace: Workspace,
): string | null {
  const reviewed = reviewedRiskIds(workspace);

  return (
    rankTriageRecords(workspace.triage_records)
      .filter(
        (record) =>
          record.state === "CRITICAL" ||
          record.state === "REVIEW",
      )
      .find((record) => {
        if (reviewed.has(record.item_id)) return false;

        return workspace.items.some(
          (item) =>
            item.id === record.item_id &&
            item.state === "ACCEPTED",
        );
      })?.item_id ?? null
  );
}

function latestTriageEventId(workspace: Workspace): string {
  return (
    [...workspace.audit_events]
      .reverse()
      .find((event) => event.event_type === "TRIAGE")
      ?.event_id ?? "NO-TRIAGE"
  );
}

export function UnifiedReviewWorkspace({
  mode,
  workspace,
  selectedItemId,
  focusedItemIds,
  graphSelectionRequest,
  onSelectItem,
  onAccept,
  onEditAndAccept,
  onReject,
  onDefer,
  onExit,
  onEditInput,
  onResetDemo,
  onRunAnalysis,
  onFocusPrimaryRisk,
  onProposeRepair,
}: UnifiedReviewWorkspaceProps) {
  const proposed = latestProposedRevision(workspace);
  const reviewFresh = semanticReviewIsFresh(workspace);
  const semanticTargetId = reviewFresh
    ? nextReviewTargetId(workspace)
    : null;
  const structuralTargetId =
    mode === "CUSTOM" && !reviewFresh
      ? getP112CustomStructuralReviewTarget(workspace)
      : null;
  const currentTargetId = semanticTargetId ?? structuralTargetId;
  const currentTarget = itemById(workspace, currentTargetId);
  const structuralFirstPass = Boolean(
    mode === "CUSTOM" &&
      structuralTargetId &&
      !reviewFresh,
  );
  const acceptedConclusion = itemById(
    workspace,
    workspace.accepted_conclusion_id,
  );

  const criticalCount = workspace.triage_records.filter(
    (record) => record.state === "CRITICAL",
  ).length;
  const reviewCount = workspace.triage_records.filter(
    (record) => record.state === "REVIEW",
  ).length;
  const stableCount = workspace.triage_records.filter(
    (record) => record.state === "STABLE",
  ).length;
  const unlinkedCount = workspace.items.filter((item) =>
    item.tags?.includes("unlinked"),
  ).length;

  const customStructuralFallbackAllowed =
    mode === "CUSTOM" &&
    isP112CustomStructuralFallbackAllowed(workspace);
  const reviewNeedsRefresh =
    acceptedKnowledgeChangedAfterLastTriage(workspace) ||
    (workspace.triage_records.length > 0 && !reviewFresh);

  const autoFocusKey =
    reviewFresh && semanticTargetId
      ? `${latestTriageEventId(workspace)}:${semanticTargetId}`
      : null;
  const lastAutoFocusKey = useRef<string | null>(null);

  useEffect(() => {
    if (
      !autoFocusKey ||
      !onFocusPrimaryRisk ||
      proposed ||
      lastAutoFocusKey.current === autoFocusKey
    ) {
      return;
    }

    lastAutoFocusKey.current = autoFocusKey;
    onFocusPrimaryRisk();
  }, [autoFocusKey, onFocusPrimaryRisk, proposed]);

  const focusedForMap = useMemo(() => {
    if (focusedItemIds.length > 0) {
      return focusedItemIds;
    }

    if (!currentTargetId) {
      return [];
    }

    const trace = getDownstreamDependencies(
      workspace,
      currentTargetId,
    );

    return [currentTargetId, ...trace.node_ids].filter(
      (id, index, values) =>
        values.indexOf(id) === index,
    );
  }, [focusedItemIds, currentTargetId, workspace]);

  const effectiveSelectedItemId =
    selectedItemId ??
    currentTargetId ??
    workspace.question_id;

  const showRunAnalysis =
    !reviewFresh &&
    !proposed &&
    Boolean(onRunAnalysis) &&
    (mode === "DEMO" ||
      (customStructuralFallbackAllowed &&
        !structuralTargetId));

  const showFocus =
    Boolean(currentTarget) &&
    !proposed &&
    Boolean(onFocusPrimaryRisk);

  const showRepair =
    Boolean(currentTarget) &&
    !proposed &&
    Boolean(onProposeRepair);

  const understandComplete = Boolean(proposed);
  const decideComplete =
    !proposed &&
    workspace.revisions.some(
      (revision) => revision.state !== "PROPOSED",
    );

  return (
    <>
      <nav
        className="focus-journey"
        aria-label="Groundline review steps"
      >
        <div className="focus-journey__intro">
          <span>
            {mode === "DEMO"
              ? "Seeded example"
              : "Your decision"}
          </span>
          <strong>
            Map the reasoning, inspect exact cards, and
            review agent proposals in one live workspace.
          </strong>
        </div>

        <ol>
          <li className="is-complete">
            <span>1</span>
            <strong>Check</strong>
          </li>
          <li
            className={
              understandComplete
                ? "is-complete"
                : "is-current"
            }
          >
            <span>2</span>
            <strong>Understand</strong>
          </li>
          <li
            className={
              proposed
                ? "is-current"
                : decideComplete
                  ? "is-complete"
                  : ""
            }
          >
            <span>3</span>
            <strong>Decide</strong>
          </li>
        </ol>
      </nav>

      <section
        className="workspace-toolbar workspace-toolbar--demo"
        aria-label={
          mode === "DEMO"
            ? "Example controls"
            : "Workspace controls"
        }
      >
        <div className="workspace-toolbar__group">
          <span className="workspace-toolbar__label">
            {mode === "DEMO"
              ? "Example controls"
              : "Workspace controls"}
          </span>

          {showRunAnalysis ? (
            <button
              type="button"
              onClick={() => onRunAnalysis?.()}
            >
              Run analysis
            </button>
          ) : null}

          {showFocus ? (
            <button
              type="button"
              onClick={() => onFocusPrimaryRisk?.()}
            >
              Focus primary risk
            </button>
          ) : null}

          {showRepair ? (
            <button
              type="button"
              onClick={() => onProposeRepair?.()}
            >
              Propose repair
            </button>
          ) : null}

          {mode === "CUSTOM" && onEditInput ? (
            <button type="button" onClick={onEditInput}>
              Edit inputs
            </button>
          ) : null}

          {mode === "DEMO" && onResetDemo ? (
            <button type="button" onClick={onResetDemo}>
              Replay example
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onExit}
        >
          {mode === "DEMO"
            ? "Exit example"
            : "Exit workspace"}
        </button>
      </section>

      <section className="focus-decision-strip">
        <div>
          <p className="eyebrow">
            {mode === "DEMO"
              ? "Example decision"
              : "Decision"}
          </p>
          <h2>{workspace.title}</h2>
          <p className="focus-question">
            {itemById(
              workspace,
              workspace.question_id,
            )?.text}
          </p>
        </div>

        <article className="focus-current-conclusion">
          <span>Current accepted conclusion</span>
          <strong>
            {acceptedConclusion?.text ??
              "No accepted conclusion."}
          </strong>
          <code>
            {workspace.accepted_conclusion_id ?? "NONE"}
          </code>
        </article>
      </section>

      <section
        className="focus-analysis"
        aria-label="Current review status"
      >
        <div className="focus-analysis__heading">
          <div>
            <p className="eyebrow">
              {proposed
                ? "Agent proposal"
                : reviewFresh
                  ? `${criticalCount} CRITICAL · ${reviewCount} REVIEW · ${stableCount} STABLE`
                  : structuralFirstPass
                    ? "Structural first pass"
                    : reviewNeedsRefresh
                      ? "Review needs refresh"
                      : "Not reviewed yet"}
            </p>

            <h3>
              {proposed
                ? "Review the proposal without leaving the reasoning workspace."
                : reviewFresh && currentTarget
                  ? `${currentTarget.id} is the current primary risk.`
                  : reviewFresh
                    ? "No unresolved CRITICAL or REVIEW item remains."
                    : structuralFirstPass && currentTarget
                      ? `${currentTarget.id} is the current review target.`
                      : reviewNeedsRefresh
                        ? "The reasoning changed after the last accepted review."
                        : mode === "DEMO"
                          ? "Run the seeded analysis, then inspect the selected risk in the graph."
                          : "Run analysis to select a first review target."}
            </h3>
          </div>

          {proposed ? (
            <span className="focus-status">
              Human decision required
            </span>
          ) : reviewFresh && currentTarget ? (
            <span className="focus-status">
              {workspace.triage_records.find(
                (record) =>
                  record.item_id === currentTarget.id,
              )?.state ?? "REVIEW"}
            </span>
          ) : structuralFirstPass ? (
            <span className="focus-status">
              STRUCTURAL
            </span>
          ) : null}
        </div>

        <p className="focus-muted">
          {proposed
            ? "The graph, Inspector, Revision Proposal, and Decision History below are still the same shared state. Accept, edit, reject, or defer from the proposal panel."
            : reviewFresh && currentTarget
              ? "Groundline keeps the current risk and its downstream reasoning highlighted. Click any other card to inspect it; Focus primary risk returns to this exact item. Propose repair creates a reviewable draft for this item."
              : structuralFirstPass && currentTarget
                ? "This target came from Groundline's deterministic structural first pass, not an AI semantic risk judgment. It does not invent CRITICAL or REVIEW labels. Focus primary risk returns to this exact card; Propose repair creates a clearly marked local deterministic draft that you still decide on."
                : reviewNeedsRefresh
                  ? mode === "CUSTOM"
                    ? "Accepted reasoning changed, so Groundline will not start another structural fallback cycle. A fresh WebMCP semantic review can continue from the current graph."
                    : "The example reasoning changed. Run analysis again to refresh the seeded review before continuing."
                  : mode === "CUSTOM"
                    ? "Run analysis performs a deterministic first pass over the mapped structure so the real decision flow can continue in the browser. It does not pretend to be a WebMCP semantic review; a connected agent can later provide richer triage over this same workspace."
                    : "The example uses deterministic seeded results so you can see the full interaction loop without an external agent."}
        </p>

        {mode === "CUSTOM" &&
        unlinkedCount > 0 ? (
          <p className="focus-muted">
            {unlinkedCount} human-authored card
            {unlinkedCount === 1 ? " is" : "s are"}{" "}
            UNLINKED. An agent may suggest semantic
            connections, but nothing is committed until
            you approve the proposal.
          </p>
        ) : null}
      </section>

      <ExpandedReasoningMap
        workspace={workspace}
        selectedItemId={effectiveSelectedItemId}
        focusedItemIds={focusedForMap}
        graphSelectionRequest={graphSelectionRequest}
        onSelectItem={onSelectItem}
        onAccept={onAccept}
        onEditAndAccept={onEditAndAccept}
        onReject={onReject}
        onDefer={onDefer}
        heading="Work directly with the reasoning map."
      />
    </>
  );
}
