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
    return (
      <section className="revision-panel">
        <p className="eyebrow">Revision proposal</p>
        <h2>No pending proposal</h2>
        <p className="muted-copy">
          The agent may propose a repair. Accepted knowledge
          does not change until a human reviews it.
        </p>
      </section>
    );
  }

  const target = workspace.items.find(
    (item) => item.id === revision.target_item_id,
  );

  return (
    <section className="revision-panel">
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
