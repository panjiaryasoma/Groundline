import { describe, expect, it } from "vitest";
import { RevisionSchema } from "../../src/domain/schema";

describe("human authority contract", () => {
  it("rejects an agent-created revision that starts ACCEPTED", () => {
    const result = RevisionSchema.safeParse({
      revision_id: "REV-TEST-001",
      target_item_id: "CONC-001",
      proposed_text: "A revised conclusion.",
      state: "ACCEPTED",
      reason_codes: ["OVERGENERALIZATION"],
      affected_item_ids: ["CONC-001"],
      created_by: "AGENT",
      created_at: "2026-09-02T00:00:00+07:00",
    });

    expect(result.success).toBe(false);
  });

  it("allows an agent-created revision to start PROPOSED", () => {
    const result = RevisionSchema.safeParse({
      revision_id: "REV-TEST-002",
      target_item_id: "CONC-001",
      proposed_text: "A revised conclusion.",
      state: "PROPOSED",
      reason_codes: ["OVERGENERALIZATION"],
      affected_item_ids: ["CONC-001"],
      created_by: "AGENT",
      created_at: "2026-09-02T00:00:00+07:00",
    });

    expect(result.success).toBe(true);
  });
});
