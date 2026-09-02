import type {
  Workspace,
} from "../domain/schema";
import {
  useWorkspaceStore,
  type ExperienceMode,
} from "../state/workspaceStore";

export interface ActiveGroundlineWorkspaceState {
  experienceMode: "DEMO" | "CUSTOM";
  workspace: Workspace;
  ui: {
    selectedItemId: string | null;
    focusedItemIds: string[];
  };
}

const ACTIVE_MODES =
  new Set<ExperienceMode>([
    "DEMO",
    "CUSTOM",
  ]);

export function assertActiveGroundlineWorkspace():
  ActiveGroundlineWorkspaceState {
  const state =
    useWorkspaceStore.getState();

  if (
    !ACTIVE_MODES.has(
      state.experienceMode,
    )
  ) {
    throw new Error(
      "No active Groundline workspace. Open the seeded example or create your own reasoning workspace before using WebMCP tools.",
    );
  }

  return {
    experienceMode:
      state.experienceMode as
        "DEMO" | "CUSTOM",
    workspace: state.workspace,
    ui: {
      selectedItemId:
        state.ui.selectedItemId,
      focusedItemIds: [
        ...state.ui.focusedItemIds,
      ],
    },
  };
}
