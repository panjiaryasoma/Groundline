import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  KnowledgeItem,
  Relation,
  Revision,
  TriageRecord,
  Workspace,
} from "../../domain/schema";
import {
  isSeededAnalysisFresh,
  isSeededDemoCycleComplete,
} from "../../state/workspaceStore";


const ExpandedReasoningMap = lazy(async () => {
  const module = await import("./ExpandedReasoningMap");
  return {
    default: module.ExpandedReasoningMap,
  };
});

interface FocusWorkspaceProps {
  workspace: Workspace;
  selectedItemId: string | null;
  focusedItemIds: string[];
  graphSelectionRequest: GraphSelectionRequest;
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
    "The conclusion reaches beyond what the current evidence safely establishes.",
  CONTRADICTED:
    "Some represented evidence or counter-evidence conflicts with this reasoning.",
  SOURCE_CONFLICT:
    "The represented sources do not fully agree.",
  MISSING_DIRECT_EVIDENCE:
    "This reasoning point does not yet have direct supporting evidence.",
  DEPENDENCY_ON_UNASSESSED_NODE:
    "This conclusion depends on reasoning that still needs review.",
  SCOPE_MISMATCH:
    "The evidence and the conclusion do not fully match in scope.",
  SOURCE_QUALITY_UNCLEAR:
    "The quality of at least one source still needs review.",
  WEAK_SUPPORT:
    "The current support for this reasoning point is weak.",
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

function itemById(
  workspace: Workspace,
  id: string | undefined | null,
): KnowledgeItem | undefined {
  if (!id) return undefined;
  return workspace.items.find((item) => item.id === id);
}

function relationsTo(
  workspace: Workspace,
  targetId: string,
  type?: Relation["type"],
): Relation[] {
  return workspace.relations.filter(
    (relation) =>
      relation.to_id === targetId &&
      (!type || relation.type === type),
  );
}

function findChain(
  workspace: Workspace,
  risk: TriageRecord | undefined,
): {
  weakPoint?: KnowledgeItem;
  bridge?: KnowledgeItem;
  conclusion?: KnowledgeItem;
} {
  const weakPoint = itemById(workspace, risk?.item_id);
  const conclusion = itemById(
    workspace,
    workspace.accepted_conclusion_id,
  );

  if (!weakPoint) {
    return { conclusion };
  }

  const downstreamIds = risk?.downstream_accepted_ids ?? [];
  const bridge =
    downstreamIds
      .map((id) => itemById(workspace, id))
      .find(
        (item) =>
          item?.type === "CLAIM" ||
          item?.type === "COUNTERCLAIM",
      ) ??
    workspace.items.find(
      (item) =>
        item.type === "CLAIM" &&
        workspace.relations.some(
          (relation) =>
            relation.from_id === weakPoint.id &&
            relation.to_id === item.id &&
            relation.type === "SUPPORTS",
        ),
    );

  return {
    weakPoint,
    bridge,
    conclusion,
  };
}

interface EvidenceCard {
  item: KnowledgeItem;
  source?: KnowledgeItem;
  posture: "SUPPORT" | "CHALLENGE" | "CONTEXT";
}

function findEvidenceContext(
  workspace: Workspace,
  bridge?: KnowledgeItem,
): EvidenceCard[] {
  if (!bridge) return [];

  const cards: EvidenceCard[] = [];

  for (const relation of relationsTo(
    workspace,
    bridge.id,
  )) {
    const from = itemById(workspace, relation.from_id);

    if (from?.type === "EVIDENCE") {
      const sourceRelation = relationsTo(
        workspace,
        from.id,
        "SOURCED_FROM",
      )[0];
      const source = itemById(
        workspace,
        sourceRelation?.from_id,
      );

      cards.push({
        item: from,
        source,
        posture:
          relation.type === "SUPPORTS"
            ? "SUPPORT"
            : "CONTEXT",
      });
    }

    if (from?.type === "COUNTERCLAIM") {
      for (const support of relationsTo(
        workspace,
        from.id,
        "SUPPORTS",
      )) {
        const evidence = itemById(
          workspace,
          support.from_id,
        );

        if (evidence?.type !== "EVIDENCE") {
          continue;
        }

        const sourceRelation = relationsTo(
          workspace,
          evidence.id,
          "SOURCED_FROM",
        )[0];

        cards.push({
          item: evidence,
          source: itemById(
            workspace,
            sourceRelation?.from_id,
          ),
          posture: "CHALLENGE",
        });
      }
    }
  }

  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.item.id)) return false;
    seen.add(card.item.id);
    return true;
  });
}

function reviewedOutcome(
  revision: Revision | undefined,
): string {
  switch (revision?.state) {
    case "ACCEPTED":
      return "Suggestion accepted";
    case "EDITED_AND_ACCEPTED":
      return "Edited revision accepted";
    case "REJECTED":
      return "Current conclusion kept";
    case "DEFERRED":
      return "Decision deferred";
    default:
      return "Review complete";
  }
}


function acceptedKnowledgeChanged(
  revision: Revision | undefined,
): boolean {
  return (
    revision?.state === "ACCEPTED" ||
    revision?.state === "EDITED_AND_ACCEPTED"
  );
}

function postureLabel(
  posture: EvidenceCard["posture"],
): string {
  switch (posture) {
    case "SUPPORT":
      return "Supports";
    case "CHALLENGE":
      return "Challenges";
    case "CONTEXT":
      return "Context";
  }
}


function journeyStep(
  analysisFresh: boolean,
  hasProposal: boolean,
  cycleComplete: boolean,
): 1 | 2 | 3 | 4 {
  if (cycleComplete) return 4;
  if (hasProposal) return 3;
  if (analysisFresh) return 2;
  return 1;
}

function journeyLabel(step: 1 | 2 | 3 | 4): string {
  switch (step) {
    case 1:
      return "Check";
    case 2:
      return "Understand";
    case 3:
      return "Decide";
    case 4:
      return "Done";
  }
}

export function FocusWorkspace({
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
}: FocusWorkspaceProps) {
  const [mapExpanded, setMapExpanded] =
    useState(false);
  const [showEditor, setShowEditor] =
    useState(false);

  const analysisFresh =
    isSeededAnalysisFresh(workspace);
  const cycleComplete =
    isSeededDemoCycleComplete(workspace);


  const currentJourneyStep = journeyStep(
    analysisFresh,
    Boolean(
      latestProposedRevision(workspace),
    ),
    cycleComplete,
  );

  const risk = useMemo(
    () => primaryTriage(workspace),
    [workspace.triage_records],
  );

  const chain = useMemo(
    () => findChain(workspace, risk),
    [workspace, risk],
  );

  const evidence = useMemo(
    () =>
      findEvidenceContext(
        workspace,
        chain.bridge,
      ),
    [workspace, chain.bridge],
  );

  const proposed = useMemo(
    () => latestProposedRevision(workspace),
    [workspace.revisions],
  );

  const reviewed = useMemo(
    () => latestReviewedRevision(workspace),
    [workspace.revisions],
  );


  const acceptedChanged =
    acceptedKnowledgeChanged(reviewed);

  const acceptedConclusion = itemById(
    workspace,
    workspace.accepted_conclusion_id,
  );

  const proposalTarget = itemById(
    workspace,
    proposed?.target_item_id,
  );

  const [editedText, setEditedText] =
    useState(proposed?.proposed_text ?? "");

  useEffect(() => {
    setEditedText(proposed?.proposed_text ?? "");
    setShowEditor(false);
  }, [
    proposed?.revision_id,
    proposed?.proposed_text,
  ]);

  function runAnalysisAndOpenWorkspace() {
    onRunAnalysis();
    setMapExpanded(true);
  }

  function focusRiskAndOpenWorkspace() {
    onFocusPrimaryRisk();
    setMapExpanded(true);
  }

  function proposeAndOpenWorkspace() {
    onProposeRevision();
    setMapExpanded(true);
  }

  function openAdvancedMap() {
    if (
      analysisFresh &&
      !cycleComplete
    ) {
      onFocusPrimaryRisk();
    } else if (
      workspace.accepted_conclusion_id
    ) {
      onSelectItem(
        workspace.accepted_conclusion_id,
      );
    }

    setMapExpanded(true);
  }

  function resetWorkspace() {
    onReset();
    setMapExpanded(false);
    setShowEditor(false);
  }

  return (
    <>
      <nav
        className="focus-journey"
        aria-label="Groundline review steps"
      >
        <div className="focus-journey__intro">
          <span>Seeded demo</span>
          <strong>
            You only need to do three things:
            check, understand, decide.
          </strong>
        </div>

        <ol>
          {([1, 2, 3] as const).map(
            (step) => (
              <li
                key={step}
                className={
                  currentJourneyStep === step
                    ? "is-current"
                    : currentJourneyStep > step
                      ? "is-complete"
                      : ""
                }
              >
                <span>{step}</span>
                <strong>
                  {journeyLabel(step)}
                </strong>
              </li>
            ),
          )}
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
            onClick={runAnalysisAndOpenWorkspace}
            disabled={
              analysisFresh ||
              cycleComplete
            }
          >
            Run analysis
          </button>

          <button
            type="button"
            onClick={focusRiskAndOpenWorkspace}
            disabled={
              !analysisFresh ||
              cycleComplete
            }
          >
            Focus primary risk
          </button>

          <button
            type="button"
            onClick={proposeAndOpenWorkspace}
            disabled={
              !analysisFresh ||
              Boolean(proposed) ||
              cycleComplete
            }
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
          <p className="eyebrow">
            Demo decision
          </p>
          <h2>{workspace.title}</h2>
          <p className="focus-question">
            {
              itemById(
                workspace,
                workspace.question_id,
              )?.text
            }
          </p>
        </div>

        <article className="focus-current-conclusion">
          <span>Current accepted conclusion</span>
          <strong>
            {acceptedConclusion?.text ??
              "No accepted conclusion."}
          </strong>
          <code>
            {workspace.accepted_conclusion_id ??
              "NONE"}
          </code>
        </article>
      </section>

      {!analysisFresh && !cycleComplete ? (
        <section className="focus-start">
          <div className="focus-start__copy">
            <p className="eyebrow">
              Start here
            </p>
            <h3>
              Check the reasoning before acting
              on the conclusion.
            </h3>
            <p>
              Groundline checks what supports the conclusion,
              points out the weakest important step,
              and explains it in plain language.
            </p>
          </div>

          <button
            type="button"
            className="focus-primary-action"
            onClick={runAnalysisAndOpenWorkspace}
          >
            Check this reasoning
            <small>
              Find the highest-impact weak point
            </small>
          </button>

          <aside className="advanced-map-callout">
            <div>
              <span>Reasoning map</span>
              <p>
                Optional, but always available if you
                want to inspect the structure behind
                this example.
              </p>
            </div>
            <button
              type="button"
              onClick={openAdvancedMap}
            >
              Open map
            </button>
          </aside>
        </section>
      ) : null}

      {analysisFresh &&
      chain.weakPoint &&
      !proposed &&
      !cycleComplete ? (
        <section className="focus-analysis">
          <div className="focus-analysis__heading">
            <div>
              <p className="eyebrow">
                Groundline found one high-impact
                weak point
              </p>
              <h3>
                Here is the one reasoning step
                worth reviewing first.
              </h3>
            </div>
            <span className="focus-status">
              Review first
            </span>
          </div>

          <div className="focus-analysis-grid">
            <div className="focus-chain">
              <article className="focus-chain-card focus-chain-card--risk">
                <span>
                  {chain.weakPoint.type}
                </span>
                <strong>
                  {chain.weakPoint.text}
                </strong>
                <small>Needs attention</small>
              </article>

              {chain.bridge ? (
                <>
                  <div className="focus-chain-link">
                    <span>affects</span>
                  </div>
                  <article className="focus-chain-card">
                    <span>
                      {chain.bridge.type}
                    </span>
                    <strong>
                      {chain.bridge.text}
                    </strong>
                  </article>
                </>
              ) : null}

              {chain.conclusion ? (
                <>
                  <div className="focus-chain-link">
                    <span>supports</span>
                  </div>
                  <article className="focus-chain-card focus-chain-card--conclusion">
                    <span>CONCLUSION</span>
                    <strong>
                      {chain.conclusion.text}
                    </strong>
                  </article>
                </>
              ) : null}
            </div>

            <aside className="focus-context">
              <section>
                <p className="eyebrow">
                  Why this matters
                </p>
                <ul className="focus-reasons">
                  {risk?.reason_codes.map(
                    (code) => (
                      <li key={code}>
                        {REASON_LABELS[code] ??
                          code
                            .toLowerCase()
                            .replaceAll("_", " ")}
                      </li>
                    ),
                  )}
                </ul>
              </section>

              <section className="focus-evidence">
                <div className="focus-section-heading">
                  <p className="eyebrow">
                    Evidence snapshot
                  </p>
                  <span>
                    {evidence.length} represented
                  </span>
                </div>

                {evidence.length > 0 ? (
                  <div className="focus-evidence-list">
                    {evidence.map((card) => (
                      <article
                        key={card.item.id}
                        className={`focus-evidence-card focus-evidence-card--${card.posture.toLowerCase()}`}
                      >
                        <span>
                          {postureLabel(
                            card.posture,
                          )}
                        </span>
                        <p>{card.item.text}</p>
                        <small>
                          {card.source
                            ? `${card.source.source_metadata?.publisher ?? "Source"} · ${card.source.text}`
                            : card.item.id}
                        </small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="focus-muted">
                    No direct evidence context is
                    represented for this path.
                  </p>
                )}
              </section>
            </aside>
          </div>

          <div className="focus-action-row focus-action-row--primary">
            <button
              type="button"
              className="focus-primary-action"
              onClick={proposeAndOpenWorkspace}
            >
              Show me a clearer conclusion
              <small>
                Groundline will propose. You still
                decide.
              </small>
            </button>
          </div>

          <aside className="advanced-map-callout">
            <div>
              <span>Reasoning map</span>
              <p>
                Inspect every reasoning object,
                relation, source, and audit event.
              </p>
            </div>
            <button
              type="button"
              onClick={openAdvancedMap}
            >
              Open map
            </button>
          </aside>
        </section>
      ) : null}

      {proposed && !mapExpanded ? (
        <section className="focus-revision">
          <div className="focus-analysis__heading">
            <div>
              <p className="eyebrow">
                Suggested revision
              </p>
              <h3>
                Compare the current conclusion
                with a clearer alternative.
              </h3>
            </div>
            <span className="focus-status">
              Human decision required
            </span>
          </div>

          <div className="focus-revision-compare">
            <article>
              <span>Current</span>
              <p>
                {proposalTarget?.text ??
                  "Current conclusion unavailable."}
              </p>
            </article>

            <div className="focus-revision-arrow">
              →
            </div>

            <article className="focus-revision-compare__suggested">
              <span>Suggested</span>
              <p>{proposed.proposed_text}</p>
            </article>
          </div>

          <div className="focus-revision-why">
            <p className="eyebrow">
              Why this revision
            </p>
            <p>
              It narrows the conclusion so it no
              longer treats aggregate performance
              as sufficient evidence across every
              intended population and capture
              condition.
            </p>
          </div>

          {showEditor ? (
            <label className="focus-editor">
              <span>Edit before accepting</span>
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

          <div className="focus-decision-actions">
            <button
              type="button"
              className="focus-primary-action"
              onClick={onAccept}
            >
              Use suggestion
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
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setShowEditor(true)
                }
              >
                Edit first
              </button>
            )}

            <button
              type="button"
              onClick={onReject}
            >
              Keep current conclusion
            </button>

            <button
              type="button"
              onClick={onDefer}
            >
              Decide later
            </button>
          </div>

          <aside className="advanced-map-callout">
            <div>
              <span>Reasoning map</span>
              <p>
                Want to inspect the structure before
                making the human decision?
              </p>
            </div>
            <button
              type="button"
              onClick={openAdvancedMap}
            >
              Open map
            </button>
          </aside>
        </section>
      ) : null}

      {cycleComplete ? (
        <section className="focus-complete">
          <div className="focus-complete__status">
            <p className="eyebrow">
              {reviewedOutcome(reviewed)}
            </p>
            <h3>
              {acceptedChanged
                ? "Accepted conclusion updated."
                : reviewed?.state === "DEFERRED"
                  ? "The review is paused."
                  : "Accepted conclusion unchanged."}
            </h3>
          </div>

          <article className="focus-complete-conclusion">
            <span>Current accepted conclusion</span>
            <strong>
              {acceptedConclusion?.text ??
                "No accepted conclusion."}
            </strong>
            <code>
              {workspace.accepted_conclusion_id ??
                "NONE"}
            </code>
          </article>

          <div className="focus-complete-grid">
            {acceptedChanged ? (
              <>
                <article>
                  <span>Status</span>
                  <strong>
                    Fresh reasoning review needed
                  </strong>
                  <p>
                    The wording changed. Groundline
                    does not inherit the previous
                    evidence relationships or analysis
                    automatically.
                  </p>
                </article>

                <article>
                  <span>History preserved</span>
                  <strong>
                    Previous conclusion remains
                    traceable
                  </strong>
                  <p>
                    The superseded conclusion and the
                    human review event remain in the
                    decision history.
                  </p>
                </article>
              </>
            ) : (
              <>
                <article>
                  <span>Status</span>
                  <strong>
                    Accepted reasoning unchanged
                  </strong>
                  <p>
                    No replacement conclusion became
                    accepted, so Groundline has not
                    created a new unassessed version.
                  </p>
                </article>

                <article>
                  <span>Review outcome</span>
                  <strong>
                    {reviewed?.state === "DEFERRED"
                      ? "Proposal deferred"
                      : "Proposal rejected"}
                  </strong>
                  <p>
                    The review event remains visible in
                    the decision history without
                    changing accepted knowledge.
                  </p>
                </article>
              </>
            )}
          </div>

          <aside className="focus-next-step">
            <span>What happens now</span>
            <strong>
              {acceptedChanged
                ? "The demo is complete."
                : "The review is complete."}
            </strong>
            <p>
              {acceptedChanged
                ? "Groundline preserved the old conclusion and accepted the human-reviewed replacement. It intentionally did not copy the old evidence links onto the new wording."
                : "No replacement became accepted. The original accepted conclusion remains unchanged and the human review is preserved in history."}
            </p>

            <div className="focus-action-row">
              <button
                type="button"
                className="focus-primary-action"
                onClick={resetWorkspace}
              >
                Replay the example
                <small>
                  Start again from the original
                  decision.
                </small>
              </button>
            </div>

            <aside className="advanced-map-callout advanced-map-callout--inside">
              <div>
                <span>Reasoning history</span>
                <p>
                  Inspect the exact objects,
                  supersession link, and audit trail.
                </p>
              </div>
              <button
                type="button"
                onClick={openAdvancedMap}
              >
                Open map
              </button>
            </aside>
          </aside>
        </section>
      ) : null}

      {mapExpanded ? (
        <Suspense
          fallback={
            <section className="focus-map-loading">
              <p className="eyebrow">
                Loading reasoning map
              </p>
              <p>
                Preparing the interactive graph only
                because you asked for it.
              </p>
            </section>
          }
        >
          <ExpandedReasoningMap
            workspace={workspace}
            selectedItemId={selectedItemId}
            focusedItemIds={focusedItemIds}
            graphSelectionRequest={
              graphSelectionRequest
            }
            onSelectItem={onSelectItem}
            onCollapse={() =>
              setMapExpanded(false)
            }
            onAccept={onAccept}
            onEditAndAccept={
              onEditAndAccept
            }
            onReject={onReject}
            onDefer={onDefer}
            heading="Inspect the seeded decision as it changes."
            showCollapse
          />
        </Suspense>
      ) : null}
    </>
  );
}
