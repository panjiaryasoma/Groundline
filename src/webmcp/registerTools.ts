import { getModelContext } from "./modelContext";
import { P0_TOOL_NAMES } from "./toolSchemas";

/**
 * Scaffold only.
 *
 * Contract evaluation:
 * - tool names are frozen
 * - no tool is registered yet because semantic implementations have not
 *   passed their acceptance tests
 * - actual imperative WebMCP definitions arrive in P-07/P-08
 */
export function registerGroundlineTools(): {
  webmcpAvailable: boolean;
  registeredTools: string[];
  pendingTools: readonly string[];
} {
  const modelContext = getModelContext();

  return {
    webmcpAvailable: Boolean(modelContext?.registerTool),
    registeredTools: [],
    pendingTools: P0_TOOL_NAMES,
  };
}
