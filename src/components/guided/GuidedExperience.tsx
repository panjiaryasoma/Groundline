import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Revision,
  TriageRecord,
  Workspace,
} from "../../domain/schema";
import {
  isSeededAnalysisFresh,
  isSeededDemoCycleComplete,
} from "../../state/workspaceStore";

interface GuidedExperienceProps {
  workspace: Workspace;
  onRunAnalysis: () => void;
  onShowWhy: () => void;
  onProposeRepair: () => void;
  onAccept: () => void;
  onEditAndAccept: (editedText: string) => void;
  onReject: () => void;
  onDefer: () => void;
  onReset: () => void;
  onOpenMap: () => void;
}

const REASON_LABELS: Record<string, string> = {
  UNSUPPORTED_ASSUMPTION:
    "This reasoning depends on an assumption that is not sufficiently supported.",
  OVERGENERALIZATION:
    "The conclusion reaches beyond what the current evidence safely establishes.",
  CONTRADICTED:
    "Some represented evidence or counter-evidence conflicts with this point.",
  SOURCE_CONFLICT:
    "The represented sources do not fully agree.",
  MISSING_DIRECT_EVIDENCE:
    "This point does not yet have direct supporting evidence.",
  DEPENDENCY_ON_UNASSESSED_NODE:
    "This point depends on reasoning that has not been fully checked yet.",
  SCOPE_MISMATCH:
    "The evidence and the conclusion do not fully match in scope.",
  SOURCE_QUALITY_UNCLEAR:
    "The quality of at least one source still needs review.",
  WEAK_SUPPORT:
    "The current support for this point is weak.",
};

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

function primaryTriage(
  workspace: Workspace,
): TriageRecord | undefined {
  return [...workspace.triage_records].sort(
    (left, right) =>
      (right.priority_score_internal ?? -1) -
      (left.priority_score_internal ?? -1),
  )[0];
}

function friendlyState(
  state: TriageRecord["state"],
): string {
  switch (state) {
    case "CRITICAL":
      return "Needs attention";
    case "REVIEW":
      return "Worth reviewing";
    case "STABLE":
      return "Well supported";
    case "UNASSESSED":
      return "Not checked yet";
  }
}

function reviewedOutcome(
  revision: Revision | undefined,
): {
  title: string;
  body: string;
} {
  switch (revision?.state) {
    case "ACCEPTED":
      return {
        title: "The suggested revision was accepted.",
        body:
          "Groundline preserved the previous conclusion as history and made the reviewed revision the accepted conclusion.",
      };
    case "EDITED_AND_ACCEPTED":
      return {
        title: "Your edited revision was accepted.",
        body:
          "The original agent suggestion remains in the audit trail, while your edited version became accepted knowledge.",
      };
    case "REJECTED":
      return {
        title: "You kept the current conclusion.",
        body:
          "The suggestion was rejected. Accepted knowledge was not replaced.",
      };
    case "DEFERRED":
      return {
        title: "The decision was deferred.",
        body:
          "Nothing was replaced. The proposal remains part of the review history.",
      };
    default:
      return {
        title: "Review complete.",
        body:
          "The reasoning cycle has finished.",
      };
  }
}

export function GuidedExperience({
  workspace,
  onRunAnalysis,
  onShowWhy,
  onProposeRepair,
  onAccept,
  onEditAndAccept,
  onReject,
  onDefer,
  onReset,
  onOpenMap,
}: GuidedExperienceProps) {
  const analysisFresh =
    isSeededAnalysisFresh(workspace);
  const complete =
    isSeededDemoCycleComplete(workspace);

  const proposedRevision = useMemo(
    () => latestProposedRevision(workspace),
    [workspace.revisions],
  );

  const reviewedRevision = useMemo(
    () => latestReviewedRevision(workspace),
    [workspace.revisions],
  );

  const risk = useMemo(
    () => primaryTriage(workspace),
    [workspace.triage_records],
  );

  const riskItem = workspace.items.find(
    (item) => item.id === risk?.item_id,
  );

  const acceptedConclusion = workspace.items.find(
    (item) =>
      item.id === workspace.accepted_conclusion_id,
  );

  const proposalTarget = workspace.items.find(
    (item) =>
      item.id === proposedRevision?.target_item_id,
  );

  const [showEditor, setShowEditor] =
    useState(false);
  const [editedText, setEditedText] =
    useState("");

  useEffect(() => {
    setEditedText(
      proposedRevision?.proposed_text ?? "",
    );
    setShowEditor(false);
  }, [
    proposedRevision?.revision_id,
    proposedRevision?.proposed_text,
  ]);

  if (complete) {
    const outcome =
      reviewedOutcome(reviewedRevision);

    return (
      <section className="guided-shell">
        <div className="guided-progress">
          <span className="guided-progress__done">
            1
          </span>
          <span className="guided-progress__done">
            2
          </span>
          <span className="guided-progress__done">
            3
          </span>
          <span className="guided-progress__done">
            4
          </span>
        </div>

        <div className="guided-result">
          <p className="eyebrow">
            Review complete
          </p>
          <h2>{outcome.title}</h2>
          <p>{outcome.body}</p>

          {acceptedConclusion ? (
            <article className="guided-conclusion-card">
              <span>Accepted conclusion now</span>
              <strong>
                {acceptedConclusion.text}
              </strong>
              <code>
                {acceptedConclusion.id}
              </code>
            </article>
          ) : null}

          <p className="guided-caveat">
            The revised conclusion is intentionally
            not re-evaluated automatically. Groundline
            does not assume old evidence relationships
            still apply to new wording.
          </p>

          <div className="guided-actions">
            <button
              type="button"
              onClick={onOpenMap}
            >
              View reasoning map
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onReset}
            >
              Start over
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (proposedRevision) {
    return (
      <section className="guided-shell">
        <div className="guided-progress">
          <span className="guided-progress__done">
            1
          </span>
          <span className="guided-progress__done">
            2
          </span>
          <span className="guided-progress__done">
            3
          </span>
          <span className="guided-progress__active">
            4
          </span>
        </div>

        <div className="guided-step">
          <p className="eyebrow">
            Step 4 · You decide
          </p>
          <h2>Review the suggested revision</h2>
          <p className="guided-lead">
            Groundline can suggest a narrower
            conclusion, but it cannot accept that
            conclusion for you.
          </p>

          <div className="guided-compare">
            <article>
              <span>Current</span>
              <p>
                {proposalTarget?.text ??
                  "Current conclusion unavailable."}
              </p>
            </article>

            <article>
              <span>Suggested</span>
              <p>
                {proposedRevision.proposed_text}
              </p>
            </article>
          </div>

          {showEditor ? (
            <label className="guided-editor">
              <span>
                Edit the suggested wording
              </span>
              <textarea
                rows={5}
                value={editedText}
                onChange={(event) =>
                  setEditedText(
                    event.target.value,
                  )
                }
              />
            </label>
          ) : null}

          <div className="guided-decision-grid">
            <button
              type="button"
              onClick={onAccept}
            >
              Use suggestion
              <small>
                Accept exactly as proposed
              </small>
            </button>

            {showEditor ? (
              <button
                type="button"
                onClick={() =>
                  onEditAndAccept(editedText)
                }
                disabled={!editedText.trim()}
              >
                Use my edited version
                <small>
                  Accept your wording
                </small>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setShowEditor(true)
                }
              >
                Edit first
                <small>
                  Change the wording before using it
                </small>
              </button>
            )}

            <button
              type="button"
              onClick={onReject}
            >
              Keep current version
              <small>
                Reject this suggestion
              </small>
            </button>

            <button
              type="button"
              onClick={onDefer}
            >
              Decide later
              <small>
                Defer the review
              </small>
            </button>
          </div>

          <button
            type="button"
            className="guided-text-button"
            onClick={onOpenMap}
          >
            Inspect the full reasoning map
          </button>
        </div>
      </section>
    );
  }

  if (analysisFresh && risk && riskItem) {
    const affectsConclusion =
      risk.downstream_accepted_ids.includes(
        workspace.accepted_conclusion_id ?? "",
      ) ||
      risk.direct_to_accepted_conclusion;

    return (
      <section className="guided-shell">
        <div className="guided-progress">
          <span className="guided-progress__done">
            1
          </span>
          <span className="guided-progress__done">
            2
          </span>
          <span className="guided-progress__active">
            3
          </span>
          <span>4</span>
        </div>

        <div className="guided-step">
          <p className="eyebrow">
            Step 3 · Biggest issue
          </p>

          <div className="guided-risk-heading">
            <div>
              <span className="guided-human-status">
                {friendlyState(risk.state)}
              </span>
              <h2>
                This is the reasoning point to
                review first.
              </h2>
            </div>

            <span className="guided-review-first">
              Review first
            </span>
          </div>

          <blockquote className="guided-issue-quote">
            {riskItem.text}
          </blockquote>

          <div className="guided-explanation">
            <h3>Why Groundline flagged it</h3>

            <ul>
              {risk.reason_codes.length > 0
                ? risk.reason_codes.map(
                    (code) => (
                      <li key={code}>
                        {REASON_LABELS[code] ??
                          code
                            .toLowerCase()
                            .replaceAll("_", " ")}
                      </li>
                    ),
                  )
                : (
                  <li>
                    This point has enough downstream
                    impact to deserve review.
                  </li>
                )}
            </ul>

            {affectsConclusion ? (
              <p>
                This point affects the currently
                accepted conclusion, so changing it
                could change the decision.
              </p>
            ) : null}
          </div>

          <div className="guided-actions">
            <button
              type="button"
              onClick={onShowWhy}
            >
              Show why it matters
            </button>

            <button
              type="button"
              onClick={onProposeRepair}
            >
              Suggest a better version
            </button>
          </div>

          <button
            type="button"
            className="guided-text-button"
            onClick={onOpenMap}
          >
            Open full reasoning map
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="guided-shell">
      <div className="guided-progress">
        <span className="guided-progress__active">
          1
        </span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
      </div>

      <div className="guided-intro">
        <p className="eyebrow">
          Step 1 · Understand the decision
        </p>

        <h2>
          Check what this conclusion actually
          stands on.
        </h2>

        <p className="guided-lead">
          Groundline traces the claims, assumptions,
          evidence, and sources behind a decision.
          It shows which reasoning point deserves
          attention first without deciding for you.
        </p>

        <article className="guided-question-card">
          <span>Decision being checked</span>
          <strong>
            {
              workspace.items.find(
                (item) =>
                  item.id === workspace.question_id,
              )?.text
            }
          </strong>
        </article>

        <article className="guided-conclusion-card">
          <span>Current conclusion</span>
          <strong>
            {acceptedConclusion?.text ??
              "No accepted conclusion."}
          </strong>
        </article>

        <div className="guided-actions">
          <button
            type="button"
            onClick={onRunAnalysis}
          >
            Check this reasoning
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={onOpenMap}
          >
            Explore the map instead
          </button>
        </div>

        <p className="guided-microcopy">
          You do not need to understand claims,
          assumptions, or triage scores before
          starting.
        </p>
      </div>
    </section>
  );
}
