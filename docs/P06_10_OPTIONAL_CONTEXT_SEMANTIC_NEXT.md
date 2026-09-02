# P-06.10 OPTIONAL CONTEXT + SEMANTIC NEXT-STAGE UX

## Problems corrected

### Intake navigation

The intake wizard had a contextual Back action but no explicit way to leave the workflow and return Home.

It now includes:

`Exit workspace`

This always returns to the Groundline start screen.

### Optional fields were accidentally treated as blockers

The intake copy explicitly says assumption, evidence, and source are optional.

The previous readiness logic contradicted that statement by refusing `READY_FOR_AGENT_REVIEW` when any optional field was missing.

That was a product-contract inconsistency.

## Correct readiness rule

Required custom-input core:

- decision question
- current answer
- main reason

If those three exist, the workspace is structurally ready for semantic review.

Optional:

- explicit assumption
- evidence
- source provenance

Missing optional context is now reported as:

`Optional improvement`

It never blocks the next stage.

## Post-analysis actions

After `Run analysis`, the user now sees:

- Focus primary risk
- Propose repair

These are intentionally presented as the semantic next stage rather than replacing the primary flow with `Add the missing pieces`.

Optional gaps remain visible through `Add optional context`.

## Important WebMCP boundary

The web page cannot honestly perform semantic agent reasoning on arbitrary free text by itself.

Therefore clicking:

- Focus primary risk
- Propose repair

does not fabricate a local result.

Instead Groundline explicitly explains the handoff:

- semantic triage must be produced by the connected WebMCP agent before a real primary-risk focus exists;
- a repair proposal requires a semantic review target and remains subject to HUMAN accept/edit/reject/defer.

This preserves the authority and evaluation contracts while keeping the expected controls visible and understandable.

## Contract evaluation

- schema: unchanged
- knowledge types: unchanged
- optional intake semantics: corrected to match existing UI contract
- local semantic inference: still prohibited
- triage semantics: unchanged
- revision authority: unchanged
- no automatic semantic rewiring: unchanged
- WebMCP boundary: preserved

**CONTRACT CHANGE: NONE**
**CONTRACT CONSISTENCY FIX: YES**

## Tests

Added:
- intake Exit workspace UX test
- semantic action feedback test

Updated:
- structural diagnostics test to verify optional fields do not block readiness
- custom analysis result test to verify semantic next-stage buttons appear

Previous expected total: 115
New expected total: **117 tests**
