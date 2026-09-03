# P11 Product Journey Consolidation

Status: **AUTHORITATIVE PRODUCT CONTRACT**

This document defines the current Groundline interaction model. It supersedes earlier P11 decisions that either treated the page as a self-contained AI analyzer or hid the reasoning graph behind a report-style summary.

## Product model

Groundline is a **live human-agent reasoning workspace**.

The website owns:
- canonical reasoning state;
- deterministic validation and triage mechanics;
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

The graph is not an optional power-user report hidden behind `Inspect full reasoning map`. It is the place where the represented reasoning lives.

Plain-language guidance may sit above the workspace, but it must not replace the workspace with a static AI report.

## Selection contract

Clicking one reasoning card:
- selects that exact item;
- updates the Inspector immediately;
- does not silently change accepted knowledge.

Programmatic focus must behave the same way.

When a fresh semantic triage identifies the highest-priority unresolved CRITICAL or REVIEW item:
- Groundline focuses that exact risk;
- its downstream reasoning remains highlighted;
- the selected item and Inspector stay synchronized.

The user may inspect another card manually.

`Focus primary risk` returns selection to the exact current review target.

This interaction is the baseline established by the P08.8 state-machine fixes and must not regress into label-only focus.

## Review status

CUSTOM does not fabricate semantic risk from structural completeness.

Before agent triage exists:

> **Not reviewed yet**  
> Your reasoning is mapped and ready for agent review.

The graph is still fully usable:
- cards can be inspected;
- new reasoning items can be added;
- human-authored state remains visible.

Internal review tokens, handshake IDs, and tool-call instructions are protocol state, not normal product UI.

DEMO may use deterministic seeded analysis to demonstrate the same workspace interaction.

## Understanding a risk

Groundline may summarize why a risk matters, but explanation stays attached to the selected reasoning object rather than replacing the graph.

The product response to fresh triage is:
1. exact risk card selected;
2. Inspector updated;
3. affected reasoning highlighted;
4. triage state visible on the card and Inspector;
5. audit state updated by the actual review actions.

Priority scores are review mechanics, never truth, confidence, or factuality scores.

## Repair preparation and proposal

For DEMO, a seeded repair proposal may be produced directly.

For CUSTOM, the page cannot invoke an external WebMCP agent. Groundline may prepare a repair target by:
- keeping the primary risk focused;
- selecting the accepted item that would be revised;
- recording the prepared target in canonical workspace/audit state.

The UI must describe this honestly as preparation, not pretend that an agent is running in the background.

When a real agent revision arrives, the Revision Proposal panel in the same live workspace displays:

- Accepted now
- Proposed revision
- editable draft
- Accept proposal
- Accept edited
- Reject
- Defer

There is no separate report page for the proposal.

## Accepted revision behavior

When a human accepts a revision:
- the old accepted item remains traceable as `SUPERSEDED`;
- the replacement becomes the new accepted item;
- the replacement is selected;
- Inspector follows the new item;
- graph and audit update together;
- the replacement remains unassessed until fresh review.

Semantic relations are not inherited automatically from the superseded item.

## Multi-risk review

A triage may contain multiple CRITICAL or REVIEW items.

Groundline reviews them sequentially rather than hiding all but one permanently.

After a proposal receives a human outcome, the next unresolved review target can become primary.

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

## Runtime authority

The authoritative review surface is:

`src/components/review/UnifiedReviewWorkspace.tsx`

It must keep the live workspace visible rather than demoting it to an optional expansion.

CUSTOM reaches this surface through:

`src/components/custom/P117CustomWorkspaceHome.tsx`

P117 remains responsible only for real relation-proposal approval overlays and then delegates to the same live workspace.

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
