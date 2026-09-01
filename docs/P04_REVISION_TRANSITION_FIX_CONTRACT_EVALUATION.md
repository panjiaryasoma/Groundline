# P-04 REVISION STATE TRANSITION FIX — CONTRACT EVALUATION

**Issue:** All HUMAN review transitions failed workspace validation.  
**Root cause:** Implementation schema misinterpreted a temporal contract rule as a permanent invariant.  
**Decision:** IMPLEMENTATION FIX. CONTRACT REMAINS AUTHORITATIVE.

## Active contract

`FEATURE_SCHEMA_FINAL.yaml` states:

- `AGENT-created revision MUST start PROPOSED`
- `only explicit HUMAN action may transition a proposed revision into an accepted state`

The operative phrase is **must start**.

An agent-created revision may therefore legitimately have a later reviewed state after explicit HUMAN review.

## Incorrect implementation

The previous TypeScript schema effectively required:

`created_by=AGENT => state=PROPOSED forever`

That made valid human transitions impossible and contradicted the active contract.

## Correct implementation

### PROPOSED
A proposed revision must have:
- no `reviewed_by`
- no `reviewed_at`

### Reviewed states
Any state other than PROPOSED:
- `ACCEPTED`
- `REJECTED`
- `EDITED_AND_ACCEPTED`
- `DEFERRED`

must have:
- `reviewed_by = HUMAN`
- non-empty `reviewed_at`

This preserves:
- original creator provenance (`created_by=AGENT` may remain);
- explicit human authority;
- review provenance.

## Why no schema change request is required

The YAML contract already expresses the intended semantics correctly.

The defect was only in the TypeScript translation of that contract.

Therefore:

- `SCHEMA_CHANGE_REQUEST_002` = NOT REQUIRED
- active schema version remains `1.1.0`
- baseline remains `GL-BASELINE-1.1`

## Expected impact

The seven previously failing P-04 tests should now pass because their transitions contain explicit HUMAN review provenance.

Two additional schema tests were added to prevent regression.

Previous target: 44 tests  
New target: **46 tests**

## Contract decision

**PASS WITH IMPLEMENTATION CORRECTION. CONTRACT UNCHANGED.**
