# P11 Product Journey Consolidation

Status: **AUTHORITATIVE PRODUCT CONTRACT**

This document defines the current Groundline interaction model. It supersedes earlier P11 decisions that either treated the page as a self-contained AI analyzer, hid the reasoning graph behind a report-style summary, or removed the real-user review controls that had already been accepted in the P08.8 interaction baseline.

## Product model

Groundline is a **live human-agent reasoning workspace**.

The website owns:
- canonical reasoning state;
- deterministic structural review mechanics;
- the reasoning graph;
- Inspector state;
- revision and human-approval surfaces;
- audit history;
- WebMCP tools.

A WebMCP-capable external agent can inspect the same canonical workspace, evaluate represented reasoning, focus items, trace dependencies, propose semantic relations, and propose revisions.

The authority boundary remains:

> **Agent proposes. Human decides.**

Groundline must not pretend that an ordinary page button can start an external AI model.

## Entry

The normal human entry remains plain-language decision intake.

Users describe:
- what they are deciding;
- what they currently think;
- their main reason;
- optional assumptions;
- optional evidence;
- optional source context.

Groundline maps those answers into reasoning objects internally. Users are not required to author ontology labels or manually wire a graph before they can begin.

## Live workspace is the primary surface

After a custom workspace is created, the live reasoning workspace is visible immediately.

The primary composition is:

```text
REASONING GRAPH  <->  INSPECTOR
        |
        +-> REVISION PROPOSAL
        |
        +-> DECISION HISTORY / AUDIT
```

Graph, Inspector, Revision Proposal, and Decision History share the same state.

The graph is not an optional power-user report. It is the place where the represented reasoning lives.

Plain-language guidance may sit above the workspace, but it must not replace the workspace with a static AI report.

## Interaction baseline

The accepted direct interaction loop is:

```text
Run analysis
    ↓
Focus primary risk
    ↓
Propose repair
    ↓
Accept / Accept edited / Reject / Defer
```

This control lifecycle applies to both the seeded example and `Check my own decision`.

The source of the review may differ, but the human interaction must not collapse into two different products again.

## Selection contract

Clicking one reasoning card:
- selects that exact item;
- updates the Inspector immediately;
- does not silently change accepted knowledge.

Programmatic focus must behave the same way.

When a review target is active:
- Groundline selects that exact card;
- related downstream reasoning remains highlighted where represented;
- the selected item and Inspector stay synchronized.

The user may inspect another card manually.

`Focus primary risk` returns selection to the exact current review target.

This interaction is the baseline established by the P08.8 state-machine fixes and must not regress into label-only focus.

## Run analysis in CUSTOM

A normal page button cannot invoke an external WebMCP agent. Therefore `Run analysis` in CUSTOM has two honest modes.

### Deterministic structural first pass

Before fresh semantic triage exists, `Run analysis` may select a provisional review target using deterministic structure already represented in the workspace.

This first pass:
- may select and focus a review target;
- may unlock `Focus primary risk` and `Propose repair`;
- must not create semantic CRITICAL, REVIEW, or STABLE labels;
- must not claim an LLM or external agent ran;
- must be visibly described as structural/local rather than semantic judgment.

`Propose repair` may create the constrained deterministic local draft already established by the P08.7/P08.8 interaction parity work. Its provenance must remain explicit in audit metadata and the Revision Proposal UI.

### Fresh WebMCP semantic triage

When a WebMCP agent commits fresh evaluations and triage, semantic CRITICAL/REVIEW ordering supersedes the provisional structural target.

Groundline then focuses the highest-priority unresolved semantic review target and uses the same visible `Focus primary risk` and `Propose repair` controls.

Priority scores remain review mechanics, never truth, confidence, or factuality scores.

## Accepted revision guard

A deterministic structural first pass is not an infinite local reasoning loop.

After a human accepts or edits-and-accepts a repair:
- the old item becomes `SUPERSEDED`;
- the replacement becomes the new accepted item;
- the replacement is selected;
- Inspector, graph, and audit update together;
- semantic relations are not inherited automatically;
- the replacement remains unassessed;
- another structural fallback cycle is blocked until fresh semantic triage arrives.

This preserves direct-browser usability without pretending that repeated local drafts are fresh semantic analysis.

Reject or Defer does not change accepted knowledge.

## Repair proposal

For both DEMO and CUSTOM, `Propose repair` operates on the active review target and creates a proposal object in the same live workspace.

A deterministic local proposal must be labeled as local deterministic and must not be presented as an LLM judgment.

A WebMCP agent may also provide a richer proposal through the existing tool surface when no proposal is pending.

When a proposal exists, the Revision Proposal panel displays:
- Accepted now;
- Proposed revision;
- editable draft;
- Accept proposal;
- Accept edited;
- Reject;
- Defer.

Accepted knowledge changes only through explicit HUMAN review actions.

## Multi-risk review

A semantic triage may contain multiple CRITICAL or REVIEW items.

Groundline reviews them sequentially rather than hiding all but one permanently.

After a proposal receives a human outcome, the next unresolved review target may become primary when the current review state permits it.

Accepted reasoning changes invalidate stale semantic review where required.

## Additional reasoning cards

Humans may add multiple:
- CLAIM;
- COUNTERCLAIM;
- ASSUMPTION;
- EVIDENCE cards.

A new card remains explicitly `UNLINKED` until a represented semantic relation exists.

Groundline must not silently invent SUPPORTS, CHALLENGES, DEPENDS_ON, or QUALIFIES relations.

An agent may propose defensible semantic relations. Canonical relations change only after human approval.

## Relation review

Real agent relation proposals may open a dedicated human-approval panel.

Until approval:
- canonical relations do not change;
- accepted knowledge does not change;
- proposed semantic inference is not treated as committed graph state.

If approved relations change the graph, stale semantic review is invalidated and the agent must inspect the current canonical workspace again.

Internal review tokens, handshake IDs, and tool-call instructions are protocol state, not normal product UI.

## Runtime authority

The authoritative review surface is:

`src/components/review/UnifiedReviewWorkspace.tsx`

It must keep the live workspace visible and preserve the `Run analysis -> Focus primary risk -> Propose repair -> Decide` lifecycle for real custom decisions.

CUSTOM reaches this surface through:

`src/components/custom/P117CustomWorkspaceHome.tsx`

P117 remains responsible for real relation-proposal approval overlays and delegates the normal review experience to the same live workspace.

DEMO reaches the same review surface directly from `src/app/App.tsx`.

Earlier components may remain for regression compatibility but are not product authority.

## Verification gate

P11 is verified only when the current branch HEAD passes:

```text
npm ci
npm run typecheck
npm run build
npm test
```

via `.github/workflows/p11-verify.yml`.

A green run for an older commit is not evidence for a newer HEAD.
