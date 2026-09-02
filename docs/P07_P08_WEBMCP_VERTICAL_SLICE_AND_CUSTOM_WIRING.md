# P-07/P-08 WEBMCP VERTICAL SLICE + CUSTOM ACTION WIRING

## Root cause

The custom UI had buttons for semantic operations before the state transitions and WebMCP tools behind them existed.

That created three false affordances:

1. `Focus primary risk` changed only component-local copy.
2. `Propose repair` opened a placeholder but created no revision.
3. Human-decision buttons appeared before there was a proposal, so they could only be disabled.

The graph also did not visually reflect application-driven selection because React Flow's local multi-selection and the app's `selectedItemId` were not represented by the same visual class.

## Correct fix

This milestone wires the underlying vertical slice instead of adding more decorative button state.

### Local UI focus

`Focus primary risk` now:

- uses semantic triage if it exists;
- otherwise selects a deterministic structural review target;
- records a `FOCUS` audit event;
- updates `selectedItemId`;
- updates `focusedItemIds`;
- opens the reasoning map;
- opens inspector/audit details.

The structural fallback is explicitly not a truth or semantic-risk score.

### Repair preparation

Clicking `Propose repair` before an agent proposal exists now:

- selects the accepted conclusion as the repair target;
- records a `FOCUS` event with `proposal_state: AWAITING_AGENT`;
- opens the map + inspector;
- does NOT create a fake revision.

Human-decision controls are not shown while the proposal does not exist.

### Real proposal

The WebMCP `propose_revision` tool now creates an actual revision through the existing domain revision engine.

Result:

- revision state = `PROPOSED`
- `created_by = AGENT`
- audit event = `PROPOSE_REVISION`
- accepted conclusion remains unchanged
- target becomes selected/focused in the UI

When that revision appears, the custom Human Decision section automatically becomes active:

- Use suggestion
- Edit first
- Keep current conclusion
- Decide later

All four call the existing HUMAN-authority revision transitions.

### Graph selection

Programmatic `selectedItemId` is now rendered with an explicit application-selected node class.

This does not reuse React Flow's local `selected` flag, because doing so would break `Select all` and grouped drag.

`Select all` also no longer calls `onSelectItem`, preventing the parent selection update from immediately collapsing the multi-selection.

## WebMCP vertical slice

The postponed P-07/P-08 contract slice is now implemented.

Registered tools:

1. `inspect_workspace`
2. `triage_workspace`
3. `trace_dependencies`
4. `focus_items`
5. `propose_revision`

Pending P-09 tools:

- `inspect_item`
- `evaluate_item`
- `find_contradictions`
- `find_evidence_gaps`

### triage_workspace

The external agent supplies evaluation dimensions.

Groundline:

- validates those records;
- marks them `generated_by = AGENT`;
- computes deterministic triage locally;
- records `EVALUATE` and `TRIAGE` audit events.

The agent does natural-language reasoning; Groundline owns deterministic prioritization mechanics.

### focus_items

Mutates UI focus/selection and records `FOCUS`.

### propose_revision

Creates only `PROPOSED`.

It cannot accept or replace accepted knowledge.

## WebMCP API correctness

Registration uses the current imperative API:

`document.modelContext.registerTool(...)`

with AbortSignal-bound lifecycle registration and a short retry window for late API injection.

## Contract evaluation

- exactly frozen P0 tool names retained
- P-07/P-08 implements only the contracted five-tool vertical slice
- accepted knowledge authority remains HUMAN
- agent proposal starts PROPOSED
- no local semantic LLM added
- no automatic semantic rewiring
- bounded workspace/dependency output
- untrusted content annotations applied to content-bearing tools

**CONTRACT CHANGE: NONE**

## Expected runtime

Previous expected tests: 119

Added:
- 3 custom state/action tests
- 5 WebMCP vertical-slice tests
- 1 actual-proposal custom UI test

Expected total: **128 tests**
