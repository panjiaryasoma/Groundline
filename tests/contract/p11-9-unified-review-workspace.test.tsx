import {
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UnifiedReviewWorkspace } from "../../src/components/review/UnifiedReviewWorkspace";
import { buildCustomWorkspace } from "../../src/domain/customWorkspace";
import { proposeRevision } from "../../src/domain/revisions";
import {
  attachWorkspaceAnalysis,
  triageWorkspaceFromEvaluations,
} from "../../src/domain/workspaceAnalysis";
import { integration001 } from "../../src/fixtures/integration001";
import { integration001Evaluations } from "../../src/fixtures/integration001Evaluations";

const handlers = {
  onSelectItem: vi.fn(),
  onAccept: vi.fn(),
  onEditAndAccept: vi.fn(),
  onReject: vi.fn(),
  onDefer: vi.fn(),
  onExit: vi.fn(),
  onFocusPrimaryRisk: vi.fn(),
  onPrepareRepairTarget: vi.fn(),
  onRunAnalysis: vi.fn(),
  onProposeRepair: vi.fn(),
};

function analyzedExample() {
  return attachWorkspaceAnalysis(
    structuredClone(integration001),
    triageWorkspaceFromEvaluations(
      structuredClone(integration001),
      integration001Evaluations,
    ),
  );
}

describe("P11 live unified review workspace", () => {
  it("maps custom reasoning directly into the visible graph without exposing a fake page-side analysis step", () => {
    const workspace = buildCustomWorkspace({
      question:
        "Should we change our release process?",
      conclusion: "We should change it.",
      reason: "Releases fail too often.",
      assumption:
        "The handoff causes the failures.",
      evidence:
        "Three recent releases failed at the same handoff.",
    });

    render(
      <UnifiedReviewWorkspace
        mode="CUSTOM"
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
        name: /Run analysis|Check reasoning structure/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("uses the same live graph-and-Inspector surface for reviewed demo and custom workspaces", () => {
    const workspace = analyzedExample();

    const first = render(
      <UnifiedReviewWorkspace
        mode="DEMO"
        workspace={workspace}
        selectedItemId="A-001"
        focusedItemIds={[]}
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        {...handlers}
      />,
    );

    expect(
      screen.getByLabelText(
        "Live reasoning workspace",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /A-001 is the current primary risk/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Focus primary risk",
      }),
    ).toBeInTheDocument();

    first.unmount();

    render(
      <UnifiedReviewWorkspace
        mode="CUSTOM"
        workspace={workspace}
        selectedItemId="A-001"
        focusedItemIds={[]}
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        {...handlers}
      />,
    );

    expect(
      screen.getByLabelText(
        "Live reasoning workspace",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /A-001 is the current primary risk/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Focus primary risk",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Prepare repair",
      }),
    ).toBeInTheDocument();
  });

  it("keeps DECIDE inside the same workspace when a real agent proposal exists", () => {
    const analyzed = analyzedExample();
    const workspace = proposeRevision({
      workspace: analyzed,
      revisionId: "REV-UNIFIED-001",
      targetItemId: "CONC-001",
      proposedText:
        "Use face recognition only with evaluated deployment conditions and an alternative review path.",
      reasonCodes: ["OVERGENERALIZATION"],
      affectedItemIds: [
        "A-001",
        "C-001",
        "CONC-001",
      ],
      createdBy: "AGENT",
      createdAt:
        "2026-09-03T16:00:00+07:00",
      auditEventId: "AUD-UNIFIED-001",
    });

    render(
      <UnifiedReviewWorkspace
        mode="CUSTOM"
        workspace={workspace}
        selectedItemId="CONC-001"
        focusedItemIds={[
          "A-001",
          "C-001",
          "CONC-001",
        ]}
        graphSelectionRequest={{
          itemId: null,
          version: 0,
        }}
        {...handlers}
      />,
    );

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
    expect(
      screen.getByLabelText(
        "Live reasoning workspace",
      ),
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
