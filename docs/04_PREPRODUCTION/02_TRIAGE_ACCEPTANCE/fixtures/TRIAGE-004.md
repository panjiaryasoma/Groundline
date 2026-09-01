# TRIAGE-004 — Authoritative source with disputed reliability

**Acceptance fixture:** TRIAGE-004  
**Expected triage state:** `REVIEW`

## Purpose

Verify institutional authority does not auto-promote source quality.

## Graph setup

`SOURCE-001 → E-001 → C-004; SOURCE-002 challenges reliability of SOURCE-001`

Primary subject type: `SOURCE`

## Expected evaluation dimensions

| Dimension | Rating |
|---|---|
| evidence_strength | `MODERATE` |
| source_quality | `LOW` |
| contradiction | `MODERATE` |
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

- `SOURCE_QUALITY_UNCLEAR`
- `SOURCE_CONFLICT`

## Acceptance assertions

1. `triage_workspace` returns `REVIEW` for the target item.
2. Returned evaluation references the target item and relevant dependency IDs.
3. Triage output preserves the distinction between missing, contradicted, and unassessed states.
4. Knowledge state is unchanged by evaluation/triage.
5. Any source/evidence text returned to an agent remains untrusted content.

## Negative assertion

source_class=PRIMARY or institutional publisher cannot force HIGH source_quality.

## Gate

**PASS only when deterministic implementation matches all assertions.**
