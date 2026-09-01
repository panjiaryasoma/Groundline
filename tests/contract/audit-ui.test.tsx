import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditTrail } from "../../src/components/audit";
import {
  runIntegration001HumanAcceptance,
} from "../../src/fixtures/integration001Scenario";

describe("P-06 audit trail", () => {
  it("renders proposal, supersession, and acceptance events", () => {
    const { acceptedWorkspace } =
      runIntegration001HumanAcceptance();

    render(
      <AuditTrail workspace={acceptedWorkspace} />,
    );

    expect(
      screen.getByText("PROPOSE_REVISION"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("SUPERSEDE"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ACCEPT_REVISION"),
    ).toBeInTheDocument();
  });
});
