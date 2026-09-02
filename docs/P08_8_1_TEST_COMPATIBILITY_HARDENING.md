# P-08.8.1 — Test Compatibility Hardening

## What failed

P-08.8 fixed the real UI behavior, but introduced a new required ephemeral UI field:
`graphSelectionRequest`. Older tests and snapshots intentionally replace the whole `ui` object
with the pre-P-08.8 shape (`selectedItemId` + `focusedItemIds`).

That produced one root failure:

`ui.graphSelectionRequest.version` -> `Cannot read properties of undefined`

The 28 failing tests were mostly cascade failures from that one migration issue, not 28
independent product regressions.

Two smaller integration mistakes were also present:

1. `FocusWorkspace.tsx` referenced `GraphSelectionRequest` without importing the type.
2. `selectSingleGraphNode` existed in `graphInteraction.ts` but was not exported by the graph barrel,
   while the tests import helpers from `src/components/graph`.

## Fix

- `graphSelectionRequest` is optional in ephemeral UI state for backwards-compatible snapshots.
- `nextGraphSelectionRequest()` treats a missing prior request as version 0.
- graph component props accept an omitted request and normalize it to `{ itemId: null, version: 0 }`.
- App still passes the real request in normal production flow.
- the missing type import and barrel export are restored.
- one regression test explicitly proves an old UI snapshot is upgraded on the first programmatic selection command.

## Why this is safer than editing 28 tests

The old test fixtures are valid historical snapshots of ephemeral state. Making the new field
backwards-compatible fixes the state migration boundary itself. Mass-editing every fixture would
hide the brittleness rather than fix it.

## Contract evaluation

- Agent proposes, human decides: unchanged.
- Programmatic Focus selects the exact risk card: preserved.
- Repair targets accepted conclusion: preserved.
- Manual multi-select remains ReactFlow-local: preserved.
- No automatic semantic rewiring: unchanged.
- Domain schema: unchanged.

CONTRACT CHANGE: NONE
