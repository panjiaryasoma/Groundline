import type { WebMCPToolDefinition } from "../modelContext";
import { useWorkspaceStore } from "../../state/workspaceStore";
import { assertActiveGroundlineWorkspace } from "../activeWorkspace";

export function createProposeRevisionTool(): WebMCPToolDefinition {
  return {
    name: "propose_revision",
    title: "Propose Groundline revision",
    description:
      "Create a PROPOSED revision for an existing ACCEPTED Groundline item after inspecting and, when needed, triaging the active workspace. The latest semantic agent focus is preserved as primary-risk context. If a human already prepared a repair target, the proposal must target that same item. Never accept knowledge; a human reviews the proposal.",
    inputSchema: {
      type: "object",
      properties: {
        target_item_id: {
          type: "string",
          description:
            "Existing ACCEPTED item to revise.",
        },
        proposed_text: {
          type: "string",
          minLength: 3,
          description:
            "Suggested replacement wording.",
        },
        reason_codes: {
          type: "array",
          items: { type: "string" },
          maxItems: 20,
        },
        affected_item_ids: {
          type: "array",
          items: { type: "string" },
          maxItems: 50,
          uniqueItems: true,
        },
      },
      required: [
        "target_item_id",
        "proposed_text",
        "reason_codes",
        "affected_item_ids",
      ],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
    },
    execute(input) {
      assertActiveGroundlineWorkspace();

      useWorkspaceStore
        .getState()
        .proposeAgentRevision({
          targetItemId: String(
            input.target_item_id,
          ),
          proposedText: String(
            input.proposed_text,
          ),
          reasonCodes: Array.isArray(
            input.reason_codes,
          )
            ? input.reason_codes.map(String)
            : [],
          affectedItemIds: Array.isArray(
            input.affected_item_ids,
          )
            ? input.affected_item_ids.map(
                String,
              )
            : [],
        });

      const workspace =
        useWorkspaceStore.getState().workspace;
      const proposal =
        [...workspace.revisions]
          .reverse()
          .find(
            (revision) =>
              revision.state === "PROPOSED",
          );

      return {
        proposal,
        accepted_conclusion_id:
          workspace.accepted_conclusion_id,
        knowledge_changed: false,
        human_review_required: true,
        audit_event:
          "PROPOSE_REVISION",
      };
    },
  };
}
