import { describe, expect, it } from "vitest";
import { P0_TOOL_NAMES } from "../../src/webmcp/toolSchemas";

describe("frozen WebMCP P0 surface", () => {
  it("contains exactly nine tools", () => {
    expect(P0_TOOL_NAMES).toHaveLength(9);
  });

  it("contains the central demo operations", () => {
    expect(P0_TOOL_NAMES).toEqual(
      expect.arrayContaining([
        "inspect_workspace",
        "triage_workspace",
        "focus_items",
        "trace_dependencies",
        "propose_revision",
      ]),
    );
  });
});
