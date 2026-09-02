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

import { FocusWorkspace } from "../../src/components/focus";
import { integration001 } from "../../src/fixtures/integration001";
import { useWorkspaceStore } from "../../src/state/workspaceStore";

function renderFocus(
  workspace = useWorkspaceStore.getState().workspace,
) {
  const handlers = {
    onSelectItem: vi.fn(),
    onRunAnalysis: vi.fn(),
    onFocusPrimaryRisk: vi.fn(),
    onProposeRevision: vi.fn(),
    onAccept: vi.fn(),
    onEditAndAccept: vi.fn(),
    onReject: vi.fn(),
    onDefer: vi.fn(),
    onReset: vi.fn(),
    onExitExample: vi.fn(),
  };

  render(
    <FocusWorkspace
      workspace={workspace}
      selectedItemId={null}
      focusedItemIds={[]}
      {...handlers}
    />,
  );

  return handlers;
}

describe("P-06.6 plain-language review flow", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspace: structuredClone(integration001),
      ui: {
        selectedItemId: null,
        focusedItemIds: [],
      },
    });
  });

  it("starts with one clear reasoning-check action", () => {
    renderFocus();

    expect(
      screen.getByText(
        /Check the reasoning before acting on the conclusion/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Check this reasoning/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /You only need to do three things/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Check"),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(/Guided view/i),
    ).not.toBeInTheDocument();
  });

  it("shows the weak-point chain directly after analysis", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();

    renderFocus(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.getByText(
        /Groundline found one high-impact weak point/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Aggregate accuracy generalizes across demographic groups/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /The system is sufficiently accurate for all enrolled users/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(
        /Deploy face recognition as the sole access-control mechanism/i,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("shows evidence beside the focused chain", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();

    renderFocus(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.getByText("Evidence snapshot"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /internal aggregate benchmark reports high overall accuracy/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /NIST reports demographic differentials/i,
      ),
    ).toBeInTheDocument();
  });

  it("expands the full map inline instead of switching modes", async () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();

    renderFocus(
      useWorkspaceStore.getState().workspace,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open map",
      }),
    );

    expect(
      await screen.findByText(
        "Advanced reasoning map",
      ),
    ).toBeInTheDocument();

    expect(
      await screen.findByLabelText(
        "Groundline reasoning graph",
      ),
    ).toBeInTheDocument();
  });

  it("shows the revision inline with human decision controls", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();
    useWorkspaceStore
      .getState()
      .proposeSeededRevision();

    renderFocus(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.getByText("Suggested revision"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Use suggestion",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Keep current conclusion",
      }),
    ).toBeInTheDocument();
  });

  it("keeps editing behind an explicit human action", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();
    useWorkspaceStore
      .getState()
      .proposeSeededRevision();

    const handlers = renderFocus(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.queryByLabelText(
        "Edit before accepting",
      ),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Edit first",
      }),
    );

    const editor = screen.getByLabelText(
      "Edit before accepting",
    );

    fireEvent.change(editor, {
      target: {
        value:
          "Human-edited unified conclusion.",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Use my edited version",
      }),
    );

    expect(
      handlers.onEditAndAccept,
    ).toHaveBeenCalledWith(
      "Human-edited unified conclusion.",
    );
  });

  it("shows post-review state without pretending the new conclusion is already re-evaluated", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();
    useWorkspaceStore
      .getState()
      .proposeSeededRevision();
    useWorkspaceStore
      .getState()
      .acceptLatestRevision();

    renderFocus(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.getByText(
        "Fresh reasoning review needed",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /does not inherit the previous evidence relationships or analysis automatically/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Replay the example/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Review evidence links",
      }),
    ).not.toBeInTheDocument();
  });

  it("renders both accepted and superseded conclusions when history map opens after acceptance", async () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();
    useWorkspaceStore
      .getState()
      .proposeSeededRevision();
    useWorkspaceStore
      .getState()
      .acceptLatestRevision();

    const workspace =
      useWorkspaceStore.getState().workspace;

    renderFocus(workspace);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open map",
      }),
    );

    await screen.findByLabelText(
      "Groundline reasoning graph",
    );

    expect(
      document.querySelector(
        '[data-item-id="CONC-001"]',
      ),
    ).toBeInTheDocument();

    expect(
      document.querySelector(
        `[data-item-id="${workspace.accepted_conclusion_id}"]`,
      ),
    ).toBeInTheDocument();
  });

  it("ends the main demo without forcing the user into the graph", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();
    useWorkspaceStore
      .getState()
      .proposeSeededRevision();
    useWorkspaceStore
      .getState()
      .acceptLatestRevision();

    renderFocus(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.getByText(
        "The demo is complete.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Replay the example/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByLabelText(
        "Groundline reasoning graph",
      ),
    ).not.toBeInTheDocument();
  });

  it("does not falsely mark a rejected proposal as an unevaluated replacement", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();
    useWorkspaceStore
      .getState()
      .proposeSeededRevision();
    useWorkspaceStore
      .getState()
      .rejectLatestRevision();

    renderFocus(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.getByText(
        "Accepted reasoning unchanged",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(
        "Fresh reasoning review needed",
      ),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText(
        "Proposal rejected",
      ),
    ).toBeInTheDocument();
  });

  it("does not falsely mark a deferred proposal as an unevaluated replacement", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();
    useWorkspaceStore
      .getState()
      .proposeSeededRevision();
    useWorkspaceStore
      .getState()
      .deferLatestRevision();

    renderFocus(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.getByText(
        "The review is paused.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Proposal deferred",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(
        "Fresh reasoning review needed",
      ),
    ).not.toBeInTheDocument();
  });


  it("keeps the reasoning map visible without making it the primary workflow", () => {
    renderFocus();

    expect(
      screen.getByRole("button", {
        name: "Open map",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Reasoning map"),
    ).toBeInTheDocument();
  });

  it("does not require map interaction to complete check-review-decide", () => {
    const handlers = renderFocus();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Check this reasoning/i,
      }),
    );

    expect(
      handlers.onRunAnalysis,
    ).toHaveBeenCalledTimes(1);

    expect(
      screen.queryByLabelText(
        "Groundline reasoning graph",
      ),
    ).not.toBeInTheDocument();
  });


  it("exposes the original example controls and an exit path", () => {
    const handlers = renderFocus();

    expect(
      screen.getByRole("button", {
        name: "Run analysis",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Focus primary risk",
      }),
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Propose repair",
      }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Exit example",
      }),
    );

    expect(
      handlers.onExitExample,
    ).toHaveBeenCalledTimes(1);
  });

  it("enables focus and repair controls after the seeded analysis", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();

    renderFocus(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.getByRole("button", {
        name: "Focus primary risk",
      }),
    ).toBeEnabled();

    expect(
      screen.getByRole("button", {
        name: "Propose repair",
      }),
    ).toBeEnabled();
  });

});
