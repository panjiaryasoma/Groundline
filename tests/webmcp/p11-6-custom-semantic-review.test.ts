import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { buildEvaluationRecord } from "../../src/domain/evaluation";
import { installP111RepairLifecycle } from "../../src/state/p111RepairLifecycle";
import { installP112CustomSemanticGate } from "../../src/state/p112CustomSemanticGate";
import { addP114ReasoningItem } from "../../src/state/p114AddReasoningItem";
import { useWorkspaceStore } from "../../src/state/workspaceStore";
import { createVerticalSliceTools } from "../../src/webmcp/registerTools";

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

function tool(name: string) {
  return createVerticalSliceTools().find(
    (candidate) => candidate.name === name,
  )!;
}

function semanticEvaluation(itemId: string) {
  const record = buildEvaluationRecord({
    evaluationId: `TEST-${itemId}`,
    itemId,
    ratings: {
      evidence_strength: "LOW",
      source_quality: "MODERATE",
      contradiction: "MODERATE",
      assumption_burden: "HIGH",
      generalization_risk: "HIGH",
      downstream_impact: "HIGH",
    },
    reasonCodes: ["OVERGENERALIZATION"],
    referencedItemIds: [itemId],
    generatedBy: "AGENT",
    createdAt: "2026-09-03T12:00:00+07:00",
  });

  return {
    item_id: record.item_id,
    status: record.status,
    dimensions: record.dimensions,
    reason_codes: record.reason_codes,
    referenced_item_ids: record.referenced_item_ids,
  };
}

describe("P11.6 versioned custom semantic review", () => {
  beforeAll(() => {
    installP111RepairLifecycle();
    installP112CustomSemanticGate();
  });

  beforeEach(() => {
    useWorkspaceStore
      .getState()
      .createCustomWorkspace(customInput);
  });

  it("inspect_workspace publishes one review token and the complete current target set", async () => {
    const result = (await tool("inspect_workspace").execute({})) as any;

    expect(result.experience_mode).toBe("CUSTOM");
    expect(result.semantic_review.status).toBe("REQUIRED");
    expect(result.semantic_review.review_token).toMatch(/^SRV-[0-9a-f]{8}$/);
    expect(result.semantic_review.target_item_ids).toEqual([
      "A-USER-001",
      "C-USER-001",
      "CONC-USER-001",
      "E-USER-001",
    ]);
    expect(result.semantic_review.requires_full_batch).toBe(true);
  });

  it("rejects custom triage without the inspect handshake instead of silently accepting a partial review", () => {
    expect(() =>
      tool("triage_workspace").execute({
        evaluations: [semanticEvaluation("C-USER-001")],
      }),
    ).toThrow(/review_token/i);

    expect(
      useWorkspaceStore.getState().workspace.triage_records,
    ).toEqual([]);
  });

  it("rejects a stale review token after accepted reasoning changes", async () => {
    const inspected = (await tool("inspect_workspace").execute({})) as any;
    const staleToken = inspected.semantic_review.review_token;

    addP114ReasoningItem({
      type: "COUNTERCLAIM",
      text: "The pilot excluded escalations and complex account recovery.",
    });

    const current = (await tool("inspect_workspace").execute({})) as any;

    expect(current.semantic_review.review_token).not.toBe(staleToken);
    expect(current.semantic_review.target_item_ids).toContain("CC-USER-001");

    expect(() =>
      tool("triage_workspace").execute({
        review_token: staleToken,
        evaluations: current.semantic_review.target_item_ids.map(
          semanticEvaluation,
        ),
      }),
    ).toThrow(/stale/i);

    expect(
      useWorkspaceStore.getState().workspace.triage_records,
    ).toEqual([]);
  });

  it("rejects an incomplete current batch so CRITICAL labels cannot represent only a hidden subset", async () => {
    const inspected = (await tool("inspect_workspace").execute({})) as any;
    const targets = inspected.semantic_review.target_item_ids as string[];

    expect(() =>
      tool("triage_workspace").execute({
        review_token: inspected.semantic_review.review_token,
        evaluations: targets.slice(0, -1).map(semanticEvaluation),
      }),
    ).toThrow(/exactly one evaluation for every current semantic review target/i);

    expect(
      useWorkspaceStore.getState().workspace.triage_records,
    ).toEqual([]);
  });

  it("commits one complete fresh batch and immediately exposes deterministic triage to the UI", async () => {
    const inspected = (await tool("inspect_workspace").execute({})) as any;
    const targets = inspected.semantic_review.target_item_ids as string[];

    const result = (await tool("triage_workspace").execute({
      review_token: inspected.semantic_review.review_token,
      evaluations: targets.map(semanticEvaluation),
    })) as any;

    const state = useWorkspaceStore.getState();

    expect(result.semantic_review.coverage_complete).toBe(true);
    expect(result.counts.critical).toBeGreaterThan(0);
    expect(result.primary_risk?.state).toBe("CRITICAL");
    expect(state.workspace.triage_records).toHaveLength(targets.length);
    expect(
      new Set(state.workspace.triage_records.map((record) => record.item_id)),
    ).toEqual(new Set(targets));
    expect(state.ui.selectedItemId).toBe(result.primary_risk.item_id);

    const after = (await tool("inspect_workspace").execute({})) as any;
    expect(after.semantic_review.status).toBe("COMPLETE");
    expect(after.semantic_review.review_token).toBe(
      inspected.semantic_review.review_token,
    );
  });
});