# P11.2 — Custom Semantic Gate

Status: IMPLEMENTED ON `P11`; LOCAL VALIDATION REQUIRED

## Bug reproduced

The real `Check my own decision` flow could enter a repair loop before any semantic triage existed.

Observed sequence:

`CONC-USER-001 -> CONC-011 -> CONC-017 -> ...`

The graph simultaneously showed no CRITICAL label because the workspace had no semantic triage record.

## Root cause

P11.1 replaced the repair lifecycle but did not replace the legacy `focusCustomPrimaryRisk` structural fallback. With zero triage records, that fallback selected `accepted_conclusion_id` as the primary risk. After a human accepted the deterministic repair, the newly accepted conclusion became the next fallback target, so the same generic conclusion repair could repeat indefinitely.

This was a contract mismatch:

- structural readiness is not semantic risk;
- CRITICAL/REVIEW must come from represented semantic evaluation + deterministic triage;
- repair must not run merely because a structurally complete workspace exists.

## P11.2 decision

Custom semantic actions are now gated by fresh semantic triage.

Before triage:

- structural `Run analysis` may open and inspect the reasoning map;
- Groundline does not create a FOCUS risk event;
- `Focus primary risk` is disabled;
- `Propose repair` is disabled;
- no CRITICAL or REVIEW label is fabricated;
- the UI explicitly asks a WebMCP-aware agent to inspect/evaluate the workspace and call `triage_workspace`.

After fresh triage:

- `Focus primary risk` selects only an ACCEPTED CRITICAL/REVIEW item;
- the focused item is the repair target;
- the UI exposes the current CRITICAL/REVIEW counts;
- the focused-risk card includes the actual triage state;
- a local deterministic repair may be created only from that semantic triage context.

After an accepted repair:

- affected semantic analysis is invalidated by the P11.1 lifecycle;
- semantic focus and repair are blocked again;
- the WebMCP agent must evaluate and triage the current accepted reasoning before Groundline can advance;
- the newly created replacement item is not automatically treated as the next risk.

A replacement may be reviewed again only if a subsequent fresh semantic triage independently identifies it as CRITICAL or REVIEW.

## Contract preserved

- Agent proposes. Human decides.
- Triage is operational review priority, never truth/confidence.
- No automatic semantic rewiring.
- SUPERSEDES lineage is preserved.
- Structural completeness is not promoted into semantic judgment.
- WebMCP remains the semantic agent surface.
- Schema remains 1.1.0.

## Files

Added:

- `src/state/p112CustomSemanticGate.ts`
- `src/components/custom/P112CustomWorkspaceHome.tsx`
- `tests/contract/p11-2-custom-semantic-gate.test.ts`

Changed:

- `src/app/App.tsx`

## Required local validation

```powershell
npm run typecheck
npm run build
npm test
```

Then validate the real custom journey:

1. Enter a custom decision.
2. Run the structural analysis.
3. Confirm no CRITICAL/REVIEW appears yet and semantic repair controls are disabled.
4. Use the WebMCP agent to inspect/evaluate/triage the workspace.
5. Confirm CRITICAL/REVIEW now appears from triage.
6. Focus one primary risk.
7. Propose and human-review that exact item.
8. After acceptance, confirm re-analysis is required and another repair cannot be generated immediately.
9. Run fresh agent triage and confirm Groundline selects the next unresolved semantic risk rather than looping on the replacement.
