import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getDownstreamDependencies } from "../../domain/dependencies";
import type {
  KnowledgeItem,
  Revision,
  Workspace,
} from "../../domain/schema";
import { rankTriageRecords } from "../../domain/workspaceAnalysis";
import type { GraphSelectionRequest } from "../../state/workspaceStore";

const ExpandedReasoningMap = lazy(async () => {
  const module = await import("../focus/ExpandedReasoningMap");
  return { default: module.ExpandedReasoningMap };
});

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
  onShowExampleRevision?: () => void;
}

const REASON_LABELS: Record<string, string> = {
  WEAK_SUPPORT:
    "The represented support is too weak for the role this item plays in the reasoning.",
  MISSING_DIRECT_EVIDENCE:
    "No direct represented evidence currently supports this item.",
  SOURCE_QUALITY_UNCLEAR:
    "The represented source quality is unclear for this use.",
  SOURCE_CONFLICT:
    "The represented sources conflict in a way that matters to this item.",
  UNSUPPORTED_ASSUMPTION:
    "This assumption is not sufficiently supported by the represented evidence.",
  OVERGENERALIZATION:
    "This reasoning reaches beyond what the represented evidence safely establishes.",
  CONTRADICTED:
    "Represented counter-evidence conflicts with this reasoning item.",
  STALE_EVIDENCE:
    "The represented evidence may be too stale for the current decision context.",
  SCOPE_MISMATCH:
    "The evidence and this reasoning item do not fully match in scope.",
  DEPENDENCY_ON_UNASSESSED_NODE:
    "This item depends on reasoning that still needs review.",
};

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
  const lastAcceptedRevisionIndex = eventTypes.lastIndexOf(
    "ACCEPT_REVISION",
  );

  return lastTriageIndex >= 0 && lastTriageIndex > lastAcceptedRevisionIndex;
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
    const primaryRiskId = proposalEvent?.metadata?.primary_risk_id;

    if (typeof primaryRiskId === "string") {
      reviewed.add(primaryRiskId);
    } else {
      reviewed.add(revision.target_item_id);
    }
  }

  return reviewed;
}

function nextReviewTargetId(workspace: Workspace): string | null {
  const reviewed = reviewedRiskIds(workspace);

  return (
    rankTriageRecords(workspace.triage_records)
      .filter(
        (record) =>
          record.state === "CRITICAL" || record.state === "REVIEW",
      )
      .find((record) => {
        if (reviewed.has(record.item_id)) return false;

        return workspace.items.some(
          (item) =>
            item.id === record.item_id && item.state === "ACCEPTED",
        );
      })?.item_id ?? null
  );
}

function relationContext(
  workspace: Workspace,
  targetId: string | null,
  relationType: "SUPPORTS" | "CHALLENGES",
): KnowledgeItem[] {
  if (!targetId) return [];

  return workspace.relations
    .filter(
      (relation) =>
        relation.type === relationType && relation.to_id === targetId,
    )
    .map((relation) => itemById(workspace, relation.from_id))
    .filter(
      (item): item is KnowledgeItem =>
        Boolean(item) && item?.state === "ACCEPTED",
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
  onShowExampleRevision,
}: UnifiedReviewWorkspaceProps) {
  const [mapExpanded, setMapExpanded] = useState(false);
  const proposed = latestProposedRevision(workspace);
  const [editedText, setEditedText] = useState(
    proposed?.proposed_text ?? "",
  );

  useEffect(() => {
    setEditedText(proposed?.proposed_text ?? "");
  }, [proposed?.revision_id, proposed?.proposed_text]);

  const reviewFresh = semanticReviewIsFresh(workspace);
  const nextTargetId = reviewFresh
    ? nextReviewTargetId(workspace)
    : null;
  const nextTarget = itemById(workspace, nextTargetId);
  const nextTriage = workspace.triage_records.find(
    (record) => record.item_id === nextTargetId,
  );
  const acceptedConclusion = itemById(
    workspace,
    workspace.accepted_conclusion_id,
  );
  const proposalTarget = itemById(
    workspace,
    proposed?.target_item_id,
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

  const supportingItems = useMemo(
    () => relationContext(workspace, nextTargetId, "SUPPORTS"),
    [workspace, nextTargetId],
  );
  const challengingItems = useMemo(
    () => relationContext(workspace, nextTargetId, "CHALLENGES"),
    [workspace, nextTargetId],
  );

  const affectedDownstream = useMemo(() => {
    if (!nextTargetId) return [];

    const representedIds =
      nextTriage?.downstream_accepted_ids?.length
        ? nextTriage.downstream_accepted_ids
        : getDownstreamDependencies(workspace, nextTargetId).node_ids;

    return representedIds
      .map((id) => itemById(workspace, id))
      .filter(
        (item): item is KnowledgeItem =>
          Boolean(item) && item?.state === "ACCEPTED",
      );
  }, [workspace, nextTargetId, nextTriage]);

  const focusedForMap = useMemo(() => {
    if (focusedItemIds.length > 0) return focusedItemIds;
    if (!nextTargetId) return [];

    return [
      nextTargetId,
      ...affectedDownstream.map((item) => item.id),
    ].filter((id, index, values) => values.indexOf(id) === index);
  }, [focusedItemIds, nextTargetId, affectedDownstream]);

  const hasReviewedOutcome = workspace.revisions.some(
    (revision) => revision.state !== "PROPOSED",
  );
  const unlinkedCount = workspace.items.filter((item) =>
    item.tags?.includes("unlinked"),
  ).length;

  const understandComplete = Boolean(proposed);
  const decideComplete = !proposed && hasReviewedOutcome;

  return (
    <>
      <nav className="focus-journey" aria-label="Groundline review steps">
        <div className="focus-journey__intro">
          <span>{mode === "DEMO" ? "Seeded example" : "Your decision"}</span>
          <strong>
            One reasoning workspace. Agent reviews are visible; human decisions
            remain authoritative.
          </strong>
        </div>

        <ol>
          <li className="is-complete">
            <span>1</span>
            <strong>Check</strong>
          </li>
          <li className={understandComplete ? "is-complete" : "is-current"}>
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

      <section className="workspace-toolbar workspace-toolbar--demo">
        <div className="workspace-toolbar__group">
          <span className="workspace-toolbar__label">
            {mode === "DEMO" ? "Example controls" : "Workspace"}
          </span>

          <button type="button" onClick={() => setMapExpanded((value) => !value)}>
            {mapExpanded ? "Hide full reasoning map" : "Inspect full reasoning map"}
          </button>

          {mode === "CUSTOM" && onEditInput ? (
            <button type="button" onClick={onEditInput}>
              Edit inputs
            </button>
          ) : null}

          {mode === "DEMO" &&
          reviewFresh &&
          nextTarget &&
          !proposed &&
          onShowExampleRevision ? (
            <button type="button" onClick={onShowExampleRevision}>
              Show example revision
            </button>
          ) : null}

          {mode === "DEMO" && onResetDemo ? (
            <button type="button" onClick={onResetDemo}>
              Replay example
            </button>
          ) : null}
        </div>

        <button type="button" className="secondary-button" onClick={onExit}>
          {mode === "DEMO" ? "Exit example" : "Exit workspace"}
        </button>
      </section>

      <section className="focus-decision-strip">
        <div>
          <p className="eyebrow">
            {mode === "DEMO" ? "Example decision" : "Decision"}
          </p>
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

      {!reviewFresh && !proposed ? (
        <section className="focus-start">
          <div className="focus-start__copy">
            <p className="eyebrow">
              {workspace.triage_records.length > 0
                ? "Review needs refresh"
                : "Not reviewed yet"}
            </p>
            <h3>
              {workspace.triage_records.length > 0
                ? "The reasoning changed after the last semantic review."
                : "Your reasoning is mapped and ready for agent review."}
            </h3>
            <p>
              {workspace.triage_records.length > 0
                ? "Groundline will not reuse stale semantic labels after accepted reasoning changes. The next WebMCP review will populate the current graph again."
                : "There is no fake analysis step here. A WebMCP agent can inspect this same workspace, evaluate the represented reasoning, and write a fresh triage back into Groundline."}
            </p>
            {unlinkedCount > 0 ? (
              <p className="focus-muted">
                {unlinkedCount} human-authored card{unlinkedCount === 1 ? " is" : "s are"}{" "}
                still UNLINKED. An agent may suggest defensible connections, but
                nothing becomes part of the graph until you approve it.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="focus-primary-action"
            onClick={() => setMapExpanded(true)}
          >
            Inspect the reasoning map
            <small>Optional power-user view</small>
          </button>
        </section>
      ) : null}

      {reviewFresh && nextTarget && !proposed ? (
        <section className="focus-analysis">
          <div className="focus-analysis__heading">
            <div>
              <p className="eyebrow">
                {criticalCount} CRITICAL · {reviewCount} REVIEW · {stableCount}{" "}
                STABLE
              </p>
              <h3>Start with the weakest high-impact point.</h3>
            </div>
            <span className="focus-status">
              {nextTriage?.state ?? "REVIEW"}
            </span>
          </div>

          <div className="focus-analysis-grid">
            <div className="focus-chain">
              <article className="focus-chain-card focus-chain-card--risk">
                <span>
                  Weakest point · {nextTarget.type} · {nextTarget.id}
                </span>
                <strong>{nextTarget.text}</strong>
                <small>
                  {nextTriage?.priority_score_internal != null
                    ? `Review priority ${nextTriage.priority_score_internal}`
                    : "Semantic review target"}
                </small>
              </article>

              {affectedDownstream.map((item) => (
                <div key={item.id}>
                  <div className="focus-chain-link">
                    <span>affects</span>
                  </div>
                  <article className="focus-chain-card">
                    <span>
                      {item.type} · {item.id}
                    </span>
                    <strong>{item.text}</strong>
                  </article>
                </div>
              ))}
            </div>

            <aside className="focus-context">
              <section>
                <p className="eyebrow">Why this matters</p>
                <ul className="focus-reasons">
                  {(nextTriage?.reason_codes ?? []).map((code) => (
                    <li key={code}>
                      {REASON_LABELS[code] ??
                        code.toLowerCase().replaceAll("_", " ")}
                    </li>
                  ))}
                </ul>
              </section>

              {supportingItems.length > 0 ? (
                <section>
                  <p className="eyebrow">Supports</p>
                  {supportingItems.map((item) => (
                    <p className="focus-muted" key={item.id}>
                      {item.id} · {item.text}
                    </p>
                  ))}
                </section>
              ) : null}

              {challengingItems.length > 0 ? (
                <section>
                  <p className="eyebrow">Challenges</p>
                  {challengingItems.map((item) => (
                    <p className="focus-muted" key={item.id}>
                      {item.id} · {item.text}
                    </p>
                  ))}
                </section>
              ) : null}

              <section>
                <p className="eyebrow">What happens next</p>
                <p className="focus-muted">
                  If the agent proposes a revision, Groundline will move to the
                  decision view automatically. There is no disabled repair button
                  and no page-side attempt to start an AI model.
                </p>
              </section>
            </aside>
          </div>
        </section>
      ) : null}

      {reviewFresh && !nextTarget && !proposed ? (
        <section className="focus-complete">
          <div className="focus-complete__status">
            <p className="eyebrow">Current review complete</p>
            <h3>No unresolved CRITICAL or REVIEW item remains in this triage.</h3>
          </div>
          <p className="focus-muted">
            This is an operational review state, not a declaration that the
            conclusion is true.
          </p>
        </section>
      ) : null}

      {proposed ? (
        <section className="focus-revision" aria-label="Human revision decision">
          <div className="focus-analysis__heading">
            <div>
              <p className="eyebrow">Agent proposal</p>
              <h3>Compare the accepted reasoning with the proposed revision.</h3>
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

          <label className="revision-editor">
            <span>Edit before accepting</span>
            <textarea
              rows={5}
              value={editedText}
              onChange={(event) => setEditedText(event.target.value)}
            />
          </label>

          <div className="focus-action-row focus-action-row--primary">
            <button type="button" onClick={onAccept}>
              Accept proposal
            </button>
            <button
              type="button"
              onClick={() => onEditAndAccept(editedText)}
              disabled={!editedText.trim()}
            >
              Accept edited
            </button>
            <button type="button" onClick={onReject}>
              Reject
            </button>
            <button type="button" onClick={onDefer}>
              Defer
            </button>
          </div>

          <p className="focus-muted">
            Agent proposes. Human decides. Accepted knowledge changes only after
            one of the human acceptance actions above.
          </p>
        </section>
      ) : null}

      {mapExpanded ? (
        <Suspense
          fallback={
            <section className="focus-map-loading">
              Loading reasoning map…
            </section>
          }
        >
          <ExpandedReasoningMap
            workspace={workspace}
            selectedItemId={selectedItemId ?? nextTargetId}
            focusedItemIds={focusedForMap}
            graphSelectionRequest={graphSelectionRequest}
            onSelectItem={onSelectItem}
            onCollapse={() => setMapExpanded(false)}
            onAccept={onAccept}
            onEditAndAccept={onEditAndAccept}
            onReject={onReject}
            onDefer={onDefer}
            heading="Inspect the full reasoning map."
            showCollapse
          />
        </Suspense>
      ) : null}
    </>
  );
}
