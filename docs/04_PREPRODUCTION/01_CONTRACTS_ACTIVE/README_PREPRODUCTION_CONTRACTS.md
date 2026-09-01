# PREPRODUCTION CONTRACTS — SECOND BRAIN

This folder is the implementation-facing contract layer.

## Read order

1. `BASELINE_CONTRACT.md`
2. `SCHEMA_CHANGE_REQUEST_001.md`
3. `FEATURE_SCHEMA_FINAL.yaml`
4. `SCHEMA_FINALIZATION_DECISION.md`
5. `SCHEMA_SUPERSESSION_NOTICE.md`
6. `TOOLCHAIN_DECISION.md`

## Source hierarchy

If documents conflict:

1. `BASELINE_CONTRACT.md`
2. `FEATURE_SCHEMA_FINAL.yaml`
3. accepted schema change requests
4. original PRD/domain-rule artifacts
5. implementation code

Implementation code never wins a semantic conflict merely because it already exists.

## What is frozen

- knowledge types;
- relation types;
- state transitions;
- triage states;
- scoring semantics;
- human authority boundary;
- WebMCP tool surface;
- source safety rules.

## What remains implementation freedom

- component/file names;
- CSS/layout implementation;
- state-store library details;
- test framework organization;
- exact visual rendering of the geological metaphor.

## Change procedure

Any semantic change after this freeze must:
1. create a numbered schema change request;
2. update final schema;
3. update affected triage fixtures;
4. update integration fixture;
5. rerun consistency audit;
6. rerun readiness gate.

No "tiny harmless tweak" exemption exists. Those are how contracts become archaeological sites.
