import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RevisionPanel } from "../../src/components/revision";
import { integration001 } from "../../src/fixtures/integration001";
import { proposeRevision } from "../../src/domain/revisions";

function proposedWorkspace() {
  return proposeRevision({
    workspace: integration001,
    revisionId: "REV-UI-TEST",
    targetItemId: "CONC-001",
    proposedText: "A narrower proposed conclusion.",
    reasonCodes: ["OVERGENERALIZATION"],
    affectedItemIds: ["CONC-001"],
    createdBy: "AGENT",
    createdAt: "2026-09-02T00:00:00+07:00",
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
      screen.getByText(/Deploy face recognition as the sole/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("A narrower proposed conclusion.")
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/Agent proposes. Human decides/i),
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
      screen.getByRole("button", { name: "Reject" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Defer" }),
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
        value: "Human-edited accepted conclusion.",
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

  it("shows a waiting state after repair is prepared but before the agent proposal exists", () => {
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
        "Waiting for agent proposal",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText("A-001").length,
    ).toBeGreaterThan(0);

    expect(
      screen.getAllByText("CONC-001").length,
    ).toBeGreaterThan(0);
  });

});
