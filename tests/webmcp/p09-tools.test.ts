import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  createVerticalSliceTools,
} from "../../src/webmcp/registerTools";
import { P0_TOOL_NAMES } from "../../src/webmcp/toolSchemas";
import { useWorkspaceStore } from "../../src/state/workspaceStore";
import { integration001Evaluations } from "../../src/fixtures/integration001Evaluations";

describe("P-09 remaining P0 WebMCP tools", () => {
  beforeEach(() => {
    useWorkspaceStore
      .getState()
      .startDemo();
  });

  it("registers all nine frozen P0 tool names in contract order", () => {
    expect(
      createVerticalSliceTools().map(
        (tool) => tool.name,
      ),
    ).toEqual([...P0_TOOL_NAMES]);
  });

  it("inspect_item returns bounded relations, provenance and dependency IDs", async () => {
    const tool =
      createVerticalSliceTools().find(
        (candidate) =>
          candidate.name === "inspect_item",
      )!;

    const result =
      (await tool.execute({
        item_id: "E-SUB-001",
      })) as any;

    expect(result.item).toMatchObject({
      id: "E-SUB-001",
      type: "EVIDENCE",
      state: "ACCEPTED",
    });

    expect(
      result.provenance.source_items.map(
        (source: any) => source.id,
      ),
    ).toContain("SRC-NIST-001");

    expect(
      result.dependencies.downstream_item_ids,
    ).toContain("CC-001");
  });

  it("evaluate_item writes only an evaluation record plus audit and never accepted knowledge", async () => {
    const tool =
      createVerticalSliceTools().find(
        (candidate) =>
          candidate.name === "evaluate_item",
      )!;

    const seeded =
      integration001Evaluations.find(
        (evaluation) =>
          evaluation.item_id === "A-001",
      )!;

    const before =
      useWorkspaceStore.getState().workspace;

    const result =
      (await tool.execute({
        item_id: seeded.item_id,
        dimensions: seeded.dimensions,
        reason_codes:
          seeded.reason_codes,
        referenced_item_ids:
          seeded.referenced_item_ids,
      })) as any;

    const after =
      useWorkspaceStore.getState().workspace;

    expect(result.evaluation.item_id).toBe(
      "A-001",
    );
    expect(result.evaluation.generated_by).toBe(
      "AGENT",
    );
    expect(
      result.accepted_knowledge_changed,
    ).toBe(false);
    expect(
      result.triage_recompute_required,
    ).toBe(true);

    expect(after.evaluations).toHaveLength(1);
    expect(after.triage_records).toEqual(
      before.triage_records,
    );
    expect(
      after.accepted_conclusion_id,
    ).toBe(before.accepted_conclusion_id);
    expect(
      after.audit_events.at(-1)?.event_type,
    ).toBe("EVALUATE");
    expect(
      after.audit_events.at(-1)?.actor_type,
    ).toBe("AGENT");
  });

  it("find_contradictions reports explicit represented challenge evidence without universal prose inference", async () => {
    const tool =
      createVerticalSliceTools().find(
        (candidate) =>
          candidate.name ===
          "find_contradictions",
      )!;

    const result =
      (await tool.execute({
        item_id: "C-001",
      })) as any;

    expect(result.count).toBeGreaterThan(0);
    expect(
      result.semantic_inference_performed,
    ).toBe(false);

    expect(result.findings[0]).toMatchObject({
      finding_type: "CONTRADICTED",
      basis:
        "EXPLICIT_CHALLENGES_RELATION",
      subject_item_id: "C-001",
      challenger_item_ids: ["CC-001"],
    });

    expect(
      result.findings[0].evidence_item_ids,
    ).toContain("E-SUB-001");
    expect(
      result.findings[0].source_item_ids,
    ).toContain("SRC-NIST-001");
  });

  it("find_evidence_gaps distinguishes missing support from contradiction", async () => {
    const tool =
      createVerticalSliceTools().find(
        (candidate) =>
          candidate.name ===
          "find_evidence_gaps",
      )!;

    const result =
      (await tool.execute({
        item_id: "A-001",
      })) as any;

    expect(result).toMatchObject({
      count: 1,
      missing_evidence_is_not_contradiction:
        true,
      semantic_inference_performed: false,
    });

    expect(result.findings[0]).toMatchObject({
      finding_type:
        "MISSING_DIRECT_EVIDENCE",
      item_id: "A-001",
      declares_false: false,
    });
  });

  it("find_evidence_gaps does not label a supported claim as structurally missing evidence", async () => {
    const tool =
      createVerticalSliceTools().find(
        (candidate) =>
          candidate.name ===
          "find_evidence_gaps",
      )!;

    const result =
      (await tool.execute({
        item_id: "C-001",
      })) as any;

    expect(result.findings).toEqual([]);
  });

  it("new P09 tools reject invalid item IDs instead of silently guessing", () => {
    const tools = createVerticalSliceTools();

    const inspect = tools.find(
      (tool) => tool.name === "inspect_item",
    )!;
    const evaluate = tools.find(
      (tool) => tool.name === "evaluate_item",
    )!;
    const contradictions = tools.find(
      (tool) =>
        tool.name === "find_contradictions",
    )!;
    const gaps = tools.find(
      (tool) =>
        tool.name === "find_evidence_gaps",
    )!;

    expect(() =>
      inspect.execute({
        item_id: "DOES-NOT-EXIST",
      }),
    ).toThrow(
      'Knowledge item "DOES-NOT-EXIST" was not found.',
    );

    expect(() =>
      contradictions.execute({
        item_id: "DOES-NOT-EXIST",
      }),
    ).toThrow(
      'Knowledge item "DOES-NOT-EXIST" was not found.',
    );

    expect(() =>
      gaps.execute({
        item_id: "DOES-NOT-EXIST",
      }),
    ).toThrow(
      'Knowledge item "DOES-NOT-EXIST" was not found.',
    );

    expect(() =>
      evaluate.execute({
        item_id: "",
      }),
    ).toThrow(
      "evaluate_item requires a non-empty item_id.",
    );
  });

  it("all four P09 tools require a visible active reasoning workspace", () => {
    useWorkspaceStore
      .getState()
      .backToStart();

    const names = new Set([
      "inspect_item",
      "evaluate_item",
      "find_contradictions",
      "find_evidence_gaps",
    ]);

    for (const tool of
      createVerticalSliceTools().filter(
        (candidate) =>
          names.has(candidate.name),
      )) {
      expect(() =>
        tool.execute({}),
      ).toThrow(
        "No active Groundline workspace.",
      );
    }
  });
});
