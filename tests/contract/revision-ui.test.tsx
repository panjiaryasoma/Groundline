import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RevisionPanel } from "../../src/components/revision";
import { proposeRevision } from "../../src/domain/revisions";
import { integration001 } from "../../src/fixtures/integration001";

function proposedWorkspace() {
  return proposeRevision({
    workspace: integration001,
    revisionId: "REV-UI-TEST",
    targetItemId: "CONC-001",
    proposedText:
      "A narrower proposed conclusion.",
    reasonCodes: ["OVERGENERALIZATION"],
    affectedItemIds: ["CONC-001"],
    createdBy: "AGENT",
    createdAt:
      "2026-09-02T00:00:00+07:00",
    auditEventId: "AUD-UI-TEST",
  });
}

describe("P-06 revision panel", () => {
  it("shows accepted and proposed text separately", () => {
    render(
      <RevisionPanel
        workspace={proposedWorkspace()}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        /Deploy face recognition as the sole/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "A narrower proposed conclusion.",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /Agent proposes. Human decides/i,
      ),
    ).toBeInTheDocument();
  });

  it("routes accept/reject/defer through explicit controls", () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const onDefer = vi.fn();

    render(
      <RevisionPanel
        workspace={proposedWorkspace()}
        onAccept={onAccept}
        onEditAndAccept={vi.fn()}
        onReject={onReject}
        onDefer={onDefer}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Accept proposal",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Reject",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Defer",
      }),
    );

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onDefer).toHaveBeenCalledTimes(1);
  });

  it("passes human-edited text to edit-and-accept", () => {
    const onEditAndAccept = vi.fn();

    render(
      <RevisionPanel
        workspace={proposedWorkspace()}
        onAccept={vi.fn()}
        onEditAndAccept={onEditAndAccept}
        onReject={vi.fn()}
        onDefer={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText(
      "Edit before accepting",
    );

    fireEvent.change(textarea, {
      target: {
        value:
          "Human-edited accepted conclusion.",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Accept edited",
      }),
    );

    expect(onEditAndAccept).toHaveBeenCalledWith(
      "Human-edited accepted conclusion.",
    );
  });

  it("shows an honest prepared-target state before an external agent proposal exists", () => {
    const workspace = structuredClone(
      integration001,
    );

    workspace.audit_events.push({
      event_id: "AUD-REPAIR-WAIT",
      event_type: "FOCUS",
      timestamp:
        "2026-09-02T00:01:00+07:00",
      actor_type: "HUMAN",
      entity_ids: [
        "A-001",
        "C-001",
        "CONC-001",
      ],
      metadata: {
        requested_action:
          "PROPOSE_REPAIR",
        primary_risk_id: "A-001",
        repair_target_id: "CONC-001",
        proposal_state:
          "AWAITING_AGENT",
      },
    });

    render(
      <RevisionPanel
        workspace={workspace}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Repair target prepared",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText("A-001").length,
    ).toBeGreaterThan(0);

    expect(
      screen.getAllByText("CONC-001")
        .length,
    ).toBeGreaterThan(0);

    expect(
      screen.queryByText(
        /call propose_revision/i,
      ),
    ).not.toBeInTheDocument();
  });

  it("labels the immediate custom draft as a local deterministic agent proposal", () => {
    const base = structuredClone(
      integration001,
    );

    const workspace = proposeRevision({
      workspace: base,
      revisionId: "REV-LOCAL-001",
      targetItemId: "CONC-001",
      proposedText:
        "Keep the conclusion provisional until the focused reasoning issue is resolved.",
      reasonCodes: [
        "STRUCTURAL_REVIEW_TARGET",
      ],
      affectedItemIds: [
        "A-001",
        "CONC-001",
      ],
      createdBy: "AGENT",
      createdAt:
        "2026-09-02T12:00:00+07:00",
      auditEventId:
        "AUD-LOCAL-001",
    });

    const event =
      workspace.audit_events.at(-1);

    if (event) {
      event.metadata = {
        ...(event.metadata ?? {}),
        proposal_source:
          "LOCAL_DETERMINISTIC_REPAIR_AGENT",
      };
    }

    render(
      <RevisionPanel
        workspace={workspace}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        /Agent proposal · local deterministic/i,
      ),
    ).toBeInTheDocument();

    for (const name of [
      "Accept proposal",
      "Accept edited",
      "Reject",
      "Defer",
    ]) {
      expect(
        screen.getByRole("button", {
          name,
        }),
      ).toBeEnabled();
    }
  });
});
