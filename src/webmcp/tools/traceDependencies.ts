import type { WebMCPToolDefinition } from "../modelContext";
import {
  getDownstreamDependencies,
  getUpstreamDependencies,
} from "../../domain/dependencies";
import { useWorkspaceStore } from "../../state/workspaceStore";

export function createTraceDependenciesTool(): WebMCPToolDefinition {
  return {
    name: "trace_dependencies",
    title: "Trace reasoning dependencies",
    description:
      "Trace a bounded upstream or downstream reasoning path from one Groundline knowledge item.",
    inputSchema: {
      type: "object",
      properties: {
        item_id: {
          type: "string",
          description:
            "Existing Groundline knowledge item ID.",
        },
        direction: {
          type: "string",
          enum: ["UPSTREAM", "DOWNSTREAM"],
          description:
            "Direction to traverse reasoning relations.",
        },
        max_depth: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          default: 8,
        },
        max_nodes: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          default: 25,
        },
      },
      required: ["item_id", "direction"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false,
    },
    execute(input) {
      const workspace =
        useWorkspaceStore.getState().workspace;
      const options = {
        maxDepth:
          Number(input.max_depth) || 8,
        maxNodes:
          Number(input.max_nodes) || 25,
      };

      return input.direction === "UPSTREAM"
        ? getUpstreamDependencies(
            workspace,
            String(input.item_id),
            options,
          )
        : getDownstreamDependencies(
            workspace,
            String(input.item_id),
            options,
          );
    },
  };
}
