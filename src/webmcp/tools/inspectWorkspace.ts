import type { WebMCPToolDefinition } from "../modelContext";
import { useWorkspaceStore } from "../../state/workspaceStore";

const MAX_ITEMS = 12;
const MAX_TRIAGE = 8;
const MAX_REVISIONS = 6;

export function createInspectWorkspaceTool(): WebMCPToolDefinition {
  return {
    name: "inspect_workspace",
    title: "Inspect Groundline workspace",
    description:
      "Read a bounded summary of the active Groundline reasoning workspace, including accepted conclusion, reasoning items, triage and revision state.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
    execute() {
      const state =
        useWorkspaceStore.getState();
      const workspace =
        state.workspace;

      const acceptedConclusion =
        workspace.items.find(
          (item) =>
            item.id ===
            workspace.accepted_conclusion_id,
        );

      const repairRequest =
        [...workspace.audit_events]
          .reverse()
          .find(
            (event) =>
              event.event_type === "FOCUS" &&
              event.metadata
                ?.requested_action ===
                "PROPOSE_REPAIR",
          );

      return {
        workspace_id: workspace.workspace_id,
        title: workspace.title,
        question_id: workspace.question_id,
        ui_state: {
          selected_item_id:
            state.ui.selectedItemId,
          focused_item_ids: [
            ...state.ui.focusedItemIds,
          ],
          primary_risk_id:
            typeof repairRequest?.metadata
              ?.primary_risk_id === "string"
              ? repairRequest.metadata
                  .primary_risk_id
              : null,
          repair_target_id:
            typeof repairRequest?.metadata
              ?.repair_target_id === "string"
              ? repairRequest.metadata
                  .repair_target_id
              : null,
        },
        accepted_conclusion:
          acceptedConclusion
            ? {
                id: acceptedConclusion.id,
                text: acceptedConclusion.text,
                state: acceptedConclusion.state,
              }
            : null,
        counts: {
          items: workspace.items.length,
          relations: workspace.relations.length,
          evaluations:
            workspace.evaluations.length,
          triage:
            workspace.triage_records.length,
          revisions:
            workspace.revisions.length,
          audit_events:
            workspace.audit_events.length,
        },
        items: workspace.items
          .slice(0, MAX_ITEMS)
          .map((item) => ({
            id: item.id,
            type: item.type,
            state: item.state,
            text: item.text,
          })),
        triage: workspace.triage_records
          .slice()
          .sort(
            (a, b) =>
              (b.priority_score_internal ?? -1) -
              (a.priority_score_internal ?? -1),
          )
          .slice(0, MAX_TRIAGE),
        revisions: workspace.revisions
          .slice(-MAX_REVISIONS),
        truncated:
          workspace.items.length > MAX_ITEMS ||
          workspace.triage_records.length >
            MAX_TRIAGE ||
          workspace.revisions.length >
            MAX_REVISIONS,
      };
    },
  };
}
