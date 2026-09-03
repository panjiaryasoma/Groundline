import {
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
} from "../../src/state/p117AgentReview";
import { useWorkspaceStore } from "../../src/state/workspaceStore";

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

describe("P11.7.2 agent review status UX", () => {
  beforeEach(() => {
    clearP117AgentReviewState();
    useWorkspaceStore.getState().createCustomWorkspace(customInput);

    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: vi.fn(),
      },
    });
  });

  afterEach(() => {
    delete (document as Document & { modelContext?: unknown }).modelContext;
    clearP117AgentReviewState();
  });

  it("shows a passive WebMCP handoff status after Run analysis and exposes no fake refresh control", async () => {
    renderWorkspace();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Run analysis/i,
      }),
    );

    expect(
      await screen.findByText("Waiting for agent review"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("AGENT HANDOFF READY"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This page does not start an AI agent by itself/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No action is required in this panel/i),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /Refresh review request/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Create current review request/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("explains that repeated page clicks cannot run semantic review when WebMCP is unavailable", async () => {
    delete (document as Document & { modelContext?: unknown }).modelContext;

    renderWorkspace();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Run analysis/i,
      }),
    );

    expect(
      await screen.findByText("WebMCP not detected in this tab"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No semantic result will appear here by repeatedly clicking the page/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Refresh|Create current review request/i,
      }),
    ).not.toBeInTheDocument();
  });
});
