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

describe("P11.9 unified review workspace", () => {
  it("maps custom reasoning directly without exposing a fake analysis step", () => {
    const workspace = buildCustomWorkspace({
      question: "Should we change our release process?",
      conclusion: "We should change it.",
      reason: "Releases fail too often.",
      assumption: "The handoff causes the failures.",
      evidence: "Three recent releases failed at the same handoff.",
    });

    render(
      <UnifiedReviewWorkspace
        mode="CUSTOM"
        workspace={workspace}
        selectedItemId={null}
        focusedItemIds={[]}
        graphSelectionRequest={{ itemId: null, version: 0 }}
        {...handlers}
      />,
    );

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

  it("uses the same UNDERSTAND surface for reviewed demo and custom workspaces", () => {
    const workspace = analyzedExample();

    const first = render(
      <UnifiedReviewWorkspace
        mode="DEMO"
        workspace={workspace}
        selectedItemId="A-001"
        focusedItemIds={[]}
        graphSelectionRequest={{ itemId: null, version: 0 }}
        {...handlers}
      />,
    );

    expect(
      screen.getByText("Start with the weakest high-impact point."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Weakest point · ASSUMPTION · A-001/i),
    ).toBeInTheDocument();

    first.unmount();

    render(
      <UnifiedReviewWorkspace
        mode="CUSTOM"
        workspace={workspace}
        selectedItemId="A-001"
        focusedItemIds={[]}
        graphSelectionRequest={{ itemId: null, version: 0 }}
        {...handlers}
      />,
    );

    expect(
      screen.getByText("Start with the weakest high-impact point."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Focus primary risk|Propose repair/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("moves to DECIDE only when a real agent proposal exists", () => {
    const analyzed = analyzedExample();
    const workspace = proposeRevision({
      workspace: analyzed,
      revisionId: "REV-UNIFIED-001",
      targetItemId: "CONC-001",
      proposedText:
        "Use face recognition only with evaluated deployment conditions and an alternative review path.",
      reasonCodes: ["OVERGENERALIZATION"],
      affectedItemIds: ["A-001", "C-001", "CONC-001"],
      createdBy: "AGENT",
      createdAt: "2026-09-03T16:00:00+07:00",
      auditEventId: "AUD-UNIFIED-001",
    });

    render(
      <UnifiedReviewWorkspace
        mode="CUSTOM"
        workspace={workspace}
        selectedItemId="CONC-001"
        focusedItemIds={["A-001", "C-001", "CONC-001"]}
        graphSelectionRequest={{ itemId: null, version: 0 }}
        {...handlers}
      />,
    );

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
      expect(
        screen.getByRole("button", { name }),
      ).toBeEnabled();
    }
  });
});
