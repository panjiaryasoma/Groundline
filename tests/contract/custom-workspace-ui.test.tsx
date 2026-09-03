import {
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CustomWorkspaceHome } from "../../src/components/custom";
import { buildCustomWorkspace } from "../../src/domain/customWorkspace";
import { proposeRevision } from "../../src/domain/revisions";

const handlers = {
  onSelectItem: vi.fn(),
  onAccept: vi.fn(),
  onEditAndAccept: vi.fn(),
  onReject: vi.fn(),
  onDefer: vi.fn(),
  onExit: vi.fn(),
  onEditInput: vi.fn(),
  onFocusPrimaryRisk: vi.fn(),
  onPrepareRepairTarget: vi.fn(),
};

function renderWorkspace(
  workspace = buildCustomWorkspace({
    question: "Should we change our release process?",
    conclusion: "We should change it.",
    reason: "Releases fail too often.",
    assumption:
      "The current handoff causes the failures.",
    evidence:
      "Three recent releases failed at the same handoff.",
  }),
) {
  return render(
    <CustomWorkspaceHome
      workspace={workspace}
      selectedItemId={null}
      focusedItemIds={[]}
      graphSelectionRequest={{
        itemId: null,
        version: 0,
      }}
      {...handlers}
    />,
  );
}

describe("custom workspace live reasoning journey", () => {
  it("opens directly into the live reasoning workspace without a fake local analysis step", () => {
    renderWorkspace();

    expect(
      screen.getByText("Your decision"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Not reviewed yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your reasoning is mapped and ready for agent review.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(
        "Live reasoning workspace",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /Check reasoning structure|Inspect full reasoning map/i,
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /Run analysis/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps graph, Inspector, Revision Proposal, and Decision History in the same visible workspace", () => {
    renderWorkspace();

    expect(
      screen.getByLabelText(
        "Groundline reasoning graph",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Revision proposal",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Selection, inspector, revision proposal, and decision history share the same state/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows human decision controls in the same workspace when a real proposal exists", () => {
    const base = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion: "We should change it.",
      reason: "Releases fail too often.",
    });

    const workspace = proposeRevision({
      workspace: base,
      revisionId: "REV-AGENT-UI-001",
      targetItemId: "CONC-USER-001",
      proposedText:
        "Pilot the changed release process before replacing the current process.",
      reasonCodes: ["SCOPE_MISMATCH"],
      affectedItemIds: [
        "C-USER-001",
        "CONC-USER-001",
      ],
      createdBy: "AGENT",
      createdAt:
        "2026-09-03T16:00:00+07:00",
      auditEventId:
        "AUD-PROP-AGENT-UI-001",
    });

    renderWorkspace(workspace);

    expect(
      screen.getByText(
        "Human decision required",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Accepted now"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Proposed revision"),
    ).toBeInTheDocument();

    for (const name of [
      "Accept proposal",
      "Accept edited",
      "Reject",
      "Defer",
    ]) {
      expect(
        screen.getByRole("button", { name }),
      ).toBeEnabled();
    }
  });
});
