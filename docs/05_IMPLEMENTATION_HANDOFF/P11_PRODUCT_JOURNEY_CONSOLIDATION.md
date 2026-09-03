# P11 Product Journey Consolidation

Status: **AUTHORITATIVE PRODUCT CONTRACT**

This document supersedes P11 interaction decisions that treated Groundline as a page that starts an AI analysis by itself.

## Product model

Groundline is a **shared human-agent reasoning workspace**.

The website owns the canonical reasoning state, deterministic validation and triage mechanics, audit history, human approval surfaces, and WebMCP tools. A WebMCP-capable external agent inspects and acts on that shared workspace.

Groundline does **not** embed a hidden page-local model and does **not** pretend that an ordinary page button can start an external AI agent.

The authoritative product loop is:

```text
MAP -> REVIEW -> REVISE
       |
       +-- CHECK -> UNDERSTAND -> DECIDE
```

`Agent proposes. Human decides.` remains the authority boundary.

## One workspace experience

DEMO and CUSTOM use the same review surface after semantic results exist.

- **DEMO** receives deterministic seeded semantic results for the frozen example.
- **CUSTOM** receives semantic results from a WebMCP agent.
- Once results exist, both experiences present the same UNDERSTAND and DECIDE interaction model.

The semantic result source may differ. The human review experience must not become two different products again.

## CHECK

For CUSTOM, intake submission creates the reasoning workspace immediately.

Structural validation is an intake/domain concern, not a user-facing analysis stage. The primary workspace must not require a `Run analysis`, `Check reasoning structure`, `Request agent review`, or equivalent ritual before the user can see the mapped reasoning.

Before an agent review exists, the primary state is intentionally simple:

> **Not reviewed yet**  
> Your reasoning is mapped and ready for agent review.

This state must not expose internal review tokens, target IDs, handshake protocol, or disabled semantic-action buttons as normal product UX.

## UNDERSTAND

When a fresh semantic triage is committed, Groundline moves directly to the highest-priority unresolved CRITICAL or REVIEW item.

The primary surface should explain:

1. the weakest/high-impact reasoning item;
2. why it was prioritized;
3. what accepted reasoning depends on or is affected by it;
4. represented support and challenges where available.

The user should not need to press `Focus primary risk` after the agent has already produced a primary risk. The focused weak-point view is the product response to fresh triage.

Triage states remain operational review priorities, never truth, confidence, or factuality scores.

## DECIDE

DECIDE appears only when there is a real pending agent revision proposal.

The surface must compare:

- Accepted now
- Proposed revision

Human controls remain:

- Accept proposal
- Accept edited
- Reject
- Defer

Accepted knowledge changes only through human review actions.

No semantic relation is inherited automatically when a revision is accepted. SUPERSEDES lineage is preserved, while semantic relationships require explicit re-analysis or re-linking.

## Full reasoning map

The full graph, Inspector, Revision history, and Audit trail are an **inspection layer**, not the required first screen.

The primary journey may expose an action such as:

`Inspect full reasoning map`

This preserves auditability and power-user access without forcing a normal user to understand Groundline's internal graph machinery before Groundline explains the reasoning problem.

## Additional reasoning cards

Humans may add multiple CLAIM, COUNTERCLAIM, ASSUMPTION, or EVIDENCE cards.

A newly added card remains explicitly UNLINKED until a represented semantic relationship exists.

Groundline must not infer or silently commit SUPPORTS, CHALLENGES, DEPENDS_ON, or QUALIFIES relations merely because a card was added.

There is no fake `Run analysis again` button. Adding accepted reasoning invalidates stale semantic evaluation/triage. A WebMCP agent can later inspect the changed canonical workspace and review the current graph.

## Relation proposals

When an agent proposes semantic relations for UNLINKED cards, Groundline may show a dedicated human-approval surface.

This surface is actionable because a real proposal exists.

Until the human accepts a proposal:

- canonical relations do not change;
- accepted knowledge does not change;
- semantic inference is not committed.

After an accepted relation changes the graph, stale semantic analysis is invalidated and the agent must inspect/review the current workspace again.

## WebMCP review state

`inspect_workspace` derives the current semantic review token, target set, and UNLINKED state directly from the canonical workspace.

Therefore Groundline does not maintain a separate fake `agent review requested` handshake state.

The semantic review token remains a protocol integrity mechanism for stale-review rejection. It is not normal user-facing product state.

## Runtime authority

The authoritative runtime review surface is:

`src/components/review/UnifiedReviewWorkspace.tsx`

CUSTOM reaches it through:

`src/components/custom/P117CustomWorkspaceHome.tsx`

DEMO reaches the same component directly from `src/app/App.tsx`.

Earlier P11 components may remain temporarily for regression compatibility, but they are not product authority and must not be used to reintroduce a parallel CUSTOM or DEMO journey.

## Verification gate

P11 is considered verified only when the current branch HEAD passes `.github/workflows/p11-verify.yml`:

```text
npm ci
npm run typecheck
npm run build
npm test
```

A previous green run is not evidence for a newer unverified HEAD.
