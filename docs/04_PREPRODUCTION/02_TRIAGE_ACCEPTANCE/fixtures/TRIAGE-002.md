# TRIAGE-002 — Overgeneralized claim with subgroup counterevidence

**Acceptance fixture:** TRIAGE-002  
**Expected triage state:** `CRITICAL`

## Purpose

Verify scope mismatch and contradictory subgroup evidence produce CRITICAL review priority.

## Graph setup

`E-AGG supports C-001; E-SUBGROUP challenges C-001; C-001 supports CONCLUSION-001`

Primary subject type: `CLAIM`

## Expected evaluation dimensions

| Dimension | Rating |
|---|---|
| evidence_strength | `MODERATE` |
| source_quality | `HIGH` |
| contradiction | `HIGH` |
| assumption_burden | `MODERATE` |
| generalization_risk | `HIGH` |
| downstream_impact | `HIGH` |

## Expected internal prioritization

- weakness score: `3`
- impact score: `3`
- priority score: `9`
- direct to accepted conclusion: `true`

These values are prioritization mechanics, **not truth/confidence scores**.

## Expected reason codes

- `OVERGENERALIZATION`
- `SCOPE_MISMATCH`
- `CONTRADICTED`

## Acceptance assertions

1. `triage_workspace` returns `CRITICAL` for the target item.
2. Returned evaluation references the target item and relevant dependency IDs.
3. Triage output preserves the distinction between missing, contradicted, and unassessed states.
4. Knowledge state is unchanged by evaluation/triage.
5. Any source/evidence text returned to an agent remains untrusted content.

## Negative assertion

Must not treat high source quality as resolving the contradiction.

## Gate

**PASS only when deterministic implementation matches all assertions.**
