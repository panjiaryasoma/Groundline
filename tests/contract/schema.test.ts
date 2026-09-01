import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_TYPES,
  REVISION_STATES,
  TRIAGE_STATES,
  WorkspaceSchema,
} from "../../src/domain/schema";
import { integration001 } from "../../src/fixtures/integration001";

describe("Groundline active contract scaffold", () => {
  it("keeps evaluation, triage, and revision outside knowledge node types", () => {
    expect(KNOWLEDGE_TYPES).not.toContain("EVALUATION");
    expect(KNOWLEDGE_TYPES).not.toContain("TRIAGE");
    expect(KNOWLEDGE_TYPES).not.toContain("REVISION");
  });

  it("preserves the four canonical triage states", () => {
    expect(TRIAGE_STATES).toEqual([
      "CRITICAL",
      "REVIEW",
      "STABLE",
      "UNASSESSED",
    ]);
  });

  it("preserves PROPOSED as a revision state", () => {
    expect(REVISION_STATES).toContain("PROPOSED");
  });

  it("parses Integration 001 against schema 1.1.0", () => {
    expect(() => WorkspaceSchema.parse(integration001)).not.toThrow();
  });
});
