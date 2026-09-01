# TRIAGE-003 — Missing direct evidence on an intermediate claim

**Acceptance fixture:** TRIAGE-003  
**Expected triage state:** `REVIEW`

## Purpose

Verify missing evidence is a REVIEW finding rather than automatic contradiction.

## Graph setup

`C-002 → C-003 → CONCLUSION-001; no EVIDENCE supports C-002`

Primary subject type: `CLAIM`

## Expected evaluation dimensions

| Dimension | Rating |
|---|---|
| evidence_strength | `LOW` |
| source_quality | `UNASSESSED` |
| contradiction | `LOW` |
| assumption_burden | `MODERATE` |
| generalization_risk | `LOW` |
| downstream_impact | `MODERATE` |

## Expected internal prioritization

- weakness score: `3`
- impact score: `2`
- priority score: `6`
- direct to accepted conclusion: `false`

These values are prioritization mechanics, **not truth/confidence scores**.

## Expected reason codes

- `MISSING_DIRECT_EVIDENCE`

## Acceptance assertions

1. `triage_workspace` returns `REVIEW` for the target item.
2. Returned evaluation references the target item and relevant dependency IDs.
3. Triage output preserves the distinction between missing, contradicted, and unassessed states.
4. Knowledge state is unchanged by evaluation/triage.
5. Any source/evidence text returned to an agent remains untrusted content.

## Negative assertion

Expected finding is not CONTRADICTED.

## Gate

**PASS only when deterministic implementation matches all assertions.**
