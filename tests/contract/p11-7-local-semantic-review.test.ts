import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  getP117LocalReviewerAvailability,
  proposeP117Connections,
  runP117SemanticTriage,
} from "../../src/ai/p117LocalSemanticReviewer";
import { installP111RepairLifecycle } from "../../src/state/p111RepairLifecycle";
import { installP112CustomSemanticGate } from "../../src/state/p112CustomSemanticGate";
import {
  addP114ReasoningItem,
  getP114UnlinkedReasoningItemIds,
} from "../../src/state/p114AddReasoningItem";
import { applyP117ApprovedRelations } from "../../src/state/p117RelationReview";
import { useWorkspaceStore } from "../../src/state/workspaceStore";
import { buildSemanticReviewToken } from "../../src/webmcp/semanticReviewContract";

const customInput = {
  question:
    "Should we replace tier-1 human support with an autonomous agent next quarter?",
  conclusion:
    "Yes, replace tier-1 support next quarter.",
  reason:
    "The internal pilot resolved most common tickets quickly.",
  assumption:
    "The pilot reflects production edge cases.",
  evidence:
    "A 30-day pilot covered 5,000 interactions.",
};

const originalLanguageModel = (globalThis as any).LanguageModel;

function installLanguageModelMock(
  promptImpl: (prompt: string) => string | Promise<string>,
  availability = "available",
) {
  const destroy = vi.fn();
  const prompt = vi.fn(promptImpl);
  const create = vi.fn(async () => ({ prompt, destroy }));

  (globalThis as any).LanguageModel = {
    availability: vi.fn(async () => availability),
    create,
  };

  return { prompt, create, destroy };
}

function evaluationPayload(targetIds: string[]) {
  return JSON.stringify({
    evaluations: targetIds.map((itemId) => {
      const assumption = itemId.startsWith("A-");
      const conclusion = itemId.startsWith("CONC-");
      const evidence = itemId.startsWith("E-");

      return {
        item_id: itemId,
        ratings: {
          evidence_strength: evidence ? "HIGH" : assumption ? "LOW" : "MODERATE",
          source_quality: evidence ? "MODERATE" : "UNASSESSED",
          contradiction: conclusion ? "MODERATE" : "LOW",
          assumption_burden: assumption ? "HIGH" : conclusion ? "HIGH" : "MODERATE",
          generalization_risk: assumption || conclusion ? "HIGH" : "MODERATE",
          downstream_impact: assumption || conclusion ? "HIGH" : "MODERATE",
        },
        reason_codes: assumption
          ? ["UNSUPPORTED_ASSUMPTION", "OVERGENERALIZATION"]
          : conclusion
            ? ["OVERGENERALIZATION"]
            : [],
        referenced_item_ids: [itemId],
      };
    }),
  });
}

describe("P11.7 on-device semantic review path", () => {
  beforeAll(() => {
    installP111RepairLifecycle();
    installP112CustomSemanticGate();
  });

  beforeEach(() => {
    useWorkspaceStore
      .getState()
      .createCustomWorkspace(customInput);
  });

  afterEach(() => {
    (globalThis as any).LanguageModel = originalLanguageModel;
    vi.restoreAllMocks();
  });

  it("reports an explicit external-agent fallback when the on-device model is unavailable", async () => {
    delete (globalThis as any).LanguageModel;

    await expect(
      getP117LocalReviewerAvailability(),
    ).resolves.toBe("unsupported");
  });

  it("proposes connections for UNLINKED cards without mutating the canonical graph", async () => {
    addP114ReasoningItem({
      type: "COUNTERCLAIM",
      text: "The pilot excluded escalations and complex account recovery.",
    });

    installLanguageModelMock(() =>
      JSON.stringify({
        proposals: [
          {
            from_id: "CC-USER-001",
            to_id: "C-USER-001",
            type: "CHALLENGES",
            rationale:
              "The added counterclaim directly challenges the pilot-based claim.",
          },
        ],
      }),
    );

    const before = useWorkspaceStore.getState().workspace;
    const relationCount = before.relations.length;

    const proposals = await proposeP117Connections(before);

    expect(proposals).toEqual([
      expect.objectContaining({
        from_id: "CC-USER-001",
        to_id: "C-USER-001",
        type: "CHALLENGES",
      }),
    ]);
    expect(
      useWorkspaceStore.getState().workspace.relations,
    ).toHaveLength(relationCount);
    expect(
      getP114UnlinkedReasoningItemIds(
        useWorkspaceStore.getState().workspace,
      ),
    ).toContain("CC-USER-001");
  });

  it("commits only human-approved relation proposals and invalidates stale triage", () => {
    addP114ReasoningItem({
      type: "COUNTERCLAIM",
      text: "The pilot excluded escalations and complex account recovery.",
    });

    const token = buildSemanticReviewToken(
      useWorkspaceStore.getState().workspace,
    );

    const ids = applyP117ApprovedRelations(
      [
        {
          from_id: "CC-USER-001",
          to_id: "C-USER-001",
          type: "CHALLENGES",
          rationale: "Human reviewed this suggestion.",
        },
      ],
      token,
    );

    const workspace = useWorkspaceStore.getState().workspace;
    const relation = workspace.relations.find(
      (candidate) => candidate.id === ids[0],
    );

    expect(relation).toMatchObject({
      from_id: "CC-USER-001",
      to_id: "C-USER-001",
      type: "CHALLENGES",
      created_by: "HUMAN",
    });
    expect(
      getP114UnlinkedReasoningItemIds(workspace),
    ).not.toContain("CC-USER-001");
    expect(workspace.evaluations).toEqual([]);
    expect(workspace.triage_records).toEqual([]);
    expect(
      workspace.audit_events.at(-1)?.metadata,
    ).toMatchObject({
      requested_action: "ACCEPT_AGENT_RELATION_PROPOSALS",
      human_approved: true,
    });
  });

  it("rejects relation proposals if the workspace changed after the agent produced them", () => {
    addP114ReasoningItem({
      type: "COUNTERCLAIM",
      text: "The pilot excluded escalations.",
    });

    const staleToken = buildSemanticReviewToken(
      useWorkspaceStore.getState().workspace,
    );

    addP114ReasoningItem({
      type: "EVIDENCE",
      text: "A later escalation audit found a different failure rate.",
    });

    expect(() =>
      applyP117ApprovedRelations(
        [
          {
            from_id: "CC-USER-001",
            to_id: "C-USER-001",
            type: "CHALLENGES",
            rationale: "Stale proposal.",
          },
        ],
        staleToken,
      ),
    ).toThrow(/changed after these semantic connections were proposed/i);
  });

  it("runs one complete on-device semantic batch through the P11.6 review token and exposes deterministic CRITICAL triage", async () => {
    const targetIds = [
      "A-USER-001",
      "C-USER-001",
      "CONC-USER-001",
      "E-USER-001",
    ];

    installLanguageModelMock(() => evaluationPayload(targetIds));

    const result = await runP117SemanticTriage();
    const workspace = useWorkspaceStore.getState().workspace;

    expect(result.critical).toBeGreaterThan(0);
    expect(result.primaryRiskId).toBeTruthy();
    expect(workspace.evaluations).toHaveLength(targetIds.length);
    expect(workspace.triage_records).toHaveLength(targetIds.length);
    expect(
      workspace.triage_records.some(
        (record) => record.state === "CRITICAL",
      ),
    ).toBe(true);
    expect(useWorkspaceStore.getState().ui.selectedItemId).toBe(
      result.primaryRiskId,
    );
  });
});
