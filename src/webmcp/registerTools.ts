import {
  getModelContext,
  type WebMCPToolDefinition,
} from "./modelContext";
import { createInspectWorkspaceTool } from "./tools/inspectWorkspace";
import { createInspectItemTool } from "./tools/inspectItem";
import { createEvaluateItemTool } from "./tools/evaluateItem";
import { createTriageWorkspaceTool } from "./tools/triageWorkspace";
import { createTraceDependenciesTool } from "./tools/traceDependencies";
import { createFindContradictionsTool } from "./tools/findContradictions";
import { createFindEvidenceGapsTool } from "./tools/findEvidenceGaps";
import { createFocusItemsTool } from "./tools/focusItems";
import { createProposeRevisionTool } from "./tools/proposeRevision";
import { createProposeRelationsTool } from "./tools/proposeRelations";
import { P0_TOOL_NAMES } from "./toolSchemas";

export const VERTICAL_SLICE_TOOL_NAMES = [
  ...P0_TOOL_NAMES,
] as const;

export const GROUNDLINE_EXTENSION_TOOL_NAMES = [
  "propose_relations",
] as const;

export function createVerticalSliceTools():
  WebMCPToolDefinition[] {
  return [
    createInspectWorkspaceTool(),
    createInspectItemTool(),
    createEvaluateItemTool(),
    createTriageWorkspaceTool(),
    createTraceDependenciesTool(),
    createFindContradictionsTool(),
    createFindEvidenceGapsTool(),
    createFocusItemsTool(),
    createProposeRevisionTool(),
  ];
}

export function createGroundlineExtensionTools():
  WebMCPToolDefinition[] {
  return [createProposeRelationsTool()];
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
      pendingTools: [
        ...P0_TOOL_NAMES,
        ...GROUNDLINE_EXTENSION_TOOL_NAMES,
      ],
    };
  }

  const tools = [
    ...createVerticalSliceTools(),
    ...createGroundlineExtensionTools(),
  ];

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
    pendingTools: [
      ...P0_TOOL_NAMES,
      ...GROUNDLINE_EXTENSION_TOOL_NAMES,
    ].filter((name) => !registeredTools.includes(name)),
  };
}
