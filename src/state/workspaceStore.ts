import { create } from "zustand";
import { integration001 } from "../fixtures/integration001";
import { integration001Evaluations } from "../fixtures/integration001Evaluations";
import {
  EvaluationRecordSchema,
  WorkspaceSchema,
  type EvaluationRecord,
  type Workspace,
} from "../domain/schema";
import {
  buildCustomWorkspace,
  type CustomDecisionInput,
} from "../domain/customWorkspace";
import {
  attachWorkspaceAnalysis,
  rankTriageRecords,
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

export type ExperienceMode =
  | "START"
  | "INTAKE"
  | "DEMO"
  | "CUSTOM";

interface EphemeralUiState {
  selectedItemId: string | null;
  focusedItemIds: string[];
}


export interface FocusResult {
  targetId: string;
  focusedItemIds: string[];
  basis: "SEMANTIC_TRIAGE" | "STRUCTURAL_FALLBACK";
}

export interface AgentRevisionInput {
  targetItemId: string;
  proposedText: string;
  reasonCodes: string[];
  affectedItemIds: string[];
}

interface WorkspaceState {
  experienceMode: ExperienceMode;
  customInput: CustomDecisionInput | null;
  workspace: Workspace;
  ui: EphemeralUiState;

  startIntake: () => void;
  startDemo: () => void;
  backToStart: () => void;
  createCustomWorkspace: (input: CustomDecisionInput) => void;

  resetDemo: () => void;
  selectItem: (itemId: string | null) => void;
  focusItems: (itemIds: string[]) => void;
  focusItemsWithAudit: (
    itemIds: string[],
    primaryItemId: string,
    actor: "HUMAN" | "AGENT" | "SYSTEM",
    metadata?: Record<string, unknown>,
  ) => void;
  focusCustomPrimaryRisk: () => FocusResult | null;
  prepareCustomRepairTarget: () => FocusResult | null;
  applyAgentEvaluations: (
    evaluations: EvaluationRecord[],
  ) => void;
  proposeAgentRevision: (
    input: AgentRevisionInput,
  ) => void;

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


function validateWorkspaceState(
  workspace: Workspace,
): Workspace {
  const parsed = WorkspaceSchema.safeParse(workspace);

  if (!parsed.success) {
    throw new Error(
      "Workspace state violates the active schema.",
    );
  }

  return parsed.data;
}

function uniqueExistingIds(
  workspace: Workspace,
  itemIds: string[],
): string[] {
  const existing = new Set(
    workspace.items.map((item) => item.id),
  );

  const unique = [...new Set(itemIds)];

  for (const id of unique) {
    if (!existing.has(id)) {
      throw new Error(
        `Knowledge item "${id}" was not found.`,
      );
    }
  }

  return unique;
}

function structuralFallbackTarget(
  workspace: Workspace,
): string {
  const byTag = (tag: string) =>
    workspace.items.find((item) =>
      item.tags?.includes(tag),
    );

  const evidence = byTag("main-evidence");
  const source = byTag("user-source");
  const assumption = byTag("stated-assumption");
  const reason = byTag("main-reason");

  if (evidence && !source) {
    return evidence.id;
  }

  if (!evidence && reason) {
    return reason.id;
  }

  if (!assumption && reason) {
    return reason.id;
  }

  return (
    workspace.accepted_conclusion_id ??
    reason?.id ??
    workspace.question_id
  );
}

function reviewedTargetIds(
  workspace: Workspace,
): Set<string> {
  const reviewed = new Set<string>();

  for (const revision of workspace.revisions) {
    if (revision.state === "PROPOSED") {
      continue;
    }

    const proposalEvent =
      workspace.audit_events.find(
        (event) =>
          event.event_type ===
            "PROPOSE_REVISION" &&
          event.entity_ids.includes(
            revision.revision_id,
          ),
      );

    const primaryRiskId =
      proposalEvent?.metadata
        ?.primary_risk_id;

    if (typeof primaryRiskId === "string") {
      reviewed.add(primaryRiskId);
    } else {
      reviewed.add(
        revision.target_item_id,
      );
    }
  }

  return reviewed;
}

function semanticAnalysisIsStale(
  workspace: Workspace,
): boolean {
  const lastTriageIndex =
    workspace.audit_events.findLastIndex(
      (event) =>
        event.event_type === "TRIAGE",
    );

  const lastAcceptedRevisionIndex =
    workspace.audit_events.findLastIndex(
      (event) =>
        event.event_type ===
        "ACCEPT_REVISION",
    );

  return (
    lastAcceptedRevisionIndex >
    lastTriageIndex
  );
}

function nextSemanticReviewTarget(
  workspace: Workspace,
): string | null {
  const reviewed = reviewedTargetIds(
    workspace,
  );

  return (
    rankTriageRecords(
      workspace.triage_records,
    )
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

function latestPrimaryRiskFocus(
  workspace: Workspace,
): string | null {
  const event =
    [...workspace.audit_events]
      .reverse()
      .find(
        (candidate) =>
          candidate.event_type === "FOCUS" &&
          candidate.metadata
            ?.requested_action ===
            "FOCUS_PRIMARY_RISK",
      );

  const id =
    event?.metadata?.primary_item_id;

  return typeof id === "string"
    ? id
    : null;
}

function replacementPrefix(
  workspace: Workspace,
  targetItemId: string,
): string {
  const type =
    workspace.items.find(
      (item) =>
        item.id === targetItemId,
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

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  experienceMode: "START",
  customInput: null,
  workspace: structuredClone(integration001),
  ui: {
    selectedItemId: null,
    focusedItemIds: [],
  },

  startIntake: () =>
    set({
      experienceMode: "INTAKE",
    }),

  startDemo: () =>
    set({
      experienceMode: "DEMO",
      customInput: null,
      workspace: structuredClone(integration001),
      ui: {
        selectedItemId: null,
        focusedItemIds: [],
      },
    }),

  backToStart: () =>
    set({
      experienceMode: "START",
      ui: {
        selectedItemId: null,
        focusedItemIds: [],
      },
    }),

  createCustomWorkspace: (input) =>
    set({
      experienceMode: "CUSTOM",
      customInput: structuredClone(input),
      workspace: buildCustomWorkspace(input),
      ui: {
        selectedItemId: null,
        focusedItemIds: [],
      },
    }),

  resetDemo: () =>
    set({
      experienceMode: "DEMO",
      customInput: null,
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

  focusItemsWithAudit: (
    itemIds,
    primaryItemId,
    actor,
    metadata = {},
  ) => {
    const current = get().workspace;
    const focused = uniqueExistingIds(
      current,
      itemIds,
    );

    if (!focused.includes(primaryItemId)) {
      throw new Error(
        "primaryItemId must be included in focused item IDs.",
      );
    }

    const next = structuredClone(current);
    next.audit_events.push({
      event_id: nextId("AUD-FOCUS", current),
      event_type: "FOCUS",
      timestamp: nowIso(),
      actor_type: actor,
      entity_ids: focused,
      metadata: {
        primary_item_id: primaryItemId,
        ...metadata,
      },
    });

    set({
      workspace: validateWorkspaceState(next),
      ui: {
        selectedItemId: primaryItemId,
        focusedItemIds: focused,
      },
    });
  },

  focusCustomPrimaryRisk: () => {
    const current = get().workspace;

    if (
      current.triage_records.length > 0 &&
      semanticAnalysisIsStale(current)
    ) {
      return null;
    }

    // One review cycle at a time. A pending proposal must be
    // resolved by the human before Groundline advances.
    if (getLatestProposedRevision(current)) {
      return null;
    }

    const semanticTarget =
      nextSemanticReviewTarget(current);

    let targetId =
      semanticTarget;

    if (
      !targetId &&
      current.triage_records.length === 0
    ) {
      const fallback =
        structuralFallbackTarget(current);

      const alreadyReviewed =
        reviewedTargetIds(current).has(
          fallback,
        );

      if (!alreadyReviewed) {
        targetId = fallback;
      }
    }

    if (!targetId) {
      return null;
    }

    const trace =
      getDownstreamDependencies(
        current,
        targetId,
      );

    const focusedItemIds = [
      targetId,
      ...trace.node_ids,
    ].filter(
      (id, index, values) =>
        values.indexOf(id) === index,
    );

    get().focusItemsWithAudit(
      focusedItemIds,
      targetId,
      "HUMAN",
      {
        requested_action:
          "FOCUS_PRIMARY_RISK",
        basis: semanticTarget
          ? "SEMANTIC_TRIAGE"
          : "STRUCTURAL_FALLBACK",
      },
    );

    return {
      targetId,
      focusedItemIds,
      basis: semanticTarget
        ? "SEMANTIC_TRIAGE"
        : "STRUCTURAL_FALLBACK",
    };
  },

  prepareCustomRepairTarget: () => {
    const current = get().workspace;

    if (getLatestProposedRevision(current)) {
      return null;
    }

    const primaryRiskId =
      latestPrimaryRiskFocus(current);

    const repairTargetId =
      current.accepted_conclusion_id;

    if (!primaryRiskId || !repairTargetId) {
      return null;
    }

    const primaryRisk =
      current.items.find(
        (item) =>
          item.id === primaryRiskId,
      );

    const repairTarget =
      current.items.find(
        (item) =>
          item.id === repairTargetId,
      );

    if (
      !primaryRisk ||
      primaryRisk.state !== "ACCEPTED" ||
      reviewedTargetIds(current).has(
        primaryRiskId,
      ) ||
      !repairTarget ||
      repairTarget.state !== "ACCEPTED"
    ) {
      return null;
    }

    const trace =
      getDownstreamDependencies(
        current,
        primaryRiskId,
      );

    const focusedItemIds = [
      primaryRiskId,
      ...trace.node_ids,
      repairTargetId,
    ].filter(
      (id, index, values) =>
        values.indexOf(id) === index,
    );

    // Restore P-06 interaction semantics:
    // the risk remains highlighted, but Inspector moves
    // to the accepted conclusion because that is what
    // the revision will actually replace.
    get().focusItemsWithAudit(
      focusedItemIds,
      repairTargetId,
      "HUMAN",
      {
        requested_action:
          "PROPOSE_REPAIR",
        primary_risk_id:
          primaryRiskId,
        repair_target_id:
          repairTargetId,
        proposal_state:
          "AWAITING_AGENT",
      },
    );

    return {
      targetId: repairTargetId,
      focusedItemIds,
      basis:
        current.triage_records.some(
          (record) =>
            record.item_id ===
            primaryRiskId,
        )
          ? "SEMANTIC_TRIAGE"
          : "STRUCTURAL_FALLBACK",
    };
  },

  applyAgentEvaluations: (evaluations) => {
    const current = get().workspace;

    const validated = evaluations.map(
      (evaluation) => {
        const parsed =
          EvaluationRecordSchema.safeParse(
            evaluation,
          );

        if (!parsed.success) {
          throw new Error(
            "Agent evaluation violates the active schema.",
          );
        }

        return parsed.data;
      },
    );

    const analysis =
      triageWorkspaceFromEvaluations(
        current,
        validated,
      );

    const analyzed =
      attachWorkspaceAnalysis(
        current,
        analysis,
      );

    set({
      workspace: analyzed,
      ui: {
        ...get().ui,
        selectedItemId:
          analysis.ordered_review_targets[0]
            ?.item_id ?? null,
      },
    });
  },

  proposeAgentRevision: (input) => {
    const current = get().workspace;

    if (getLatestProposedRevision(current)) {
      throw new Error(
        "A proposed revision already exists.",
      );
    }

    const preparedRepairEvent =
      [...current.audit_events]
        .reverse()
        .find(
          (event) =>
            event.event_type === "FOCUS" &&
            event.metadata
              ?.requested_action ===
              "PROPOSE_REPAIR",
        );

    const preparedRepairTarget =
      preparedRepairEvent
        ?.metadata?.repair_target_id;

    const preparedPrimaryRisk =
      preparedRepairEvent
        ?.metadata?.primary_risk_id;

    if (
      typeof preparedRepairTarget === "string" &&
      preparedRepairTarget !==
        input.targetItemId
    ) {
      throw new Error(
        `The prepared repair target is "${preparedRepairTarget}", not "${input.targetItemId}".`,
      );
    }

    const createdAt = nowIso();
    const revisionId =
      nextId("REV-AGENT", current);
    const auditEventId =
      nextId("AUD-PROP", current);

    const next = proposeRevision({
      workspace: current,
      revisionId,
      targetItemId: input.targetItemId,
      proposedText: input.proposedText,
      reasonCodes: input.reasonCodes,
      affectedItemIds: [
        ...(typeof preparedPrimaryRisk ===
        "string"
          ? [preparedPrimaryRisk]
          : []),
        ...input.affectedItemIds,
      ].filter(
        (id, index, values) =>
          values.indexOf(id) === index,
      ),
      createdBy: "AGENT",
      createdAt,
      auditEventId,
    });

    const proposalAudit =
      [...next.audit_events]
        .reverse()
        .find(
          (event) =>
            event.event_type ===
              "PROPOSE_REVISION" &&
            event.entity_ids.includes(
              revisionId,
            ),
        );

    if (proposalAudit) {
      proposalAudit.metadata = {
        ...(proposalAudit.metadata ?? {}),
        primary_risk_id:
          typeof preparedPrimaryRisk ===
          "string"
            ? preparedPrimaryRisk
            : null,
        repair_target_id:
          input.targetItemId,
      };
    }

    const validatedNext =
      validateWorkspaceState(next);

    set({
      workspace: validatedNext,
      ui: {
        selectedItemId:
          input.targetItemId,
        focusedItemIds: [
          ...(typeof preparedPrimaryRisk ===
          "string"
            ? [preparedPrimaryRisk]
            : []),
          input.targetItemId,
          ...input.affectedItemIds,
        ].filter(
          (id, index, values) =>
            values.indexOf(id) === index,
        ),
      },
    });
  },

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
    const acceptedItemId = nextId(
      replacementPrefix(
        current,
        revision.target_item_id,
      ),
      current,
    );
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
    const acceptedItemId = nextId(
      replacementPrefix(
        current,
        revision.target_item_id,
      ),
      current,
    );
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
