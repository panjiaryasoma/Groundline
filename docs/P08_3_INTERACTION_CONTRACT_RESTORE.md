# P-08.3 — Interaction Contract Restore

P-08.2 preserved much of the domain engine but regressed the observable P-06
interaction contract. This patch restores the interaction contract without
rolling back the newer intake shell or adding another subsystem.

## Restored behavior

1. Graph card selection immediately updates Inspector.
2. Run analysis immediately produces an observable focus/selection consequence.
3. If semantic triage exists, the ordered highest-priority unresolved risk is selected.
4. If no semantic triage exists for arbitrary user prose, the existing explicitly non-semantic structural fallback is selected. No fake semantic oracle is added.
5. Focus primary risk remains usable after the human manually selects another graph card; clicking Focus returns selection to the current primary risk.
6. Propose repair preserves the focused risk as context but selects the current accepted conclusion in Inspector, matching the original P-06 interaction semantics.
7. The live review workspace always renders:
   - ReasoningGraph
   - InspectorPanel
   - RevisionPanel
   - AuditTrail
8. Inspector and Decision history are no longer hidden behind an advanced-details toggle.
9. A real proposal automatically appears in RevisionPanel as:
   - Accepted now
   - Proposed revision
   - Edit before accepting
   - Accept proposal
   - Accept edited
   - Reject
   - Defer
10. Human acceptance still creates a replacement ACCEPTED item, SUPERSEDES the old item, updates selection, and records audit events.
11. Priority-score epistemic warning is restored.

## Repair semantics

The primary risk is the *reason* for repair.
The accepted conclusion is the *object* being repaired.

The repair-request FOCUS audit event records both:
- primary_risk_id
- repair_target_id

The WebMCP inspect_workspace tool exposes both fields, and propose_revision is
expected to target repair_target_id.

## Ponytail Full audit

- Reused existing graph, inspector, revision, audit components.
- Removed duplicate custom human-decision UI.
- No new dependency.
- No new backend.
- No local semantic inference.
- No schema change.
- No automatic semantic rewiring.

CONTRACT CHANGE: NONE
INTERACTION CONTRACT RESTORED: YES
