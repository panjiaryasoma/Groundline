import { getDownstreamDependencies } from "../domain/dependencies";
import { proposeRevision } from "../domain/revisions";
import {
  WorkspaceSchema,
  type KnowledgeItem,
  type Revision,
  type TriageRecord,
  type Workspace,
} from "../domain/schema";
import { rankTriageRecords } from "../domain/workspaceAnalysis";
import {
  type FocusResult,
  type GraphSelectionRequest,
  useWorkspaceStore,
} from "./workspaceStore";

let installed = false;

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(prefix: string, workspace: Workspace): string {
  const number =
    workspace.revisions.length +
    workspace.audit_events.length +
    workspace.items.length +
    1;

  return `${prefix}-${number.toString().padStart(3, "0")}`;
}

function nextGraphSelectionRequest(
  current: GraphSelectionRequest | undefined,
  itemId: string | null,
): GraphSelectionRequest {
  return {
    itemId,
    version: (current?.version ?? 0) + 1,
  };
}

function latestProposedRevision(
  workspace: Workspace,
): Revision | undefined {
  return [...workspace.revisions]
    .reverse()
    .find((revision) => revision.state === "PROPOSED");
}

function proposalAuditForRevision(
  workspace: Workspace,
  revisionId: string,
) {
  return [...workspace.audit_events]
    .reverse()
    .find(
      (event) =>
        event.event_type === "PROPOSE_REVISION" &&
        event.entity_ids.includes(revisionId),
    );
}

function reviewedTargetIds(workspace: Workspace): Set<string> {
  const reviewed = new Set<string>();

  for (const revision of workspace.revisions) {
    if (revision.state === "PROPOSED") continue;

    const proposalEvent = proposalAuditForRevision(
      workspace,
      revision.revision_id,
    );
    const primaryRiskId =
      proposalEvent?.metadata?.primary_risk_id;

    reviewed.add(
      typeof primaryRiskId === "string"
        ? primaryRiskId
        : revision.target_item_id,
    );
  }

  return reviewed;
}

function lastEventIndex(
  workspace: Workspace,
  eventType: Workspace["audit_events"][number]["event_type"],
): number {
  return workspace.audit_events
    .map((event) => event.event_type)
    .lastIndexOf(eventType);
}

export function isP112CustomSemanticAnalysisFresh(
  workspace: Workspace,
): boolean {
  if (workspace.triage_records.length === 0) {
    return false;
  }

  return (
    lastEventIndex(workspace, "TRIAGE") >
    lastEventIndex(workspace, "ACCEPT_REVISION")
  );
}

export function getP112CustomNextTarget(
  workspace: Workspace,
): string | null {
  if (!isP112CustomSemanticAnalysisFresh(workspace)) {
    return null;
  }

  const reviewed = reviewedTargetIds(workspace);

  return (
    rankTriageRecords(workspace.triage_records)
      .filter(
        (record) =>
          record.state === "CRITICAL" ||
          record.state === "REVIEW",
      )
      .find((record) => {
        if (reviewed.has(record.item_id)) return false;

        return workspace.items.some(
          (item) =>
            item.id === record.item_id &&
            item.state === "ACCEPTED",
        );
      })?.item_id ?? null
  );
}

function latestPrimaryRiskFocus(
  workspace: Workspace,
): string | null {
  const event = [...workspace.audit_events]
    .reverse()
    .find(
      (candidate) =>
        candidate.event_type === "FOCUS" &&
        candidate.metadata?.requested_action ===
          "FOCUS_PRIMARY_RISK",
    );

  const value = event?.metadata?.primary_item_id;
  return typeof value === "string" ? value : null;
}

function focusResultForTarget(
  workspace: Workspace,
  targetId: string,
): FocusResult {
  const trace = getDownstreamDependencies(workspace, targetId);
  const focusedItemIds = [targetId, ...trace.node_ids].filter(
    (id, index, values) => values.indexOf(id) === index,
  );

  return {
    targetId,
    focusedItemIds,
    basis: "SEMANTIC_TRIAGE",
  };
}

function validateWorkspace(workspace: Workspace): Workspace {
  const parsed = WorkspaceSchema.safeParse(workspace);

  if (!parsed.success) {
    throw new Error(
      "P11.2 custom semantic gate produced an invalid workspace.",
    );
  }

  return parsed.data;
}

function activeTriageForTarget(
  workspace: Workspace,
  targetId: string,
): TriageRecord | undefined {
  return workspace.triage_records.find(
    (record) =>
      record.item_id === targetId &&
      (record.state === "CRITICAL" ||
        record.state === "REVIEW"),
  );
}

function semanticRepairText(
  item: KnowledgeItem,
  triage: TriageRecord,
): string {
  const reasons = triage.reason_codes;

  if (reasons.includes("OVERGENERALIZATION")) {
    switch (item.type) {
      case "ASSUMPTION":
        return "Limit this assumption to the conditions directly supported by the represented evidence; treat broader generalization as unresolved until additional evidence is reviewed.";
      case "CLAIM":
      case "COUNTERCLAIM":
        return "Limit this claim to the population, conditions, and scope directly supported by the represented evidence; treat broader application as provisional.";
      case "CONCLUSION":
        return "Narrow this conclusion to what the represented reasoning actually supports and keep broader or irreversible action provisional until the identified risk is resolved.";
      default:
        break;
    }
  }

  if (reasons.includes("UNSUPPORTED_ASSUMPTION")) {
    return "Treat this assumption as conditional rather than established until direct support is represented for the intended decision context.";
  }

  if (reasons.includes("CONTRADICTED")) {
    return "Treat this reasoning item as unsettled until the represented contradiction is addressed; avoid relying on it as decisive support in the meantime.";
  }

  if (reasons.includes("SCOPE_MISMATCH")) {
    return "Restrict this reasoning item to the scope actually supported by the represented evidence and reassess before extending it beyond those conditions.";
  }

  if (reasons.includes("SOURCE_QUALITY_UNCLEAR")) {
    return "Treat this item as provisional until the relevant source provenance, quality, and applicability are verified.";
  }

  switch (item.type) {
    case "ASSUMPTION":
      return "Keep this assumption conditional until the semantic risk identified in the current triage is resolved.";
    case "CLAIM":
      return "Keep this claim provisional and limit it to what the represented evidence supports until the current semantic risk is resolved.";
    case "COUNTERCLAIM":
      return "Keep this counterclaim provisional and limited to its represented support until the current semantic risk is resolved.";
    case "EVIDENCE":
      return "Treat this evidence as provisional until its scope, provenance, and relevance to the current decision are verified.";
    case "SOURCE":
      return "Treat this source as provisional until its provenance, quality, and relevance are verified.";
    case "QUESTION":
      return "Clarify the decision scope before using this question as the basis for a broader reasoning chain.";
    case "CONCLUSION":
      return "Keep this conclusion provisional until the current semantic risk is resolved; prefer a limited, reversible decision in the meantime.";
  }
}

function reselectWithoutDuplicateAudit(result: FocusResult): void {
  const state = useWorkspaceStore.getState();

  useWorkspaceStore.setState({
    ui: {
      ...state.ui,
      selectedItemId: result.targetId,
      focusedItemIds: result.focusedItemIds,
      graphSelectionRequest: nextGraphSelectionRequest(
        state.ui.graphSelectionRequest,
        result.targetId,
      ),
    },
  });
}

export function installP112CustomSemanticGate(): void {
  if (installed) return;
  installed = true;

  useWorkspaceStore.setState({
    focusCustomPrimaryRisk: () => {
      const state = useWorkspaceStore.getState();
      const current = state.workspace;

      if (
        latestProposedRevision(current) ||
        !isP112CustomSemanticAnalysisFresh(current)
      ) {
        return null;
      }

      const targetId = getP112CustomNextTarget(current);
      if (!targetId) return null;

      const result = focusResultForTarget(current, targetId);
      const existingFocus = latestPrimaryRiskFocus(current);

      if (existingFocus === targetId) {
        reselectWithoutDuplicateAudit(result);
        return result;
      }

      state.focusItemsWithAudit(
        result.focusedItemIds,
        targetId,
        "HUMAN",
        {
          requested_action: "FOCUS_PRIMARY_RISK",
          basis: "SEMANTIC_TRIAGE",
          p11_2_custom_semantic_gate: true,
        },
      );

      return result;
    },

    prepareCustomRepairTarget: () => {
      let state = useWorkspaceStore.getState();
      let current = state.workspace;

      if (
        latestProposedRevision(current) ||
        !isP112CustomSemanticAnalysisFresh(current)
      ) {
        return null;
      }

      const targetId = getP112CustomNextTarget(current);
      if (!targetId) return null;

      if (latestPrimaryRiskFocus(current) !== targetId) {
        const focused = state.focusCustomPrimaryRisk();
        if (!focused) return null;
        state = useWorkspaceStore.getState();
        current = state.workspace;
      }

      if (!activeTriageForTarget(current, targetId)) {
        return null;
      }

      const result = focusResultForTarget(current, targetId);

      state.focusItemsWithAudit(
        result.focusedItemIds,
        targetId,
        "HUMAN",
        {
          requested_action: "PROPOSE_REPAIR",
          primary_item_id: targetId,
          primary_risk_id: targetId,
          repair_target_id: targetId,
          proposal_state: "AWAITING_AGENT",
          basis: "SEMANTIC_TRIAGE",
          p11_2_custom_semantic_gate: true,
        },
      );

      return result;
    },

    proposeCustomRepair: () => {
      let state = useWorkspaceStore.getState();
      let current = state.workspace;

      if (
        latestProposedRevision(current) ||
        !isP112CustomSemanticAnalysisFresh(current)
      ) {
        return null;
      }

      const targetId = getP112CustomNextTarget(current);
      if (!targetId) return null;

      if (latestPrimaryRiskFocus(current) !== targetId) {
        const focused = state.focusCustomPrimaryRisk();
        if (!focused) return null;
        state = useWorkspaceStore.getState();
        current = state.workspace;
      }

      const target = current.items.find(
        (item) =>
          item.id === targetId &&
          item.state === "ACCEPTED",
      );
      const triage = activeTriageForTarget(current, targetId);

      if (!target || !triage) return null;

      const result = focusResultForTarget(current, targetId);
      const revisionId = nextId("REV-LOCAL", current);
      const next = proposeRevision({
        workspace: current,
        revisionId,
        targetItemId: targetId,
        proposedText: semanticRepairText(target, triage),
        reasonCodes: [...triage.reason_codes],
        affectedItemIds: result.focusedItemIds,
        createdBy: "AGENT",
        createdAt: nowIso(),
        auditEventId: nextId("AUD-PROP", current),
      });
      const proposalEvent = proposalAuditForRevision(
        next,
        revisionId,
      );

      if (proposalEvent) {
        proposalEvent.metadata = {
          ...(proposalEvent.metadata ?? {}),
          primary_focus_id: targetId,
          primary_risk_id: targetId,
          repair_target_id: targetId,
          proposal_source: "LOCAL_DETERMINISTIC_SEMANTIC_REPAIR",
          semantic_triage_required: true,
          semantic_triage_state: triage.state,
          p11_2_custom_semantic_gate: true,
        };
      }

      useWorkspaceStore.setState({
        workspace: validateWorkspace(next),
        ui: {
          ...state.ui,
          selectedItemId: targetId,
          focusedItemIds: result.focusedItemIds,
          graphSelectionRequest: nextGraphSelectionRequest(
            state.ui.graphSelectionRequest,
            targetId,
          ),
        },
      });

      return result;
    },
  });
}
