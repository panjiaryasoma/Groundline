import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { useWorkspaceStore } from "../../src/state/workspaceStore";

const input = {
  question:
    "Should our team switch release processes?",
  conclusion:
    "We should switch.",
  reason:
    "The current process fails too often.",
  evidence:
    "Three recent releases failed at the same handoff.",
};

describe("P-07/08 custom workspace actions", () => {
  beforeEach(() => {
    useWorkspaceStore
      .getState()
      .createCustomWorkspace(input);
  });

  it("focuses a structural fallback target and records FOCUS", () => {
    const result =
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk();

    const state =
      useWorkspaceStore.getState();

    expect(
      state.ui.selectedItemId,
    ).toBe(result?.targetId);

    expect(
      state.ui.focusedItemIds,
    ).toContain(result?.targetId);

    expect(
      state.workspace.audit_events.at(-1),
    ).toEqual(
      expect.objectContaining({
        event_type: "FOCUS",
        actor_type: "HUMAN",
      }),
    );
  });

  it("prepares the accepted conclusion as repair target and records focus", () => {
    useWorkspaceStore
      .getState()
      .focusCustomPrimaryRisk();

    const result =
      useWorkspaceStore
        .getState()
        .prepareCustomRepairTarget();

    expect(result?.targetId).toBe(
      "CONC-USER-001",
    );

    expect(
      useWorkspaceStore
        .getState()
        .workspace.audit_events.at(-1)
        ?.metadata,
    ).toEqual(
      expect.objectContaining({
        requested_action:
          "PROPOSE_REPAIR",
        proposal_state:
          "AWAITING_AGENT",
      }),
    );
  });

  it("creates a real AGENT proposal and PROPOSE_REVISION audit event", () => {
    useWorkspaceStore
      .getState()
      .proposeAgentRevision({
        targetItemId:
          "CONC-USER-001",
        proposedText:
          "Pilot the change before replacing the current process.",
        reasonCodes: [
          "SCOPE_MISMATCH",
        ],
        affectedItemIds: [
          "C-USER-001",
          "CONC-USER-001",
        ],
      });

    const state =
      useWorkspaceStore.getState();
    const proposal =
      state.workspace.revisions.at(-1);

    expect(proposal).toEqual(
      expect.objectContaining({
        state: "PROPOSED",
        created_by: "AGENT",
      }),
    );

    expect(
      state.workspace.audit_events.at(-1)
        ?.event_type,
    ).toBe("PROPOSE_REVISION");

    expect(
      state.workspace.accepted_conclusion_id,
    ).toBe("CONC-USER-001");
  });

  it("focuses the highest-priority unresolved risk one at a time", () => {
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
            downstream_accepted_ids: ["CONC-USER-001"],
            direct_to_accepted_conclusion: true,
          },
          {
            item_id: "E-USER-001",
            state: "REVIEW",
            weakness_score_internal: 3,
            impact_score_internal: 2,
            priority_score_internal: 6,
            reason_codes: ["SOURCE_QUALITY_UNCLEAR"],
            downstream_accepted_ids: ["C-USER-001", "CONC-USER-001"],
            direct_to_accepted_conclusion: false,
          },
        ],
      },
    });

    const first =
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk();

    expect(first?.targetId).toBe("C-USER-001");

    useWorkspaceStore
      .getState()
      .prepareCustomRepairTarget();

    useWorkspaceStore
      .getState()
      .proposeAgentRevision({
        targetItemId:
          "CONC-USER-001",
        proposedText:
          "Limit the conclusion to the failures actually observed.",
        reasonCodes: ["OVERGENERALIZATION"],
        affectedItemIds: [
          "C-USER-001",
          "CONC-USER-001",
        ],
      });

    useWorkspaceStore
      .getState()
      .rejectLatestRevision();

    const second =
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk();

    expect(second?.targetId).toBe("E-USER-001");
  });

  it("repairs the accepted conclusion while preserving the focused risk as context", () => {
    const current =
      useWorkspaceStore.getState().workspace;

    useWorkspaceStore.setState({
      workspace: {
        ...current,
        triage_records: [
          {
            item_id: "E-USER-001",
            state: "CRITICAL",
            weakness_score_internal: 3,
            impact_score_internal: 3,
            priority_score_internal: 9,
            reason_codes: ["SOURCE_QUALITY_UNCLEAR"],
            downstream_accepted_ids: ["C-USER-001", "CONC-USER-001"],
            direct_to_accepted_conclusion: false,
          },
        ],
      },
    });

    useWorkspaceStore
      .getState()
      .focusCustomPrimaryRisk();

    const repair =
      useWorkspaceStore
        .getState()
        .prepareCustomRepairTarget();

    expect(repair?.targetId).toBe(
      "CONC-USER-001",
    );

    expect(
      useWorkspaceStore
        .getState()
        .workspace.audit_events.at(-1)?.metadata,
    ).toEqual(
      expect.objectContaining({
        requested_action:
          "PROPOSE_REPAIR",
        primary_risk_id:
          "E-USER-001",
        repair_target_id:
          "CONC-USER-001",
      }),
    );
  });

  it("does not move to another risk while a proposal is still waiting for human review", () => {
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
            downstream_accepted_ids: ["CONC-USER-001"],
            direct_to_accepted_conclusion: true,
          },
          {
            item_id: "E-USER-001",
            state: "REVIEW",
            weakness_score_internal: 3,
            impact_score_internal: 2,
            priority_score_internal: 6,
            reason_codes: ["SOURCE_QUALITY_UNCLEAR"],
            downstream_accepted_ids: ["C-USER-001", "CONC-USER-001"],
            direct_to_accepted_conclusion: false,
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

    useWorkspaceStore
      .getState()
      .proposeAgentRevision({
        targetItemId:
          "CONC-USER-001",
        proposedText:
          "Limit the conclusion to the failures actually observed.",
        reasonCodes: ["OVERGENERALIZATION"],
        affectedItemIds: [
          "C-USER-001",
          "CONC-USER-001",
        ],
      });

    expect(
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk(),
    ).toBeNull();
  });

  it("uses the repaired item type when a non-conclusion revision is accepted", () => {
    useWorkspaceStore
      .getState()
      .proposeAgentRevision({
        targetItemId: "E-USER-001",
        proposedText:
          "Treat this as evidence from three recent releases only.",
        reasonCodes: ["SCOPE_MISMATCH"],
        affectedItemIds: ["E-USER-001"],
      });

    useWorkspaceStore
      .getState()
      .acceptLatestRevision();

    const workspace =
      useWorkspaceStore.getState().workspace;

    const replacement =
      workspace.items.find(
        (item) =>
          item.supersedes_id === "E-USER-001",
      );

    expect(replacement?.type).toBe("EVIDENCE");
    expect(replacement?.id.startsWith("E-")).toBe(true);
  });


  it("does not reuse stale semantic triage after an accepted repair", () => {
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
            downstream_accepted_ids: ["CONC-USER-001"],
            direct_to_accepted_conclusion: true,
          },
          {
            item_id: "E-USER-001",
            state: "REVIEW",
            weakness_score_internal: 3,
            impact_score_internal: 2,
            priority_score_internal: 6,
            reason_codes: ["SOURCE_QUALITY_UNCLEAR"],
            downstream_accepted_ids: ["C-USER-001", "CONC-USER-001"],
            direct_to_accepted_conclusion: false,
          },
        ],
        audit_events: [
          ...current.audit_events,
          {
            event_id: "AUD-TRIAGE-CUSTOM",
            event_type: "TRIAGE",
            timestamp: "2026-09-02T09:00:00+07:00",
            actor_type: "SYSTEM",
            entity_ids: [
              "C-USER-001",
              "E-USER-001",
            ],
            metadata: {
              triage_count: 2,
            },
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

    useWorkspaceStore
      .getState()
      .proposeAgentRevision({
        targetItemId:
          "CONC-USER-001",
        proposedText:
          "Limit the conclusion to the failures actually observed.",
        reasonCodes: ["OVERGENERALIZATION"],
        affectedItemIds: [
          "C-USER-001",
          "CONC-USER-001",
        ],
      });

    useWorkspaceStore
      .getState()
      .acceptLatestRevision();

    expect(
      useWorkspaceStore
        .getState()
        .focusCustomPrimaryRisk(),
    ).toBeNull();
  });


  it("repairs the accepted conclusion while retaining the focused primary risk as context", () => {
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

    const result =
      useWorkspaceStore
        .getState()
        .prepareCustomRepairTarget();

    const state =
      useWorkspaceStore.getState();

    expect(result?.targetId).toBe(
      "CONC-USER-001",
    );
    expect(
      state.ui.selectedItemId,
    ).toBe("CONC-USER-001");
    expect(
      state.ui.focusedItemIds,
    ).toContain("C-USER-001");
    expect(
      state.workspace.audit_events.at(-1)
        ?.metadata,
    ).toEqual(
      expect.objectContaining({
        primary_risk_id:
          "C-USER-001",
        repair_target_id:
          "CONC-USER-001",
      }),
    );
  });

  it("writes primary-risk context into the proposal audit event", () => {
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

    useWorkspaceStore
      .getState()
      .proposeAgentRevision({
        targetItemId:
          "CONC-USER-001",
        proposedText:
          "Narrow the conclusion to the observed evidence.",
        reasonCodes: [
          "OVERGENERALIZATION",
        ],
        affectedItemIds: [
          "CONC-USER-001",
        ],
      });

    const event =
      [...useWorkspaceStore
        .getState()
        .workspace.audit_events]
        .reverse()
        .find(
          (candidate) =>
            candidate.event_type ===
            "PROPOSE_REVISION",
        );

    expect(event?.metadata).toEqual(
      expect.objectContaining({
        primary_risk_id:
          "C-USER-001",
        repair_target_id:
          "CONC-USER-001",
      }),
    );
  });

});
