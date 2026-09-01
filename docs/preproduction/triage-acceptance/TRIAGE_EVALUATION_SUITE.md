# GROUNDLINE — TRIAGE EVALUATION SUITE

**Version:** 1.0  
**Contract:** GL-BASELINE-1.1

## Objective

Prove that the triage model prioritizes **structural reasoning risk**, not merely weak-looking text.

## Scoring contract

`priority = weakness × impact`

See `BASELINE_CONTRACT.md` for the canonical mapping.

## Acceptance matrix

| ID | Case | Weakness | Impact | Priority | Expected |
|---|---|---:|---:|---:|---|
| TRIAGE-001 | Unsupported assumption directly supports accepted conclusion | 3 | 3 | 9 | `CRITICAL` |
| TRIAGE-002 | Overgeneralized claim with subgroup counterevidence | 3 | 3 | 9 | `CRITICAL` |
| TRIAGE-003 | Missing direct evidence on an intermediate claim | 3 | 2 | 6 | `REVIEW` |
| TRIAGE-004 | Authoritative source with disputed reliability | 3 | 2 | 6 | `REVIEW` |
| TRIAGE-005 | Explicit contradiction on a conclusion-driving claim | 3 | 3 | 9 | `CRITICAL` |
| TRIAGE-006 | Weak isolated side claim | 3 | 1 | 3 | `REVIEW` |
| TRIAGE-007 | Well-supported stable claim | 0 | 3 | 0 | `STABLE` |
| TRIAGE-008 | Insufficient information | None | None | None | `UNASSESSED` |

## Suite-wide invariants

1. No case emits a truth probability.
2. No evaluation operation changes accepted knowledge.
3. `MISSING_EVIDENCE != CONTRADICTED != UNASSESSED`.
4. Source class is not source quality.
5. High impact without weakness can remain STABLE.
6. High weakness without high impact is REVIEW, not automatically CRITICAL.
7. Agent-created repair is PROPOSED until human review.
8. Malicious source text remains data.

## Required result

- TRIAGE-001 PASS
- TRIAGE-002 PASS
- TRIAGE-003 PASS
- TRIAGE-004 PASS
- TRIAGE-005 PASS
- TRIAGE-006 PASS
- TRIAGE-007 PASS
- TRIAGE-008 PASS

**Suite decision before implementation:** CONTRACT COMPLETE / EXECUTION PENDING.
