import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HumanDecisionButton } from "../../src/components/human/HumanDecisionButton";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("HumanDecisionButton", () => {
  it("does not confirm on an ordinary click and explains the hold gesture", () => {
    vi.useFakeTimers();
    const onHumanConfirm = vi.fn();

    render(
      <HumanDecisionButton onHumanConfirm={onHumanConfirm} holdMs={1200}>
        Accept proposal
      </HumanDecisionButton>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onHumanConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toHaveTextContent(
      "Hold for 1.2s to confirm",
    );
  });

  it("confirms only after the full human hold duration", () => {
    vi.useFakeTimers();
    const onHumanConfirm = vi.fn();

    render(
      <HumanDecisionButton onHumanConfirm={onHumanConfirm} holdMs={1200}>
        Accept proposal
      </HumanDecisionButton>,
    );

    const button = screen.getByRole("button");
    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(1199);
    });
    expect(onHumanConfirm).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onHumanConfirm).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(button, { button: 0, pointerId: 1 });
  });

  it("cancels when the human releases before the hold duration", () => {
    vi.useFakeTimers();
    const onHumanConfirm = vi.fn();

    render(
      <HumanDecisionButton onHumanConfirm={onHumanConfirm} holdMs={1200}>
        Reject
      </HumanDecisionButton>,
    );

    const button = screen.getByRole("button");
    fireEvent.pointerDown(button, { button: 0, pointerId: 2 });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(button, { button: 0, pointerId: 2 });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onHumanConfirm).not.toHaveBeenCalled();
  });
});
