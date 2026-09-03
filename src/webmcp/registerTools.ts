import {
  getModelContext,
  type WebMCPToolDefinition,
} from "./modelContext";
import { createInspectWorkspaceTool } from "./tools/inspectWorkspace";
import { createTriageWorkspaceTool } from "./tools/triageWorkspace";
import { createTraceDependenciesTool } from "./tools/traceDependencies";
import { createFocusItemsTool } from "./tools/focusItems";
import { createProposeRevisionTool } from "./tools/proposeRevision";
import { P0_TOOL_NAMES } from "./toolSchemas";

export const VERTICAL_SLICE_TOOL_NAMES = [
  "inspect_workspace",
  "triage_workspace",
  "trace_dependencies",
  "focus_items",
  "propose_revision",
] as const;

export function createVerticalSliceTools():
  WebMCPToolDefinition[] {
  return [
    createInspectWorkspaceTool(),
    createTriageWorkspaceTool(),
    createTraceDependenciesTool(),
    createFocusItemsTool(),
    createProposeRevisionTool(),
  ];
}

export async function registerGroundlineTools(
  signal?: AbortSignal,
): Promise<{
  webmcpAvailable: boolean;
  registeredTools: string[];
  pendingTools: string[];
}> {
  const modelContext = getModelContext();

  if (!modelContext?.registerTool) {
    return {
      webmcpAvailable: false,
      registeredTools: [],
      pendingTools: [...P0_TOOL_NAMES],
    };
  }

  const tools = createVerticalSliceTools();

  for (const tool of tools) {
    await modelContext.registerTool(
      tool,
      signal
        ? { signal }
        : undefined,
    );
  }

  const registeredTools =
    tools.map((tool) => tool.name);

  return {
    webmcpAvailable: true,
    registeredTools,
    pendingTools:
      P0_TOOL_NAMES.filter(
        (name) =>
          !registeredTools.includes(name),
      ),
  };
}
