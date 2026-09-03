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

import { GuidedExperience } from "../../src/components/guided";
import { integration001 } from "../../src/fixtures/integration001";
import { useWorkspaceStore } from "../../src/state/workspaceStore";

function renderGuided(
  workspace = useWorkspaceStore.getState().workspace,
) {
  const handlers = {
    onRunAnalysis: vi.fn(),
    onShowWhy: vi.fn(),
    onProposeRepair: vi.fn(),
    onAccept: vi.fn(),
    onEditAndAccept: vi.fn(),
    onReject: vi.fn(),
    onDefer: vi.fn(),
    onReset: vi.fn(),
    onOpenMap: vi.fn(),
  };

  render(
    <GuidedExperience
      workspace={workspace}
      {...handlers}
    />,
  );

  return handlers;
}

describe("P-06.3 guided UX", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspace: structuredClone(
        integration001,
      ),
      ui: {
        selectedItemId: null,
        focusedItemIds: [],
      },
    });
  });

  it("starts with plain-language decision framing", () => {
    renderGuided();

    expect(
      screen.getByText(
        /Check what this conclusion actually stands on/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Check this reasoning",
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Weakness"),
    ).not.toBeInTheDocument();
  });

  it("shows the biggest issue in plain language after analysis", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();

    renderGuided(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.getByText(
        "This is the reasoning point to review first.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Needs attention"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Show why it matters",
      }),
    ).toBeInTheDocument();
  });

  it("routes explanation to the reasoning map", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();

    const handlers = renderGuided(
      useWorkspaceStore.getState().workspace,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show why it matters",
      }),
    );

    expect(
      handlers.onShowWhy,
    ).toHaveBeenCalledTimes(1);
  });

  it("uses human-friendly decision labels for a proposal", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();
    useWorkspaceStore
      .getState()
      .proposeSeededRevision();

    renderGuided(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.getByRole("button", {
        name: /Use suggestion/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Keep current version/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Decide later/i,
      }),
    ).toBeInTheDocument();
  });

  it("allows editing before human acceptance", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();
    useWorkspaceStore
      .getState()
      .proposeSeededRevision();

    const handlers = renderGuided(
      useWorkspaceStore.getState().workspace,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Edit first/i,
      }),
    );

    const textarea =
      screen.getByLabelText(
        "Edit the suggested wording",
      );

    fireEvent.change(textarea, {
      target: {
        value:
          "Human-friendly edited conclusion.",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Use my edited version/i,
      }),
    );

    expect(
      handlers.onEditAndAccept,
    ).toHaveBeenCalledWith(
      "Human-friendly edited conclusion.",
    );
  });

  it("shows a plain-language completion state after review", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();
    useWorkspaceStore
      .getState()
      .proposeSeededRevision();
    useWorkspaceStore
      .getState()
      .acceptLatestRevision();

    renderGuided(
      useWorkspaceStore.getState().workspace,
    );

    expect(
      screen.getByText(
        /The suggested revision was accepted/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Start over",
      }),
    ).toBeInTheDocument();
  });
});
