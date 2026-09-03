# P-08.4 — Interaction Fix

This is a corrective patch on top of P-08.3.

## Fixes

- Removed the redundant `Open map` callout.
- `Run analysis` is now the normal entry point that opens the live reasoning workspace.
- Fixed accidental duplicate declaration in `CustomWorkspaceHome`.
- Removed the stale explicit `Revision` type annotation that caused a missing-name TypeScript error.
- Replaced ES2023-only `findLastIndex` / `findLast` usage with ES2022-safe code.
- Programmatic Groundline selection is synchronized back into ReactFlow.
- ReactFlow position merging now preserves internal multi-selection state.
- Clicking another card and then `Focus primary risk` reasserts the same primary risk without writing duplicate FOCUS events.
- Repair still follows the restored P-06 semantics:
  - primary risk = reason for repair
  - accepted conclusion = revision target
- No fake semantic evaluation or fake agent proposal was added.

## Why `No pending proposal` can still be correct for custom input

The page can prepare a repair target, but WebMCP is a tool-exposure interface.
The connected browser agent must actually call `propose_revision` before a real
AGENT proposal exists. The seeded demo can create its deterministic fixture
proposal locally; arbitrary user text cannot be truthfully treated the same way
without an agent/model call.

CONTRACT CHANGE: NONE
