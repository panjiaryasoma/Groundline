# P-08.2 — Ponytail Sequential Risk Review Fix

## Why P-08.1 was discarded

P-08.1 introduced a target picker, manual-repair subsystem, and multi-proposal queue.
Those additions were not necessary to satisfy the observed UX bug.

Ponytail Full decision: delete the unnecessary interaction model and return to
the P-07/P-08 v0.8.0 baseline.

## Required flow

1. Run analysis.
2. Focus primary risk.
3. Groundline selects exactly one unresolved highest-priority risk.
4. Map, selection, inspector, and audit all point at that risk.
5. Propose repair is enabled only for that focused risk.
6. The WebMCP agent creates a real PROPOSED revision for that exact risk.
7. The UI renders the same human-decision pattern as the seeded example:
   - Use suggestion
   - Edit first
   - Keep current <item type>
   - Decide later
8. After HUMAN review completes, Focus primary risk may advance to the next
   unresolved risk.

## Priority selection

The implementation reuses the existing `rankTriageRecords()` helper.

Eligible semantic targets are:
- CRITICAL
- REVIEW
- ACCEPTED item state
- no completed revision review for that target

If semantic triage does not exist, Groundline retains the existing structural
fallback behavior. It does not label that fallback as semantic truth.

## Repair target

`prepareCustomRepairTarget()` no longer defaults to the accepted conclusion.

It resolves the most recent `FOCUS_PRIMARY_RISK` audit event and prepares that
exact item as the repair target.

## Why the page does not fabricate proposal text

The active baseline says the external browser agent performs natural-language
reasoning and `propose_revision` creates PROPOSED state.

WebMCP exposes tools to an agent. Registering a tool does not give the page a
model-generation call.

Therefore:
- clicking Propose repair prepares the exact target;
- the connected WebMCP agent calls `propose_revision`;
- once the proposal object exists, the human-decision buttons appear
  automatically.

No local fake semantic proposal, hidden LLM, or new backend was added.

## Acceptance correctness

The previous custom path always generated `CONC-*` replacement IDs.
That was incorrect for repairing ASSUMPTION / CLAIM / EVIDENCE items.

Replacement IDs now preserve the target knowledge type prefix.

Semantic relations are still not automatically rewired after acceptance.

## Contract evaluation

- schema: unchanged
- WebMCP P0 names: unchanged
- deterministic triage: unchanged
- triage priority helper: reused
- proposal authority: AGENT
- final review authority: HUMAN
- automatic semantic rewiring: still prohibited
- new dependency: none
- new backend/model: none
- P-08.1 picker/manual/multi-queue: removed from this baseline

CONTRACT CHANGE: NONE

## Freshness guard

If HUMAN accepts or edits-and-accepts a proposal, accepted knowledge changes.
The previous triage ordering is therefore treated as stale.

Groundline blocks `Focus primary risk` until a later `TRIAGE` audit event exists.

Rejecting or deferring a proposal does not mutate accepted knowledge, so the
existing triage may continue to the next unresolved risk.
