# GROUNDLINE — PREPRODUCTION READINESS GATE

**Gate:** PREPRODUCTION_READINESS_GATE  
**Result:** **PASS**  
**Date:** 2026-09-02

## Required preconditions

| Condition | Result |
|---|---|
| Problem grounded in documented real failure modes | PASS |
| Product scope bounded | PASS |
| PRD complete enough for build | PASS |
| Domain rules explicit | PASS |
| Final schema frozen | PASS |
| Schema supersession recorded | PASS |
| Toolchain locked | PASS |
| 30 broad evaluation cases exist | PASS |
| 8 triage acceptance fixtures frozen | PASS |
| Integration 001 frozen | PASS |
| Human authority negative tests defined | PASS |
| Prompt-injection/source boundary defined | PASS |
| Consistency audit | PASS |

## Build permission

Because the gate is PASS, implementation may begin.

## First permitted vertical slice

Only build enough to prove:

1. load `INTEGRATION-001`;
2. render the graph;
3. register `inspect_workspace`;
4. register `triage_workspace`;
5. produce `A-001 / CRITICAL`;
6. call `focus_items`;
7. call `trace_dependencies(A-001)`;
8. call `propose_revision(CONC-001)`;
9. show proposal in UI;
10. human rejects or accepts;
11. verify audit state.

Do not implement all nine tools simultaneously if the first slice is not working.

## Production start constraints

P0 implementation MUST:
- use `FEATURE_SCHEMA_FINAL.yaml`;
- preserve GL-BASELINE-1.1 semantics;
- treat Integration 001 as the first executable end-to-end contract;
- keep the app usable without a proprietary backend;
- keep WebMCP central to the demonstrated workflow.

## Explicitly still forbidden

Before the vertical slice passes:
- RAG/search;
- user accounts;
- database;
- multi-workspace sync;
- generic chat panel;
- automatic source crawling;
- additional agent roles;
- analytics;
- "AI confidence" or truth score.

## Exit from preproduction

**PREPRODUCTION: CLOSED / IMPLEMENTATION: AUTHORIZED.**

Any semantic deviation discovered during build must reopen preproduction through `SCHEMA_CHANGE_REQUEST_002.md`, not be patched silently.
