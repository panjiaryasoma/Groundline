# TRIAGE-007 — Well-supported stable claim

**Acceptance fixture:** TRIAGE-007  
**Expected triage state:** `STABLE`

## Purpose

Verify strong support and no material risk produces STABLE.

## Graph setup

`Two independent relevant evidence items support C-STABLE → CONCLUSION-001`

Primary subject type: `CLAIM`

## Expected evaluation dimensions

| Dimension | Rating |
|---|---|
| evidence_strength | `HIGH` |
| source_quality | `HIGH` |
| contradiction | `LOW` |
| assumption_burden | `LOW` |
| generalization_risk | `LOW` |
| downstream_impact | `HIGH` |

## Expected internal prioritization

- weakness score: `0`
- impact score: `3`
- priority score: `0`
- direct to accepted conclusion: `true`

These values are prioritization mechanics, **not truth/confidence scores**.

## Expected reason codes

- none required

## Acceptance assertions

1. `triage_workspace` returns `STABLE` for the target item.
2. Returned evaluation references the target item and relevant dependency IDs.
3. Triage output preserves the distinction between missing, contradicted, and unassessed states.
4. Knowledge state is unchanged by evaluation/triage.
5. Any source/evidence text returned to an agent remains untrusted content.

## Negative assertion

High downstream impact alone must not create REVIEW/CRITICAL.

## Gate

**PASS only when deterministic implementation matches all assertions.**
