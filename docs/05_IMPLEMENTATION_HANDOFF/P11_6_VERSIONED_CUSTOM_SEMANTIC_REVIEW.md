# P11.6 — Versioned Custom Semantic Review

Status: implementation complete, local validation pending.

## Problem

A custom workspace can be structurally complete while still having no semantic triage. WebMCP already exposed `inspect_workspace` and `triage_workspace`, but the contract did not prevent an agent from submitting a partial review or from applying a review after the accepted reasoning changed. That could leave the UI with missing or stale CRITICAL / REVIEW / STABLE labels.

## Contract

P11.6 adds a versioned semantic-review handshake without changing accepted knowledge or the frozen nine-tool P0 surface.

1. `inspect_workspace` returns `semantic_review.review_token` and the complete current `target_item_ids` for CUSTOM workspaces.
2. The token is derived only from accepted knowledge and represented semantic relations. Evaluation, triage, focus, and audit activity do not change the token.
3. `triage_workspace` requires that token in CUSTOM mode.
4. CUSTOM triage must contain exactly one evaluation for every current semantic-review target. Duplicate, missing, unexpected, stale, and over-capacity batches are rejected before state mutation.
5. If accepted reasoning changes between inspect and triage, the token changes and the old review is rejected.
6. A valid complete batch is committed once, then Groundline deterministically computes triage and the UI immediately receives the new priority states.
7. The tool returns the primary CRITICAL / REVIEW target and state counts. Priority remains a review mechanism, never a truth score.

## Review targets

The bounded semantic batch covers accepted CLAIM, COUNTERCLAIM, ASSUMPTION, EVIDENCE, and CONCLUSION items. QUESTION defines decision scope and SOURCE remains provenance context that may be inspected and referenced by evaluations.

Maximum target count per review batch: 25.

## Human-agent flow

```text
CUSTOM WORKSPACE
    |
    | inspect_workspace
    v
review_token + complete target_item_ids
    |
    | agent inspects/evaluates every target
    v
triage_workspace(review_token, complete batch)
    |
    | deterministic Groundline triage
    v
CRITICAL / REVIEW / STABLE / UNASSESSED
    |
    v
Focus primary risk -> Repair -> Human decision
```

If the human adds a card or accepts a revision before the batch is submitted, the previous token becomes stale. The agent must inspect the current workspace again.

## Why this does not fake AI

The page still does not manufacture semantic judgments locally. The agent supplies evaluation dimensions; Groundline validates the review scope and deterministically computes triage. This preserves the product boundary: agent interprets and proposes, Groundline validates and prioritizes, human decides accepted knowledge.

## Validation added

`tests/webmcp/p11-6-custom-semantic-review.test.ts` covers:

- review packet publication;
- missing-token rejection;
- stale-token rejection after accepted reasoning changes;
- incomplete-batch rejection with no triage mutation;
- successful complete review producing visible deterministic triage and a primary risk.

Local `typecheck`, `build`, full test suite, and browser WebMCP runtime validation remain required before P11.6 is marked complete.
