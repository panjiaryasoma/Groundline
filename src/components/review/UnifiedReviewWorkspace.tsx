import { useEffect, useMemo, useRef } from "react";

import { getDownstreamDependencies } from "../../domain/dependencies";
import type {
  KnowledgeItem,
  Revision,
  Workspace,
} from "../../domain/schema";
import { rankTriageRecords } from "../../domain/workspaceAnalysis";
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
  onPrepareRepairTarget?: () => unknown;
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

function semanticReviewIsFresh(workspace: Workspace): boolean {
  if (workspace.triage_records.length === 0) return false;

  const eventTypes = workspace.audit_events.map(
    (event) => event.event_type,
  );
  const lastTriageIndex = eventTypes.lastIndexOf("TRIAGE");
  const lastAcceptedRevisionIndex =
    eventTypes.lastIndexOf("ACCEPT_REVISION");

  return (
    lastTriageIndex >= 0 &&
    lastTriageIndex > lastAcceptedRevisionIndex
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

function hasPreparedRepair(workspace: Workspace): boolean {
  const events = workspace.audit_events;
  const lastRepairIndex = events
    .map((event) =>
      event.event_type === "FOCUS" &&
      event.metadata?.requested_action === "PROPOSE_REPAIR"
        ? 1
        : 0,
    )
    .lastIndexOf(1);

  if (lastRepairIndex < 0) return false;

  const lifecycleTypes = new Set([
    "PROPOSE_REVISION",
    "ACCEPT_REVISION",
    "REJECT_REVISION",
  ]);

  let lastLifecycleIndex = -1;
  events.forEach((event, index) => {
    if (lifecycleTypes.has(event.event_type)) {
      lastLifecycleIndex = index;
    }
  });

  return lastRepairIndex > lastLifecycleIndex;
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
  onPrepareRepairTarget,
}: UnifiedReviewWorkspaceProps) {
  const proposed = latestProposedRevision(workspace);
  const reviewFresh = semanticReviewIsFresh(workspace);
  const nextTargetId = reviewFresh
    ? nextReviewTargetId(workspace)
    : null;
  const nextTarget = itemById(workspace, nextTargetId);
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

  const repairPrepared = hasPreparedRepair(workspace);
  const autoFocusKey =
    reviewFresh && nextTargetId
      ? `${latestTriageEventId(workspace)}:${nextTargetId}`
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
  }, [
    autoFocusKey,
    onFocusPrimaryRisk,
    proposed,
  ]);

  const focusedForMap = useMemo(() => {
    if (focusedItemIds.length > 0) {
      return focusedItemIds;
    }

    if (!nextTargetId) {
      return [];
    }

    const trace = getDownstreamDependencies(
      workspace,
      nextTargetId,
    );

    return [nextTargetId, ...trace.node_ids].filter(
      (id, index, values) =>
        values.indexOf(id) === index,
    );
  }, [focusedItemIds, nextTargetId, workspace]);

  const effectiveSelectedItemId =
    selectedItemId ??
    nextTargetId ??
    workspace.question_id;

  const showRunAnalysis =
    mode === "DEMO" &&
    !reviewFresh &&
    !proposed &&
    Boolean(onRunAnalysis);

  const showFocus =
    reviewFresh &&
    Boolean(nextTarget) &&
    !proposed &&
    Boolean(onFocusPrimaryRisk);

  const showDemoRepair =
    mode === "DEMO" &&
    reviewFresh &&
    Boolean(nextTarget) &&
    !proposed &&
    Boolean(onProposeRepair);

  const showCustomRepairPrep =
    mode === "CUSTOM" &&
    reviewFresh &&
    Boolean(nextTarget) &&
    !proposed &&
    !repairPrepared &&
    Boolean(onPrepareRepairTarget);

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
              : "Workspace"}
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

          {showDemoRepair ? (
            <button
              type="button"
              onClick={() => onProposeRepair?.()}
            >
              Propose repair
            </button>
          ) : null}

          {showCustomRepairPrep ? (
            <button
              type="button"
              onClick={() => onPrepareRepairTarget?.()}
            >
              Prepare repair
            </button>
          ) : null}

          {mode === "CUSTOM" &&
          repairPrepared &&
          !proposed ? (
            <span className="focus-muted">
              Repair target prepared for the agent.
            </span>
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
                  : workspace.triage_records.length > 0
                    ? "Review needs refresh"
                    : "Not reviewed yet"}
            </p>

            <h3>
              {proposed
                ? "Review the proposal without leaving the reasoning workspace."
                : reviewFresh && nextTarget
                  ? `${nextTarget.id} is the current primary risk.`
                  : reviewFresh
                    ? "No unresolved CRITICAL or REVIEW item remains."
                    : workspace.triage_records.length > 0
                      ? "The reasoning changed after the last semantic review."
                      : mode === "DEMO"
                        ? "Run the seeded analysis, then inspect the selected risk in the graph."
                        : "Your reasoning is mapped and ready for agent review."}
            </h3>
          </div>

          {proposed ? (
            <span className="focus-status">
              Human decision required
            </span>
          ) : reviewFresh && nextTarget ? (
            <span className="focus-status">
              {workspace.triage_records.find(
                (record) =>
                  record.item_id === nextTarget.id,
              )?.state ?? "REVIEW"}
            </span>
          ) : null}
        </div>

        <p className="focus-muted">
          {proposed
            ? "The graph, Inspector, Revision Proposal, and Decision History below are still the same shared state. Accept, edit, reject, or defer from the proposal panel."
            : reviewFresh && nextTarget
              ? "Groundline keeps the current risk and its downstream reasoning highlighted. Click any other card to inspect it; Focus primary risk returns to this exact item."
              : workspace.triage_records.length > 0
                ? "Old semantic labels are not reused after accepted reasoning changes. The current graph stays visible while a fresh WebMCP review is obtained."
                : mode === "CUSTOM"
                  ? "Keep mapping, add reasoning cards, and inspect any card now. A WebMCP agent can review this same canonical workspace; when fresh triage arrives, Groundline focuses the highest-priority unresolved risk here automatically."
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
