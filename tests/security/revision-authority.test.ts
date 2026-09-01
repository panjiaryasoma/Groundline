import { describe, expect, it } from "vitest";
import {
  acceptRevision,
  editAndAcceptRevision,
  proposeRevision,
} from "../../src/domain/revisions";
import { GroundlineError } from "../../src/domain/errors";
import { integration001 } from "../../src/fixtures/integration001";

describe("revision authority security regression", () => {
  it("EVAL-022: agent cannot mark its own revision ACCEPTED", () => {
    const workspace = proposeRevision({
      workspace: integration001,
      revisionId: "REV-SEC-001",
      targetItemId: "CONC-001",
      proposedText: "Agent-proposed replacement.",
      reasonCodes: ["OVERGENERALIZATION"],
      affectedItemIds: ["CONC-001"],
      createdBy: "AGENT",
      createdAt: "2026-09-02T02:00:00+07:00",
      auditEventId: "AUD-SEC-PROP",
    });

    for (const attempt of [
      () =>
        acceptRevision({
          workspace,
          revisionId: "REV-SEC-001",
          actor: "AGENT",
          reviewedAt: "2026-09-02T02:01:00+07:00",
          auditEventId: "AUD-SEC-ACCEPT",
          acceptedItemId: "CONC-SEC-002",
        }),
      () =>
        editAndAcceptRevision({
          workspace,
          revisionId: "REV-SEC-001",
          actor: "AGENT",
          reviewedAt: "2026-09-02T02:01:00+07:00",
          auditEventId: "AUD-SEC-EDIT",
          acceptedItemId: "CONC-SEC-003",
          editedText: "Agent edits and accepts.",
        }),
    ]) {
      try {
        attempt();
        throw new Error("Authority bypass unexpectedly succeeded.");
      } catch (error) {
        expect(error).toBeInstanceOf(GroundlineError);
        expect((error as GroundlineError).code).toBe(
          "HUMAN_APPROVAL_REQUIRED",
        );
      }
    }
  });
});
