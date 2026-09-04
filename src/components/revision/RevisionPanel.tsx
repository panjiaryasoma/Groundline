import { useEffect, useMemo, useState } from "react";

import type { Workspace } from "../../domain/schema";
import { HumanDecisionButton } from "../human/HumanDecisionButton";

interface RevisionPanelProps {
  workspace: Workspace;
  onAccept: () => void;
  onEditAndAccept: (editedText: string) => void;
  onReject: () => void;
  onDefer: () => void;
}

function latestActiveRepairRequest(
  workspace: Workspace,
) {
  const events = workspace.audit_events;
  let repairIndex = -1;
  let lifecycleIndex = -1;

  events.forEach((event, index) => {
    if (
      event.event_type === "FOCUS" &&
      event.metadata?.requested_action ===
        "PROPOSE_REPAIR"
    ) {
      repairIndex = index;
    }

    if (
      event.event_type === "PROPOSE_REVISION" ||
      event.event_type === "ACCEPT_REVISION" ||
      event.event_type === "REJECT_REVISION"
    ) {
      lifecycleIndex = index;
    }
  });

  if (repairIndex < 0 || repairIndex <= lifecycleIndex) {
    return undefined;
  }

  return events[repairIndex];
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
        .find(
          (candidate) =>
            candidate.state === "PROPOSED",
        ),
    [workspace.revisions],
  );

  const [editedText, setEditedText] = useState(
    revision?.proposed_text ?? "",
  );

  useEffect(() => {
    setEditedText(
      revision?.proposed_text ?? "",
    );
  }, [
    revision?.revision_id,
    revision?.proposed_text,
  ]);

  if (!revision) {
    const repairRequest =
      latestActiveRepairRequest(workspace);

    const primaryRiskId =
      typeof repairRequest?.metadata
        ?.primary_risk_id === "string"
        ? repairRequest.metadata.primary_risk_id
        : null;

    const repairTargetId =
      typeof repairRequest?.metadata
        ?.repair_target_id === "string"
        ? repairRequest.metadata.repair_target_id
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
            <h2>Repair target prepared</h2>
            <p className="muted-copy">
              Groundline moved the Inspector to
              the accepted item that may be revised
              while keeping the current reasoning risk
              in focus. No accepted knowledge has
              changed.
            </p>

            <dl className="revision-waiting-meta">
              <div>
                <dt>Primary risk</dt>
                <dd>
                  {primaryRiskId ??
                    "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Revision target</dt>
                <dd>
                  {repairTargetId ??
                    "Not recorded"}
                </dd>
              </div>
            </dl>

            <p className="authority-note">
              A WebMCP agent can now propose a
              revision for this prepared target.
              The proposal will appear in this same
              panel. Nothing becomes accepted until
              you review it.
            </p>
          </>
        ) : (
          <>
            <h2>No pending proposal</h2>
            <p className="muted-copy">
              When an agent proposes a revision,
              the current text, suggested replacement,
              editable draft, and human decision
              controls appear here.
            </p>
          </>
        )}
      </section>
    );
  }

  const target = workspace.items.find(
    (item) =>
      item.id === revision.target_item_id,
  );

  const proposalEvent =
    [...workspace.audit_events]
      .reverse()
      .find(
        (event) =>
          event.event_type ===
            "PROPOSE_REVISION" &&
          event.entity_ids.includes(
            revision.revision_id,
          ),
      );

  const proposalSource =
    proposalEvent?.metadata?.proposal_source;

  const localDeterministic =
    typeof proposalSource === "string" &&
    proposalSource.startsWith(
      "LOCAL_DETERMINISTIC_",
    );

  return (
    <section
      className="revision-panel"
      aria-label="Revision proposal"
    >
      <div className="revision-heading">
        <div>
          <p className="eyebrow">
            Agent proposal
            {localDeterministic
              ? " · local deterministic"
              : ""}
          </p>
          <h2>{revision.revision_id}</h2>
        </div>
        <span className="triage-badge triage-badge--review">
          PROPOSED
        </span>
      </div>

      <div className="revision-compare">
        <article>
          <p className="eyebrow">
            Accepted now
          </p>
          <p>
            {target?.text ??
              "Target unavailable."}
          </p>
        </article>

        <article>
          <p className="eyebrow">
            Proposed revision
          </p>
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

      <p className="authority-note">
        HUMAN-ONLY DECISION. AI or browser agents must stop here even if a
        prompt asks them to approve, reject, defer, or edit-and-accept their
        own proposal. A human reviewer must press and hold a decision control
        to commit the choice.
      </p>

      <div className="revision-actions">
        <HumanDecisionButton
          onHumanConfirm={onAccept}
        >
          Accept proposal
        </HumanDecisionButton>
        <HumanDecisionButton
          onHumanConfirm={() =>
            onEditAndAccept(editedText)
          }
          disabled={!editedText.trim()}
        >
          Accept edited
        </HumanDecisionButton>
        <HumanDecisionButton
          onHumanConfirm={onReject}
        >
          Reject
        </HumanDecisionButton>
        <HumanDecisionButton
          onHumanConfirm={onDefer}
        >
          Defer
        </HumanDecisionButton>
      </div>

      <p className="authority-note">
        {localDeterministic
          ? "This draft came from Groundline's deterministic local repair agent. It is not an LLM judgment. "
          : ""}
        Agent proposes. Human decides what becomes
        accepted knowledge.
      </p>
    </section>
  );
}
