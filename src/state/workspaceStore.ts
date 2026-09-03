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
import {
  getLatestAgentFocusPrimaryId,
} from "./reviewContext";

export type ExperienceMode =
  | "START"
  | "INTAKE"
  | "DEMO"
  | "CUSTOM";

export interface GraphSelectionRequest {
  itemId: string | null;
  version: number;
}

interface EphemeralUiState {
  selectedItemId: string | null;
  focusedItemIds: string[];
  /**
   * Versioned command consumed by ReactFlow for programmatic selection.
   * Optional for backwards compatibility with older test fixtures / snapshots.
   */
  graphSelectionRequest?: GraphSelectionRequest;
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
  proposeCustomRepair: () => FocusResult | null;
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

function nextGraphSelectionRequest(
  ui: EphemeralUiState,
  itemId: string | null,
): GraphSelectionRequest {
  return {
    itemId,
    version:
      (ui.graphSelectionRequest?.version ?? 0) + 1,
  };
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


function deterministicRepairText(
  workspace: Workspace,
  primaryRiskId: string,
  repairTargetId: string,
): string {
  const risk = workspace.items.find(
    (item) => item.id === primaryRiskId,
  );
  const target = workspace.items.find(
    (item) => item.id === repairTargetId,
  );
  const triage = workspace.triage_records.find(
    (record) =>
      record.item_id === primaryRiskId,
  );

  const reasonCodes =
    triage?.reason_codes ?? [];

  if (
    reasonCodes.includes(
      "OVERGENERALIZATION",
    )
  ) {
    return (
      "Narrow the current conclusion to the scope directly supported by the represented evidence. " +
      "Treat any broader claim as provisional until the focused reasoning risk is resolved."
    );
  }

  if (
    reasonCodes.includes(
      "UNSUPPORTED_ASSUMPTION",
    )
  ) {
    return (
      "Keep the current conclusion provisional until the focused assumption is directly supported in the intended context. " +
      "Do not treat the present reasoning as sufficient for a broader or irreversible commitment."
    );
  }

  if (
    reasonCodes.includes("CONTRADICTED")
  ) {
    return (
      "Do not treat the current conclusion as settled until the represented contradiction is resolved. " +
      "Use a limited, reversible decision while the conflicting reasoning remains material."
    );
  }

  if (
    reasonCodes.includes("SCOPE_MISMATCH")
  ) {
    return (
      "Limit the current conclusion to the scope actually represented by the available reasoning. " +
      "Reassess before extending it to a broader population, condition, or decision context."
    );
  }

  const type = risk?.type ?? "CLAIM";

  const conditionByType: Record<
    string,
    string
  > = {
    ASSUMPTION:
      "the focused assumption is validated",
    EVIDENCE:
      "the focused evidence is verified and, when possible, sourced",
    CLAIM:
      "the focused claim is better supported",
    COUNTERCLAIM:
      "the focused counterclaim is addressed",
    SOURCE:
      "the focused source is checked for quality and relevance",
    QUESTION:
      "the decision scope is clarified",
    CONCLUSION:
      "the conclusion is re-evaluated",
  };

  const condition =
    conditionByType[type] ??
    "the focused reasoning issue is resolved";

  const targetText =
    target?.text?.trim();

  return (
    `Keep this conclusion provisional until ${condition}. ` +
    `Reassess it before making a broader or irreversible commitment.` +
    (targetText
      ? ` Current position under review: ${targetText}`
      : "")
  );
}

function deterministicRepairReasonCodes(
  workspace: Workspace,
  primaryRiskId: string,
): string[] {
  const triage = workspace.triage_records.find(
    (record) =>
      record.item_id === primaryRiskId,
  );

  if (triage?.reason_codes.length) {
    return [...triage.reason_codes];
  }

  return ["STRUCTURAL_REVIEW_TARGET"];
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
  const eventTypes =
    workspace.audit_events.map(
      (event) => event.event_type,
    );

  const lastTriageIndex =
    eventTypes.lastIndexOf("TRIAGE");

  const lastAcceptedRevisionIndex =
    eventTypes.lastIndexOf(
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
    graphSelectionRequest: {
      itemId: null,
      version: 0,
    },
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
        graphSelectionRequest: {
          itemId: null,
          version: 0,
        },
      },
    }),

  backToStart: () =>
    set({
      experienceMode: "START",
      ui: {
        selectedItemId: null,
        focusedItemIds: [],
        graphSelectionRequest: {
          itemId: null,
          version: 0,
        },
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
        graphSelectionRequest: {
          itemId: null,
          version: 0,
        },
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
        graphSelectionRequest: {
          itemId: null,
          version: 0,
        },
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

    const ui = get().ui;

    set({
      workspace: validateWorkspaceState(next),
      ui: {
        selectedItemId: primaryItemId,
        focusedItemIds: focused,
        graphSelectionRequest:
          nextGraphSelectionRequest(
            ui,
            primaryItemId,
          ),
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

    const existingPrimaryRiskId =
      latestPrimaryRiskFocus(current);

    if (
      existingPrimaryRiskId &&
      !reviewedTargetIds(current).has(
        existingPrimaryRiskId,
      )
    ) {
      const existingItem =
        current.items.find(
          (item) =>
            item.id ===
            existingPrimaryRiskId &&
            item.state === "ACCEPTED",
        );

      if (existingItem) {
        const trace =
          getDownstreamDependencies(
            current,
            existingPrimaryRiskId,
          );

        const focusedItemIds = [
          existingPrimaryRiskId,
          ...trace.node_ids,
        ].filter(
          (id, index, values) =>
            values.indexOf(id) === index,
        );

        // Reassert UI selection only. Do not write another
        // identical FOCUS event just because the user clicked
        // another card and then returned to the primary risk.
        const ui = get().ui;

        set({
          ui: {
            ...ui,
            selectedItemId:
              existingPrimaryRiskId,
            focusedItemIds,
            graphSelectionRequest:
              nextGraphSelectionRequest(
                ui,
                existingPrimaryRiskId,
              ),
          },
        });

        return {
          targetId:
            existingPrimaryRiskId,
          focusedItemIds,
          basis:
            current.triage_records.some(
              (record) =>
                record.item_id ===
                existingPrimaryRiskId,
            )
              ? "SEMANTIC_TRIAGE"
              : "STRUCTURAL_FALLBACK",
        };
      }
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


  proposeCustomRepair: () => {
    let current = get().workspace;

    if (getLatestProposedRevision(current)) {
      return null;
    }

    let primaryRiskId =
      latestPrimaryRiskFocus(current);

    if (!primaryRiskId) {
      const focused =
        get().focusCustomPrimaryRisk();

      if (!focused) {
        return null;
      }

      primaryRiskId =
        focused.targetId;
      current = get().workspace;
    }

    const repairTargetId =
      current.accepted_conclusion_id;

    if (!repairTargetId) {
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
      !repairTarget ||
      repairTarget.state !== "ACCEPTED" ||
      reviewedTargetIds(current).has(
        primaryRiskId,
      )
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

    const createdAt = nowIso();
    const revisionId =
      nextId("REV-LOCAL", current);
    const auditEventId =
      nextId("AUD-PROP", current);

    const next = proposeRevision({
      workspace: current,
      revisionId,
      targetItemId: repairTargetId,
      proposedText:
        deterministicRepairText(
          current,
          primaryRiskId,
          repairTargetId,
        ),
      reasonCodes:
        deterministicRepairReasonCodes(
          current,
          primaryRiskId,
        ),
      affectedItemIds:
        focusedItemIds,
      createdBy: "AGENT",
      createdAt,
      auditEventId,
    });

    const proposalEvent =
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

    if (proposalEvent) {
      proposalEvent.metadata = {
        ...(proposalEvent.metadata ?? {}),
        primary_risk_id:
          primaryRiskId,
        repair_target_id:
          repairTargetId,
        proposal_source:
          "LOCAL_DETERMINISTIC_REPAIR_AGENT",
        semantic_inference:
          current.triage_records.some(
            (record) =>
              record.item_id ===
              primaryRiskId,
          )
            ? "AGENT_TRIAGE_CONTEXT"
            : "STRUCTURAL_FALLBACK_ONLY",
      };
    }

    const validated =
      validateWorkspaceState(next);

    const ui = get().ui;

    set({
      workspace: validated,
      ui: {
        ...ui,
        selectedItemId:
          repairTargetId,
        focusedItemIds,
        graphSelectionRequest:
          nextGraphSelectionRequest(
            ui,
            repairTargetId,
          ),
      },
    });

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

    const ui = get().ui;
    const primaryTargetId =
      analysis.ordered_review_targets[0]
        ?.item_id ?? null;

    set({
      workspace: analyzed,
      ui: {
        ...ui,
        selectedItemId:
          primaryTargetId,
        graphSelectionRequest:
          nextGraphSelectionRequest(
            ui,
            primaryTargetId,
          ),
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

    const latestAgentFocusId =
      getLatestAgentFocusPrimaryId(
        current,
      );

    const latestAgentFocusIsRisk =
      latestAgentFocusId
        ? current.triage_records.some(
            (record) =>
              record.item_id ===
                latestAgentFocusId &&
              (
                record.state ===
                  "CRITICAL" ||
                record.state ===
                  "REVIEW"
              ),
          )
        : false;

    const effectivePrimaryFocus =
      latestAgentFocusId ??
      (
        typeof preparedPrimaryRisk ===
          "string"
          ? preparedPrimaryRisk
          : undefined
      );

    const effectivePrimaryRisk =
      latestAgentFocusIsRisk
        ? latestAgentFocusId ?? undefined
        : (
            typeof preparedPrimaryRisk ===
              "string"
              ? preparedPrimaryRisk
              : undefined
          );

    if (
      typeof preparedRepairTarget === "string" &&
      preparedRepairTarget !==
        input.targetItemId
    ) {
      throw new Error(
        `The prepared repair target is "${preparedRepairTarget}", not "${input.targetItemId}".`,
      );
    }

    const repairTarget =
      current.items.find(
        (item) =>
          item.id ===
            input.targetItemId &&
          item.state ===
            "ACCEPTED",
      );

    if (!repairTarget) {
      throw new Error(
        `Repair target "${input.targetItemId}" is not an ACCEPTED knowledge item.`,
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
        ...(typeof effectivePrimaryFocus ===
        "string"
          ? [effectivePrimaryFocus]
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
        primary_focus_id:
          typeof effectivePrimaryFocus ===
          "string"
            ? effectivePrimaryFocus
            : null,
        primary_risk_id:
          typeof effectivePrimaryRisk ===
          "string"
            ? effectivePrimaryRisk
            : null,
        repair_target_id:
          input.targetItemId,
        proposal_source:
          "WEBMCP_AGENT",
      };
    }

    const validatedNext =
      validateWorkspaceState(next);

    const ui = get().ui;

    set({
      workspace: validatedNext,
      ui: {
        ...ui,
        selectedItemId:
          input.targetItemId,
        focusedItemIds: [
          ...(typeof effectivePrimaryFocus ===
          "string"
            ? [effectivePrimaryFocus]
            : []),
          input.targetItemId,
          ...input.affectedItemIds,
        ].filter(
          (id, index, values) =>
            values.indexOf(id) === index,
        ),
        graphSelectionRequest:
          nextGraphSelectionRequest(
            ui,
            input.targetItemId,
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

    const ui = get().ui;
    const targetId =
      analysis.ordered_review_targets[0]
        ?.item_id ?? null;

    set({
      workspace: analyzed,
      ui: {
        ...ui,
        selectedItemId: targetId,
        graphSelectionRequest:
          nextGraphSelectionRequest(
            ui,
            targetId,
          ),
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
        graphSelectionRequest:
          nextGraphSelectionRequest(
            state.ui,
            targetId,
          ),
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

    const ui = get().ui;
    const targetId =
      current.accepted_conclusion_id ??
      "CONC-001";

    set({
      workspace: next,
      ui: {
        ...ui,
        selectedItemId:
          targetId,
        graphSelectionRequest:
          nextGraphSelectionRequest(
            ui,
            targetId,
          ),
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
        ...get().ui,
        selectedItemId: acceptedItemId,
        focusedItemIds: [acceptedItemId],
        graphSelectionRequest:
          nextGraphSelectionRequest(
            get().ui,
            acceptedItemId,
          ),
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
        ...get().ui,
        selectedItemId: acceptedItemId,
        focusedItemIds: [acceptedItemId],
        graphSelectionRequest:
          nextGraphSelectionRequest(
            get().ui,
            acceptedItemId,
          ),
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
