import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  afterEach,
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
}

describe("P11 final custom semantic-review UX", () => {
  beforeEach(() => {
    clearP117AgentReviewState();
    useWorkspaceStore.getState().createCustomWorkspace(customInput);
  });

  afterEach(() => {
    clearP117AgentReviewState();
  });

  it("keeps protocol handoff invisible after the structural check", () => {
    renderWorkspace();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Check reasoning structure/i,
      }),
    );

    expect(
      screen.getByText("Your reasoning map is ready."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Semantic review not run yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Not reviewed by an AI agent yet."),
    ).toBeInTheDocument();

    expect(
      useP117AgentReviewStore.getState().request,
    ).not.toBeNull();

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
  });

  it("shows a panel only when the agent has produced connections that need a human decision", async () => {
    renderWorkspace();

    const workspace = useWorkspaceStore.getState().workspace;
    const reviewToken = semanticReviewContract(workspace).review_token;

    act(() => {
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
