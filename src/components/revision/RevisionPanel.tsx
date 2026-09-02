import { useEffect, useMemo, useState } from "react";
import type { Workspace } from "../../domain/schema";

interface RevisionPanelProps {
  workspace: Workspace;
  onAccept: () => void;
  onEditAndAccept: (editedText: string) => void;
  onReject: () => void;
  onDefer: () => void;
}

export function RevisionPanel({
  workspace,
  onAccept,
  onEditAndAccept,
  onReject,
  onDefer,
}: RevisionPanelProps) {
  const revision = useMemo(
    () =>
      [...workspace.revisions]
        .reverse()
        .find((candidate) => candidate.state === "PROPOSED"),
    [workspace.revisions],
  );

  const [editedText, setEditedText] = useState(
    revision?.proposed_text ?? "",
  );

  useEffect(() => {
    setEditedText(revision?.proposed_text ?? "");
  }, [revision?.revision_id, revision?.proposed_text]);

  if (!revision) {
    const repairRequest =
      [...workspace.audit_events]
        .reverse()
        .find(
          (event) =>
            event.event_type === "FOCUS" &&
            event.metadata
              ?.requested_action ===
              "PROPOSE_REPAIR",
        );

    const primaryRiskId =
      typeof repairRequest?.metadata
        ?.primary_risk_id === "string"
        ? repairRequest.metadata
            .primary_risk_id
        : null;

    const repairTargetId =
      typeof repairRequest?.metadata
        ?.repair_target_id === "string"
        ? repairRequest.metadata
            .repair_target_id
        : null;

    return (
      <section
        className="revision-panel"
        aria-label="Revision proposal"
      >
        <p className="eyebrow">
          Revision proposal
        </p>

        {repairRequest ? (
          <>
            <h2>
              Ready for WebMCP agent
            </h2>
            <p className="muted-copy">
              Groundline prepared the repair target.
              Nothing is running in the background.
              A WebMCP-aware agent must inspect this
              page and call{" "}
              <code>propose_revision</code>.
            </p>

            <div className="revision-agent-instruction">
              <span>Ask your agent</span>
              <p>
                Review this Groundline workspace.
                Inspect and triage the reasoning,
                focus the highest-priority unresolved
                risk, trace how it affects the accepted
                conclusion, then propose a revision for
                the prepared repair target. Do not
                accept it.
              </p>
            </div>

            <dl className="revision-waiting-meta">
              <div>
                <dt>Primary risk</dt>
                <dd>
                  {primaryRiskId ??
                    "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Repair target</dt>
                <dd>
                  {repairTargetId ??
                    "Not recorded"}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <h2>No pending proposal</h2>
            <p className="muted-copy">
              The agent may propose a repair.
              Accepted knowledge does not change
              until a human reviews it.
            </p>
          </>
        )}
      </section>
    );
  }

  const target = workspace.items.find(
    (item) => item.id === revision.target_item_id,
  );

  return (
    <section
      className="revision-panel"
      aria-label="Revision proposal"
    >
      <div className="revision-heading">
        <div>
          <p className="eyebrow">Agent proposal</p>
          <h2>{revision.revision_id}</h2>
        </div>
        <span className="triage-badge triage-badge--review">
          PROPOSED
        </span>
      </div>

      <div className="revision-compare">
        <article>
          <p className="eyebrow">Accepted now</p>
          <p>{target?.text ?? "Target unavailable."}</p>
        </article>

        <article>
          <p className="eyebrow">Proposed revision</p>
          <p>{revision.proposed_text}</p>
        </article>
      </div>

      <label className="edit-field">
        <span>Edit before accepting</span>
        <textarea
          value={editedText}
          onChange={(event) =>
            setEditedText(event.target.value)
          }
          rows={5}
        />
      </label>

      <div className="revision-actions">
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

      <p className="authority-note">
        Agent proposes. Human decides what becomes accepted
        knowledge.
      </p>
    </section>
  );
}
