# P-08.5 — Selection Stability Regression Fix

## Observed regression

After P-08.4, clicking a reasoning card could blank the React application.

The regression was introduced by giving the same concept two state owners:

1. ReactFlow maintained `node.selected` and emitted `onSelectionChange`.
2. Groundline maintained `ui.selectedItemId`.
3. P-08.4 added an effect that pushed `ui.selectedItemId` back into
   ReactFlow `node.selected`.
4. `onSelectionChange` could then write that selection back into the store.

That circular synchronization was unnecessary and unsafe.

## Fixed ownership

### Groundline app selection

`workspaceStore.ui.selectedItemId`

Owns:
- Inspector content
- app-selected card styling
- programmatic Focus/Repair target

### ReactFlow local selection

`node.selected`

Owns:
- Ctrl/Shift multi-selection
- Select all / Clear selection
- group dragging

The app no longer pushes `selectedItemId` into `node.selected`.

Programmatic Focus is still visually obvious through
`reasoning-node--app-selected`, while Inspector follows
`selectedItemId` directly.

## Interaction contract preserved

- Click card -> Inspector follows the clicked card.
- Click another card -> Inspector follows the new card.
- Focus primary risk -> store selection returns to the primary risk.
- Propose repair -> store selection moves to the accepted conclusion.
- ReactFlow multi-select remains independent for group movement.
- No extra semantic inference.
- No schema change.
- No new dependency.

## Test cleanup

The patch also updates tests that became stale when:
- the live workspace started showing the same item ID in both graph and Inspector;
- `inspect_workspace.ui_state` gained `primary_risk_id` and `repair_target_id`;
- the live workspace became lazy-loaded;
- proposal text could appear in more than one visible region.

CONTRACT CHANGE: NONE
