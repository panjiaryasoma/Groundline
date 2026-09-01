# TRIAGE-006 — Weak isolated side claim

**Acceptance fixture:** TRIAGE-006  
**Expected triage state:** `REVIEW`

## Purpose

Verify weakness alone does not create CRITICAL severity.

## Graph setup

`C-SIDE has no path to accepted conclusion`

Primary subject type: `CLAIM`

## Expected evaluation dimensions

| Dimension | Rating |
|---|---|
| evidence_strength | `LOW` |
| source_quality | `MODERATE` |
| contradiction | `LOW` |
| assumption_burden | `LOW` |
| generalization_risk | `LOW` |
| downstream_impact | `LOW` |

## Expected internal prioritization

- weakness score: `3`
- impact score: `1`
- priority score: `3`
- direct to accepted conclusion: `false`

These values are prioritization mechanics, **not truth/confidence scores**.

## Expected reason codes

- `WEAK_SUPPORT`

## Acceptance assertions

1. `triage_workspace` returns `REVIEW` for the target item.
2. Returned evaluation references the target item and relevant dependency IDs.
3. Triage output preserves the distinction between missing, contradicted, and unassessed states.
4. Knowledge state is unchanged by evaluation/triage.
5. Any source/evidence text returned to an agent remains untrusted content.

## Negative assertion

Must not become CRITICAL.

## Gate

**PASS only when deterministic implementation matches all assertions.**
