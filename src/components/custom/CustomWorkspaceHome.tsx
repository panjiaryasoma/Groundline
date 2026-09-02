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

const ExpandedReasoningMap = lazy(async () => {
  const module = await import(
    "../focus/ExpandedReasoningMap"
  );

  return {
    default: module.ExpandedReasoningMap,
  };
});

interface CustomWorkspaceHomeProps {
  workspace: Workspace;
  selectedItemId: string | null;
  focusedItemIds: string[];
  onSelectItem: (itemId: string | null) => void;
  onFocusPrimaryRisk: () => {
    targetId: string;
    focusedItemIds: string[];
    basis: "SEMANTIC_TRIAGE" | "STRUCTURAL_FALLBACK";
  } | null;
  onPrepareRepairTarget: () => {
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
  return workspace.items.find((item) =>
    item.tags?.includes(tag),
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

export function CustomWorkspaceHome({
  workspace,
  selectedItemId,
  focusedItemIds,
  onSelectItem,
  onFocusPrimaryRisk,
  onPrepareRepairTarget,
  onAccept,
  onEditAndAccept,
  onReject,
  onDefer,
  onEdit,
  onBackToStart,
}: CustomWorkspaceHomeProps) {
  const [checked, setChecked] =
    useState(false);
  const [mapOpen, setMapOpen] =
    useState(false);
  const [agentActionNotice, setAgentActionNotice] =
    useState<"FOCUS" | "REPAIR" | null>(null);

  const analysisResultRef =
    useRef<HTMLDivElement | null>(null);

  const question = tagged(
    workspace,
    "decision-question",
  );
  const conclusion = tagged(
    workspace,
    "current-answer",
  );
  const reason = tagged(
    workspace,
    "main-reason",
  );
  const assumption = tagged(
    workspace,
    "stated-assumption",
  );
  const evidence = tagged(
    workspace,
    "main-evidence",
  );
  const source = tagged(
    workspace,
    "user-source",
  );

  const diagnostics = useMemo(
    () => getIntakeDiagnostics(workspace),
    [workspace],
  );

  const ready = diagnostics.some(
    (item) =>
      item.code === "READY_FOR_AGENT_REVIEW",
  );

  const optionalDiagnostics =
    diagnostics.filter(
      (item) =>
        item.code !== "READY_FOR_AGENT_REVIEW",
    );

  const proposedRevision: Revision | undefined =
    [...workspace.revisions]
      .reverse()
      .find(
        (revision) =>
          revision.state === "PROPOSED",
      );

  const latestPrimaryFocusEvent =
    [...workspace.audit_events]
      .reverse()
      .find(
        (event) =>
          event.event_type === "FOCUS" &&
          event.metadata
            ?.requested_action ===
            "FOCUS_PRIMARY_RISK",
      );

  const latestPrimaryRiskId =
    typeof latestPrimaryFocusEvent
      ?.metadata?.primary_item_id === "string"
      ? latestPrimaryFocusEvent
          .metadata.primary_item_id
      : null;

  const latestPrimaryRisk =
    latestPrimaryRiskId
      ? workspace.items.find(
          (item) =>
            item.id ===
            latestPrimaryRiskId,
        )
      : undefined;

  const latestPrimaryRiskReviewed =
    latestPrimaryRiskId
      ? workspace.revisions.some(
          (revision) => {
            if (
              revision.state ===
              "PROPOSED"
            ) {
              return false;
            }

            const proposalEvent =
              workspace.audit_events.find(
                (event) =>
                  event.event_type ===
                    "PROPOSE_REVISION" &&
                  event.entity_ids.includes(
                    revision.revision_id,
                  ),
              );

            return (
              proposalEvent?.metadata
                ?.primary_risk_id ===
              latestPrimaryRiskId
            );
          },
        )
      : false;

  const activePrimaryRisk =
    latestPrimaryRiskReviewed
      ? undefined
      : latestPrimaryRisk;

  const repairRequestedForActiveRisk =
    activePrimaryRisk
      ? workspace.audit_events.some(
          (event) =>
            event.event_type === "FOCUS" &&
            event.metadata
              ?.requested_action ===
              "PROPOSE_REPAIR" &&
            event.metadata
              ?.primary_risk_id ===
              activePrimaryRisk.id,
        )
      : false;

  const lastTriageIndex =
    workspace.audit_events.findLastIndex(
      (event) =>
        event.event_type === "TRIAGE",
    );

  const lastAcceptedRevisionIndex =
    workspace.audit_events.findLastIndex(
      (event) =>
        event.event_type ===
        "ACCEPT_REVISION",
    );

  const semanticAnalysisStale =
    workspace.triage_records.length > 0 &&
    lastAcceptedRevisionIndex >
      lastTriageIndex;

  function runReadinessAnalysis() {
    setChecked(true);

    // Observable consequence, like P-06:
    // if semantic triage exists this selects its
    // highest-priority unresolved item; otherwise
    // the explicitly non-semantic structural fallback.
    onFocusPrimaryRisk();

    setMapOpen(true);

    window.requestAnimationFrame(() => {
      analysisResultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function focusPrimaryRisk() {
    const result =
      onFocusPrimaryRisk();

    setAgentActionNotice(
      result ? "FOCUS" : null,
    );

    if (!result) {
      return null;
    }

    setMapOpen(true);

    window.requestAnimationFrame(() => {
      document
        .querySelector(
          '[aria-label="Groundline reasoning graph"]',
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    });

    return result;
  }

  function prepareRepair() {
    const result =
      onPrepareRepairTarget();

    if (!result) {
      return null;
    }

    setAgentActionNotice("REPAIR");
    setMapOpen(true);

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
          <p className="eyebrow">
            Your reasoning workspace
          </p>
          <h2>
            Groundline put your answers in the
            right places.
          </h2>
          <p>
            You do not need to organize a graph.
            Start by checking whether anything
            important is missing.
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
          <p className="eyebrow">
            What happened to your input
          </p>
          <h3>
            Nothing disappeared. Groundline mapped
            each answer to a role in the reasoning.
          </h3>
        </div>

        <div className="custom-mapped-list">
          {mappedRows.map((row) => (
            <article key={row.label}>
              <span>{row.label}</span>
              <p>
                {row.value ||
                  "You did not add this yet."}
              </p>
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
          <p className="eyebrow">
            What do I do now?
          </p>
          <h3>
            Run the first check on what you entered.
          </h3>
          <p>
            Groundline will check whether the
            reasoning structure has the minimum
            pieces needed for a useful review.
            This does not pretend to judge whether
            your argument is true.
          </p>
        </div>

        <div className="custom-analysis-action">
          <button
            type="button"
            className="focus-primary-action"
            onClick={runReadinessAnalysis}
          >
            Run analysis
            <small>
              Check structure and show the next action
            </small>
          </button>

          <span>
            This first analysis checks structure only.
            Semantic risk scoring and repair generation
            come from the WebMCP agent review stage.
          </span>
        </div>

        {checked ? (
          <div
            ref={analysisResultRef}
            className="custom-analysis-result"
            tabIndex={-1}
          >
            <div className="custom-analysis-result__heading">
              <p className="eyebrow">
                Analysis result
              </p>
              <h4>
                Your reasoning is structurally ready
                for the next stage.
              </h4>
              <p>
                Decision, current answer, and main
                reason are present. Missing optional
                context does not block semantic review.
              </p>
            </div>

            {optionalDiagnostics.length > 0 ? (
              <section className="custom-optional-improvements">
                <div className="custom-optional-improvements__heading">
                  <span>Optional improvements</span>
                  <p>
                    Useful context, not prerequisites.
                  </p>
                </div>

                <div className="custom-diagnostics">
                  {optionalDiagnostics.map(
                    (diagnostic) => (
                      <DiagnosticCard
                        key={diagnostic.code}
                        diagnostic={diagnostic}
                      />
                    ),
                  )}
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
                <p className="eyebrow">
                  Next · Semantic review
                </p>
                <h5>
                  Now inspect what matters, not just
                  what is missing.
                </h5>
                <p>
                  These actions belong to the WebMCP
                  agent stage. Groundline will not
                  fabricate semantic risk or repair
                  text locally.
                </p>
              </div>

              <div className="custom-semantic-actions__buttons">
                <button
                  type="button"
                  onClick={focusPrimaryRisk}
                  disabled={Boolean(
                    proposedRevision ||
                    semanticAnalysisStale,
                  )}
                  title={
                    semanticAnalysisStale
                      ? "Accepted knowledge changed. Run semantic triage again before trusting the next priority."
                      : proposedRevision
                        ? "Finish the current human review first."
                        : activePrimaryRisk
                          ? "Return selection to the current primary risk."
                          : "Focus the highest-priority unresolved risk."
                  }
                >
                  Focus primary risk
                </button>

                <button
                  type="button"
                  onClick={prepareRepair}
                  disabled={
                    !activePrimaryRisk ||
                    repairRequestedForActiveRisk ||
                    Boolean(proposedRevision)
                  }
                >
                  {repairRequestedForActiveRisk &&
                  !proposedRevision
                    ? "Repair requested"
                    : "Propose repair"}
                </button>
              </div>

              {semanticAnalysisStale ? (
                <aside className="custom-analysis-stale">
                  <span>Re-analysis required</span>
                  <strong>
                    Accepted knowledge changed.
                  </strong>
                  <p>
                    Groundline will not reuse the old
                    semantic priority order after an
                    accepted revision. Ask the WebMCP
                    agent to triage the workspace again,
                    then Focus primary risk can continue.
                  </p>
                </aside>
              ) : null}

              {activePrimaryRisk ? (
                <article className="custom-focused-risk">
                  <span>Focused risk</span>
                  <strong>
                    {activePrimaryRisk.type}
                    {" · "}
                    {activePrimaryRisk.id}
                  </strong>
                  <p>
                    {activePrimaryRisk.text}
                  </p>
                </article>
              ) : latestPrimaryRiskReviewed ? (
                <p className="custom-review-next-note">
                  Review complete. Focus primary risk
                  will move to the next unresolved item.
                </p>
              ) : null}

              {agentActionNotice ? (
                <aside
                  className="custom-agent-handoff"
                  role="status"
                >
                  <span>
                    {agentActionNotice === "FOCUS"
                      ? "Focus primary risk"
                      : "Propose repair"}
                  </span>
                  <strong>
                    Semantic agent review is required.
                  </strong>
                  <p>
                    {agentActionNotice === "FOCUS"
                      ? workspace.triage_records.length > 0
                        ? "Groundline selected one highest-priority unresolved risk. Repair this item before moving to the next risk."
                        : "No semantic triage exists yet, so Groundline focused one structural fallback item. The map and inspector show exactly what is selected."
                      : proposedRevision
                        ? "The WebMCP agent created a real proposal for the accepted conclusion. The focused risk remains the reason for the repair."
                        : activePrimaryRisk
                          ? `Primary risk ${activePrimaryRisk.id} is the reason for review. Groundline moved the Inspector to the accepted conclusion because that is the repair target. A real WebMCP propose_revision result will appear in Revision Proposal below.`
                          : "Focus one risk before requesting a repair."}
                  </p>
                </aside>
              ) : null}

            </section>
          </div>
        ) : null}

        <aside className="advanced-map-callout">
          <div>
            <span>Reasoning map</span>
            <p>
              See exactly how Groundline connected
              your question, answer, reason,
              assumption, evidence, and source.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMapOpen(true)}
          >
            Open map
          </button>
        </aside>
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
            onSelectItem={onSelectItem}
            onCollapse={() => {
              setMapOpen(false);
            }}
            onAccept={onAccept}
            onEditAndAccept={
              onEditAndAccept
            }
            onReject={onReject}
            onDefer={onDefer}
            heading="Inspect what Groundline is reviewing right now."
            showCollapse
          />
        </Suspense>
      ) : null}
    </>
  );
}
