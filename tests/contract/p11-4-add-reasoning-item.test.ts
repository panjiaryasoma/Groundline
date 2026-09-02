import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  buildEvaluationRecord,
  type ReasonCode,
} from "../../src/domain/evaluation";
import { installP111RepairLifecycle } from "../../src/state/p111RepairLifecycle";
import { installP112CustomSemanticGate } from "../../src/state/p112CustomSemanticGate";
import {
  addP114ReasoningItem,
  getP114UnlinkedReasoningItemIds,
  isP114ReasoningItemUnlinked,
} from "../../src/state/p114AddReasoningItem";
import { useWorkspaceStore } from "../../src/state/workspaceStore";

const input = {
  question: "Should the team expand the pilot next quarter?",
  conclusion: "Yes, expand the pilot next quarter.",
  reason: "The initial pilot produced promising results.",
  assumption: "The initial conditions reflect the next phase.",
  evidence: "The pilot recorded five thousand interactions.",
};

function evaluation(
  itemId: string,
  reasonCodes: ReasonCode[],
) {
  return buildEvaluationRecord({
    evaluationId: `EVAL-P115-${itemId}`,
    itemId,
    ratings: {
      evidence_strength: "LOW",
      source_quality: "MODERATE",
      contradiction: "MODERATE",
      assumption_burden: "HIGH",
      generalization_risk: "HIGH",
      downstream_impact: "HIGH",
    },
    reasonCodes,
    referencedItemIds: [itemId],
    generatedBy: "AGENT",
    createdAt: "2026-09-03T00:00:00+07:00",
  });
}

describe("P11.5 add unlinked reasoning items", () => {
  beforeAll(() => {
    installP111RepairLifecycle();
    installP112CustomSemanticGate();
  });

  beforeEach(() => {
    useWorkspaceStore.getState().createCustomWorkspace(input);
  });

  it("adds a human-authored card without inventing a semantic relation and selects it", () => {
    const beforeRelationCount =
      useWorkspaceStore.getState().workspace.relations.length;

    const itemId = addP114ReasoningItem({
      type: "COUNTERCLAIM",
      text: "The pilot excluded several complex cases, so its headline result may not transfer to the next phase.",
    });

    expect(itemId).toBe("CC-USER-001");

    const state = useWorkspaceStore.getState();
    const item = state.workspace.items.find(
      (candidate) => candidate.id === itemId,
    );
    const createEvent = [...state.workspace.audit_events]
      .reverse()
      .find(
        (event) =>
          event.event_type === "CREATE" &&
          event.entity_ids.includes(itemId),
      );

    expect(item).toEqual(
      expect.objectContaining({
        id: itemId,
        type: "COUNTERCLAIM",
        state: "ACCEPTED",
        created_by: "HUMAN",
        tags: expect.arrayContaining(["user-added", "unlinked"]),
      }),
    );
    expect(state.workspace.relations).toHaveLength(
      beforeRelationCount,
    );
    expect(
      isP114ReasoningItemUnlinked(state.workspace, itemId),
    ).toBe(true);
    expect(createEvent).toEqual(
      expect.objectContaining({
        actor_type: "HUMAN",
        metadata: expect.objectContaining({
          requested_action: "ADD_REASONING_ITEM",
          connection_state: "UNLINKED",
          semantic_inference_performed: false,
        }),
      }),
    );
    expect(state.ui.selectedItemId).toBe(itemId);
    expect(state.ui.graphSelectionRequest?.itemId).toBe(itemId);
    expect(state.ui.focusedItemIds).toEqual([]);
  });

  it("allows several cards to be mapped before semantic review", () => {
    const claimId = addP114ReasoningItem({
      type: "CLAIM",
      text: "The pilot workload was dominated by simple cases.",
    });
    const evidenceId = addP114ReasoningItem({
      type: "EVIDENCE",
      text: "Only a small fraction of the pilot involved complex cases.",
    });
    const assumptionId = addP114ReasoningItem({
      type: "ASSUMPTION",
      text: "The next phase will have a similar case mix.",
    });

    expect(
      getP114UnlinkedReasoningItemIds(
        useWorkspaceStore.getState().workspace,
      ),
    ).toEqual([claimId, evidenceId, assumptionId]);
  });

  it("invalidates semantic evaluation and triage when accepted reasoning expands", () => {
    useWorkspaceStore.getState().applyAgentEvaluations([
      evaluation("C-USER-001", ["OVERGENERALIZATION"]),
      evaluation("CONC-USER-001", [
        "DEPENDENCY_ON_UNASSESSED_NODE",
      ]),
    ]);

    expect(
      useWorkspaceStore.getState().workspace.triage_records.length,
    ).toBeGreaterThan(0);

    addP114ReasoningItem({
      type: "EVIDENCE",
      text: "Additional outcomes from the next phase should be reviewed before expansion.",
    });

    const state = useWorkspaceStore.getState();

    expect(state.workspace.evaluations).toEqual([]);
    expect(state.workspace.triage_records).toEqual([]);
    expect(state.focusCustomPrimaryRisk()).toBeNull();
    expect(state.proposeCustomRepair()).toBeNull();
  });

  it("blocks graph expansion while a human revision decision is pending", () => {
    useWorkspaceStore.getState().applyAgentEvaluations([
      evaluation("C-USER-001", ["OVERGENERALIZATION"]),
    ]);

    useWorkspaceStore.getState().focusCustomPrimaryRisk();
    useWorkspaceStore.getState().proposeCustomRepair();

    expect(() =>
      addP114ReasoningItem({
        type: "ASSUMPTION",
        text: "The unresolved limitations do not materially change the decision.",
      }),
    ).toThrow(
      "Finish the current revision review before adding another reasoning item.",
    );
  });
});
