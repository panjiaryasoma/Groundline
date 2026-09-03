import type {
  Workspace,
} from "../domain/schema";

export interface GroundlineReviewContext {
  primaryFocusId: string | null;
  primaryRiskId: string | null;
  repairTargetId: string | null;
}

function latestAgentFocusPrimaryId(
  workspace: Workspace,
): string | null {
  const event =
    [...workspace.audit_events]
      .reverse()
      .find(
        (candidate) =>
          candidate.event_type ===
            "FOCUS" &&
          candidate.actor_type ===
            "AGENT" &&
          typeof candidate.metadata
            ?.primary_item_id ===
            "string",
      );

  const id =
    event?.metadata?.primary_item_id;

  if (typeof id !== "string") {
    return null;
  }

  const item =
    workspace.items.find(
      (candidate) =>
        candidate.id === id &&
        candidate.state ===
          "ACCEPTED",
    );

  return item ? id : null;
}

function semanticRiskId(
  workspace: Workspace,
  itemId: string | null,
): string | null {
  if (!itemId) return null;

  const triage =
    workspace.triage_records.find(
      (record) =>
        record.item_id === itemId,
    );

  return (
    triage?.state === "CRITICAL" ||
    triage?.state === "REVIEW"
  )
    ? itemId
    : null;
}

function latestProposalContext(
  workspace: Workspace,
) {
  const event =
    [...workspace.audit_events]
      .reverse()
      .find(
        (candidate) =>
          candidate.event_type ===
          "PROPOSE_REVISION",
      );

  if (!event) return null;

  const primaryRisk =
    event.metadata?.primary_risk_id;
  const repairTarget =
    event.metadata?.repair_target_id;

  return {
    primaryRiskId:
      typeof primaryRisk ===
      "string"
        ? primaryRisk
        : null,
    repairTargetId:
      typeof repairTarget ===
      "string"
        ? repairTarget
        : null,
  };
}

function latestPreparedRepairContext(
  workspace: Workspace,
) {
  const event =
    [...workspace.audit_events]
      .reverse()
      .find(
        (candidate) =>
          candidate.event_type ===
            "FOCUS" &&
          candidate.metadata
            ?.requested_action ===
            "PROPOSE_REPAIR",
      );

  if (!event) return null;

  const primaryRisk =
    event.metadata?.primary_risk_id;
  const repairTarget =
    event.metadata?.repair_target_id;

  return {
    primaryRiskId:
      typeof primaryRisk ===
      "string"
        ? primaryRisk
        : null,
    repairTargetId:
      typeof repairTarget ===
      "string"
        ? repairTarget
        : null,
  };
}

export function getLatestAgentFocusPrimaryId(
  workspace: Workspace,
): string | null {
  return latestAgentFocusPrimaryId(
    workspace,
  );
}

export function deriveGroundlineReviewContext(
  workspace: Workspace,
): GroundlineReviewContext {
  const primaryFocusId =
    latestAgentFocusPrimaryId(
      workspace,
    );

  const proposal =
    latestProposalContext(workspace);
  const prepared =
    latestPreparedRepairContext(
      workspace,
    );

  const semanticAgentRisk =
    semanticRiskId(
      workspace,
      primaryFocusId,
    );

  return {
    primaryFocusId,
    primaryRiskId:
      proposal?.primaryRiskId ??
      prepared?.primaryRiskId ??
      semanticAgentRisk,
    repairTargetId:
      proposal?.repairTargetId ??
      prepared?.repairTargetId ??
      null,
  };
}
