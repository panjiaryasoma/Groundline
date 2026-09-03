# P-08.8 — Programmatic Graph Selection

## User-visible bug

Groundline could say that `E-USER-001` was the focused risk while ReactFlow
still showed a previously clicked card as its one selected card.

That happened because P-08.5 intentionally separated:

- app selection (`ui.selectedItemId`) for Inspector
- ReactFlow local selection (`node.selected`) for multi-select and group drag

The separation prevented the P-08.4 blank-screen feedback loop, but it also
meant programmatic Focus no longer commanded ReactFlow's visible selection.

## Fix

A versioned one-way `graphSelectionRequest` is now part of ephemeral UI state.

Programmatic actions increment the version and specify exactly one card:

- Run analysis -> review target
- Focus primary risk -> primary risk
- Propose repair -> accepted conclusion
- agent proposal -> repair target
- Accept / Accept edited -> newly accepted replacement card
- seeded demo equivalents -> same behavior

`ReasoningGraph` reacts only to the request version and applies an exclusive
ReactFlow selection.

Normal user selection does NOT increment this command version.

Therefore:

- programmatic Focus can select the exact named card
- `1 selected` matches the focused card
- Inspector matches the same card
- Ctrl/Shift manual multi-selection still works
- there is no external-selectedItemId <-> ReactFlow feedback loop

## P-06 parity

P-06 used one visible selected reasoning object.
P-08.8 restores that observable behavior while retaining P-08's draggable and
multi-select graph.

## Stale test cleanup from P-08.7

The user's local P-08.7 run showed:
- typecheck PASS
- build PASS
- 147/149 tests PASS

The two failures were stale expectations:
1. Inspector still expected a pre-P-08.7 `Repair requested` waiting state.
2. A component-isolation test clicked a disabled repair button because its mocked
   Focus callback did not mutate the workspace prop like the real store does.

They are updated to test the current immediate-proposal lifecycle.

CONTRACT CHANGE: NONE
