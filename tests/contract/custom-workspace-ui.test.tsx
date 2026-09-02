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
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK" as const,
        }))}
        onProposeRepair={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
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
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK" as const,
        }))}
        onProposeRepair={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
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
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK" as const,
        }))}
        onProposeRepair={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
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

  it("does not show a redundant Open map action and opens the live workspace from Run analysis", async () => {
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
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis:
            "STRUCTURAL_FALLBACK" as const,
        }))}
        onProposeRepair={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis:
            "STRUCTURAL_FALLBACK" as const,
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
      screen.queryByRole("button", {
        name: "Open map",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Run analysis/i,
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
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK" as const,
        }))}
        onProposeRepair={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
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

    expect(
      screen.getByText(
        /Your reasoning is structurally ready/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Review target selected.",
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
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK" as const,
        }))}
        onProposeRepair={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
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

    expect(
      screen.getByText(
        "Review target selected.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /no semantic triage exists yet/i,
      ),
    ).toBeInTheDocument();
  });

  it("requests an immediate repair proposal instead of entering a waiting-only state", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
    });

    workspace.audit_events.push({
      event_id: "AUD-FOCUS-UI-TEST",
      event_type: "FOCUS",
      timestamp:
        "2026-09-02T12:00:00+07:00",
      actor_type: "HUMAN",
      entity_ids: [
        "C-USER-001",
        "CONC-USER-001",
      ],
      metadata: {
        primary_item_id:
          "C-USER-001",
        requested_action:
          "FOCUS_PRIMARY_RISK",
        basis:
          "STRUCTURAL_FALLBACK",
      },
    });

    const onProposeRepair =
      vi.fn(() => ({
        targetId:
          "CONC-USER-001",
        focusedItemIds: [
          "C-USER-001",
          "CONC-USER-001",
        ],
        basis:
          "STRUCTURAL_FALLBACK" as const,
      }));

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={
          "C-USER-001"
        }
        focusedItemIds={[
          "C-USER-001",
          "CONC-USER-001",
        ]}
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId:
            "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis:
            "STRUCTURAL_FALLBACK" as const,
        }))}
        onProposeRepair={
          onProposeRepair
        }
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
      onProposeRepair,
    ).toHaveBeenCalledTimes(1);
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
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK" as const,
        }))}
        onProposeRepair={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
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

    expect(
      screen.queryByRole("button", {
        name: "Accept proposal",
      }),
    ).not.toBeInTheDocument();
  });

  it("activates human decision controls when a real AGENT proposal exists", async () => {
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
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => ({
          targetId: "C-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis: "STRUCTURAL_FALLBACK" as const,
        }))}
        onProposeRepair={vi.fn(() => ({
          targetId: "CONC-USER-001",
          focusedItemIds: [
            "CONC-USER-001",
          ],
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

    expect(
      (
        await screen.findAllByText(
          "Pilot the new release process before replacing the current one.",
          {},
          { timeout: 5000 },
        )
      ).length,
    ).toBeGreaterThan(0);

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

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={onFocusPrimaryRisk}
        onProposeRepair={vi.fn(() => ({
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

    expect(onFocusPrimaryRisk).toHaveBeenCalledTimes(2);
  });

  it("shows the canonical RevisionPanel for a real proposal", async () => {
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
      targetItemId: "CONC-USER-001",
      proposedText:
        "Pilot the change before replacing the current release process.",
      reasonCodes: ["SCOPE_MISMATCH"],
      affectedItemIds: [
        "C-USER-001",
        "CONC-USER-001",
      ],
      createdBy: "AGENT",
      createdAt: "2026-09-02T09:00:00+07:00",
      auditEventId: "AUD-PROP-EVIDENCE",
    });

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId="CONC-USER-001"
        focusedItemIds={[
          "C-USER-001",
          "CONC-USER-001",
        ]}
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={vi.fn(() => null)}
        onProposeRepair={vi.fn(() => null)}
        onAccept={vi.fn()}
        onEditAndAccept={vi.fn()}
        onReject={vi.fn()}
        onDefer={vi.fn()}
        onEdit={vi.fn()}
        onBackToStart={vi.fn()}
      />,
    );

    expect(
      screen.getAllByText(
        "We should change it.",
      ).length,
    ).toBeGreaterThan(0);

    expect(
      (
        await screen.findAllByText(
          "Pilot the change before replacing the current release process.",
          {},
          { timeout: 5000 },
        )
      ).length,
    ).toBeGreaterThan(0);

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

  it("Run analysis immediately invokes primary focus and exposes the live workspace", async () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion:
        "We should change it.",
      reason:
        "Releases fail too often.",
    });

    const onFocusPrimaryRisk =
      vi.fn(() => ({
        targetId:
          "C-USER-001",
        focusedItemIds: [
          "C-USER-001",
          "CONC-USER-001",
        ],
        basis:
          "STRUCTURAL_FALLBACK" as const,
      }));

    render(
      <CustomWorkspaceHome
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        onSelectItem={vi.fn()}
        onFocusPrimaryRisk={
          onFocusPrimaryRisk
        }
        onProposeRepair={vi.fn(() => ({
          targetId:
            "CONC-USER-001",
          focusedItemIds: [
            "C-USER-001",
            "CONC-USER-001",
          ],
          basis:
            "STRUCTURAL_FALLBACK" as const,
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
      onFocusPrimaryRisk,
    ).toHaveBeenCalledTimes(1);

    expect(
      await screen.findByLabelText(
        "Live reasoning workspace",
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });
});
