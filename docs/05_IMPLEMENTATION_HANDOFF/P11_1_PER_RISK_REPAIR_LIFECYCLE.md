# P11.1 — Per-Risk Repair + Re-analysis Lifecycle

Status: IMPLEMENTED ON `P11.1`, LOCAL RUNTIME VALIDATION REQUIRED

## Why P11.1 exists

P11 correctly displayed three CRITICAL reasoning items in Integration 001 (`A-001`, `C-001`, and `CONC-001`), but its repair action remained conclusion-centric. A focused upstream risk could therefore be used only as context for rewriting the accepted conclusion.

That behavior was internally consistent with the earlier one-cycle demo, but it no longer matched the visible product semantics. If Groundline shows several accepted reasoning items as independently reviewable risks, the focused accepted item must be the actual repair target.

P11.1 removes that mismatch.

## Contract decision

The repair target is now the focused accepted reasoning item itself.

Initial seeded order remains determined by triage ranking:

1. `A-001` — CRITICAL
2. `C-001` — CRITICAL
3. `CONC-001` — CRITICAL

For each review cycle:

`ANALYZE -> FOCUS ONE RISK -> PROPOSE REVISION FOR THAT ITEM -> HUMAN DECIDES -> INVALIDATE AFFECTED ANALYSIS -> RE-ANALYZE`

Groundline must not advance to the next risk using stale triage after accepted knowledge changed.

## P11.1 seeded behavior

### First cycle

- Focus target: `A-001`
- Repair target: `A-001`
- Accepted replacement keeps type `ASSUMPTION`
- Original `A-001` becomes `SUPERSEDED`
- Replacement links to `A-001` only through `SUPERSEDES`
- Downstream analysis touching the repaired item is invalidated
- `accepted_conclusion_id` remains unchanged

### Second cycle

After a fresh analysis pass:

- Next review target becomes `C-001`
- Repair target is `C-001`
- Accepted replacement keeps type `CLAIM`
- Original `C-001` becomes `SUPERSEDED`
- Downstream analysis is invalidated again

### Third cycle

After another fresh analysis pass:

- Next review target becomes `CONC-001`
- Repair target is `CONC-001`
- Accepted replacement keeps type `CONCLUSION`
- `accepted_conclusion_id` moves to the human-reviewed replacement

The seeded walkthrough is complete only after all three original critical targets have a human review outcome.

## No automatic semantic rewiring

P11.1 does **not** copy SUPPORTS, CHALLENGES, DEPENDS_ON, SOURCED_FROM, or QUALIFIES relations from a superseded item to its replacement.

A human-approved wording change may alter meaning. Therefore the only automatically created semantic-history relation is:

`NEW_ITEM --SUPERSEDES--> OLD_ITEM`

Affected evaluation and triage records are removed from the current analysis state and the `ACCEPT_REVISION` audit event records:

- `analysis_invalidated_item_ids`
- `requires_reanalysis: true`
- `semantic_relations_inherited: false`
- `p11_1_per_risk_repair: true`

This is deliberate invalidation, not data loss. Historical EVALUATE/TRIAGE audit events remain in the audit trail.

## Authority boundary

P11.1 does not change the authority contract.

- Agent may create a `PROPOSED` revision.
- Agent may not accept knowledge.
- Human explicitly accepts, accepts an edited version, rejects, or defers.
- Accepted knowledge changes only through an explicit human review transition.

`Agent proposes. Human decides.`

## WebMCP compatibility

The existing `propose_revision` WebMCP tool already accepts any existing ACCEPTED Groundline knowledge item as `target_item_id`; no conclusion-only schema restriction exists.

P11.1 aligns the UI preparation flow with that existing generic tool contract. When a repair target is prepared, `primary_risk_id` and `repair_target_id` now refer to the same focused accepted item.

The nine-tool P0 WebMCP surface is unchanged.

## UI behavior

The seeded demo now states how many unresolved CRITICAL items remain in the current analysis and makes the single next target explicit.

The advanced map legend now describes Repair as:

> revise the focused accepted item

After an accepted repair, the UI requires a new analysis pass before another repair can be selected. The walkthrough does not claim that the replacement is already semantically validated.

## Files introduced / changed

Introduced:

- `src/state/p111RepairLifecycle.ts`
- `src/components/focus/P111FocusWorkspace.tsx`
- `tests/contract/p11-1-per-risk-repair.test.ts`

Changed:

- `src/app/App.tsx`
- `src/components/focus/index.ts`
- `src/components/focus/ExpandedReasoningMap.tsx`

The original P11 implementation remains available in source for regression/reference tests; P11.1 is wired as the active demo experience through `App.tsx`.

## Contract evaluation

| Contract | P11.1 result |
|---|---|
| Agent proposes, human decides | Preserved |
| Revision is an action/state transition | Preserved |
| Knowledge types remain canonical | Preserved |
| Triage is review priority, not truth | Preserved |
| No automatic semantic rewiring | Strengthened |
| SUPERSEDES lineage retained | Preserved |
| Affected analysis requires re-evaluation | Explicitly enforced |
| WebMCP proposal targets ACCEPTED knowledge | Preserved |
| Schema version | Remains `1.1.0` |

## Validation status

Repository-side implementation is complete on branch `P11.1`.

No claim is made here that local TypeScript compilation, Vite production build, or Vitest runtime has passed after these changes. Run the local validation commands and record the actual results before promoting P11.1:

```powershell
npm run typecheck
npm run build
npm test
```

Expected new regression coverage includes:

- first repair targets `A-001`, not `CONC-001`;
- accepted assumption repair creates an ASSUMPTION replacement;
- only SUPERSEDES lineage is automatically added to the replacement;
- affected analysis becomes stale after acceptance;
- re-analysis is required before advancing to `C-001`;
- `CONC-001` is repaired only after the preceding review cycles;
- accepted conclusion ID changes only when the conclusion itself is accepted as a revision target.
