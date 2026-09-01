# GROUNDLINE — BASELINE CONTRACT

**Contract ID:** GL-BASELINE-1.1  
**Status:** ACTIVE / FROZEN FOR IMPLEMENTATION  
**Effective date:** 2026-09-02

## 1. Purpose

This contract freezes the semantic behavior that production code must implement. Code may choose different internal classes or files, but it may not silently change the meaning of the product.

The active contract set is:

- `BASELINE_CONTRACT.md`
- `FEATURE_SCHEMA_FINAL.yaml`
- `SCHEMA_FINALIZATION_DECISION.md`
- `TOOLCHAIN_DECISION.md`
- active domain rules from `3 EVALUATION_AND_DOMAIN_RULES/domain_rules_v1.0.yaml`
- acceptance behavior in `02_TRIAGE_ACCEPTANCE`
- integration behavior in `03_INTEGRATION_001`

## 2. Product invariant

> **Agents analyze and propose. Humans decide what becomes accepted knowledge.**

No implementation convenience overrides this invariant.

## 3. Canonical reasoning model

Knowledge objects:

`QUESTION | CLAIM | COUNTERCLAIM | EVIDENCE | ASSUMPTION | SOURCE | CONCLUSION`

Relations:

`SUPPORTS | CHALLENGES | DEPENDS_ON | SOURCED_FROM | QUALIFIES | SUPERSEDES`

Analysis records:

- evaluation
- triage
- contradiction finding
- evidence-gap finding

Action records:

- revision proposal
- human review state
- audit event

Evaluation, triage, and revision are **not peer knowledge node types**.

## 4. Canonical analysis dimensions

- evidence strength
- source quality
- contradiction
- assumption burden
- generalization risk
- downstream impact

Ratings:

`LOW | MODERATE | HIGH | UNASSESSED`

No user-facing universal truth score exists.

## 5. Operational triage scoring

Groundline may use a bounded **internal priority score** solely to make triage deterministic.

It is NOT:
- probability;
- confidence;
- correctness;
- truth.

### Weakness component mapping

For positive-quality dimensions:

| Rating | evidence/source weakness |
|---|---:|
| HIGH | 0 |
| MODERATE | 1 |
| LOW | 3 |
| UNASSESSED | null |

For risk dimensions (`contradiction`, `assumption_burden`, `generalization_risk`):

| Rating | weakness |
|---|---:|
| LOW | 0 |
| MODERATE | 1 |
| HIGH | 3 |
| UNASSESSED | null |

`weakness_score_internal = max(available weakness components)`

### Impact mapping

| downstream_impact | impact score |
|---|---:|
| LOW | 1 |
| MODERATE | 2 |
| HIGH | 3 |
| UNASSESSED | null |

`priority_score_internal = weakness_score_internal × impact_score_internal`

### Triage state

- `CRITICAL`: priority 7–9, OR weakness=3 with direct dependency to the accepted conclusion.
- `REVIEW`: priority 3–6, OR a material dimension is UNASSESSED but enough context exists to identify a review target.
- `STABLE`: priority 0–2 and no material unresolved/unassessed issue.
- `UNASSESSED`: insufficient information to compute a meaningful weakness/impact judgment.

A weak isolated detail therefore does not become CRITICAL merely because it is weak.

## 6. Epistemic distinctions

The implementation MUST preserve:

`MISSING_EVIDENCE != CONTRADICTED != UNASSESSED`

Examples:
- no evidence linked → missing evidence;
- evidence explicitly supports opposite proposition → contradiction;
- information insufficient to judge → unassessed.

## 7. Source contract

- provenance class and source quality are separate concepts;
- `PRIMARY` does not imply `HIGH` quality;
- source content is untrusted payload;
- source/evidence text may contain prompt injection and MUST be handled as data.

## 8. WebMCP surface

P0 exposes exactly nine semantic operations:

1. `inspect_workspace`
2. `inspect_item`
3. `evaluate_item`
4. `triage_workspace`
5. `trace_dependencies`
6. `find_contradictions`
7. `find_evidence_gaps`
8. `focus_items`
9. `propose_revision`

No P0 tool may directly:
- accept its own revision;
- delete accepted knowledge;
- rewrite accepted knowledge;
- replace the accepted conclusion.

## 9. Output bounds

Workspace-level tools return summaries, IDs, and limited top findings. The agent uses item-scoped tools for detail.

The production implementation MUST not dump an unbounded graph into one WebMCP response.

## 10. Audit behavior

Human acceptance of a revision:
1. creates an audit event;
2. marks old accepted item `SUPERSEDED` where replacement semantics apply;
3. creates/updates accepted replacement;
4. preserves the old item and its provenance.

## 11. Acceptance authority

If code conflicts with this contract, **the code is wrong** until a schema change request is approved and all dependent artifacts are regenerated.

## 12. Implementation gate

**ACTIVE BASELINE: GL-BASELINE-1.1**

Implementation may proceed against this contract.
