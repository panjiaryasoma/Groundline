import { describe, expect, it } from "vitest";

import {
  buildCustomWorkspace,
  type CustomDecisionInput,
} from "../../src/domain/customWorkspace";
import { getIntakeDiagnostics } from "../../src/domain/intakeDiagnostics";
import { WorkspaceSchema } from "../../src/domain/schema";

const completeInput: CustomDecisionInput = {
  question:
    "Should our team switch to a four-day workweek?",
  conclusion:
    "We should run a four-day workweek pilot.",
  reason:
    "Productivity may stay stable while burnout falls.",
  assumption:
    "The team can reorganize work without increasing overtime.",
  evidence:
    "A pilot team delivered the same output with lower reported burnout.",
  sourceUrl: "https://example.com/pilot",
};

describe("P-06.7 custom decision workspace", () => {
  it("builds a schema-valid workspace from human-facing input", () => {
    const workspace = buildCustomWorkspace(
      completeInput,
      {
        workspaceId: "WS-TEST-CUSTOM",
        createdAt:
          "2026-09-02T04:30:00+07:00",
      },
    );

    expect(
      WorkspaceSchema.safeParse(workspace).success,
    ).toBe(true);

    expect(workspace.question_id).toBe(
      "Q-USER-001",
    );
    expect(
      workspace.accepted_conclusion_id,
    ).toBe("CONC-USER-001");
  });

  it("maps reason, assumption, evidence, and source to typed relations", () => {
    const workspace =
      buildCustomWorkspace(completeInput);

    expect(
      workspace.relations,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from_id: "C-USER-001",
          to_id: "CONC-USER-001",
          type: "SUPPORTS",
        }),
        expect.objectContaining({
          from_id: "A-USER-001",
          to_id: "C-USER-001",
          type: "SUPPORTS",
        }),
        expect.objectContaining({
          from_id: "E-USER-001",
          to_id: "C-USER-001",
          type: "SUPPORTS",
        }),
        expect.objectContaining({
          from_id: "SRC-USER-001",
          to_id: "E-USER-001",
          type: "SOURCED_FROM",
        }),
      ]),
    );
  });

  it("allows a first draft with no assumption, evidence, or source", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should I launch this feature?",
      conclusion:
        "I think we should launch it.",
      reason:
        "Users keep asking for it.",
    });

    expect(
      workspace.items.some(
        (item) => item.type === "ASSUMPTION",
      ),
    ).toBe(false);
    expect(
      workspace.items.some(
        (item) => item.type === "EVIDENCE",
      ),
    ).toBe(false);
  });

  it("flags missing structure without pretending to semantically judge prose", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should I launch this feature?",
      conclusion:
        "I think we should launch it.",
      reason:
        "Users keep asking for it.",
    });

    const diagnostics =
      getIntakeDiagnostics(workspace);

    expect(
      diagnostics.map((item) => item.code),
    ).toEqual(
      expect.arrayContaining([
        "READY_FOR_AGENT_REVIEW",
        "MISSING_ASSUMPTION",
        "MISSING_EVIDENCE",
      ]),
    );

    expect(
      diagnostics
        .filter(
          (item) =>
            item.code !== "READY_FOR_AGENT_REVIEW",
        )
        .every(
          (item) =>
            item.severity === "OPTIONAL",
        ),
    ).toBe(true);

    expect(workspace.evaluations).toEqual([]);
    expect(workspace.triage_records).toEqual([]);
  });

  it("reports ready only when assumption, evidence, and provenance are present", () => {
    const workspace =
      buildCustomWorkspace(completeInput);

    expect(
      getIntakeDiagnostics(workspace),
    ).toEqual([
      expect.objectContaining({
        code: "READY_FOR_AGENT_REVIEW",
      }),
    ]);
  });
});
