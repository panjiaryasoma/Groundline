import type { WebMCPToolDefinition } from "../modelContext";
import { GroundlineError } from "../../domain/errors";
import {
  getDownstreamDependencies,
  getUpstreamDependencies,
} from "../../domain/dependencies";
import { assertActiveGroundlineWorkspace } from "../activeWorkspace";

const DEFAULT_MAX_DEPTH = 8;
const DEFAULT_MAX_NODES = 25;
const MAX_DEPTH = 20;
const MAX_NODES = 50;

function requireItemId(input: any): string {
  const value = input?.item_id;

  if (typeof value !== "string" || !value.trim()) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "trace_dependencies requires a non-empty item_id.",
    );
  }

  return value.trim();
}

function requireDirection(
  input: any,
): "UPSTREAM" | "DOWNSTREAM" {
  const value = input?.direction;

  if (value !== "UPSTREAM" && value !== "DOWNSTREAM") {
    throw new GroundlineError(
      "INVALID_INPUT",
      "trace_dependencies direction must be UPSTREAM or DOWNSTREAM.",
    );
  }

  return value;
}

function parseBoundedInteger(
  value: unknown,
  fallback: number,
  max: number,
  field: string,
): number {
  if (value == null) {
    return fallback;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > max
  ) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `${field} must be an integer between 1 and ${max}.`,
    );
  }

  return value;
}

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
          minLength: 1,
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
          maximum: MAX_DEPTH,
          default: DEFAULT_MAX_DEPTH,
        },
        max_nodes: {
          type: "integer",
          minimum: 1,
          maximum: MAX_NODES,
          default: DEFAULT_MAX_NODES,
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
        assertActiveGroundlineWorkspace()
          .workspace;
      const itemId = requireItemId(input);
      const direction =
        requireDirection(input);
      const options = {
        maxDepth: parseBoundedInteger(
          input?.max_depth,
          DEFAULT_MAX_DEPTH,
          MAX_DEPTH,
          "max_depth",
        ),
        maxNodes: parseBoundedInteger(
          input?.max_nodes,
          DEFAULT_MAX_NODES,
          MAX_NODES,
          "max_nodes",
        ),
      };

      return direction === "UPSTREAM"
        ? getUpstreamDependencies(
            workspace,
            itemId,
            options,
          )
        : getDownstreamDependencies(
            workspace,
            itemId,
            options,
          );
    },
  };
}
