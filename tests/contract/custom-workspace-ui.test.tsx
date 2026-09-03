import {
  fireEvent,
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
};

function renderWorkspace(
  workspace = buildCustomWorkspace({
    question: "Should we change our release process?",
    conclusion: "We should change it.",
    reason: "Releases fail too often.",
    assumption: "The current handoff causes the failures.",
    evidence: "Three recent releases failed at the same handoff.",
  }),
) {
  return render(
    <CustomWorkspaceHome
      workspace={workspace}
      selectedItemId={null}
      focusedItemIds={[]}
      graphSelectionRequest={{ itemId: null, version: 0 }}
      {...handlers}
    />,
  );
}

describe("custom workspace unified product journey", () => {
  it("starts in the mapped workspace without promoting structural validation into a user step", () => {
    renderWorkspace();

    expect(screen.getByText("Your decision")).toBeInTheDocument();
    expect(screen.getByText("Not reviewed yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your reasoning is mapped and ready for agent review.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /Run analysis|Check reasoning structure|Focus primary risk|Propose repair/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps the full graph behind an explicit inspection action", async () => {
    renderWorkspace();

    expect(
      screen.queryByLabelText("Live reasoning workspace"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Inspect full reasoning map",
      }),
    );

    expect(
      await screen.findByLabelText(
        "Live reasoning workspace",
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });

  it("shows human decision controls only when a real agent proposal exists", () => {
    const base = buildCustomWorkspace({
      question: "Should we change our release process?",
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
      affectedItemIds: ["C-USER-001", "CONC-USER-001"],
      createdBy: "AGENT",
      createdAt: "2026-09-03T16:00:00+07:00",
      auditEventId: "AUD-PROP-AGENT-UI-001",
    });

    renderWorkspace(workspace);

    expect(
      screen.getByText("Human decision required"),
    ).toBeInTheDocument();
    expect(screen.getByText("Accepted now")).toBeInTheDocument();
    expect(screen.getByText("Proposed revision")).toBeInTheDocument();

    for (const name of [
      "Accept proposal",
      "Accept edited",
      "Reject",
      "Defer",
    ]) {
      expect(screen.getByRole("button", { name })).toBeEnabled();
    }
  });
});
