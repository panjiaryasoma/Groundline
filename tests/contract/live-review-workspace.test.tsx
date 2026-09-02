import {
  render,
  screen,
} from "@testing-library/react";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ExpandedReasoningMap } from "../../src/components/focus/ExpandedReasoningMap";
import { integration001 } from "../../src/fixtures/integration001";
import { integration001Evaluations } from "../../src/fixtures/integration001Evaluations";
import {
  attachWorkspaceAnalysis,
  triageWorkspaceFromEvaluations,
} from "../../src/domain/workspaceAnalysis";

describe("P-08.3 live review workspace", () => {
  it("keeps graph, inspector, revision proposal and audit visible together", () => {
    const analyzed =
      attachWorkspaceAnalysis(
        integration001,
        triageWorkspaceFromEvaluations(
          integration001,
          integration001Evaluations,
        ),
      );

    render(
      <ExpandedReasoningMap
        workspace={analyzed}
        selectedItemId="A-001"
        focusedItemIds={[
          "A-001",
          "C-001",
          "CONC-001",
        ]}
        onSelectItem={vi.fn()}
      />,
    );

    expect(
      screen.getAllByText("A-001").length,
    ).toBeGreaterThanOrEqual(2);

    expect(
      screen.getByText(
        "Revision proposal",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Decision history",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name:
          /Show selected item and decision history/i,
      }),
    ).not.toBeInTheDocument();
  });
});
