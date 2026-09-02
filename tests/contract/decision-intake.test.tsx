import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { DecisionIntake } from "../../src/components/intake";

describe("P-06.7 decision intake UX", () => {
  it("asks for ordinary user questions instead of ontology fields", () => {
    render(
      <DecisionIntake
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onExitHome={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "What are you trying to decide?",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /What do you currently think the answer is/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("CLAIM"),
    ).not.toBeInTheDocument();
  });

  it("lets the user proceed with required fields and keeps evidence optional", () => {
    render(
      <DecisionIntake
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onExitHome={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText(
        /Should our team switch/i,
      ),
      {
        target: {
          value:
            "Should we change our release process?",
        },
      },
    );

    fireEvent.change(
      screen.getByPlaceholderText(
        /I think we should try/i,
      ),
      {
        target: {
          value:
            "I think we should change it.",
        },
      },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue",
      }),
    );

    expect(
      screen.getByText("Your main reason"),
    ).toBeInTheDocument();
  });

  it("explains where the user's input goes before workspace creation", () => {
    const onSubmit = vi.fn();

    render(
      <DecisionIntake
        initialValue={{
          question:
            "Should we change our release process?",
          conclusion:
            "We should change it.",
          reason:
            "Releases fail too often.",
          assumption: "",
          evidence: "",
          sourceUrl: "",
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        onExitHome={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue",
      }),
    );

    expect(
      screen.getByText(
        /This is what will go into your workspace/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Your current answer",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Your main reason",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /You do not need to place cards on the graph yourself/i,
      ),
    ).toBeInTheDocument();
  });

  it("lets the user exit intake directly to the home screen", () => {
    const onExitHome = vi.fn();

    render(
      <DecisionIntake
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onExitHome={onExitHome}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Exit workspace",
      }),
    );

    expect(onExitHome).toHaveBeenCalledTimes(1);
  });

});
