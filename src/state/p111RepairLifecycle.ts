import { getDownstreamDependencies } from "../domain/dependencies";
import {
  acceptRevision,
  editAndAcceptRevision,
  proposeRevision,
} from "../domain/revisions";
import {
  WorkspaceSchema,
  type KnowledgeItem,
  type Revision,
  type Workspace,
} from "../domain/schema";
import {
  attachWorkspaceAnalysis,
  rankTriageRecords,
  triageWorkspaceFromEvaluations,
} from "../domain/workspaceAnalysis";
import { integration001Evaluations } from "../fixtures/integration001Evaluations";
import {
  type FocusResult,
  type GraphSelectionRequest,
  useWorkspaceStore,
} from "./workspaceStore";

const SEEDED_REPAIR_TARGETS = [
  "A-001",
  "C-001",
  "CONC-001",
] as const;

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

export function p111ReviewedTargetIds(
  workspace: Workspace,
): Set<string> {
  const reviewed = new Set<string>();

  for (const revision of workspace.revisions) {
    if (revision.state === "PROPOSED") {
      continue;
    }

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

export function isP111AnalysisFresh(
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

export function isP111SeededCycleComplete(
  workspace: Workspace,
): boolean {
  const reviewed = p111ReviewedTargetIds(workspace);
  return SEEDED_REPAIR_TARGETS.every((id) => reviewed.has(id));
}

export function getP111SeededNextTarget(
  workspace: Workspace,
): string | null {
  if (!isP111AnalysisFresh(workspace)) {
    return null;
  }

  const reviewed = p111ReviewedTargetIds(workspace);

  return (
    rankTriageRecords(workspace.triage_records)
      .filter(
        (record) =>
          record.state === "CRITICAL" ||
          record.state === "REVIEW",
      )
      .find((record) => {
        if (reviewed.has(record.item_id)) {
          return false;
        }

        return workspace.items.some(
          (item) =>
            item.id === record.item_id &&
            item.state === "ACCEPTED",
        );
      })?.item_id ?? null
  );
}

function validateWorkspace(workspace: Workspace): Workspace {
  const parsed = WorkspaceSchema.safeParse(workspace);

  if (!parsed.success) {
    throw new Error(
      "P11.1 lifecycle produced a workspace that violates schema 1.1.0.",
    );
  }

  return parsed.data;
}

function replacementPrefix(
  workspace: Workspace,
  targetItemId: string,
): string {
  const type = workspace.items.find(
    (item) => item.id === targetItemId,
  )?.type;

  switch (type) {
    case "QUESTION":
      return "Q";
    case "CLAIM":
      return "C";
    case "COUNTERCLAIM":
      return "CC";
    case "EVIDENCE":
      return "E";
    case "ASSUMPTION":
      return "A";
    case "SOURCE":
      return "SRC";
    case "CONCLUSION":
    default:
      return "CONC";
  }
}

function affectedAcceptedIds(
  workspace: Workspace,
  targetId: string,
): string[] {
  const trace = getDownstreamDependencies(workspace, targetId);

  return [targetId, ...trace.node_ids].filter(
    (id, index, values) => values.indexOf(id) === index,
  );
}

function invalidateAnalysisAfterAcceptance(
  before: Workspace,
  after: Workspace,
  revision: Revision,
): Workspace {
  const traceIds = affectedAcceptedIds(
    before,
    revision.target_item_id,
  );
  const invalidatedIds = [
    revision.target_item_id,
    ...revision.affected_item_ids,
    ...traceIds,
  ].filter(
    (id, index, values) => values.indexOf(id) === index,
  );
  const invalidated = new Set(invalidatedIds);
  const next = structuredClone(after);

  next.evaluations = next.evaluations.filter(
    (evaluation) => !invalidated.has(evaluation.item_id),
  );
  next.triage_records = next.triage_records.filter(
    (record) => !invalidated.has(record.item_id),
  );

  const acceptEvent = [...next.audit_events]
    .reverse()
    .find(
      (event) =>
        event.event_type === "ACCEPT_REVISION" &&
        event.entity_ids.includes(revision.revision_id),
    );

  if (acceptEvent) {
    acceptEvent.metadata = {
      ...(acceptEvent.metadata ?? {}),
      analysis_invalidated_item_ids: invalidatedIds,
      requires_reanalysis: true,
      semantic_relations_inherited: false,
      p11_1_per_risk_repair: true,
    };
  }

  return validateWorkspace(next);
}

function seededRepairText(targetId: string): string {
  switch (targetId) {
    case "A-001":
      return (
        "Aggregate accuracy alone does not establish that performance generalizes across demographic groups, capture conditions, or the intended high-stakes deployment context."
      );
    case "C-001":
      return (
        "The system's accuracy is not established for all enrolled users in the intended deployment until performance is evaluated across relevant populations and capture conditions."
      );
    case "CONC-001":
      return (
        "Do not use face recognition as the sole high-stakes access-control mechanism until performance is evaluated across the intended populations and capture conditions; retain an alternative review or access path."
      );
    default:
      return "Treat this reasoning item as provisional until the represented risk is resolved.";
  }
}

function deterministicPerItemRepairText(
  item: KnowledgeItem,
): string {
  switch (item.type) {
    case "ASSUMPTION":
      return "This assumption should remain conditional until it is directly supported in the intended context.";
    case "CLAIM":
      return "This claim should be limited to the scope directly supported by the represented evidence and treated as provisional beyond that scope.";
    case "COUNTERCLAIM":
      return "This counterclaim should be limited to the scope directly supported by the represented challenge evidence.";
    case "EVIDENCE":
      return "This evidence should be treated as provisional until its provenance, scope, and relevance are verified.";
    case "SOURCE":
      return "This source should be treated as provisional until its provenance, relevance, and quality are verified.";
    case "QUESTION":
      return "Clarify the decision scope before using this question as the basis for a broader conclusion.";
    case "CONCLUSION":
      return "Keep this conclusion provisional until the focused reasoning risk is resolved; prefer a limited, reversible decision in the meantime.";
  }
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
    basis: workspace.triage_records.some(
      (record) => record.item_id === targetId,
    )
      ? "SEMANTIC_TRIAGE"
      : "STRUCTURAL_FALLBACK",
  };
}

function writeRepairPreparation(
  result: FocusResult,
): void {
  const state = useWorkspaceStore.getState();
  const current = state.workspace;
  const next = structuredClone(current);
  const timestamp = nowIso();

  next.audit_events.push({
    event_id: nextId("AUD-FOCUS", current),
    event_type: "FOCUS",
    timestamp,
    actor_type: "HUMAN",
    entity_ids: result.focusedItemIds,
    metadata: {
      requested_action: "PROPOSE_REPAIR",
      primary_item_id: result.targetId,
      primary_risk_id: result.targetId,
      repair_target_id: result.targetId,
      proposal_state: "AWAITING_AGENT",
      p11_1_per_risk_repair: true,
    },
  });

  useWorkspaceStore.setState({
    workspace: validateWorkspace(next),
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

export function installP111RepairLifecycle(): void {
  if (installed) return;
  installed = true;

  useWorkspaceStore.setState({
    runSeededAnalysis: () => {
      const state = useWorkspaceStore.getState();
      const current = state.workspace;

      if (
        isP111SeededCycleComplete(current) ||
        latestProposedRevision(current)
      ) {
        return;
      }

      const reviewed = p111ReviewedTargetIds(current);
      const evaluations = integration001Evaluations.filter(
        (evaluation) => {
          const subject = current.items.find(
            (item) => item.id === evaluation.item_id,
          );

          if (!subject || subject.state !== "ACCEPTED") {
            return false;
          }

          return !reviewed.has(evaluation.item_id);
        },
      );

      const analysis = triageWorkspaceFromEvaluations(
        current,
        evaluations,
      );
      const analyzed = attachWorkspaceAnalysis(
        current,
        analysis,
      );
      const nextTarget =
        rankTriageRecords(analysis.triage_records)
          .filter(
            (record) =>
              record.state === "CRITICAL" ||
              record.state === "REVIEW",
          )[0]?.item_id ?? null;

      useWorkspaceStore.setState({
        workspace: analyzed,
        ui: {
          ...state.ui,
          selectedItemId: nextTarget,
          focusedItemIds: nextTarget
            ? affectedAcceptedIds(analyzed, nextTarget)
            : [],
          graphSelectionRequest: nextGraphSelectionRequest(
            state.ui.graphSelectionRequest,
            nextTarget,
          ),
        },
      });
    },

    focusPrimaryRisk: () => {
      const state = useWorkspaceStore.getState();
      const current = state.workspace;

      if (
        isP111SeededCycleComplete(current) ||
        latestProposedRevision(current)
      ) {
        return;
      }

      const targetId = getP111SeededNextTarget(current);
      if (!targetId) return;

      const result = focusResultForTarget(current, targetId);

      useWorkspaceStore.setState({
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
    },

    proposeSeededRevision: () => {
      const state = useWorkspaceStore.getState();
      const current = state.workspace;

      if (
        isP111SeededCycleComplete(current) ||
        latestProposedRevision(current)
      ) {
        return;
      }

      const targetId = getP111SeededNextTarget(current);
      if (!targetId) return;

      const target = current.items.find(
        (item) =>
          item.id === targetId && item.state === "ACCEPTED",
      );
      const triage = current.triage_records.find(
        (record) => record.item_id === targetId,
      );

      if (!target || !triage) return;

      const affectedItemIds = affectedAcceptedIds(
        current,
        targetId,
      );
      const createdAt = nowIso();
      const revisionId = nextId("REV-P111", current);
      const auditEventId = nextId("AUD-PROP", current);
      const proposed = proposeRevision({
        workspace: current,
        revisionId,
        targetItemId: targetId,
        proposedText: seededRepairText(targetId),
        reasonCodes: triage.reason_codes,
        affectedItemIds,
        createdBy: "AGENT",
        createdAt,
        auditEventId,
      });
      const proposalEvent = proposalAuditForRevision(
        proposed,
        revisionId,
      );

      if (proposalEvent) {
        proposalEvent.metadata = {
          ...(proposalEvent.metadata ?? {}),
          primary_focus_id: targetId,
          primary_risk_id: targetId,
          repair_target_id: targetId,
          proposal_source: "P11_1_SEEDED_PER_RISK",
          semantic_relations_inherited: false,
        };
      }

      useWorkspaceStore.setState({
        workspace: validateWorkspace(proposed),
        ui: {
          ...state.ui,
          selectedItemId: targetId,
          focusedItemIds: affectedItemIds,
          graphSelectionRequest: nextGraphSelectionRequest(
            state.ui.graphSelectionRequest,
            targetId,
          ),
        },
      });
    },

    prepareCustomRepairTarget: () => {
      const state = useWorkspaceStore.getState();
      const current = state.workspace;

      if (latestProposedRevision(current)) {
        return null;
      }

      let targetId = latestPrimaryRiskFocus(current);
      const reviewed = p111ReviewedTargetIds(current);
      const targetStillValid = targetId
        ? current.items.some(
            (item) =>
              item.id === targetId &&
              item.state === "ACCEPTED",
          ) && !reviewed.has(targetId)
        : false;

      if (!targetStillValid) {
        const focused = state.focusCustomPrimaryRisk();
        if (!focused) return null;
        targetId = focused.targetId;
      }

      if (!targetId) return null;

      const result = focusResultForTarget(current, targetId);
      writeRepairPreparation(result);
      return result;
    },

    proposeCustomRepair: () => {
      let state = useWorkspaceStore.getState();
      let current = state.workspace;

      if (latestProposedRevision(current)) {
        return null;
      }

      let targetId = latestPrimaryRiskFocus(current);
      const reviewed = p111ReviewedTargetIds(current);
      const targetStillValid = targetId
        ? current.items.some(
            (item) =>
              item.id === targetId &&
              item.state === "ACCEPTED",
          ) && !reviewed.has(targetId)
        : false;

      if (!targetStillValid) {
        const focused = state.focusCustomPrimaryRisk();
        if (!focused) return null;
        state = useWorkspaceStore.getState();
        current = state.workspace;
        targetId = focused.targetId;
      }

      if (!targetId) return null;

      const target = current.items.find(
        (item) =>
          item.id === targetId && item.state === "ACCEPTED",
      );
      if (!target) return null;

      const result = focusResultForTarget(current, targetId);
      const triage = current.triage_records.find(
        (record) => record.item_id === targetId,
      );
      const createdAt = nowIso();
      const revisionId = nextId("REV-LOCAL", current);
      const auditEventId = nextId("AUD-PROP", current);
      const next = proposeRevision({
        workspace: current,
        revisionId,
        targetItemId: targetId,
        proposedText: deterministicPerItemRepairText(target),
        reasonCodes:
          triage?.reason_codes ?? ["STRUCTURAL_REVIEW_TARGET"],
        affectedItemIds: result.focusedItemIds,
        createdBy: "AGENT",
        createdAt,
        auditEventId,
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
          proposal_source: "LOCAL_DETERMINISTIC_PER_RISK_REPAIR",
          p11_1_per_risk_repair: true,
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

    acceptLatestRevision: () => {
      const state = useWorkspaceStore.getState();
      const current = state.workspace;
      const revision = latestProposedRevision(current);
      if (!revision) return;

      const reviewedAt = nowIso();
      const acceptedItemId = nextId(
        replacementPrefix(current, revision.target_item_id),
        current,
      );
      const accepted = acceptRevision({
        workspace: current,
        revisionId: revision.revision_id,
        actor: "HUMAN",
        reviewedAt,
        auditEventId: nextId("AUD-ACCEPT", current),
        acceptedItemId,
      });
      const invalidated = invalidateAnalysisAfterAcceptance(
        current,
        accepted,
        revision,
      );

      useWorkspaceStore.setState({
        workspace: invalidated,
        ui: {
          ...state.ui,
          selectedItemId: acceptedItemId,
          focusedItemIds: [acceptedItemId],
          graphSelectionRequest: nextGraphSelectionRequest(
            state.ui.graphSelectionRequest,
            acceptedItemId,
          ),
        },
      });
    },

    editAndAcceptLatestRevision: (editedText: string) => {
      if (!editedText.trim()) return;

      const state = useWorkspaceStore.getState();
      const current = state.workspace;
      const revision = latestProposedRevision(current);
      if (!revision) return;

      const reviewedAt = nowIso();
      const acceptedItemId = nextId(
        replacementPrefix(current, revision.target_item_id),
        current,
      );
      const accepted = editAndAcceptRevision({
        workspace: current,
        revisionId: revision.revision_id,
        actor: "HUMAN",
        reviewedAt,
        auditEventId: nextId("AUD-EDIT-ACCEPT", current),
        acceptedItemId,
        editedText,
      });
      const invalidated = invalidateAnalysisAfterAcceptance(
        current,
        accepted,
        revision,
      );

      useWorkspaceStore.setState({
        workspace: invalidated,
        ui: {
          ...state.ui,
          selectedItemId: acceptedItemId,
          focusedItemIds: [acceptedItemId],
          graphSelectionRequest: nextGraphSelectionRequest(
            state.ui.graphSelectionRequest,
            acceptedItemId,
          ),
        },
      });
    },
  });
}
