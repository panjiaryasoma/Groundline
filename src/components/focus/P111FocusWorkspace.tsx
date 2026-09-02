import {
  lazy,
  Suspense,
  useMemo,
  useState,
} from "react";

import type {
  KnowledgeItem,
  Revision,
  Workspace,
} from "../../domain/schema";
import {
  getP111SeededNextTarget,
  isP111AnalysisFresh,
  isP111SeededCycleComplete,
  p111ReviewedTargetIds,
} from "../../state/p111RepairLifecycle";
import type { GraphSelectionRequest } from "../../state/workspaceStore";

const ExpandedReasoningMap = lazy(async () => {
  const module = await import("./ExpandedReasoningMap");
  return { default: module.ExpandedReasoningMap };
});

interface P111FocusWorkspaceProps {
  workspace: Workspace;
  selectedItemId: string | null;
  focusedItemIds: string[];
  graphSelectionRequest?: GraphSelectionRequest;
  onSelectItem: (itemId: string | null) => void;
  onRunAnalysis: () => void;
  onFocusPrimaryRisk: () => void;
  onProposeRevision: () => void;
  onAccept: () => void;
  onEditAndAccept: (editedText: string) => void;
  onReject: () => void;
  onDefer: () => void;
  onReset: () => void;
  onExitExample: () => void;
}

const REASON_LABELS: Record<string, string> = {
  UNSUPPORTED_ASSUMPTION:
    "This assumption is not sufficiently supported by the represented evidence.",
  OVERGENERALIZATION:
    "This reasoning reaches beyond what the represented evidence safely establishes.",
  CONTRADICTED:
    "Represented counter-evidence conflicts with this reasoning item.",
  DEPENDENCY_ON_UNASSESSED_NODE:
    "This item depends on reasoning that still needs review.",
  SCOPE_MISMATCH:
    "The evidence and this reasoning item do not fully match in scope.",
};

function itemById(
  workspace: Workspace,
  id: string | null | undefined,
): KnowledgeItem | undefined {
  if (!id) return undefined;
  return workspace.items.find((item) => item.id === id);
}

function latestProposedRevision(
  workspace: Workspace,
): Revision | undefined {
  return [...workspace.revisions]
    .reverse()
    .find((revision) => revision.state === "PROPOSED");
}

function latestReviewedRevision(
  workspace: Workspace,
): Revision | undefined {
  return [...workspace.revisions]
    .reverse()
    .find((revision) => revision.state !== "PROPOSED");
}

function changedKnowledge(
  revision: Revision | undefined,
): boolean {
  return (
    revision?.state === "ACCEPTED" ||
    revision?.state === "EDITED_AND_ACCEPTED"
  );
}

export function P111FocusWorkspace({
  workspace,
  selectedItemId,
  focusedItemIds,
  graphSelectionRequest,
  onSelectItem,
  onRunAnalysis,
  onFocusPrimaryRisk,
  onProposeRevision,
  onAccept,
  onEditAndAccept,
  onReject,
  onDefer,
  onReset,
  onExitExample,
}: P111FocusWorkspaceProps) {
  const [mapExpanded, setMapExpanded] = useState(false);

  const analysisFresh = isP111AnalysisFresh(workspace);
  const cycleComplete = isP111SeededCycleComplete(workspace);
  const proposed = latestProposedRevision(workspace);
  const reviewed = latestReviewedRevision(workspace);
  const reviewedIds = p111ReviewedTargetIds(workspace);
  const nextTargetId = getP111SeededNextTarget(workspace);
  const nextTarget = itemById(workspace, nextTargetId);
  const acceptedConclusion = itemById(
    workspace,
    workspace.accepted_conclusion_id,
  );
  const proposalTarget = itemById(
    workspace,
    proposed?.target_item_id,
  );

  const nextTriage = workspace.triage_records.find(
    (record) => record.item_id === nextTargetId,
  );

  const unresolvedCriticalCount = useMemo(
    () =>
      workspace.triage_records.filter((record) => {
        if (record.state !== "CRITICAL") return false;
        if (reviewedIds.has(record.item_id)) return false;

        return workspace.items.some(
          (item) =>
            item.id === record.item_id &&
            item.state === "ACCEPTED",
        );
      }).length,
    [workspace, reviewedIds],
  );

  const affectedDownstream = useMemo(() => {
    if (!nextTargetId) return [];

    const triage = workspace.triage_records.find(
      (record) => record.item_id === nextTargetId,
    );

    return (triage?.downstream_accepted_ids ?? [])
      .map((id) => itemById(workspace, id))
      .filter((item): item is KnowledgeItem => Boolean(item));
  }, [workspace, nextTargetId]);

  const hasAcceptedRepair = workspace.revisions.some(
    (revision) =>
      revision.state === "ACCEPTED" ||
      revision.state === "EDITED_AND_ACCEPTED",
  );

  function runAndOpen() {
    onRunAnalysis();
    setMapExpanded(true);
  }

  function focusAndOpen() {
    onFocusPrimaryRisk();
    setMapExpanded(true);
  }

  function proposeAndOpen() {
    onFocusPrimaryRisk();
    onProposeRevision();
    setMapExpanded(true);
  }

  function reset() {
    onReset();
    setMapExpanded(false);
  }

  return (
    <>
      <nav
        className="focus-journey"
        aria-label="Groundline review steps"
      >
        <div className="focus-journey__intro">
          <span>Seeded demo · P11.1</span>
          <strong>
            Repair one reasoning risk at a time, then re-check before moving downstream.
          </strong>
        </div>

        <ol>
          <li className={!analysisFresh && !hasAcceptedRepair ? "is-current" : "is-complete"}>
            <span>1</span>
            <strong>Check</strong>
          </li>
          <li className={analysisFresh || proposed ? "is-current" : hasAcceptedRepair ? "is-complete" : ""}>
            <span>2</span>
            <strong>Repair</strong>
          </li>
          <li className={cycleComplete ? "is-complete" : hasAcceptedRepair && !analysisFresh ? "is-current" : ""}>
            <span>3</span>
            <strong>Re-check</strong>
          </li>
        </ol>
      </nav>

      <section
        className="workspace-toolbar workspace-toolbar--demo"
        aria-label="Example controls"
      >
        <div className="workspace-toolbar__group">
          <span className="workspace-toolbar__label">
            Example controls
          </span>

          <button
            type="button"
            onClick={runAndOpen}
            disabled={analysisFresh || Boolean(proposed) || cycleComplete}
          >
            Run analysis
          </button>

          <button
            type="button"
            onClick={focusAndOpen}
            disabled={!analysisFresh || Boolean(proposed) || cycleComplete}
          >
            Focus primary risk
          </button>

          <button
            type="button"
            onClick={proposeAndOpen}
            disabled={!analysisFresh || Boolean(proposed) || !nextTarget || cycleComplete}
          >
            Propose repair
          </button>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onExitExample}
        >
          Exit example
        </button>
      </section>

      <section className="focus-decision-strip">
        <div>
          <p className="eyebrow">Demo decision</p>
          <h2>{workspace.title}</h2>
          <p className="focus-question">
            {itemById(workspace, workspace.question_id)?.text}
          </p>
        </div>

        <article className="focus-current-conclusion">
          <span>Current accepted conclusion</span>
          <strong>
            {acceptedConclusion?.text ?? "No accepted conclusion."}
          </strong>
          <code>{workspace.accepted_conclusion_id ?? "NONE"}</code>
        </article>
      </section>

      {!analysisFresh && !hasAcceptedRepair && !cycleComplete ? (
        <section className="focus-start">
          <div className="focus-start__copy">
            <p className="eyebrow">Start here</p>
            <h3>Check the reasoning before acting on the conclusion.</h3>
            <p>
              Groundline will rank the represented reasoning risks. A red card is not automatically rewritten just because another red card exists.
            </p>
          </div>

          <button
            type="button"
            className="focus-primary-action"
            onClick={runAndOpen}
          >
            Check this reasoning
            <small>Find the highest-impact unresolved item</small>
          </button>
        </section>
      ) : null}

      {analysisFresh && nextTarget && !proposed && !cycleComplete ? (
        <section className="focus-analysis">
          <div className="focus-analysis__heading">
            <div>
              <p className="eyebrow">
                {unresolvedCriticalCount} critical {unresolvedCriticalCount === 1 ? "item" : "items"} remain in this analysis
              </p>
              <h3>Repair this reasoning item first.</h3>
            </div>
            <span className="focus-status">Review first</span>
          </div>

          <div className="focus-analysis-grid">
            <div className="focus-chain">
              <article className="focus-chain-card focus-chain-card--risk">
                <span>{nextTarget.type} · {nextTarget.id}</span>
                <strong>{nextTarget.text}</strong>
                <small>
                  {nextTriage?.state ?? "UNASSESSED"}
                  {nextTriage?.priority_score_internal != null
                    ? ` · priority ${nextTriage.priority_score_internal}`
                    : ""}
                </small>
              </article>

              {affectedDownstream.map((item) => (
                <div key={item.id}>
                  <div className="focus-chain-link">
                    <span>affects</span>
                  </div>
                  <article className="focus-chain-card">
                    <span>{item.type} · {item.id}</span>
                    <strong>{item.text}</strong>
                  </article>
                </div>
              ))}
            </div>

            <aside className="focus-context">
              <section>
                <p className="eyebrow">Why this item is next</p>
                <ul className="focus-reasons">
                  {(nextTriage?.reason_codes ?? []).map((code) => (
                    <li key={code}>
                      {REASON_LABELS[code] ?? code.toLowerCase().replaceAll("_", " ")}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <p className="eyebrow">Repair boundary</p>
                <p className="focus-muted">
                  The proposal will replace {nextTarget.id}, not every downstream item. Any downstream analysis touched by the change becomes stale until the next review pass.
                </p>
              </section>
            </aside>
          </div>

          <div className="focus-action-row focus-action-row--primary">
            <button
              type="button"
              className="focus-primary-action"
              onClick={proposeAndOpen}
            >
              Propose repair for {nextTarget.id}
              <small>Agent proposes. You still decide.</small>
            </button>
          </div>
        </section>
      ) : null}

      {proposed ? (
        <section className="focus-revision">
          <div className="focus-analysis__heading">
            <div>
              <p className="eyebrow">Proposal ready</p>
              <h3>
                The proposal targets {proposalTarget?.id ?? proposed.target_item_id}, not the whole graph.
              </h3>
            </div>
            <span className="focus-status">Human decision required</span>
          </div>

          <div className="focus-revision-compare">
            <article>
              <span>Accepted now</span>
              <p>{proposalTarget?.text ?? "Target unavailable."}</p>
            </article>
            <div className="focus-revision-arrow">→</div>
            <article className="focus-revision-compare__suggested">
              <span>Proposed revision</span>
              <p>{proposed.proposed_text}</p>
            </article>
          </div>

          <p className="focus-muted">
            Use the Revision Proposal panel in the reasoning workspace below to accept, edit, reject, or defer this proposal.
          </p>
        </section>
      ) : null}

      {!analysisFresh && hasAcceptedRepair && !cycleComplete && !proposed ? (
        <section className="focus-complete">
          <div className="focus-complete__status">
            <p className="eyebrow">Reasoning changed</p>
            <h3>Re-check before choosing the next repair.</h3>
          </div>

          <div className="focus-complete-grid">
            <article>
              <span>Why</span>
              <strong>Old triage is stale downstream</strong>
              <p>
                The accepted replacement only inherits SUPERSEDES lineage. Groundline does not copy the old support or dependency meaning onto it.
              </p>
            </article>
            <article>
              <span>Next action</span>
              <strong>Run analysis again</strong>
              <p>
                Only after the new pass may Groundline choose the next unresolved critical or review item.
              </p>
            </article>
          </div>

          <div className="focus-action-row">
            <button
              type="button"
              className="focus-primary-action"
              onClick={runAndOpen}
            >
              Re-check reasoning
              <small>Refresh triage before the next repair</small>
            </button>
          </div>
        </section>
      ) : null}

      {cycleComplete ? (
        <section className="focus-complete">
          <div className="focus-complete__status">
            <p className="eyebrow">P11.1 seeded repair walkthrough complete</p>
            <h3>All three original critical items received a human review outcome.</h3>
          </div>

          <div className="focus-complete-grid">
            <article>
              <span>Lineage</span>
              <strong>Old items stay traceable</strong>
              <p>
                Accepted replacements supersede their reviewed targets. Superseded cards remain visible in history.
              </p>
            </article>
            <article>
              <span>Epistemic state</span>
              <strong>Replacements are not silently re-validated</strong>
              <p>
                Their old semantic links were not inherited automatically. A fresh agent review is required before treating the new reasoning as assessed.
              </p>
            </article>
          </div>

          <div className="focus-action-row">
            <button
              type="button"
              className="focus-primary-action"
              onClick={reset}
            >
              Replay the example
              <small>Return to A-001, C-001, and CONC-001</small>
            </button>
          </div>
        </section>
      ) : null}

      {reviewed && !changedKnowledge(reviewed) && !analysisFresh && !cycleComplete ? (
        <p className="focus-muted">
          The last proposal was {reviewed.state.toLowerCase()}. Accepted knowledge did not change, so the existing semantic analysis may continue when you focus the next unresolved risk.
        </p>
      ) : null}

      {mapExpanded ? (
        <Suspense
          fallback={
            <section className="focus-map-loading">
              <p className="eyebrow">Loading reasoning map</p>
              <p>Preparing the interactive graph.</p>
            </section>
          }
        >
          <ExpandedReasoningMap
            workspace={workspace}
            selectedItemId={selectedItemId}
            focusedItemIds={focusedItemIds}
            graphSelectionRequest={graphSelectionRequest}
            onSelectItem={onSelectItem}
            onCollapse={() => setMapExpanded(false)}
            onAccept={onAccept}
            onEditAndAccept={onEditAndAccept}
            onReject={onReject}
            onDefer={onDefer}
            heading="Inspect the seeded decision as each risk is reviewed."
            showCollapse
          />
        </Suspense>
      ) : null}
    </>
  );
}
