import { describe, expect, it } from "vitest";
import {
  runIntegration001BeforeHumanReview,
  runIntegration001HumanAcceptance,
} from "../../src/fixtures/integration001Scenario";

describe("P-05 Integration 001 runtime contract", () => {
  it("matches expected operational scores and triage states", () => {
    const { analysis } =
      runIntegration001BeforeHumanReview();

    const byId = Object.fromEntries(
      analysis.triage_records.map((record) => [
        record.item_id,
        record,
      ]),
    );

    expect(byId["A-001"]).toMatchObject({
      weakness_score_internal: 3,
      impact_score_internal: 3,
      priority_score_internal: 9,
      state: "CRITICAL",
    });

    expect(byId["C-001"]).toMatchObject({
      weakness_score_internal: 3,
      impact_score_internal: 3,
      priority_score_internal: 9,
      state: "CRITICAL",
    });

    expect(byId["CC-001"]).toMatchObject({
      weakness_score_internal: 0,
      impact_score_internal: 2,
      priority_score_internal: 0,
      state: "STABLE",
    });

    expect(byId["CONC-001"]).toMatchObject({
      weakness_score_internal: 3,
      impact_score_internal: 3,
      priority_score_internal: 9,
      state: "CRITICAL",
    });
  });

  it("selects A-001 as the primary review target", () => {
    const { analysis } =
      runIntegration001BeforeHumanReview();

    expect(
      analysis.ordered_review_targets[0]?.item_id,
    ).toBe("A-001");
  });

  it("traces the expected critical dependency path", () => {
    const { trace } =
      runIntegration001BeforeHumanReview();

    expect(trace.origin_id).toBe("A-001");
    expect(trace.node_ids).toEqual(
      expect.arrayContaining(["C-001", "CONC-001"]),
    );
    expect(trace.cycle_detected).toBe(false);
    expect(trace.truncated).toBe(false);
  });

  it("creates only a PROPOSED revision before human action", () => {
    const { proposedWorkspace } =
      runIntegration001BeforeHumanReview();

    expect(
      proposedWorkspace.revisions.find(
        (revision) => revision.revision_id === "REV-INT-001",
      )?.state,
    ).toBe("PROPOSED");

    expect(
      proposedWorkspace.accepted_conclusion_id,
    ).toBe("CONC-001");

    expect(
      proposedWorkspace.items.find(
        (item) => item.id === "CONC-001",
      )?.state,
    ).toBe("ACCEPTED");
  });

  it("changes accepted conclusion only after explicit HUMAN acceptance", () => {
    const { acceptedWorkspace } =
      runIntegration001HumanAcceptance();

    expect(
      acceptedWorkspace.accepted_conclusion_id,
    ).toBe("CONC-002");

    expect(
      acceptedWorkspace.items.find(
        (item) => item.id === "CONC-001",
      )?.state,
    ).toBe("SUPERSEDED");

    expect(
      acceptedWorkspace.items.find(
        (item) => item.id === "CONC-002",
      )?.state,
    ).toBe("ACCEPTED");
  });

  it("preserves audit and supersession provenance", () => {
    const { acceptedWorkspace } =
      runIntegration001HumanAcceptance();

    expect(
      acceptedWorkspace.audit_events.some(
        (event) => event.event_type === "PROPOSE_REVISION",
      ),
    ).toBe(true);

    expect(
      acceptedWorkspace.audit_events.some(
        (event) => event.event_type === "SUPERSEDE",
      ),
    ).toBe(true);

    expect(
      acceptedWorkspace.audit_events.some(
        (event) => event.event_type === "ACCEPT_REVISION",
      ),
    ).toBe(true);

    expect(
      acceptedWorkspace.relations.some(
        (relation) =>
          relation.type === "SUPERSEDES" &&
          relation.from_id === "CONC-002" &&
          relation.to_id === "CONC-001",
      ),
    ).toBe(true);
  });

  it("does not automatically rewire semantic support relations onto revised text", () => {
    const { acceptedWorkspace } =
      runIntegration001HumanAcceptance();

    const inheritedSemanticRelations =
      acceptedWorkspace.relations.filter(
        (relation) =>
          relation.to_id === "CONC-002" &&
          relation.type !== "SUPERSEDES",
      );

    expect(inheritedSemanticRelations).toEqual([]);
  });

  it("keeps the real NIST source marked as external content", () => {
    const { analyzedWorkspace } =
      runIntegration001BeforeHumanReview();

    const nist = analyzedWorkspace.items.find(
      (item) => item.id === "SRC-NIST-001",
    );

    expect(nist?.type).toBe("SOURCE");
    expect(
      nist?.source_metadata?.external_content,
    ).toBe(true);
  });

  it("does not introduce any truth score during the full integration flow", () => {
    const { analysis, acceptedWorkspace } =
      runIntegration001HumanAcceptance();

    const serialized = JSON.stringify({
      analysis,
      acceptedWorkspace,
    });

    expect(serialized).not.toContain("truth_score");
    expect(serialized).not.toContain("truth_probability");
    expect(serialized).not.toContain(
      "confidence_of_truth",
    );
  });

  it("satisfies all P-05 hard integration gates", () => {
    const {
      analysis,
      trace,
      proposedWorkspace,
      acceptedWorkspace,
    } = runIntegration001HumanAcceptance();

    expect(
      analysis.ordered_review_targets[0]?.item_id,
    ).toBe("A-001");
    expect(trace.node_ids).toContain("CONC-001");
    expect(
      proposedWorkspace.accepted_conclusion_id,
    ).toBe("CONC-001");
    expect(
      acceptedWorkspace.accepted_conclusion_id,
    ).toBe("CONC-002");
  });
});
