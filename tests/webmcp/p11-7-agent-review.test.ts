import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { installP111RepairLifecycle } from "../../src/state/p111RepairLifecycle";
import { installP112CustomSemanticGate } from "../../src/state/p112CustomSemanticGate";
import {
  addP114ReasoningItem,
  getP114UnlinkedReasoningItemIds,
} from "../../src/state/p114AddReasoningItem";
import {
  clearP117AgentReviewState,
  requestP117AgentReview,
  useP117AgentReviewStore,
} from "../../src/state/p117AgentReview";
import { applyP117ApprovedRelations } from "../../src/state/p117RelationReview";
import { useWorkspaceStore } from "../../src/state/workspaceStore";
import {
  createGroundlineExtensionTools,
  createVerticalSliceTools,
} from "../../src/webmcp/registerTools";
import { buildSemanticReviewToken } from "../../src/webmcp/semanticReviewContract";
import { P0_TOOL_NAMES } from "../../src/webmcp/toolSchemas";

const customInput = {
  question:
    "Should we replace tier-1 human support with an autonomous agent next quarter?",
  conclusion:
    "Yes, replace tier-1 support next quarter.",
  reason:
    "The internal pilot resolved most common tickets quickly.",
  assumption:
    "The pilot reflects production edge cases.",
  evidence:
    "A 30-day pilot covered 5,000 interactions.",
};

function proposeRelationsTool() {
  return createGroundlineExtensionTools().find(
    (tool) => tool.name === "propose_relations",
  )!;
}

describe("P11.7 WebMCP-native semantic review", () => {
  beforeAll(() => {
    installP111RepairLifecycle();
    installP112CustomSemanticGate();
  });

  beforeEach(() => {
    clearP117AgentReviewState();
    useWorkspaceStore
      .getState()
      .createCustomWorkspace(customInput);
  });

  it("preserves the frozen nine P0 tools and registers relation proposal only as a P11 extension", () => {
    expect(
      createVerticalSliceTools().map((tool) => tool.name),
    ).toEqual([...P0_TOOL_NAMES]);
    expect(
      createGroundlineExtensionTools().map((tool) => tool.name),
    ).toEqual(["propose_relations"]);
  });

  it("creates a current human review request without running or bundling a page-local AI model", () => {
    addP114ReasoningItem({
      type: "COUNTERCLAIM",
      text: "The pilot excluded escalations and complex account recovery.",
    });

    const request = requestP117AgentReview();

    expect(request.reviewToken).toBe(
      buildSemanticReviewToken(
        useWorkspaceStore.getState().workspace,
      ),
    );
    expect(request.unlinkedItemIds).toContain("CC-USER-001");
    expect(request.targetItemIds).toContain("CC-USER-001");
    expect(useP117AgentReviewStore.getState().proposalBatch).toBeNull();
  });

  it("lets the WebMCP agent propose bounded relations without mutating canonical relations", () => {
    addP114ReasoningItem({
      type: "COUNTERCLAIM",
      text: "The pilot excluded escalations and complex account recovery.",
    });

    const workspace = useWorkspaceStore.getState().workspace;
    const beforeRelationCount = workspace.relations.length;
    const token = buildSemanticReviewToken(workspace);

    const result = proposeRelationsTool().execute({
      review_token: token,
      proposals: [
        {
          from_id: "CC-USER-001",
          to_id: "C-USER-001",
          type: "CHALLENGES",
          rationale:
            "The added counterclaim directly challenges the pilot-based claim.",
        },
      ],
    }) as any;

    expect(result).toMatchObject({
      status: "AWAITING_HUMAN_APPROVAL",
      canonical_relations_changed: false,
      accepted_knowledge_changed: false,
      human_approval_required: true,
    });
    expect(
      useWorkspaceStore.getState().workspace.relations,
    ).toHaveLength(beforeRelationCount);
    expect(
      useP117AgentReviewStore.getState().proposalBatch?.proposals,
    ).toHaveLength(1);
  });

  it("commits only human-approved relation proposals and invalidates stale semantic analysis", () => {
    addP114ReasoningItem({
      type: "COUNTERCLAIM",
      text: "The pilot excluded escalations and complex account recovery.",
    });

    const token = buildSemanticReviewToken(
      useWorkspaceStore.getState().workspace,
    );

    proposeRelationsTool().execute({
      review_token: token,
      proposals: [
        {
          from_id: "CC-USER-001",
          to_id: "C-USER-001",
          type: "CHALLENGES",
          rationale: "Human should decide whether to accept this line.",
        },
      ],
    });

    const proposal =
      useP117AgentReviewStore.getState().proposalBatch!.proposals[0];
    const relationIds = applyP117ApprovedRelations([proposal], token);
    const workspace = useWorkspaceStore.getState().workspace;

    expect(relationIds).toHaveLength(1);
    expect(
      workspace.relations.find((relation) => relation.id === relationIds[0]),
    ).toMatchObject({
      from_id: "CC-USER-001",
      to_id: "C-USER-001",
      type: "CHALLENGES",
      created_by: "HUMAN",
    });
    expect(
      getP114UnlinkedReasoningItemIds(workspace),
    ).not.toContain("CC-USER-001");
    expect(workspace.evaluations).toEqual([]);
    expect(workspace.triage_records).toEqual([]);
    expect(workspace.audit_events.at(-1)?.metadata).toMatchObject({
      proposal_source: "WEBMCP_AGENT",
      human_approved: true,
      semantic_analysis_invalidated: true,
    });
  });

  it("rejects stale relation proposals before any pending or canonical relation state changes", () => {
    addP114ReasoningItem({
      type: "COUNTERCLAIM",
      text: "The pilot excluded escalations.",
    });

    const staleToken = buildSemanticReviewToken(
      useWorkspaceStore.getState().workspace,
    );

    addP114ReasoningItem({
      type: "EVIDENCE",
      text: "A later escalation audit found a different failure rate.",
    });

    expect(() =>
      proposeRelationsTool().execute({
        review_token: staleToken,
        proposals: [
          {
            from_id: "CC-USER-001",
            to_id: "C-USER-001",
            type: "CHALLENGES",
            rationale: "This proposal came from an older graph.",
          },
        ],
      }),
    ).toThrow(/stale/i);

    expect(
      useP117AgentReviewStore.getState().proposalBatch,
    ).toBeNull();
  });
});
