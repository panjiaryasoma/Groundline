import { describe, it } from "vitest";
import { assertTriageAcceptance } from "./assertAcceptance";

describe("TRIAGE-001", () => {
  it("matches the frozen acceptance contract", () => {
    assertTriageAcceptance("TRIAGE-001");
  });
});
