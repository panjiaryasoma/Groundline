import { describe, it } from "vitest";
import { assertTriageAcceptance } from "./assertAcceptance";

describe("TRIAGE-007", () => {
  it("matches the frozen acceptance contract", () => {
    assertTriageAcceptance("TRIAGE-007");
  });
});
