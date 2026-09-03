import { getDownstreamDependencies } from "../domain/dependencies";
import type { Workspace } from "../domain/schema";
import { isP112CustomSemanticAnalysisFresh } from "./p112CustomSemanticGate";
import {
  type FocusResult,
  type GraphSelectionRequest,
  useWorkspaceStore,
} from "./workspaceStore";

let installed = false;

function lastEventIndex(
  workspace: Workspace,
  eventType: Workspace["audit_events"][number]["event_type"],
): number {
  return workspace.audit_events
    .map((event) => event.event_type)
    .lastIndexOf(eventType);
}

function latestProposedRevisionExists(workspace: Workspace): boolean {
  return workspace.revisions.some((revision) => revision.state === "PROPOSED");
}

function acceptedRevisionAfterLastTriage(workspace: Workspace): boolean {
  const lastAcceptedRevisionIndex = lastEventIndex(workspace, "ACCEPT_REVISION");
  const lastTriageIndex = lastEventIndex(workspace, "TRIAGE");

  return (
    lastAcceptedRevisionIndex >= 0 &&
    lastAcceptedRevisionIndex > lastTriageIndex
  );
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

function reviewedStructuralLineageIds(workspace: Workspace): Set<string> {
  const reviewed = new Set<string>();

  for (const revision of workspace.revisions) {
    if (revision.state === "PROPOSED") continue;

    const proposalEvent = [...workspace.audit_events]
      .reverse()
      .find(
        (event) =>
          event.event_type === "PROPOSE_REVISION" &&
          event.entity_ids.includes(revision.revision_id),
      );
    const primaryRiskId = proposalEvent?.metadata?.primary_risk_id;

    reviewed.add(
      typeof primaryRiskId === "string"
        ? primaryRiskId
        : revision.target_item_id,
    );
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const item of workspace.items) {
      if (
        item.supersedes_id &&
        reviewed.has(item.supersedes_id) &&
        !reviewed.has(item.id)
      ) {
        reviewed.add(item.id);
        changed = true;
      }
    }
  }

  return reviewed;
}

export function getP113NextStructuralTarget(
  workspace: Workspace,
): string | null {
  const reviewed = reviewedStructuralLineageIds(workspace);

  return (
    workspace.items.find(
      (item) =>
        item.state === "ACCEPTED" &&
        item.tags?.includes("unlinked") &&
        !reviewed.has(item.id),
    )?.id ?? null
  );
}

export function hasP113StructuralCycleCandidate(
  workspace: Workspace,
): boolean {
  if (latestProposedRevisionExists(workspace)) {
    return false;
  }

  if (isP112CustomSemanticAnalysisFresh(workspace)) {
    return false;
  }

  if (!acceptedRevisionAfterLastTriage(workspace)) {
    return true;
  }

  return getP113NextStructuralTarget(workspace) !== null;
}

function latestPrimaryRiskFocus(workspace: Workspace): string | null {
  const event = [...workspace.audit_events]
    .reverse()
    .find(
      (candidate) =>
        candidate.event_type === "FOCUS" &&
        candidate.metadata?.requested_action === "FOCUS_PRIMARY_RISK",
    );

  const value = event?.metadata?.primary_item_id;
  return typeof value === "string" ? value : null;
}

function focusResultForStructuralTarget(
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
    basis: "STRUCTURAL_FALLBACK",
  };
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

export function installP113StructuralCycleGuard(): void {
  if (installed) return;
  installed = true;

  const previousFocusCustomPrimaryRisk =
    useWorkspaceStore.getState().focusCustomPrimaryRisk;

  useWorkspaceStore.setState({
    focusCustomPrimaryRisk: () => {
      const state = useWorkspaceStore.getState();
      const current = state.workspace;

      if (
        latestProposedRevisionExists(current) ||
        isP112CustomSemanticAnalysisFresh(current) ||
        !acceptedRevisionAfterLastTriage(current)
      ) {
        return previousFocusCustomPrimaryRisk();
      }

      const targetId = getP113NextStructuralTarget(current);
      if (!targetId) {
        return null;
      }

      const result = focusResultForStructuralTarget(current, targetId);

      if (latestPrimaryRiskFocus(current) === targetId) {
        reselectWithoutDuplicateAudit(result);
        return result;
      }

      state.focusItemsWithAudit(
        result.focusedItemIds,
        targetId,
        "HUMAN",
        {
          requested_action: "FOCUS_PRIMARY_RISK",
          basis: "STRUCTURAL_FALLBACK",
          p11_3_lineage_cycle_guard: true,
        },
      );

      return result;
    },
  });
}
