import { describe, expect, it } from "vitest";
import {
  acceptRevision,
  deferRevision,
  editAndAcceptRevision,
  proposeRevision,
  rejectRevision,
} from "../../src/domain/revisions";
import { GroundlineError } from "../../src/domain/errors";
import { integration001 } from "../../src/fixtures/integration001";

const createdAt = "2026-09-02T02:00:00+07:00";
const reviewedAt = "2026-09-02T02:05:00+07:00";

function proposedWorkspace() {
  return proposeRevision({
    workspace: integration001,
    revisionId: "REV-001",
    targetItemId: "CONC-001",
    proposedText:
      "Do not deploy face recognition as the sole high-stakes access-control mechanism until performance is evaluated across the intended populations and capture conditions.",
    reasonCodes: ["OVERGENERALIZATION", "SCOPE_MISMATCH"],
    affectedItemIds: ["A-001", "C-001", "CONC-001"],
    createdBy: "AGENT",
    createdAt,
    auditEventId: "AUD-PROP-001",
  });
}

describe("P-04 revision authority", () => {
  it("creates an agent revision only as PROPOSED and preserves accepted knowledge", () => {
    const original = structuredClone(integration001);
    const next = proposedWorkspace();

    expect(next.revisions).toHaveLength(1);
    expect(next.revisions[0].state).toBe("PROPOSED");
    expect(next.revisions[0].created_by).toBe("AGENT");
    expect(next.accepted_conclusion_id).toBe("CONC-001");
    expect(
      next.items.find((item) => item.id === "CONC-001")?.state,
    ).toBe("ACCEPTED");

    expect(integration001).toEqual(original);
  });

  it("blocks an AGENT from accepting a proposed revision", () => {
    const workspace = proposedWorkspace();

    expect(() =>
      acceptRevision({
        workspace,
        revisionId: "REV-001",
        actor: "AGENT",
        reviewedAt,
        auditEventId: "AUD-ACCEPT-001",
        acceptedItemId: "CONC-002",
      }),
    ).toThrowError(GroundlineError);

    try {
      acceptRevision({
        workspace,
        revisionId: "REV-001",
        actor: "AGENT",
        reviewedAt,
        auditEventId: "AUD-ACCEPT-002",
        acceptedItemId: "CONC-003",
      });
    } catch (error) {
      expect((error as GroundlineError).code).toBe(
        "HUMAN_APPROVAL_REQUIRED",
      );
    }
  });

  it("blocks an AGENT from rejecting or deferring a proposed revision", () => {
    const workspace = proposedWorkspace();

    for (const review of [rejectRevision, deferRevision]) {
      try {
        review({
          workspace,
          revisionId: "REV-001",
          actor: "AGENT",
          reviewedAt,
          auditEventId: "AUD-REVIEW-AGENT",
        });
        throw new Error("Expected review to fail.");
      } catch (error) {
        expect(error).toBeInstanceOf(GroundlineError);
        expect((error as GroundlineError).code).toBe(
          "HUMAN_APPROVAL_REQUIRED",
        );
      }
    }
  });

  it("allows a HUMAN to accept a proposed conclusion revision", () => {
    const workspace = proposedWorkspace();

    const next = acceptRevision({
      workspace,
      revisionId: "REV-001",
      actor: "HUMAN",
      reviewedAt,
      auditEventId: "AUD-ACCEPT-001",
      acceptedItemId: "CONC-002",
    });

    expect(next.revisions[0].state).toBe("ACCEPTED");
    expect(next.revisions[0].reviewed_by).toBe("HUMAN");

    expect(
      next.items.find((item) => item.id === "CONC-001")?.state,
    ).toBe("SUPERSEDED");

    const replacement = next.items.find(
      (item) => item.id === "CONC-002",
    );
    expect(replacement?.state).toBe("ACCEPTED");
    expect(replacement?.created_by).toBe("HUMAN");
    expect(replacement?.supersedes_id).toBe("CONC-001");

    expect(next.accepted_conclusion_id).toBe("CONC-002");

    expect(
      next.relations.some(
        (relation) =>
          relation.type === "SUPERSEDES" &&
          relation.from_id === "CONC-002" &&
          relation.to_id === "CONC-001",
      ),
    ).toBe(true);

    expect(
      next.audit_events.some(
        (event) => event.event_type === "SUPERSEDE",
      ),
    ).toBe(true);
    expect(
      next.audit_events.some(
        (event) => event.event_type === "ACCEPT_REVISION",
      ),
    ).toBe(true);
  });

  it("preserves the old accepted item instead of deleting history", () => {
    const next = acceptRevision({
      workspace: proposedWorkspace(),
      revisionId: "REV-001",
      actor: "HUMAN",
      reviewedAt,
      auditEventId: "AUD-ACCEPT-HISTORY",
      acceptedItemId: "CONC-002",
    });

    expect(
      next.items.some((item) => item.id === "CONC-001"),
    ).toBe(true);
    expect(
      next.items.find((item) => item.id === "CONC-001")?.state,
    ).toBe("SUPERSEDED");
  });

  it("allows HUMAN edit-and-accept while retaining the original proposal", () => {
    const next = editAndAcceptRevision({
      workspace: proposedWorkspace(),
      revisionId: "REV-001",
      actor: "HUMAN",
      reviewedAt,
      auditEventId: "AUD-EDIT-001",
      acceptedItemId: "CONC-EDITED",
      editedText:
        "Use face recognition only with validated deployment-specific performance and a non-biometric fallback.",
    });

    const revision = next.revisions[0];
    const accepted = next.items.find(
      (item) => item.id === "CONC-EDITED",
    );

    expect(revision.state).toBe("EDITED_AND_ACCEPTED");
    expect(revision.proposed_text).not.toBe(accepted?.text);
    expect(accepted?.state).toBe("ACCEPTED");
    expect(next.accepted_conclusion_id).toBe("CONC-EDITED");
  });

  it("allows HUMAN rejection without changing accepted conclusion", () => {
    const workspace = proposedWorkspace();

    const next = rejectRevision({
      workspace,
      revisionId: "REV-001",
      actor: "HUMAN",
      reviewedAt,
      auditEventId: "AUD-REJECT-001",
    });

    expect(next.revisions[0].state).toBe("REJECTED");
    expect(next.accepted_conclusion_id).toBe("CONC-001");
    expect(
      next.items.find((item) => item.id === "CONC-001")?.state,
    ).toBe("ACCEPTED");
  });

  it("allows HUMAN defer without changing accepted conclusion", () => {
    const next = deferRevision({
      workspace: proposedWorkspace(),
      revisionId: "REV-001",
      actor: "HUMAN",
      reviewedAt,
      auditEventId: "AUD-DEFER-001",
    });

    expect(next.revisions[0].state).toBe("DEFERRED");
    expect(next.accepted_conclusion_id).toBe("CONC-001");
  });

  it("rejects a second review after a revision leaves PROPOSED", () => {
    const rejected = rejectRevision({
      workspace: proposedWorkspace(),
      revisionId: "REV-001",
      actor: "HUMAN",
      reviewedAt,
      auditEventId: "AUD-REJECT-ONCE",
    });

    expect(() =>
      rejectRevision({
        workspace: rejected,
        revisionId: "REV-001",
        actor: "HUMAN",
        reviewedAt,
        auditEventId: "AUD-REJECT-TWICE",
      }),
    ).toThrowError(GroundlineError);
  });

  it("rejects revision proposals against superseded knowledge", () => {
    const accepted = acceptRevision({
      workspace: proposedWorkspace(),
      revisionId: "REV-001",
      actor: "HUMAN",
      reviewedAt,
      auditEventId: "AUD-ACCEPT-FIRST",
      acceptedItemId: "CONC-002",
    });

    expect(() =>
      proposeRevision({
        workspace: accepted,
        revisionId: "REV-002",
        targetItemId: "CONC-001",
        proposedText: "Try to revise old history.",
        reasonCodes: [],
        affectedItemIds: ["CONC-001"],
        createdBy: "AGENT",
        createdAt,
        auditEventId: "AUD-PROP-OLD",
      }),
    ).toThrowError(GroundlineError);
  });
});
