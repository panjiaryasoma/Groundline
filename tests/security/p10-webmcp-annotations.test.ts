import {
  describe,
  expect,
  it,
} from "vitest";

import { createVerticalSliceTools } from "../../src/webmcp/registerTools";

const EXPECTED_UNTRUSTED_HINTS: Record<
  string,
  boolean
> = {
  inspect_workspace: true,
  inspect_item: true,
  evaluate_item: true,
  triage_workspace: true,
  trace_dependencies: false,
  find_contradictions: true,
  find_evidence_gaps: true,
  focus_items: false,
  propose_revision: true,
};

describe("P-10 WebMCP content trust annotations", () => {
  it("matches the frozen nine-tool untrusted-content contract", () => {
    const tools = createVerticalSliceTools();

    expect(tools).toHaveLength(9);

    for (const tool of tools) {
      expect(
        tool.annotations?.untrustedContentHint,
        tool.name,
      ).toBe(
        EXPECTED_UNTRUSTED_HINTS[tool.name],
      );
    }
  });
});
