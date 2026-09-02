import type { WebMCPToolDefinition } from "../modelContext";
import { useWorkspaceStore } from "../../state/workspaceStore";
import { assertActiveGroundlineWorkspace } from "../activeWorkspace";

export function createFocusItemsTool(): WebMCPToolDefinition {
  return {
    name: "focus_items",
    title: "Focus Groundline items",
    description:
      "Focus existing reasoning items in the Groundline UI, select a primary item, and record a FOCUS audit event.",
    inputSchema: {
      type: "object",
      properties: {
        item_ids: {
          type: "array",
          minItems: 1,
          maxItems: 50,
          uniqueItems: true,
          items: {
            type: "string",
          },
        },
        primary_item_id: {
          type: "string",
          description:
            "Item to select in the inspector. Must also appear in item_ids.",
        },
      },
      required: [
        "item_ids",
        "primary_item_id",
      ],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: false,
    },
    execute(input) {
      assertActiveGroundlineWorkspace();

      const itemIds = Array.isArray(
        input.item_ids,
      )
        ? input.item_ids.map(String)
        : [];
      const primaryItemId = String(
        input.primary_item_id ?? "",
      );

      useWorkspaceStore
        .getState()
        .focusItemsWithAudit(
          itemIds,
          primaryItemId,
          "AGENT",
          {
            source: "WEBMCP",
          },
        );

      return {
        selected_item_id: primaryItemId,
        focused_item_ids: itemIds,
        audit_event: "FOCUS",
      };
    },
  };
}
