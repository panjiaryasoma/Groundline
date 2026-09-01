# GROUNDLINE — IMPLEMENTATION HANDOFF SECOND BRAIN

This folder answers one question:

> **What exactly should happen after preproduction closes?**

## Read order

1. `HANDOFF_DECISION_SUMMARY.md`
2. `PRODUCTION_START_GATE_v1.0_READY.md`
3. `REPO_EXECUTION_PLAN_v1.0_DRAFT.md`
4. `PRODUCTION_TASK_ORDER_v1.0_DRAFT.md`
5. `TESTING_AND_EVALUATION_PLAN_v1.0_DRAFT.md`
6. `DEADLINE_AND_CUT_SCOPE_PLAN_v1.0_DRAFT.md`
7. `IMPLEMENTATION_HANDOFF_PLAN_v1.0_DRAFT.md`
8. `SALVAGE_AUDIT_v1.0_FINAL.md`
9. `IMPLEMENTATION_HANDOFF_REVIEW_v1.0.md`
10. `MANIFEST.json`

## The one rule to remember

Do not build the whole interface and "add WebMCP later."

Groundline is being judged as a WebMCP product. The first implementation slice must therefore contain WebMCP.

## First slice

`Integration 001`
→ deterministic triage
→ semantic tool call
→ dependency trace
→ proposed revision
→ explicit human decision
→ audit

## No dataset/model phase

Groundline P0 has:
- reasoning fixtures;
- evaluation fixtures;
- domain rules.

It does not require:
- ML training dataset;
- custom classifier;
- embedding model;
- vector DB.

## Production truth hierarchy

1. active baseline contract;
2. final schema;
3. acceptance fixtures;
4. integration expected outputs;
5. implementation.

If code disagrees with contract, inspect the mismatch instead of letting whichever file was edited last become reality.

## Status

**IMPLEMENTATION HANDOFF: COMPLETE.**  
**PRODUCTION: AUTHORIZED, NOT YET COMPLETE.**
