# TRIAGE-008 — Insufficient information

**Acceptance fixture:** TRIAGE-008  
**Expected triage state:** `UNASSESSED`

## Purpose

Verify incomplete reasoning returns UNASSESSED instead of optimistic default.

## Graph setup

`C-UNKNOWN exists without enough relations/source/evidence context`

Primary subject type: `CLAIM`

## Expected evaluation dimensions

| Dimension | Rating |
|---|---|
| evidence_strength | `UNASSESSED` |
| source_quality | `UNASSESSED` |
| contradiction | `UNASSESSED` |
| assumption_burden | `UNASSESSED` |
| generalization_risk | `UNASSESSED` |
| downstream_impact | `UNASSESSED` |

## Expected internal prioritization

- weakness score: `None`
- impact score: `None`
- priority score: `None`
- direct to accepted conclusion: `false`

These values are prioritization mechanics, **not truth/confidence scores**.

## Expected reason codes

- `DEPENDENCY_ON_UNASSESSED_NODE`

## Acceptance assertions

1. `triage_workspace` returns `UNASSESSED` for the target item.
2. Returned evaluation references the target item and relevant dependency IDs.
3. Triage output preserves the distinction between missing, contradicted, and unassessed states.
4. Knowledge state is unchanged by evaluation/triage.
5. Any source/evidence text returned to an agent remains untrusted content.

## Negative assertion

Must not default to STABLE.

## Gate

**PASS only when deterministic implementation matches all assertions.**
