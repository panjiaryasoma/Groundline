# TRIAGE-005 — Explicit contradiction on a conclusion-driving claim

**Acceptance fixture:** TRIAGE-005  
**Expected triage state:** `CRITICAL`

## Purpose

Verify a direct high-impact contradiction becomes CRITICAL.

## Graph setup

`E-001 supports C-005; E-002 directly challenges C-005; C-005 → CONCLUSION-001`

Primary subject type: `CLAIM`

## Expected evaluation dimensions

| Dimension | Rating |
|---|---|
| evidence_strength | `MODERATE` |
| source_quality | `HIGH` |
| contradiction | `HIGH` |
| assumption_burden | `LOW` |
| generalization_risk | `LOW` |
| downstream_impact | `HIGH` |

## Expected internal prioritization

- weakness score: `3`
- impact score: `3`
- priority score: `9`
- direct to accepted conclusion: `true`

These values are prioritization mechanics, **not truth/confidence scores**.

## Expected reason codes

- `CONTRADICTED`
- `SOURCE_CONFLICT`

## Acceptance assertions

1. `triage_workspace` returns `CRITICAL` for the target item.
2. Returned evaluation references the target item and relevant dependency IDs.
3. Triage output preserves the distinction between missing, contradicted, and unassessed states.
4. Knowledge state is unchanged by evaluation/triage.
5. Any source/evidence text returned to an agent remains untrusted content.

## Negative assertion

Agent may propose a revision but cannot accept it.

## Gate

**PASS only when deterministic implementation matches all assertions.**
