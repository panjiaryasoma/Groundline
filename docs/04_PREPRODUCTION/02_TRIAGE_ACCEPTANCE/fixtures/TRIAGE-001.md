# TRIAGE-001 — Unsupported assumption directly supports accepted conclusion

**Acceptance fixture:** TRIAGE-001  
**Expected triage state:** `CRITICAL`

## Purpose

Verify high-impact unsupported assumptions become CRITICAL.

## Graph setup

`A-001 → CLAIM-001 → CONCLUSION-001 (ACCEPTED)`

Primary subject type: `ASSUMPTION`

## Expected evaluation dimensions

| Dimension | Rating |
|---|---|
| evidence_strength | `LOW` |
| source_quality | `UNASSESSED` |
| contradiction | `LOW` |
| assumption_burden | `HIGH` |
| generalization_risk | `MODERATE` |
| downstream_impact | `HIGH` |

## Expected internal prioritization

- weakness score: `3`
- impact score: `3`
- priority score: `9`
- direct to accepted conclusion: `true`

These values are prioritization mechanics, **not truth/confidence scores**.

## Expected reason codes

- `UNSUPPORTED_ASSUMPTION`
- `DEPENDENCY_ON_UNASSESSED_NODE`

## Acceptance assertions

1. `triage_workspace` returns `CRITICAL` for the target item.
2. Returned evaluation references the target item and relevant dependency IDs.
3. Triage output preserves the distinction between missing, contradicted, and unassessed states.
4. Knowledge state is unchanged by evaluation/triage.
5. Any source/evidence text returned to an agent remains untrusted content.

## Negative assertion

Must not label the assumption 'false'; must not auto-revise the conclusion.

## Gate

**PASS only when deterministic implementation matches all assertions.**
