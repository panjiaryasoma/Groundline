export const P0_TOOL_NAMES = [
  "inspect_workspace",
  "inspect_item",
  "evaluate_item",
  "triage_workspace",
  "trace_dependencies",
  "find_contradictions",
  "find_evidence_gaps",
  "focus_items",
  "propose_revision",
] as const;

export type P0ToolName = (typeof P0_TOOL_NAMES)[number];
