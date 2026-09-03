import {
  act,
  render,
  screen,
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { P117CustomWorkspaceHome } from "../../src/components/custom/P117CustomWorkspaceHome";
import {
  clearP117AgentReviewState,
  setP117RelationProposalBatch,
  useP117AgentReviewStore,
} from "../../src/state/p117AgentReview";
import { useWorkspaceStore } from "../../src/state/workspaceStore";
import { semanticReviewContract } from "../../src/webmcp/semanticReviewContract";

const customInput = {
  question: "Should we change our release process?",
  conclusion: "We should change it.",
  reason: "Releases fail too often.",
  assumption: "The current handoff causes the failures.",
  evidence: "Three recent releases failed at the same handoff.",
};

function renderWorkspace() {
  const workspace = useWorkspaceStore.getState().workspace;

  return render(
    <P117CustomWorkspaceHome
      workspace={workspace}
      selectedItemId={null}
      focusedItemIds={[]}
      graphSelectionRequest={{ itemId: null, version: 0 }}
      onSelectItem={vi.fn()}
      onRunAnalysis={vi.fn()}
      onFocusPrimaryRisk={vi.fn()}
      onProposeRepair={vi.fn()}
      onAccept={vi.fn()}
      onEditAndAccept={vi.fn()}
      onReject={vi.fn()}
      onDefer={vi.fn()}
      onExit={vi.fn()}
      onEditInput={vi.fn()}
    />,
  );
}

describe("P11 custom semantic-review UX", () => {
  beforeEach(() => {
    clearP117AgentReviewState();
    useWorkspaceStore.getState().createCustomWorkspace(customInput);
  });

  it("keeps protocol state hidden while exposing the direct-browser review entry action", () => {
    renderWorkspace();

    expect(screen.getByText("Not reviewed yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Run analysis to select a first review target.",
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
    expect(
      screen.queryByText(/Waiting for agent review/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/AGENT HANDOFF READY/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/SRV-[a-z0-9]+/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Groundline semantic review/i),
    ).not.toBeInTheDocument();
    expect(
      useP117AgentReviewStore.getState().proposalBatch,
    ).toBeNull();
  });

  it("shows a panel only when the agent has produced connections that need a human decision", async () => {
    renderWorkspace();

    const workspace = useWorkspaceStore.getState().workspace;
    const reviewToken = semanticReviewContract(workspace).review_token;

    await act(async () => {
      setP117RelationProposalBatch({
        reviewToken,
        proposedAt: "2026-09-03T12:00:00+07:00",
        proposals: [
          {
            from_id: "A-USER-001",
            to_id: "CONC-USER-001",
            type: "QUALIFIES",
            rationale:
              "The stated assumption constrains how strongly the conclusion can be applied.",
          },
        ],
      });
      await Promise.resolve();
    });

    expect(
      await screen.findByLabelText(
        "Review suggested semantic connections",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Review suggested connections"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Accept selected connections",
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Reject all" }),
    ).toBeEnabled();
  });
});
