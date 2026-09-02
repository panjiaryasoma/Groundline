import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  createVerticalSliceTools,
  VERTICAL_SLICE_TOOL_NAMES,
} from "../../src/webmcp/registerTools";
import { useWorkspaceStore } from "../../src/state/workspaceStore";

describe("P-07/08 WebMCP vertical slice", () => {
  beforeEach(() => {
    useWorkspaceStore
      .getState()
      .createCustomWorkspace({
        question:
          "Should we change our release process?",
        conclusion:
          "We should change it.",
        reason:
          "Releases fail too often.",
        evidence:
          "Three recent releases failed at the same handoff.",
      });
  });

  it("exposes the five contracted vertical-slice tools", () => {
    expect(
      createVerticalSliceTools().map(
        (tool) => tool.name,
      ),
    ).toEqual(
      VERTICAL_SLICE_TOOL_NAMES,
    );
  });

  it("focus_items updates UI selection and audit state", async () => {
    const tool =
      createVerticalSliceTools().find(
        (candidate) =>
          candidate.name === "focus_items",
      )!;

    await tool.execute({
      item_ids: [
        "C-USER-001",
        "CONC-USER-001",
      ],
      primary_item_id:
        "C-USER-001",
    });

    const state =
      useWorkspaceStore.getState();

    expect(
      state.ui.selectedItemId,
    ).toBe("C-USER-001");

    expect(
      state.workspace.audit_events.at(-1)
        ?.event_type,
    ).toBe("FOCUS");
  });

  it("propose_revision creates PROPOSED but never accepts it", async () => {
    const tool =
      createVerticalSliceTools().find(
        (candidate) =>
          candidate.name ===
          "propose_revision",
      )!;

    await tool.execute({
      target_item_id:
        "CONC-USER-001",
      proposed_text:
        "Pilot the change before fully replacing the current process.",
      reason_codes: [
        "SCOPE_MISMATCH",
      ],
      affected_item_ids: [
        "C-USER-001",
        "CONC-USER-001",
      ],
    });

    const workspace =
      useWorkspaceStore.getState()
        .workspace;

    expect(
      workspace.revisions.at(-1),
    ).toEqual(
      expect.objectContaining({
        state: "PROPOSED",
        created_by: "AGENT",
      }),
    );

    expect(
      workspace.accepted_conclusion_id,
    ).toBe("CONC-USER-001");

    expect(
      workspace.audit_events.at(-1)
        ?.event_type,
    ).toBe("PROPOSE_REVISION");
  });

  it("inspect_workspace returns bounded structured state", async () => {
    const tool =
      createVerticalSliceTools().find(
        (candidate) =>
          candidate.name ===
          "inspect_workspace",
      )!;

    const result =
      (await tool.execute({})) as any;

    expect(result.workspace_id).toBeTruthy();
    expect(result.counts.items).toBeGreaterThan(0);
    expect(
      result.accepted_conclusion.id,
    ).toBe("CONC-USER-001");
  });

  it("trace_dependencies returns a bounded path", async () => {
    const tool =
      createVerticalSliceTools().find(
        (candidate) =>
          candidate.name ===
          "trace_dependencies",
      )!;

    const result =
      (await tool.execute({
        item_id: "C-USER-001",
        direction: "DOWNSTREAM",
        max_depth: 6,
        max_nodes: 10,
      })) as any;

    expect(result.origin_id).toBe(
      "C-USER-001",
    );
    expect(result.node_ids).toContain(
      "CONC-USER-001",
    );
  });

  it("inspect_workspace exposes the current UI focus so an agent can repair the item the human selected", async () => {
    useWorkspaceStore.setState({
      ui: {
        selectedItemId: "C-USER-001",
        focusedItemIds: [
          "C-USER-001",
          "CONC-USER-001",
        ],
      },
    });

    const tool =
      createVerticalSliceTools().find(
        (candidate) =>
          candidate.name === "inspect_workspace",
      )!;

    const result =
      (await tool.execute({})) as any;

    expect(result.ui_state).toMatchObject({
      selected_item_id: "C-USER-001",
      focused_item_ids: [
        "C-USER-001",
        "CONC-USER-001",
      ],
    });

    expect(
      result.ui_state.primary_risk_id,
    ).toBeNull();

    expect(
      result.ui_state.repair_target_id,
    ).toBeNull();
  });


  it("inspect_workspace distinguishes the focused primary risk from the conclusion repair target", async () => {
    const current =
      useWorkspaceStore.getState().workspace;

    useWorkspaceStore.setState({
      workspace: {
        ...current,
        triage_records: [
          {
            item_id: "C-USER-001",
            state: "CRITICAL",
            weakness_score_internal: 3,
            impact_score_internal: 3,
            priority_score_internal: 9,
            reason_codes: ["OVERGENERALIZATION"],
            downstream_accepted_ids: [
              "CONC-USER-001",
            ],
            direct_to_accepted_conclusion: true,
          },
        ],
      },
    });

    useWorkspaceStore
      .getState()
      .focusCustomPrimaryRisk();
    useWorkspaceStore
      .getState()
      .prepareCustomRepairTarget();

    const tool =
      createVerticalSliceTools().find(
        (candidate) =>
          candidate.name ===
          "inspect_workspace",
      )!;

    const result =
      (await tool.execute({})) as any;

    expect(
      result.ui_state.primary_risk_id,
    ).toBe("C-USER-001");

    expect(
      result.ui_state.repair_target_id,
    ).toBe("CONC-USER-001");
  });

});
