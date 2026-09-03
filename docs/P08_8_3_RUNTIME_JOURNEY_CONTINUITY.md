# P-08.8.3 — Runtime Journey Continuity

## Why this patch exists

P-08.8.2 proved the five P-08 WebMCP tools can be discovered and invoked individually in Chrome.

Manual runtime testing then exposed three integration problems that the unit suite did not cover:

1. WebMCP tools could operate on the seeded Integration 001 workspace while the visible UI was still START/INTAKE.
2. `focus_items` did not survive into `inspect_workspace` as semantic primary-risk context.
3. `propose_revision` could create a valid proposal but lose the prior focused risk / repair-target context.

The result was a technically valid individual tool call sequence that did not behave like one continuous visible agent journey.

## Contract-preserving fix

### 1. Visible active workspace boundary

All five registered P-08 tools now require the visible experience mode to be:

- `DEMO`, or
- `CUSTOM`.

`START` and `INTAKE` remain tool-discoverable but execution returns an explicit error:

> No active Groundline workspace. Open the seeded example or create your own reasoning workspace before using WebMCP tools.

This prevents an agent from silently operating on Integration 001 while the human sees an empty intake screen.

### 2. Explicit review context derivation

`src/state/reviewContext.ts` derives:

- `primary_focus_id`
- `primary_risk_id`
- `repair_target_id`

from the real audit trail.

An AGENT focus is only promoted to `primary_risk_id` when the focused item has semantic triage state `CRITICAL` or `REVIEW`.

That keeps the distinction between generic focus and semantic risk.

### 3. Focus → proposal handoff

`proposeAgentRevision()` now reads the latest AGENT focus even when there is no prior HUMAN `PROPOSE_REPAIR` preparation event.

The proposal audit event preserves:

- `primary_focus_id`
- `primary_risk_id` when semantically justified
- `repair_target_id`
- `proposal_source = WEBMCP_AGENT`

If a HUMAN already prepared a repair target, the WebMCP proposal must still target that same item.

### 4. UI selection after semantic triage

`applyAgentEvaluations()` now issues a graph-selection command for the highest-priority review target.

This keeps:

- Zustand selected item
- ReactFlow selected card
- Inspector

aligned after a WebMCP semantic review.

### 5. Registration abort fix included

This full artifact also includes the current P08 GitHub abort-safe `useGroundlineWebMCP()` implementation so React StrictMode cleanup does not leak an unhandled `AbortError`.

## Expected runtime sequence

Run the entire sequence without reload/reset while the seeded example is visibly open:

1. `inspect_workspace`
2. `triage_workspace`
3. `trace_dependencies`
4. `focus_items`
5. `propose_revision`
6. `inspect_workspace`

Expected final state:

```text
experience_mode:    DEMO
selected_item_id:   CONC-001
focused_item_ids:   A-001, C-001, CONC-001
primary_focus_id:   A-001
primary_risk_id:    A-001
repair_target_id:   CONC-001

evaluations:        4
triage:             4
revisions:          1
audit_events:       4

audit:
EVALUATE
TRIAGE
FOCUS
PROPOSE_REVISION
```

The accepted conclusion must still be `CONC-001` until a HUMAN chooses Accept / Accept edited / Reject / Defer.

## Non-goals

This patch does **not**:

- add the four P-09 tools;
- add localStorage persistence;
- automatically inherit semantic relations after revision acceptance;
- let an agent accept knowledge;
- merge P08 into main.

## Contract evaluation

- Agent proposes, human decides: preserved.
- Priority is not truth/confidence: preserved.
- No automatic semantic rewiring: preserved.
- WebMCP works only against the visible active reasoning workspace: strengthened.
- Agent focus is not mislabeled as semantic risk without triage: strengthened.
- Full P0 WebMCP surface: still pending P-09.

CONTRACT CHANGE: NONE.
