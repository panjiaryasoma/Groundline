# P-04 CONTRACT EVALUATION

**Milestone:** Revision Authority  
**Artifact result:** PASS  
**Local runtime gate:** PENDING

## Agent proposal

**PASS**

Agent-created revision starts `PROPOSED`.

`proposeRevision()` does not alter the accepted target item or accepted conclusion.

## Human review boundary

**PASS**

These operations require `actor = HUMAN`:

- accept;
- edit-and-accept;
- reject;
- defer.

Any AGENT attempt returns:

`HUMAN_APPROVAL_REQUIRED`

## Acceptance behavior

**PASS**

On human acceptance:

1. original accepted item remains in workspace;
2. original state becomes `SUPERSEDED`;
3. replacement item becomes `ACCEPTED`;
4. replacement records `supersedes_id`;
5. a typed `SUPERSEDES` relation is created;
6. if the target was the accepted conclusion, `accepted_conclusion_id` moves to the replacement;
7. audit events preserve the transition.

## Edit-and-accept

**PASS**

The original agent proposal remains preserved in the revision record.

The human-edited accepted text becomes the accepted replacement.

This preserves the distinction between:
- agent proposal;
- human final decision.

## Reject / defer

**PASS**

Neither operation changes accepted knowledge.

## Re-review

**PASS**

A revision that has left `PROPOSED` cannot be reviewed again through the P-04 transition functions.

## Historical provenance

**PASS**

No destructive deletion occurs.

The superseded item remains available for audit/history.

## Relation migration boundary

**DEFERRED INTENTIONALLY**

P-04 adds only the `SUPERSEDES` lineage relation.

It does not automatically clone all active support/challenge/dependency relations from the superseded item to the replacement.

Reason:
the active contract requires provenance preservation and accepted replacement, but does not specify automatic relation rewiring semantics.

This behavior must be evaluated in P-05 Integration 001 before any improvisation is added.

If Integration 001 requires relation rewiring to preserve the active reasoning path, that change must be evaluated explicitly against the contract rather than silently introduced here.

## Delete authority

**NO DELETE API ADDED**

The contract says accepted deletion is human-authority only, but P0 WebMCP exposes no delete tool and P-04 does not require a general deletion feature.

Avoiding a delete API is stricter than the minimum contract and reduces attack surface.

## Schema

**UNCHANGED**

No schema change request is required.

## Contract changes

**NONE.**

## Expected local test delta

Previous tests: 33  
P-04 new tests: 11  
Expected total: **44 tests**

After:
- typecheck PASS
- build PASS
- 44/44 tests PASS

P-04 may close and P-05 Integration 001 may begin.
