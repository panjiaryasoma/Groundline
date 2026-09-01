import { create } from "zustand";
import { integration001 } from "../fixtures/integration001";
import { integration001Evaluations } from "../fixtures/integration001Evaluations";
import type { Workspace } from "../domain/schema";
import {
  attachWorkspaceAnalysis,
  triageWorkspaceFromEvaluations,
} from "../domain/workspaceAnalysis";
import { getDownstreamDependencies } from "../domain/dependencies";
import {
  acceptRevision,
  deferRevision,
  editAndAcceptRevision,
  proposeRevision,
  rejectRevision,
} from "../domain/revisions";

interface EphemeralUiState {
  selectedItemId: string | null;
  focusedItemIds: string[];
}

interface WorkspaceState {
  workspace: Workspace;
  ui: EphemeralUiState;

  resetDemo: () => void;
  selectItem: (itemId: string | null) => void;
  focusItems: (itemIds: string[]) => void;

  runSeededAnalysis: () => void;
  focusPrimaryRisk: () => void;
  proposeSeededRevision: () => void;

  acceptLatestRevision: () => void;
  editAndAcceptLatestRevision: (editedText: string) => void;
  rejectLatestRevision: () => void;
  deferLatestRevision: () => void;
}

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

function getLatestProposedRevision(workspace: Workspace) {
  return [...workspace.revisions]
    .reverse()
    .find((revision) => revision.state === "PROPOSED");
}


export function isSeededDemoCycleComplete(
  workspace: Workspace,
): boolean {
  return workspace.revisions.some(
    (revision) => revision.state !== "PROPOSED",
  );
}

export function isSeededAnalysisFresh(
  workspace: Workspace,
): boolean {
  if (workspace.triage_records.length === 0) {
    return false;
  }

  if (!workspace.accepted_conclusion_id) {
    return false;
  }

  return workspace.triage_records.some(
    (record) =>
      record.item_id === workspace.accepted_conclusion_id,
  );
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: structuredClone(integration001),
  ui: {
    selectedItemId: null,
    focusedItemIds: [],
  },

  resetDemo: () =>
    set({
      workspace: structuredClone(integration001),
      ui: {
        selectedItemId: null,
        focusedItemIds: [],
      },
    }),

  selectItem: (itemId) =>
    set((state) => ({
      ui: {
        ...state.ui,
        selectedItemId: itemId,
      },
    })),

  focusItems: (itemIds) =>
    set((state) => ({
      ui: {
        ...state.ui,
        focusedItemIds: [...new Set(itemIds)],
      },
    })),

  runSeededAnalysis: () => {
    const current = get().workspace;

    if (isSeededDemoCycleComplete(current)) {
      return;
    }

    if (current.accepted_conclusion_id !== "CONC-001") {
      return;
    }

    const analysis = triageWorkspaceFromEvaluations(
      current,
      integration001Evaluations,
    );

    const analyzed = attachWorkspaceAnalysis(current, analysis);

    set({
      workspace: analyzed,
      ui: {
        ...get().ui,
        selectedItemId:
          analysis.ordered_review_targets[0]?.item_id ?? null,
      },
    });
  },

  focusPrimaryRisk: () => {
    const current = get().workspace;

    if (
      isSeededDemoCycleComplete(current) ||
      !isSeededAnalysisFresh(current)
    ) {
      return;
    }

    const targetId =
      current.triage_records
        .slice()
        .sort(
          (left, right) =>
            (right.priority_score_internal ?? -1) -
            (left.priority_score_internal ?? -1),
        )[0]?.item_id ?? "A-001";

    const trace = getDownstreamDependencies(current, targetId);

    set((state) => ({
      ui: {
        ...state.ui,
        selectedItemId: targetId,
        focusedItemIds: [
          targetId,
          ...trace.node_ids,
        ],
      },
    }));
  },

  proposeSeededRevision: () => {
    const current = get().workspace;

    if (
      current.revisions.length > 0 ||
      !isSeededAnalysisFresh(current)
    ) {
      return;
    }

    if (getLatestProposedRevision(current)) {
      return;
    }

    const createdAt = nowIso();
    const revisionId = nextId("REV-UI", current);
    const auditEventId = nextId("AUD-PROP", current);

    const next = proposeRevision({
      workspace: current,
      revisionId,
      targetItemId: current.accepted_conclusion_id ?? "CONC-001",
      proposedText:
        "Do not use face recognition as the sole high-stakes access-control mechanism until performance is evaluated across the intended populations and capture conditions; retain an alternative review or access path.",
      reasonCodes: [
        "UNSUPPORTED_ASSUMPTION",
        "OVERGENERALIZATION",
      ],
      affectedItemIds: [
        "A-001",
        "C-001",
        current.accepted_conclusion_id ?? "CONC-001",
      ],
      createdBy: "AGENT",
      createdAt,
      auditEventId,
    });

    set({
      workspace: next,
      ui: {
        ...get().ui,
        selectedItemId:
          current.accepted_conclusion_id ?? "CONC-001",
      },
    });
  },

  acceptLatestRevision: () => {
    const current = get().workspace;
    const revision = getLatestProposedRevision(current);

    if (!revision) return;

    const reviewedAt = nowIso();
    const acceptedItemId = nextId("CONC", current);
    const auditEventId = nextId("AUD-ACCEPT", current);

    set({
      workspace: acceptRevision({
        workspace: current,
        revisionId: revision.revision_id,
        actor: "HUMAN",
        reviewedAt,
        auditEventId,
        acceptedItemId,
      }),
      ui: {
        selectedItemId: acceptedItemId,
        focusedItemIds: [acceptedItemId],
      },
    });
  },

  editAndAcceptLatestRevision: (editedText) => {
    const current = get().workspace;
    const revision = getLatestProposedRevision(current);

    if (!revision) return;

    const reviewedAt = nowIso();
    const acceptedItemId = nextId("CONC", current);
    const auditEventId = nextId("AUD-EDIT-ACCEPT", current);

    set({
      workspace: editAndAcceptRevision({
        workspace: current,
        revisionId: revision.revision_id,
        actor: "HUMAN",
        reviewedAt,
        auditEventId,
        acceptedItemId,
        editedText,
      }),
      ui: {
        selectedItemId: acceptedItemId,
        focusedItemIds: [acceptedItemId],
      },
    });
  },

  rejectLatestRevision: () => {
    const current = get().workspace;
    const revision = getLatestProposedRevision(current);

    if (!revision) return;

    set({
      workspace: rejectRevision({
        workspace: current,
        revisionId: revision.revision_id,
        actor: "HUMAN",
        reviewedAt: nowIso(),
        auditEventId: nextId("AUD-REJECT", current),
      }),
    });
  },

  deferLatestRevision: () => {
    const current = get().workspace;
    const revision = getLatestProposedRevision(current);

    if (!revision) return;

    set({
      workspace: deferRevision({
        workspace: current,
        revisionId: revision.revision_id,
        actor: "HUMAN",
        reviewedAt: nowIso(),
        auditEventId: nextId("AUD-DEFER", current),
      }),
    });
  },
}));
