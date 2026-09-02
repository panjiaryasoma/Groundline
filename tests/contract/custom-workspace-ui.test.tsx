import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { CustomWorkspaceHome } from "../../src/components/custom";
import { buildCustomWorkspace } from "../../src/domain/customWorkspace";
import { proposeRevision } from "../../src/domain/revisions";

describe("P-06.7 custom workspace next-step UX", () => {
  it("tells the user what happened to their input and what to do next", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
    });

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onPrepareRepairTarget={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        /Groundline put your answers in the right places/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "What do I do now?",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Run analysis/i,
      }),
    ).toBeInTheDocument();
  });

  it("treats missing optional context as advisory and still exposes semantic next actions", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
    });

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onPrepareRepairTarget={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Run analysis/i,
      }),
    );

    expect(
      screen.getByText(
        /Your reasoning is structurally ready for the next stage/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(
        "Optional improvement",
      ).length,
    ).toBeGreaterThan(0);

    expect(
      screen.getByRole("button", {
        name: "Focus primary risk",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Propose repair",
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Add the missing pieces",
      }),
    ).not.toBeInTheDocument();
  });

  it("places Run analysis in the next-step section and shows visible results", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
    });

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onPrepareRepairTarget={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    expect(
      screen.getByText("What do I do now?"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Run analysis/i,
      }),
    );

    expect(
      screen.getByText("Analysis result"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Your reasoning is structurally ready for the next stage/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the reasoning map as a visible secondary action", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
    });

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onPrepareRepairTarget={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Reasoning map"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Open map",
      }),
    ).toBeInTheDocument();
  });


  it("shows a ready-for-agent-review result when the structure is complete", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
      assumption:
        "The failures come from the current release process.",
      evidence:
        "Three of the last five failed releases broke at the same manual handoff.",
      sourceUrl:
        "https://example.com/release-report",
    });

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onPrepareRepairTarget={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Run analysis/i,
      }),
    );

    expect(
      screen.getByText(
        /Your reasoning is structurally ready/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Ready for agent review",
      ),
    ).toBeInTheDocument();
  });


  it("explains why semantic agent actions cannot be fabricated locally", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
    });

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onPrepareRepairTarget={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Run analysis/i,
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Focus primary risk",
      }),
    );

    expect(
      screen.getByText(
        "Semantic agent review is required.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /no semantic triage exists yet/i,
      ),
    ).toBeInTheDocument();
  });


  it("waits for a real proposal instead of showing unusable human controls", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
    });

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onPrepareRepairTarget={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Run analysis/i,
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Propose repair",
      }),
    );

    expect(
      screen.getByText(
        "Waiting for agent proposal",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Use suggestion",
      }),
    ).not.toBeInTheDocument();
  });

  it("does not expose acceptance controls before the repair stage is requested", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
    });

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onPrepareRepairTarget={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Run analysis/i,
      }),
    );

    expect(
      screen.queryByRole("button", {
        name: "Use suggestion",
      }),
    ).not.toBeInTheDocument();
  });


  it("activates human decision controls when a real AGENT proposal exists", () => {
    const base = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
    });

    const workspace = proposeRevision({
      workspace: base,
      revisionId: "REV-AGENT-001",
      targetItemId: "CONC-USER-001",
      proposedText:
        "Pilot the new release process before replacing the current one.",
      reasonCodes: ["SCOPE_MISMATCH"],
      affectedItemIds: [
        "C-USER-001",
        "CONC-USER-001",
      ],
      createdBy: "AGENT",
      createdAt:
        "2026-09-02T05:00:00+07:00",
      auditEventId:
        "AUD-PROP-AGENT-001",
    });

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={
          "CONC-USER-001"
        }
        focusedItemIds={[
          "C-USER-001",
          "CONC-USER-001",
        ]}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onPrepareRepairTarget={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK",
        }))}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Pilot the new release process before replacing the current one.",
      ),
    ).toBeInTheDocument();

    for (const name of [
      "Use suggestion",
      "Edit first",
      "Keep current conclusion",
      "Decide later",
    ]) {
      expect(
        screen.getByRole("button", {
          name,
        }),
      ).toBeEnabled();
    }
  });


  it("shows the focused risk and prevents skipping it before repair", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
    });

    const onFocusPrimaryRisk = vi.fn(() => ({
      targetId: "C-USER-001",
      focusedItemIds: [
        "C-USER-001",
        "CONC-USER-001",
      ],
      basis: "STRUCTURAL_FALLBACK" as const,
    }));

    const { rerender } = render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={onFocusPrimaryRisk}
        onPrepareRepairTarget={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: ["C-USER-001"],
          basis: "STRUCTURAL_FALLBACK" as const,
        }))}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Run analysis/i,
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Focus primary risk",
      }),
    );

    expect(onFocusPrimaryRisk).toHaveBeenCalledTimes(1);
  });

  it("compares the proposal against its actual repair target, not always the conclusion", () => {
    const base = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
      evidence:
        "Three recent releases failed at the same handoff.",
    });

    const workspace = proposeRevision({
      workspace: base,
      revisionId: "REV-AGENT-EVIDENCE",
      targetItemId: "E-USER-001",
      proposedText:
        "Treat this as evidence from three recent releases, not a general rule.",
      reasonCodes: ["SCOPE_MISMATCH"],
      affectedItemIds: ["E-USER-001"],
      createdBy: "AGENT",
      createdAt: "2026-09-02T09:00:00+07:00",
      auditEventId: "AUD-PROP-EVIDENCE",
    });

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId="E-USER-001"
        focusedItemIds={["E-USER-001"]}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => null)}
        onPrepareRepairTarget={vi.fn(() => null)}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Three recent releases failed at the same handoff.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Treat this as evidence from three recent releases, not a general rule.",
      ),
    ).toBeInTheDocument();

    for (const name of [
      "Use suggestion",
      "Edit first",
      "Keep current evidence",
      "Decide later",
    ]) {
      expect(
        screen.getByRole("button", { name }),
      ).toBeEnabled();
    }
  });

});
