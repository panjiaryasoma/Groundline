import {
  fireEvent,
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
import { addP114ReasoningItem } from "../../src/state/p114AddReasoningItem";
import {
  clearP117AgentReviewState,
  useP117AgentReviewStore,
} from "../../src/state/p117AgentReview";
import {
  buildP15LocalConnectionCandidates,
} from "../../src/state/p15LocalConnectionSuggestions";
import { useWorkspaceStore } from "../../src/state/workspaceStore";

const customInput = {
  question: "Should we retain a hybrid customer-support model?",
  conclusion:
    "We should retain hybrid customer support with human escalation.",
  reason:
    "Hybrid support reduces operational risk while preserving escalation for complex customer cases.",
  assumption:
    "Customer-support demand and escalation patterns will remain comparable next quarter.",
  evidence:
    "The support pilot showed lower handling time while human escalation protected customer retention.",
};

function addMatchingClaim(): string {
  return addP114ReasoningItem({
    type: "CLAIM",
    text:
      "Retaining a hybrid support model with human escalation reduces operational costs while protecting customer retention.",
  });
}

function renderWorkspace() {
  const state = useWorkspaceStore.getState();

  return render(
    <P117CustomWorkspaceHome
      workspace={state.workspace}
      selectedItemId={state.ui.selectedItemId}
      focusedItemIds={state.ui.focusedItemIds}
      graphSelectionRequest={state.ui.graphSelectionRequest}
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

describe("P15 local connection candidates", () => {
  beforeEach(() => {
    clearP117AgentReviewState();
    useWorkspaceStore.getState().createCustomWorkspace(customInput);
  });

  it("finds likely attachment points without assigning semantic relation meaning", () => {
    const addedId = addMatchingClaim();
    const workspace = useWorkspaceStore.getState().workspace;
    const proposals = buildP15LocalConnectionCandidates(workspace);
    const proposal = proposals.find((candidate) => candidate.from_id === addedId);

    expect(proposal).toBeDefined();
    expect(proposal?.type).toBeNull();
    expect(proposal?.source).toBe("LOCAL_DETERMINISTIC");
    expect(proposal?.matched_terms?.length).toBeGreaterThan(0);
    expect(proposal?.rationale).toMatch(/has not assigned semantic meaning/i);
  });

  it("opens human review from Run analysis and requires human-chosen relation types", async () => {
    const addedId = addMatchingClaim();
    renderWorkspace();

    fireEvent.click(
      screen.getByRole("button", { name: "Run analysis" }),
    );

    const panel = await screen.findByLabelText("Review candidate connections");
    expect(panel).toBeInTheDocument();

    const batch = useP117AgentReviewStore.getState().proposalBatch;
    expect(batch?.source).toBe("LOCAL_DETERMINISTIC");
    expect(
      batch?.proposals.some((proposal) => proposal.from_id === addedId),
    ).toBe(true);

    const acceptButton = screen.getByRole("button", {
      name: "Accept selected connections",
    });
    expect(acceptButton).toBeDisabled();

    const candidate = batch?.proposals.find(
      (proposal) => proposal.from_id === addedId,
    );
    expect(candidate).toBeDefined();

    const relationTypeSelects = screen.getAllByRole("combobox", {
      name: /Relation type for/i,
    });
    expect(relationTypeSelects.length).toBeGreaterThan(0);

    for (const select of relationTypeSelects) {
      fireEvent.change(select, { target: { value: "SUPPORTS" } });
    }

    expect(acceptButton).toBeEnabled();
    fireEvent.click(acceptButton);

    const updated = useWorkspaceStore.getState().workspace;
    expect(
      updated.relations.some(
        (relation) =>
          relation.from_id === candidate?.from_id &&
          relation.to_id === candidate?.to_id &&
          relation.type === "SUPPORTS",
      ),
    ).toBe(true);
    expect(
      updated.items
        .find((item) => item.id === addedId)
        ?.tags?.includes("unlinked"),
    ).toBe(false);
    expect(
      updated.audit_events.at(-1)?.metadata?.requested_action,
    ).toBe("ACCEPT_LOCAL_CONNECTION_CANDIDATES");
  });
});
