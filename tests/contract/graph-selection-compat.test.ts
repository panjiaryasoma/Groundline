import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { integration001 } from "../../src/fixtures/integration001";
import { useWorkspaceStore } from "../../src/state/workspaceStore";

describe("P-08.8.1 graph selection backwards compatibility", () => {
  beforeEach(() => {
    // Deliberately emulate pre-P-08.8 test fixtures that only knew the old UI shape.
    useWorkspaceStore.setState({
      workspace: structuredClone(integration001),
      ui: {
        selectedItemId: null,
        focusedItemIds: [],
      },
    });
  });

  it("migrates an older ephemeral UI snapshot when analysis first issues a graph selection command", () => {
    useWorkspaceStore
      .getState()
      .runSeededAnalysis();

    const request =
      useWorkspaceStore.getState().ui
        .graphSelectionRequest;

    expect(request).toBeDefined();
    expect(request?.version).toBe(1);
    expect(request?.itemId).toBeTruthy();
  });
});
