# P-06.5 COMPLETION, MAP REMOUNT, AND INITIAL-BUNDLE OPTIMIZATION

## Why this patch exists

Manual browser smoke after P-06.4 found a real runtime failure that the automated suite did not cover:

- after a HUMAN accepted a revision;
- the completion view was shown;
- opening reasoning history rendered the geological strata but no graph nodes.

The browser also showed the main production JavaScript chunk at roughly the Vite 500 kB warning threshold.

## Root cause: empty post-review map

`ReasoningGraph` originally lived inside a CSS grid that supplied a definite rendered height.

P-06.4 moved it into a progressively expanded standalone section. The graph container kept only a `min-height`.

The strata background belongs to the parent container, so it remained visible. React Flow, however, needs a definite viewport size for reliable measurement. This produced the misleading state where the geological bands rendered but the interactive graph did not.

## Fix

The expanded map now has a definite responsive canvas height:

- desktop: `clamp(640px, 72vh, 820px)`
- mobile: `680px`

The React Flow root is explicitly pinned to that canvas with absolute inset sizing.

No knowledge-model data is changed.

## Loading optimization

The full reasoning map, inspector, audit trail, and `@xyflow/react` dependency are no longer imported eagerly into the default workspace path.

They are loaded through `React.lazy()` only when the user expands the full reasoning structure.

This is a real initial-load optimization, not a warning-threshold disguise:

- normal decision/check/revision UX does not need to download/execute the full interactive graph immediately;
- the graph chunk is requested only when the user asks for it;
- a small accessible loading state is shown while the chunk resolves.

Local Vite build output must be used to record exact post-split chunk sizes.

## Completion hierarchy fix

The accepted conclusion is no longer rendered as a giant page headline.

Completion now shows:

1. review outcome;
2. concise completion headline;
3. accepted conclusion in a bounded card;
4. status/history cards;
5. an explicit next step.

## Correct completion semantics

P-06.4 used the same `Not re-evaluated yet` message for every terminal proposal state.

That was incorrect.

### ACCEPTED / EDITED_AND_ACCEPTED

Accepted knowledge changed.

Groundline now says:

- `Fresh reasoning review needed`
- prior evidence relationships are not inherited;
- `Review evidence links` opens the full map and selects the new accepted conclusion.

### REJECTED

Accepted knowledge did not change.

Groundline now says:

- `Accepted reasoning unchanged`
- `Proposal rejected`
- no false replacement/re-evaluation warning.

### DEFERRED

Accepted knowledge did not change.

Groundline now says:

- `The review is paused`
- `Proposal deferred`
- no false replacement/re-evaluation warning.

## Contract evaluation

- schema: unchanged
- accepted-knowledge authority: unchanged
- triage semantics: unchanged
- relation semantics: unchanged
- no automatic semantic rewiring: preserved
- source provenance: unchanged
- audit history: unchanged
- graph positions: UI-only
- WebMCP scope: unchanged

**CONTRACT CHANGE: NONE**

## Regression coverage

Added 4 regression tests:

1. post-acceptance history map contains both superseded and current accepted conclusions;
2. accepted revision presents an explicit fresh-review next step;
3. rejected revision does not falsely create an unevaluated replacement state;
4. deferred revision does not falsely create an unevaluated replacement state.

The existing full-map test is now asynchronous to cover the lazy-loaded graph chunk.

Previous total: 92 tests  
Expected total: **96 tests**
