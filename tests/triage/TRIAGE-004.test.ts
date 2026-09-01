import { describe, it } from "vitest";
import { assertTriageAcceptance } from "./assertAcceptance";

describe("TRIAGE-004", () => {
  it("matches the frozen acceptance contract", () => {
    assertTriageAcceptance("TRIAGE-004");
  });
});
