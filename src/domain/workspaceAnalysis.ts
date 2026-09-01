import { GroundlineError } from "./errors";
import {
  EvaluationRecordSchema,
  WorkspaceSchema,
  type EvaluationRecord,
  type TriageRecord,
  type Workspace,
} from "./schema";
import {
  getDownstreamAcceptedIds,
  hasDirectRelationToAcceptedConclusion,
} from "./dependencies";
import { triageEvaluation } from "./triage";

export interface WorkspaceTriageResult {
  evaluations: EvaluationRecord[];
  triage_records: TriageRecord[];
  ordered_review_targets: TriageRecord[];
}

function cloneWorkspace(workspace: Workspace): Workspace {
  return structuredClone(workspace);
}

function assertEvaluationSubjectsExist(
  workspace: Workspace,
  evaluations: EvaluationRecord[],
): void {
  const itemIds = new Set(workspace.items.map((item) => item.id));

  for (const evaluation of evaluations) {
    if (!itemIds.has(evaluation.item_id)) {
      throw new GroundlineError(
        "NOT_FOUND",
        `Evaluation subject "${evaluation.item_id}" does not exist in workspace.`,
        { item_id: evaluation.item_id },
      );
    }
  }
}

function validateEvaluations(
  evaluations: EvaluationRecord[],
): EvaluationRecord[] {
  return evaluations.map((evaluation) => {
    const parsed = EvaluationRecordSchema.safeParse(evaluation);

    if (!parsed.success) {
      throw new GroundlineError(
        "INVALID_INPUT",
        "Workspace analysis received an invalid evaluation record.",
        { issues: parsed.error.issues },
      );
    }

    return parsed.data;
  });
}

function priorityValue(record: TriageRecord): number {
  return record.priority_score_internal ?? -1;
}

const TRIAGE_STATE_ORDER: Record<TriageRecord["state"], number> = {
  CRITICAL: 3,
  REVIEW: 2,
  STABLE: 1,
  UNASSESSED: 0,
};

/**
 * Stable ranking rule:
 * 1. higher operational priority first
 * 2. higher triage state class first
 * 3. preserve caller evaluation order for unresolved ties
 *
 * The third rule is intentionally non-semantic. P-05 does not invent an
 * assumption-vs-claim epistemic tie-breaker that the active contract never
 * approved.
 */
export function rankTriageRecords(
  records: TriageRecord[],
): TriageRecord[] {
  return records
    .map((record, index) => ({ record, index }))
    .sort((left, right) => {
      const priorityDifference =
        priorityValue(right.record) - priorityValue(left.record);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const stateDifference =
        TRIAGE_STATE_ORDER[right.record.state] -
        TRIAGE_STATE_ORDER[left.record.state];

      if (stateDifference !== 0) {
        return stateDifference;
      }

      return left.index - right.index;
    })
    .map(({ record }) => record);
}

export function triageWorkspaceFromEvaluations(
  workspace: Workspace,
  inputEvaluations: EvaluationRecord[],
): WorkspaceTriageResult {
  assertEvaluationSubjectsExist(workspace, inputEvaluations);
  const evaluations = validateEvaluations(inputEvaluations);

  const triageRecords = evaluations.map((evaluation) =>
    triageEvaluation(evaluation, {
      downstreamAcceptedIds: getDownstreamAcceptedIds(
        workspace,
        evaluation.item_id,
      ),
      directToAcceptedConclusion:
        hasDirectRelationToAcceptedConclusion(
          workspace,
          evaluation.item_id,
        ),
    }),
  );

  return {
    evaluations,
    triage_records: triageRecords,
    ordered_review_targets: rankTriageRecords(triageRecords),
  };
}

export function attachWorkspaceAnalysis(
  workspace: Workspace,
  analysis: WorkspaceTriageResult,
): Workspace {
  const next = cloneWorkspace(workspace);

  next.evaluations = structuredClone(analysis.evaluations);
  next.triage_records = structuredClone(analysis.triage_records);

  const timestamp =
    analysis.evaluations[0]?.created_at ?? new Date().toISOString();

  next.audit_events.push(
    {
      event_id: `AUD-EVALUATE-${next.audit_events.length + 1}`,
      event_type: "EVALUATE",
      timestamp,
      actor_type: "SYSTEM",
      entity_ids: analysis.evaluations.map(
        (evaluation) => evaluation.item_id,
      ),
      metadata: {
        evaluation_count: analysis.evaluations.length,
      },
    },
    {
      event_id: `AUD-TRIAGE-${next.audit_events.length + 2}`,
      event_type: "TRIAGE",
      timestamp,
      actor_type: "SYSTEM",
      entity_ids: analysis.ordered_review_targets.map(
        (record) => record.item_id,
      ),
      metadata: {
        triage_count: analysis.triage_records.length,
      },
    },
  );

  const parsed = WorkspaceSchema.safeParse(next);

  if (!parsed.success) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Workspace violates the active schema after analysis attachment.",
      { issues: parsed.error.issues },
    );
  }

  return parsed.data;
}
