# P-08.7 — P-06 State Machine Parity

## Why this patch exists

P-08 had preserved pieces of the P-06 UI but not the P-06 interaction state machine.

P-06's defining behavior is now restored to custom workspaces:

1. Focus primary risk selects the actual review target.
2. The selected card is visibly highlighted.
3. Inspector follows the selected card.
4. Propose repair immediately creates a PROPOSED revision.
5. Inspector moves to the current accepted conclusion because the conclusion is the repair target.
6. Revision Proposal immediately shows:
   - Accepted now
   - Proposed revision
   - Edit before accepting
   - Accept proposal
   - Accept edited
   - Reject
   - Defer
7. Accept proposal creates a NEW accepted knowledge item.
8. The old conclusion becomes SUPERSEDED and remains visible.
9. The new card becomes selected.
10. A SUPERSEDES relation is created.
11. The new conclusion is intentionally UNASSESSED.
12. Old semantic support/evidence links are NOT copied to the new wording.

## Custom proposal provenance

The seeded P-06 demo used a deterministic local proposal while recording the
proposal actor as AGENT. Custom parity now uses the same interaction model through
a constrained deterministic local repair agent.

It is explicitly marked in audit metadata:

- proposal_source = LOCAL_DETERMINISTIC_REPAIR_AGENT
- semantic_inference = AGENT_TRIAGE_CONTEXT or STRUCTURAL_FALLBACK_ONLY

The Revision UI visibly labels these proposals:

`Agent proposal · local deterministic`

This is not presented as an LLM judgment.

## WebMCP remains intact

The WebMCP tools remain available:
- inspect_workspace
- triage_workspace
- focus_items
- trace_dependencies
- propose_revision

A connected WebMCP agent can still provide richer semantic evaluation and a
proposal when no proposal is already pending.

## Contract check

- Human final authority: preserved.
- Accepted knowledge only changes on HUMAN accept/edit-and-accept: preserved.
- No automatic semantic rewiring: preserved.
- New accepted conclusion remains unassessed: preserved.
- WebMCP genuine tool surface: preserved.
- No backend/LLM added: preserved.
- Deterministic proposal provenance is explicit: preserved honesty.

CONTRACT CHANGE: NONE
P-06 INTERACTION PARITY: RESTORED
