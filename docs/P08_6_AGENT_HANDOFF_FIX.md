# P-08.6 — Agent Handoff + Regression Cleanup

## Product correction

`WEBMCP DETECTED` means the page successfully registered WebMCP tools.
It does **not** mean an AI agent is running in the background.

Groundline therefore no longer shows a misleading indefinite
`Waiting for agent proposal` state.

After the human prepares a repair target, the Revision panel now says:

- Ready for WebMCP agent
- nothing is running in the background
- a WebMCP-aware agent must inspect the page and call `propose_revision`
- an explicit natural-language handoff prompt is shown

## Correct WebMCP workflow

1. Groundline exposes tools.
2. A WebMCP-aware agent discovers them.
3. Agent calls `inspect_workspace`.
4. Agent may call `triage_workspace`.
5. Agent focuses the chosen reasoning risk.
6. Agent calls `propose_revision`.
7. Groundline renders the proposal.
8. Human accepts, edits, rejects, or defers.

## Semantic correction

The local structural fallback is not treated as immutable semantic truth.

If an agent performs a later FOCUS after the human prepared the repair target,
that later agent focus becomes the effective primary-risk context for the
proposal. The accepted conclusion remains the repair target.

## Regression cleanup

- no Node `fs/path/process` source-inspection test
- no `@types/node` dependency added
- `scrollIntoView` is guarded for jsdom
- stale copy expectations updated
- duplicate proposal-text assertions use multiple-match semantics
- seeded map tests match the current live-workspace behavior

CONTRACT CHANGE: NONE
