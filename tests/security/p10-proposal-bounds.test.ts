import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { useWorkspaceStore } from "../../src/state/workspaceStore";
import { createVerticalSliceTools } from "../../src/webmcp/registerTools";

function proposeTool() {
  const tool = createVerticalSliceTools().find(
    (candidate) =>
      candidate.name === "propose_revision",
  );

  if (!tool) {
    throw new Error(
      "Missing propose_revision tool.",
    );
  }

  return tool;
}

describe("P-10 proposal input bounds", () => {
  beforeEach(() => {
    useWorkspaceStore
      .getState()
      .startDemo();
  });

  it("rejects an oversized revision instead of storing unbounded proposal text", () => {
    const before = structuredClone(
      useWorkspaceStore.getState().workspace,
    );

    expect(() =>
      proposeTool().execute({
        target_item_id: "CONC-001",
        proposed_text: "x".repeat(6001),
        reason_codes: [],
        affected_item_ids: ["CONC-001"],
      }),
    ).toThrow(
      "proposed_text may contain at most 6000 characters.",
    );

    expect(
      useWorkspaceStore.getState().workspace,
    ).toEqual(before);
  });

  it("rejects an unknown affected item instead of preserving a dangling revision reference", () => {
    const before = structuredClone(
      useWorkspaceStore.getState().workspace,
    );

    expect(() =>
      proposeTool().execute({
        target_item_id: "CONC-001",
        proposed_text:
          "Keep the decision provisional while the represented risk is reviewed.",
        reason_codes: [
          "UNSUPPORTED_ASSUMPTION",
        ],
        affected_item_ids: [
          "CONC-001",
          "NO-SUCH-ITEM",
        ],
      }),
    ).toThrow(
      'Knowledge item "NO-SUCH-ITEM" was not found.',
    );

    expect(
      useWorkspaceStore.getState().workspace,
    ).toEqual(before);
  });
});
