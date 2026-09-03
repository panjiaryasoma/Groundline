import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExpandedReasoningMap } from "../../src/components/focus/ExpandedReasoningMap";
import { integration001 } from "../../src/fixtures/integration001";
import { integration001Evaluations } from "../../src/fixtures/integration001Evaluations";
import {
  attachWorkspaceAnalysis,
  triageWorkspaceFromEvaluations,
} from "../../src/domain/workspaceAnalysis";

describe("P11 geological UI pass", () => {
  it("keeps the geology metaphor attached to reasoning semantics", async () => {
    const analyzed = attachWorkspaceAnalysis(
      integration001,
      triageWorkspaceFromEvaluations(
        integration001,
        integration001Evaluations,
      ),
    );

    const { container } = render(
      <ExpandedReasoningMap
        workspace={analyzed}
        selectedItemId="A-001"
        focusedItemIds={["A-001", "C-001", "CONC-001"]}
        onSelectItem={vi.fn()}
      />,
    );

    expect(
      await screen.findByLabelText("Groundline reasoning graph"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Dashed gold = suggested connection; dashed rust = challenge.",
      ),
    ).toBeInTheDocument();

    expect(
      container.querySelectorAll(".reasoning-node--faulted").length,
    ).toBeGreaterThan(0);

    expect(
      container.querySelector(".strata-labels"),
    ).toHaveTextContent(
      "QUESTIONCONCLUSIONCLAIMSASSUMPTIONSEVIDENCESOURCES",
    );

    expect(
      container.querySelector(".graph-fault-line"),
    ).not.toBeInTheDocument();
  });
});
