import { describe, expect, it } from "vitest";
import {
  attachWorkspaceAnalysis,
  rankTriageRecords,
  triageWorkspaceFromEvaluations,
} from "../../src/domain/workspaceAnalysis";
import { integration001 } from "../../src/fixtures/integration001";
import { integration001Evaluations } from "../../src/fixtures/integration001Evaluations";

describe("P-05 workspace analysis integration", () => {
  it("derives triage context from the actual reasoning graph", () => {
    const analysis = triageWorkspaceFromEvaluations(
      integration001,
      integration001Evaluations,
    );

    const assumption = analysis.triage_records.find(
      (record) => record.item_id === "A-001",
    );

    expect(assumption?.direct_to_accepted_conclusion).toBe(true);
    expect(assumption?.downstream_accepted_ids).toEqual(
      expect.arrayContaining(["C-001", "CONC-001"]),
    );
  });

  it("ranks higher priority records first without inventing a semantic tie-breaker", () => {
    const analysis = triageWorkspaceFromEvaluations(
      integration001,
      integration001Evaluations,
    );

    expect(
      analysis.ordered_review_targets
        .slice(0, 3)
        .map((record) => record.item_id),
    ).toEqual(["A-001", "C-001", "CONC-001"]);

    expect(
      analysis.ordered_review_targets.at(-1)?.item_id,
    ).toBe("CC-001");
  });

  it("attaches analysis records without changing accepted knowledge", () => {
    const originalConclusion =
      integration001.accepted_conclusion_id;

    const analysis = triageWorkspaceFromEvaluations(
      integration001,
      integration001Evaluations,
    );
    const next = attachWorkspaceAnalysis(
      integration001,
      analysis,
    );

    expect(next.evaluations).toHaveLength(4);
    expect(next.triage_records).toHaveLength(4);
    expect(next.accepted_conclusion_id).toBe(originalConclusion);
    expect(
      next.items.find((item) => item.id === "CONC-001")?.state,
    ).toBe("ACCEPTED");
  });

  it("writes analysis audit events", () => {
    const analysis = triageWorkspaceFromEvaluations(
      integration001,
      integration001Evaluations,
    );
    const next = attachWorkspaceAnalysis(
      integration001,
      analysis,
    );

    expect(
      next.audit_events.some(
        (event) => event.event_type === "EVALUATE",
      ),
    ).toBe(true);
    expect(
      next.audit_events.some(
        (event) => event.event_type === "TRIAGE",
      ),
    ).toBe(true);
  });

  it("keeps ranking stable for exact ties", () => {
    const analysis = triageWorkspaceFromEvaluations(
      integration001,
      integration001Evaluations,
    );

    const tied = analysis.triage_records.filter(
      (record) => record.priority_score_internal === 9,
    );

    expect(
      rankTriageRecords(tied).map((record) => record.item_id),
    ).toEqual(["A-001", "C-001", "CONC-001"]);
  });
});
