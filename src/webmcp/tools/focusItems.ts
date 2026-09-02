import type { WebMCPToolDefinition } from "../modelContext";
import { GroundlineError } from "../../domain/errors";
import { getItem } from "../../domain/dependencies";
import { useWorkspaceStore } from "../../state/workspaceStore";
import { assertActiveGroundlineWorkspace } from "../activeWorkspace";

const MAX_FOCUS_ITEMS = 50;

function parseFocusInput(input: any): {
  itemIds: string[];
  primaryItemId: string;
} {
  if (!Array.isArray(input?.item_ids)) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "focus_items requires item_ids as an array.",
    );
  }

  if (
    input.item_ids.length < 1 ||
    input.item_ids.length > MAX_FOCUS_ITEMS
  ) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `focus_items requires between 1 and ${MAX_FOCUS_ITEMS} item IDs.`,
    );
  }

  const itemIds = input.item_ids.map(
    (value: unknown) => {
      if (
        typeof value !== "string" ||
        !value.trim()
      ) {
        throw new GroundlineError(
          "INVALID_INPUT",
          "focus_items item IDs must be non-empty strings.",
        );
      }

      return value.trim();
    },
  );

  if (new Set(itemIds).size !== itemIds.length) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "focus_items item_ids must be unique.",
    );
  }

  const rawPrimary = input?.primary_item_id;
  if (
    typeof rawPrimary !== "string" ||
    !rawPrimary.trim()
  ) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "focus_items requires a non-empty primary_item_id.",
    );
  }

  const primaryItemId = rawPrimary.trim();

  if (!itemIds.includes(primaryItemId)) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "primary_item_id must also appear in item_ids.",
    );
  }

  return {
    itemIds,
    primaryItemId,
  };
}

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
          maxItems: MAX_FOCUS_ITEMS,
          uniqueItems: true,
          items: {
            type: "string",
            minLength: 1,
          },
        },
        primary_item_id: {
          type: "string",
          minLength: 1,
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
      const { workspace } =
        assertActiveGroundlineWorkspace();
      const {
        itemIds,
        primaryItemId,
      } = parseFocusInput(input);

      for (const itemId of itemIds) {
        getItem(workspace, itemId);
      }

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
