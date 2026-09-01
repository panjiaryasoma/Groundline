# P-05 INTEGRATION 001 CONTRACT EVALUATION

**Milestone:** Integration 001 Runtime Pass  
**Artifact result:** PASS  
**Local runtime gate:** PENDING

## Integration chain

Implemented:

`structured evaluations`
→ `workspace triage`
→ `rank`
→ `dependency trace`
→ `revision proposal`
→ `human acceptance`
→ `supersession + audit`

## Expected scores

The runtime fixture implements the frozen expected values:

### A-001
- weakness 3
- impact 3
- priority 9
- CRITICAL

### C-001
- weakness 3
- impact 3
- priority 9
- CRITICAL

### CC-001
- weakness 0
- impact 2
- priority 0
- STABLE

### CONC-001
- weakness 3
- impact 3
- priority 9
- CRITICAL

## Primary target

**PASS**

A-001 remains the first review target.

P-05 does not invent a semantic tie-breaker between equally scored nodes.

Ranking rules:
1. priority descending;
2. triage class descending;
3. preserve evaluation input order for exact ties.

The Integration 001 evaluation fixture order is itself frozen and places A-001 before C-001 and CONC-001.

## Dependency path

**PASS**

Runtime trace from A-001 reaches:
- C-001
- CONC-001

No cycle and no truncation in Integration 001.

## Proposal boundary

**PASS**

Before HUMAN review:
- revision = PROPOSED
- accepted conclusion remains CONC-001
- original accepted knowledge remains unchanged

## Human acceptance

**PASS**

After explicit HUMAN acceptance:
- CONC-001 → SUPERSEDED
- CONC-002 → ACCEPTED
- accepted_conclusion_id → CONC-002
- provenance retained
- audit retained

## Relation rewiring decision

**DECISION: DO NOT AUTOMATICALLY REWIRE SEMANTIC RELATIONS**

This resolves the open P-04 question.

Reason:

The revised conclusion is not necessarily semantically equivalent to the superseded conclusion.

Automatically copying:
- SUPPORTS
- CHALLENGES
- DEPENDS_ON
- QUALIFIES

would assert that prior relations still apply to new wording without re-evaluation.

That would violate Groundline's epistemic purpose.

Therefore:
- lineage is automatically preserved through `SUPERSEDES`;
- semantic relations are not cloned;
- replacement reasoning starts needing explicit re-analysis/re-linking where appropriate.

This is an implementation interpretation consistent with the active contract and requires no schema change.

## Source security prerequisite

**PASS AS DATA STATE**

NIST source remains:
`external_content = true`

WebMCP `untrustedContentHint` behavior remains P-07/P-08 work.

## Truth-score prohibition

**PASS**

No truth/confidence probability is introduced.

## Contract changes

**NONE**

No `SCHEMA_CHANGE_REQUEST_002` required.

## Expected test delta

Previous: 46  
P-05 new: 15  
Expected total: **61 tests**

After local:
- typecheck PASS
- build PASS
- 61/61 PASS

P-05 may close and P-06 Minimal Graph UI may begin.
