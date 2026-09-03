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
  it("gives a custom decision the same visible Run analysis entry action as the example", () => {
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
      screen.getByLabelText(
        "Live reasoning workspace",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Run analysis",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Check reasoning structure",
      }),
    ).not.toBeInTheDocument();
  });

  it("uses the same Focus primary risk and Propose repair actions for reviewed demo and custom workspaces", () => {
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
        name: "Propose repair",
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
        name: "Propose repair",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Prepare repair",
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps DECIDE inside the same workspace when a proposal exists", () => {
    const analyzed = analyzedExample();
    const workspace = proposeRevision({
      workspace: analyzed,
      revisionId: "REV-UNIFIED-001",
      targetItemId: "A-001",
      proposedText:
        "Treat the assumption as conditional until it is directly supported across the intended deployment conditions.",
      reasonCodes: ["UNSUPPORTED_ASSUMPTION"],
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
        selectedItemId="A-001"
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
