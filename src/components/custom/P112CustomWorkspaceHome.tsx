import {
  lazy,
  Suspense,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getIntakeDiagnostics,
  type IntakeDiagnostic,
} from "../../domain/intakeDiagnostics";
import type {
  KnowledgeItem,
  Workspace,
} from "../../domain/schema";
import type {
  GraphSelectionRequest,
} from "../../state/workspaceStore";

function safeScrollIntoView(
  element: Element | null,
  options: ScrollIntoViewOptions,
) {
  if (!element) return;

  const scrollIntoView = (element as HTMLElement).scrollIntoView;

  if (typeof scrollIntoView === "function") {
    scrollIntoView.call(element, options);
  }
}

const ExpandedReasoningMap = lazy(async () => {
  const module = await import("../focus/ExpandedReasoningMap");

  return {
    default: module.ExpandedReasoningMap,
  };
});

interface P112CustomWorkspaceHomeProps {
  workspace: Workspace;
  selectedItemId: string | null;
  focusedItemIds: string[];
  graphSelectionRequest?: GraphSelectionRequest;
  onSelectItem: (itemId: string | null) => void;
  onFocusPrimaryRisk: () => {
    targetId: string;
    focusedItemIds: string[];
    basis: "SEMANTIC_TRIAGE" | "STRUCTURAL_FALLBACK";
  } | null;
  onProposeRepair: () => {
    targetId: string;
    focusedItemIds: string[];
    basis: "SEMANTIC_TRIAGE" | "STRUCTURAL_FALLBACK";
  } | null;
  onAccept: () => void;
  onEditAndAccept: (editedText: string) => void;
  onReject: () => void;
  onDefer: () => void;
  onEdit: () => void;
  onBackToStart: () => void;
}

function tagged(
  workspace: Workspace,
  tag: string,
): KnowledgeItem | undefined {
  return (
    [...workspace.items]
      .reverse()
      .find(
        (item) =>
          item.state === "ACCEPTED" && item.tags?.includes(tag),
      ) ??
    [...workspace.items]
      .reverse()
      .find((item) => item.tags?.includes(tag))
  );
}

function DiagnosticCard({
  diagnostic,
}: {
  diagnostic: IntakeDiagnostic;
}) {
  return (
    <article
      className={`custom-diagnostic custom-diagnostic--${diagnostic.severity.toLowerCase()}`}
    >
      <span>
        {diagnostic.severity === "OPTIONAL"
          ? "Optional improvement"
          : "Ready"}
      </span>
      <strong>{diagnostic.title}</strong>
      <p>{diagnostic.explanation}</p>
    </article>
  );
}

export function P112CustomWorkspaceHome({
  workspace,
  selectedItemId,
  focusedItemIds,
  graphSelectionRequest,
  onSelectItem,
  onFocusPrimaryRisk,
  onProposeRepair,
  onAccept,
  onEditAndAccept,
  onReject,
  onDefer,
  onEdit,
  onBackToStart,
}: P112CustomWorkspaceHomeProps) {
  const [checked, setChecked] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [agentActionNotice, setAgentActionNotice] =
    useState<"FOCUS" | "REPAIR" | null>(null);

  const analysisResultRef = useRef<HTMLDivElement | null>(null);

  const question = tagged(workspace, "decision-question");
  const conclusion = tagged(workspace, "current-answer");
  const reason = tagged(workspace, "main-reason");
  const assumption = tagged(workspace, "stated-assumption");
  const evidence = tagged(workspace, "main-evidence");
  const source = tagged(workspace, "user-source");

  const diagnostics = useMemo(
    () => getIntakeDiagnostics(workspace),
    [workspace],
  );

  const optionalDiagnostics = diagnostics.filter(
    (item) => item.code !== "READY_FOR_AGENT_REVIEW",
  );

  const proposedRevision = [...workspace.revisions]
    .reverse()
    .find((revision) => revision.state === "PROPOSED");

  const eventTypes = workspace.audit_events.map(
    (event) => event.event_type,
  );
  const lastTriageIndex = eventTypes.lastIndexOf("TRIAGE");
  const lastAcceptedRevisionIndex =
    eventTypes.lastIndexOf("ACCEPT_REVISION");

  const semanticAnalysisStale =
    lastAcceptedRevisionIndex >= 0 &&
    lastAcceptedRevisionIndex > lastTriageIndex;
  const hasSemanticTriage = workspace.triage_records.length > 0;
  const semanticReviewReady =
    hasSemanticTriage && !semanticAnalysisStale;

  const criticalCount = workspace.triage_records.filter(
    (record) => record.state === "CRITICAL",
  ).length;
  const reviewCount = workspace.triage_records.filter(
    (record) => record.state === "REVIEW",
  ).length;
  const stableCount = workspace.triage_records.filter(
    (record) => record.state === "STABLE",
  ).length;

  const latestPrimaryFocusEvent = [...workspace.audit_events]
    .reverse()
    .find(
      (event) =>
        event.event_type === "FOCUS" &&
        event.metadata?.requested_action === "FOCUS_PRIMARY_RISK",
    );

  const latestPrimaryRiskId =
    typeof latestPrimaryFocusEvent?.metadata?.primary_item_id === "string"
      ? latestPrimaryFocusEvent.metadata.primary_item_id
      : null;

  const latestPrimaryRisk = latestPrimaryRiskId
    ? workspace.items.find((item) => item.id === latestPrimaryRiskId)
    : undefined;

  const latestPrimaryRiskTriage = latestPrimaryRiskId
    ? workspace.triage_records.find(
        (record) => record.item_id === latestPrimaryRiskId,
      )
    : undefined;

  const latestPrimaryRiskReviewed = latestPrimaryRiskId
    ? workspace.revisions.some((revision) => {
        if (revision.state === "PROPOSED") {
          return false;
        }

        const proposalEvent = workspace.audit_events.find(
          (event) =>
            event.event_type === "PROPOSE_REVISION" &&
            event.entity_ids.includes(revision.revision_id),
        );

        return (
          proposalEvent?.metadata?.primary_risk_id === latestPrimaryRiskId
        );
      })
    : false;

  const activePrimaryRisk =
    semanticReviewReady &&
    !latestPrimaryRiskReviewed &&
    (latestPrimaryRiskTriage?.state === "CRITICAL" ||
      latestPrimaryRiskTriage?.state === "REVIEW")
      ? latestPrimaryRisk
      : undefined;

  function runReadinessAnalysis() {
    setChecked(true);
    setAgentActionNotice(null);
    setMapOpen(true);

    window.requestAnimationFrame(() => {
      safeScrollIntoView(analysisResultRef.current, {
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function focusPrimaryRisk() {
    const result = onFocusPrimaryRisk();

    if (!result) {
      setAgentActionNotice(null);
      return null;
    }

    setAgentActionNotice("FOCUS");
    setMapOpen(true);

    window.requestAnimationFrame(() => {
      safeScrollIntoView(
        document.querySelector(
          '[aria-label="Groundline reasoning graph"]',
        ),
        {
          behavior: "smooth",
          block: "center",
        },
      );
    });

    return result;
  }

  function proposeRepair() {
    const result = onProposeRepair();

    if (!result) {
      setAgentActionNotice(null);
      return null;
    }

    setAgentActionNotice("REPAIR");
    setMapOpen(true);

    window.requestAnimationFrame(() => {
      safeScrollIntoView(
        document.querySelector('[aria-label="Revision proposal"]'),
        {
          behavior: "smooth",
          block: "center",
        },
      );
    });

    return result;
  }

  const mappedRows = [
    {
      label: "You are deciding",
      value: question?.text,
    },
    {
      label: "Your current answer",
      value: conclusion?.text,
    },
    {
      label: "Your main reason",
      value: reason?.text,
    },
    {
      label: "This must be true",
      value: assumption?.text,
    },
    {
      label: "What supports the reason",
      value: evidence?.text,
    },
    {
      label: "Where it came from",
      value: source?.source_metadata?.url,
    },
  ];

  return (
    <>
      <section className="custom-workspace-heading">
        <div>
          <p className="eyebrow">Your reasoning workspace</p>
          <h2>Groundline put your answers in the right places.</h2>
          <p>
            You do not need to organize a graph. Start by checking whether
            anything important is missing.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onBackToStart}
        >
          Exit workspace
        </button>
      </section>

      <section className="custom-mapped">
        <div className="custom-mapped__heading">
          <p className="eyebrow">What happened to your input</p>
          <h3>
            Nothing disappeared. Groundline mapped each answer to a role in the
            reasoning.
          </h3>
        </div>

        <div className="custom-mapped-list">
          {mappedRows.map((row) => (
            <article key={row.label}>
              <span>{row.label}</span>
              <p>{row.value || "You did not add this yet."}</p>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="focus-text-action"
          onClick={onEdit}
        >
          Edit what I entered
        </button>
      </section>

      <section className="custom-next">
        <div>
          <p className="eyebrow">What do I do now?</p>
          <h3>Check the reasoning structure first.</h3>
          <p>
            This check only verifies that the minimum reasoning pieces exist and
            opens the workspace. It does not pretend to understand meaning or
            assign semantic risk labels.
          </p>
        </div>

        <div className="custom-analysis-action">
          <button
            type="button"
            className="focus-primary-action"
            onClick={runReadinessAnalysis}
          >
            Check reasoning structure
            <small>Verify minimum pieces and open the workspace</small>
          </button>

          <span>
            CRITICAL, REVIEW, and STABLE appear only after an AI agent reviews
            the current graph through WebMCP and Groundline validates the result.
          </span>
        </div>

        {checked ? (
          <div
            ref={analysisResultRef}
            className="custom-analysis-result"
            tabIndex={-1}
          >
            <div className="custom-analysis-result__heading">
              <p className="eyebrow">Structure check</p>
              <h4>Your reasoning map is ready.</h4>
              <p>
                Decision, current answer, and main reason are present. Missing
                optional context does not block mapping or later semantic review.
              </p>
            </div>

            {optionalDiagnostics.length > 0 ? (
              <section className="custom-optional-improvements">
                <div className="custom-optional-improvements__heading">
                  <span>Optional improvements</span>
                  <p>Useful context, not prerequisites.</p>
                </div>

                <div className="custom-diagnostics">
                  {optionalDiagnostics.map((diagnostic) => (
                    <DiagnosticCard
                      key={diagnostic.code}
                      diagnostic={diagnostic}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="focus-text-action"
                  onClick={onEdit}
                >
                  Add optional context
                </button>
              </section>
            ) : null}

            <section className="custom-semantic-actions">
              <div>
                <p className="eyebrow">Semantic review</p>
                <span className="custom-agent-ready">
                  {semanticReviewReady
                    ? "Semantic review complete"
                    : semanticAnalysisStale
                      ? "Semantic review needs refresh"
                      : "Semantic review not run yet"}
                </span>
                <h5>
                  {semanticReviewReady
                    ? "Review the highest-priority unresolved risk."
                    : semanticAnalysisStale
                      ? "The reasoning changed after the last semantic review."
                      : "No semantic risk labels yet."}
                </h5>
                <p>
                  {semanticReviewReady
                    ? "Focus selects one CRITICAL or REVIEW item from the current semantic triage. Repair targets that exact accepted item."
                    : semanticAnalysisStale
                      ? "Groundline discarded stale semantic results. A WebMCP agent must review the current graph again before risk labels or repair can continue."
                      : "Groundline has not received an AI semantic review for this graph. You can keep mapping here. When a WebMCP agent reviews this workspace, the resulting CRITICAL, REVIEW, and STABLE labels will appear automatically."}
                </p>
              </div>

              <div className="custom-semantic-actions__buttons">
                <button
                  type="button"
                  onClick={focusPrimaryRisk}
                  disabled={
                    !semanticReviewReady || Boolean(proposedRevision)
                  }
                  title={
                    semanticAnalysisStale
                      ? "Reasoning changed after the last semantic review. Review the current graph again first."
                      : !hasSemanticTriage
                        ? "No semantic triage exists yet."
                        : proposedRevision
                          ? "Finish the current human review first."
                          : activePrimaryRisk
                            ? "Return selection to the current semantic risk."
                            : "Focus the highest-priority unresolved semantic risk."
                  }
                >
                  Focus primary risk
                </button>

                <button
                  type="button"
                  onClick={proposeRepair}
                  disabled={
                    !semanticReviewReady ||
                    !activePrimaryRisk ||
                    Boolean(proposedRevision)
                  }
                >
                  Propose repair
                </button>
              </div>

              {!hasSemanticTriage && !semanticAnalysisStale ? (
                <aside className="custom-analysis-stale">
                  <span>Semantic review</span>
                  <strong>Not reviewed by an AI agent yet.</strong>
                  <p>
                    No risk labels are available yet. Keep mapping the reasoning,
                    or review this workspace from a WebMCP-capable agent session.
                    Groundline will update this page when agent results arrive.
                  </p>
                </aside>
              ) : null}

              {semanticAnalysisStale ? (
                <aside className="custom-analysis-stale">
                  <span>Semantic review required again</span>
                  <strong>Reasoning changed since the last review.</strong>
                  <p>
                    Old semantic labels were discarded so they cannot describe a
                    graph that no longer exists. Review the current reasoning
                    again before focusing or repairing another risk.
                  </p>
                </aside>
              ) : null}

              {semanticReviewReady ? (
                <aside className="custom-agent-handoff" role="status">
                  <span>Semantic triage</span>
                  <strong>
                    {criticalCount} CRITICAL · {reviewCount} REVIEW · {stableCount}{" "}
                    STABLE
                  </strong>
                  <p>
                    These are operational review priorities, not truth or
                    confidence scores. Groundline handles one unresolved accepted
                    item at a time.
                  </p>
                </aside>
              ) : null}

              {activePrimaryRisk ? (
                <article className="custom-focused-risk">
                  <span>
                    Focused risk · {latestPrimaryRiskTriage?.state}
                  </span>
                  <strong>
                    {activePrimaryRisk.type} · {activePrimaryRisk.id}
                  </strong>
                  <p>{activePrimaryRisk.text}</p>
                </article>
              ) : null}

              {agentActionNotice ? (
                <aside className="custom-agent-handoff" role="status">
                  <span>
                    {agentActionNotice === "FOCUS"
                      ? "Focus primary risk"
                      : "Propose repair"}
                  </span>
                  <strong>
                    {agentActionNotice === "REPAIR"
                      ? "Repair proposal created."
                      : "Semantic review target selected."}
                  </strong>
                  <p>
                    {agentActionNotice === "FOCUS"
                      ? "Groundline selected the highest-priority unresolved accepted item from the current semantic triage."
                      : "The proposal targets the focused accepted item. Human review is still required before accepted knowledge changes."}
                  </p>
                </aside>
              ) : null}
            </section>
          </div>
        ) : null}
      </section>

      {mapOpen || proposedRevision ? (
        <Suspense
          fallback={
            <section className="focus-map-loading">
              Loading reasoning map…
            </section>
          }
        >
          <ExpandedReasoningMap
            workspace={workspace}
            selectedItemId={selectedItemId}
            focusedItemIds={focusedItemIds}
            graphSelectionRequest={graphSelectionRequest}
            onSelectItem={onSelectItem}
            onCollapse={() => {
              setMapOpen(false);
            }}
            onAccept={onAccept}
            onEditAndAccept={onEditAndAccept}
            onReject={onReject}
            onDefer={onDefer}
            heading="Inspect the reasoning workspace."
            showCollapse
          />
        </Suspense>
      ) : null}
    </>
  );
}
