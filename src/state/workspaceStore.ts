import { create } from "zustand";
import { integration001 } from "../fixtures/integration001";
import type { Workspace } from "../domain/schema";

interface EphemeralUiState {
  selectedItemId: string | null;
  focusedItemIds: string[];
}

interface WorkspaceState {
  workspace: Workspace;
  ui: EphemeralUiState;
  resetDemo: () => void;
  selectItem: (itemId: string | null) => void;
  focusItems: (itemIds: string[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: structuredClone(integration001),
  ui: {
    selectedItemId: null,
    focusedItemIds: [],
  },
  resetDemo: () =>
    set({
      workspace: structuredClone(integration001),
      ui: { selectedItemId: null, focusedItemIds: [] },
    }),
  selectItem: (itemId) =>
    set((state) => ({
      ui: { ...state.ui, selectedItemId: itemId },
    })),
  focusItems: (itemIds) =>
    set((state) => ({
      ui: { ...state.ui, focusedItemIds: [...itemIds] },
    })),
}));
