# P-06.5.1 TEST ALIGNMENT

P-06.5 runtime behavior is not changed by this patch.

The local run showed:

- typecheck: PASS
- build: PASS
- bundle split: PASS
- post-acceptance graph regression: PASS
- 94 / 96 tests PASS

The remaining two failures were obsolete test expectations.

## Fix 1 — lazy map assertion

`ExpandedReasoningMap` is intentionally loaded with `React.lazy()`.

The old test clicked `Expand full map` and immediately called `getByText("Full reasoning structure")`, which assumes synchronous rendering.

The assertion now uses `await findByText(...)` before checking the React Flow surface.

## Fix 2 — P-06.4 completion copy

An older test still expected:

`Not re-evaluated yet`

P-06.5 intentionally replaced that ambiguous wording with:

`Fresh reasoning review needed`

and explicitly states that Groundline does not inherit previous evidence relationships or analysis automatically.

The test now verifies the active P-06.5 semantics and the `Review evidence links` next action.

## Contract evaluation

No production/runtime code changed.

- schema: unchanged
- authority boundary: unchanged
- graph behavior: unchanged
- revision semantics: unchanged
- evaluation semantics: unchanged
- WebMCP scope: unchanged

**CONTRACT CHANGE: NONE**

Expected local result after this patch: **96 / 96 PASS**
