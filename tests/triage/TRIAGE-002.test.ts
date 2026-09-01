import { describe, it } from "vitest";
import { assertTriageAcceptance } from "./assertAcceptance";

describe("TRIAGE-002", () => {
  it("matches the frozen acceptance contract", () => {
    assertTriageAcceptance("TRIAGE-002");
  });
});
