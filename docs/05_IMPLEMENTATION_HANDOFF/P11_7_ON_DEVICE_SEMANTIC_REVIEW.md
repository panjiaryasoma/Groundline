# P11.7 — On-device semantic review path

Status: **IMPLEMENTED · VALIDATION PENDING**

## Problem

The custom `Check my own decision` flow could build a reasoning graph, but `Run analysis` only performed structural readiness. That was contractually honest, yet operationally incomplete: no semantic evaluator was invoked, so `triage_records` stayed empty and the UI could not truthfully show `CRITICAL`, `REVIEW`, or `STABLE`.

P11.5 also allowed humans to add accepted reasoning cards without inventing relations. Those cards correctly appeared as `UNLINKED`, but there was no in-page semantic reviewer capable of proposing links before fresh triage.

## Decision

P11.7 adds an **optional on-device semantic reviewer** using Chrome's built-in Prompt API / `LanguageModel` when available. Groundline remains backend-free and API-key-free.

This is progressive enhancement, not a new authority boundary:

- Local model: interprets semantic meaning and proposes structured findings.
- Groundline: validates structure, review-token freshness, exact batch coverage, and deterministic triage.
- Human: approves semantic relation proposals before they become canonical.
- External WebMCP-aware agent: remains the fallback when the on-device model is unavailable.

The nine P0 WebMCP tools remain unchanged.

## One-click custom review

`Run analysis` and `Run analysis again` now share one semantic-review path.

### No UNLINKED cards

1. Check local `LanguageModel` availability.
2. `inspect_workspace` establishes the current P11.6 `review_token` and exact semantic target set.
3. Gemini Nano evaluates every target exactly once across the six Groundline dimensions.
4. Groundline validates the complete structured output.
5. `triage_workspace` receives the current token plus the full batch.
6. The deterministic engine computes `CRITICAL / REVIEW / STABLE / UNASSESSED`.
7. Groundline focuses the current primary risk.

### UNLINKED cards present

1. The local model receives accepted items, existing represented relations, and the UNLINKED IDs as untrusted data.
2. It may propose only `SUPPORTS`, `CHALLENGES`, `DEPENDS_ON`, or `QUALIFIES` connections involving at least one UNLINKED card.
3. It cannot propose `SUPERSEDES` or `SOURCED_FROM` through this path.
4. No proposal mutates the workspace.
5. A resizable review panel shows the suggestions.
6. The human accepts selected suggestions or continues without them.
7. Accepted suggestions become canonical relations with `created_by = HUMAN` and an explicit audit event recording human approval.
8. The semantic review token changes because represented reasoning changed.
9. Fresh full-batch semantic evaluation and deterministic triage run against the new graph.

## Freshness and mutation safety

Relation proposals are bound to the semantic review token that produced them. If accepted reasoning changes before the human approves the proposals, Groundline rejects the stale proposal set and requires another analysis.

Accepting relation proposals clears prior evaluations and triage before recomputation. No stale `CRITICAL` label survives a semantic graph change.

The P11.6 full-batch handshake remains the only path by which custom semantic triage is committed.

## Untrusted-content handling

Prompt construction explicitly treats all reasoning item text as untrusted data. Item text is analyzed as reasoning content and is never treated as model instructions.

Model output is constrained and then validated again by Groundline:

- known accepted item IDs only;
- exact current semantic target coverage for triage;
- allowed dimension ratings only;
- allowed Groundline reason codes only;
- allowed semantic relation types only;
- no self-relation;
- no duplicate represented relation;
- bounded prompt text and proposal counts.

## Fallback

If Chrome's on-device `LanguageModel` is unsupported or unavailable, Groundline does not invent semantic ratings. The UI presents the external WebMCP handoff:

`inspect_workspace → evaluate every semantic_review.target_item_id → triage_workspace(review_token, full batch)`

## Authority invariant

P11.7 does **not** allow AI to make accepted knowledge or accepted semantic relations by itself.

**Agent proposes. Human decides.**

Semantic evaluation may be agent-generated because evaluation/triage is analysis-layer state, not accepted knowledge. Semantic relation changes remain human-approved canonical graph mutations.

## Files

- `src/ai/p117LocalSemanticReviewer.ts`
- `src/state/p117RelationReview.ts`
- `src/components/custom/P117CustomWorkspaceHome.tsx`
- `src/styles/p11-7.css`
- `src/app/App.tsx`
- `tests/contract/p11-7-local-semantic-review.test.ts`

## Validation gate

P11.7 is not complete until all of the following pass locally:

- `npm run typecheck`
- `npm run build`
- `npm test`
- Chrome runtime: initial custom analysis produces fresh semantic triage when the local model is available.
- Chrome runtime: UNLINKED cards produce relation suggestions, not automatic edges.
- Chrome runtime: accepted suggestions create edges and clear `UNLINKED` for connected cards.
- Chrome runtime: fresh triage after relation approval produces visible triage labels.
- Chrome runtime: unavailable local model produces explicit WebMCP fallback without fabricated risk labels.
