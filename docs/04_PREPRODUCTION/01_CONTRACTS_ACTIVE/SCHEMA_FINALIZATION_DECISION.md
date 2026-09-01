# SCHEMA FINALIZATION DECISION

**Decision:** FINALIZE FEATURE SCHEMA v1.1.0  
**Date:** 2026-09-02  
**Decision status:** APPROVED FOR IMPLEMENTATION

## Review performed

The final schema was reviewed against:
- Problem Brief;
- real-case discovery;
- PRD;
- PRD/schema alignment addendum;
- domain rules;
- 30-source evaluation suite;
- 8 triage acceptance fixtures;
- Integration 001.

## Questions resolved

### Is a revision knowledge?
No. It is a state-transition proposal.

### Is triage a fact about the world?
No. It is an operational review priority produced from the represented reasoning state.

### Is source class equivalent to source quality?
No.

### May the agent accept its own recommendation?
No.

### Can a UI focus change modify accepted knowledge?
No.

### Can Groundline output a truth percentage?
No.

### Does a missing source contradict a claim?
No.

## Finalization rationale

The schema is now detailed enough to:
- implement deterministic triage;
- make security boundaries testable;
- represent human acceptance correctly;
- generate stable integration fixtures;
- expose bounded WebMCP tools.

Further schema expansion before a working vertical slice would increase risk more than value.

## Decision

`FEATURE_SCHEMA_FINAL.yaml` v1.1.0 is **FINAL FOR P0 IMPLEMENTATION**.

Changes require a new numbered schema change request.
