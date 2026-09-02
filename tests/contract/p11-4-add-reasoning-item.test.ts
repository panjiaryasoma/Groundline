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
  P114_ADDABLE_RELATION_TYPES,
  addP114ReasoningItem,
} from "../../src/state/p114AddReasoningItem";
import { useWorkspaceStore } from "../../src/state/workspaceStore";

const input = {
  question:
    "Should our team fully replace tier-1 support with an autonomous agent?",
  conclusion:
    "Yes, replace tier-1 support next quarter.",
  reason:
    "The pilot resolved most common tickets quickly.",
  assumption:
    "The pilot reflects production edge cases.",
  evidence:
    "A 30-day pilot covered 5,000 interactions.",
};

function evaluation(
  itemId: string,
  reasonCodes: ReasonCode[],
) {
  return buildEvaluationRecord({
    evaluationId: `EVAL-P114-${itemId}`,
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

describe("P11.4 add reasoning item", () => {
  beforeAll(() => {
    installP111RepairLifecycle();
    installP112CustomSemanticGate();
  });

  beforeEach(() => {
    useWorkspaceStore
      .getState()
      .createCustomWorkspace(input);
  });

  it("adds a human-authored card, explicit relation, audit event, and immediate inspector selection", () => {
    const itemId = addP114ReasoningItem({
      type: "COUNTERCLAIM",
      text: "The pilot excluded escalations and complex recovery cases, so its headline resolution rate may not transfer to live support.",
      relationType: "CHALLENGES",
      targetItemId: "C-USER-001",
    });

    expect(itemId).toBe("CC-USER-001");

    const state = useWorkspaceStore.getState();
    const item = state.workspace.items.find(
      (candidate) => candidate.id === itemId,
    );
    const relation = state.workspace.relations.find(
      (candidate) => candidate.from_id === itemId,
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
      }),
    );
    expect(relation).toEqual(
      expect.objectContaining({
        from_id: itemId,
        to_id: "C-USER-001",
        type: "CHALLENGES",
        created_by: "HUMAN",
      }),
    );
    expect(createEvent).toEqual(
      expect.objectContaining({
        actor_type: "HUMAN",
        metadata: expect.objectContaining({
          requested_action: "ADD_REASONING_ITEM",
          semantic_inference_performed: false,
        }),
      }),
    );
    expect(state.ui.selectedItemId).toBe(itemId);
    expect(state.ui.graphSelectionRequest?.itemId).toBe(itemId);
    expect(state.ui.focusedItemIds).toEqual([]);
  });

  it("does not expose SUPERSEDES as a manual add relation", () => {
    expect(P114_ADDABLE_RELATION_TYPES).not.toContain(
      "SUPERSEDES",
    );
  });

  it("invalidates semantic evaluation and triage when accepted reasoning changes", () => {
    useWorkspaceStore
      .getState()
      .applyAgentEvaluations([
        evaluation(
          "C-USER-001",
          ["OVERGENERALIZATION"],
        ),
        evaluation(
          "CONC-USER-001",
          ["DEPENDENCY_ON_UNASSESSED_NODE"],
        ),
      ]);

    expect(
      useWorkspaceStore.getState().workspace.triage_records.length,
    ).toBeGreaterThan(0);

    addP114ReasoningItem({
      type: "EVIDENCE",
      text: "Escalation outcomes from the live queue should be reviewed before full replacement.",
      relationType: "SUPPORTS",
      targetItemId: "C-USER-001",
    });

    const state = useWorkspaceStore.getState();

    expect(state.workspace.evaluations).toEqual([]);
    expect(state.workspace.triage_records).toEqual([]);
    expect(state.focusCustomPrimaryRisk()).toBeNull();
    expect(state.proposeCustomRepair()).toBeNull();
  });

  it("blocks graph expansion while a human revision decision is pending", () => {
    useWorkspaceStore
      .getState()
      .applyAgentEvaluations([
        evaluation(
          "C-USER-001",
          ["OVERGENERALIZATION"],
        ),
      ]);

    useWorkspaceStore
      .getState()
      .focusCustomPrimaryRisk();
    useWorkspaceStore
      .getState()
      .proposeCustomRepair();

    expect(() =>
      addP114ReasoningItem({
        type: "ASSUMPTION",
        text: "The unresolved pilot limitations do not materially change the deployment decision.",
        relationType: "SUPPORTS",
        targetItemId: "CONC-USER-001",
      }),
    ).toThrow(
      "Finish the current revision review before adding another reasoning item.",
    );
  });
});
