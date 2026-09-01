import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InspectorPanel } from "../../src/components/inspector";
import { integration001 } from "../../src/fixtures/integration001";
import { integration001Evaluations } from "../../src/fixtures/integration001Evaluations";
import {
  attachWorkspaceAnalysis,
  triageWorkspaceFromEvaluations,
} from "../../src/domain/workspaceAnalysis";

describe("P-06 inspector", () => {
  it("shows a selected reasoning item's text and relations", () => {
    render(
      <InspectorPanel
        workspace={integration001}
        selectedItemId="A-001"
      />,
    );

    expect(screen.getByText("A-001")).toBeInTheDocument();
    expect(
      screen.getByText(/Aggregate accuracy generalizes/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("SUPPORTS").length,
    ).toBeGreaterThan(0);
  });

  it("shows triage state after analysis", () => {
    const analysis = triageWorkspaceFromEvaluations(
      integration001,
      integration001Evaluations,
    );
    const workspace = attachWorkspaceAnalysis(
      integration001,
      analysis,
    );

    render(
      <InspectorPanel
        workspace={workspace}
        selectedItemId="A-001"
      />,
    );

    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    expect(screen.getByText(/priority 9/i)).toBeInTheDocument();
  });

  it("labels external source content as untrusted", () => {
    render(
      <InspectorPanel
        workspace={integration001}
        selectedItemId="SRC-NIST-001"
      />,
    );

    expect(
      screen.getByText("YES · UNTRUSTED CONTENT"),
    ).toBeInTheDocument();
  });
});
