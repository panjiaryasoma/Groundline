# P-08.8.2 — Test Type Repair

## Problem

P-08.8.1 fixed the runtime migration boundary by making `graphSelectionRequest` optional for legacy UI-state fixtures. That exposed two test-only TypeScript issues:

1. New assertions dereferenced the optional migration field without first proving it exists.
2. `graph-interaction.test.ts` called `selectSingleGraphNode` without importing it, even though the helper is correctly exported by the graph barrel.

These are test harness/type errors, not runtime UI regressions.

## Fix

- Assert `graphSelectionRequest` exists before dereferencing it in the new programmatic-selection tests.
- Import `selectSingleGraphNode` from the graph barrel.
- Preserve P-08.8 runtime behavior and all active Groundline contracts.

## Contract evaluation

- Agent proposes. Human decides: unchanged.
- No automatic semantic rewiring: unchanged.
- Programmatic focus selects exactly one named card: unchanged.
- Manual graph selection remains independent: unchanged.

No product/domain contract change.
