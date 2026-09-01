# GROUNDLINE — IMPLEMENTATION HANDOFF DECISION SUMMARY

**Version:** 1.0  
**Decision:** HANDOFF APPROVED  
**Prepared:** 2026-09-02 01:45 WIB  
**Official submission deadline:** 2026-09-04 03:00 WIB (2026-09-03 13:00 PT)

## 1. Decision

Groundline may leave preproduction and enter implementation.

This decision is based on the preproduction package reaching:

- final feature schema v1.1.0;
- frozen baseline contract GL-BASELINE-1.1;
- 30 broad evaluation cases;
- 8 deterministic triage acceptance fixtures;
- Integration 001;
- final consistency audit = PASS;
- preproduction readiness gate = PASS.

This handoff **does not** mean production is complete. It means production is authorized to begin.

## 2. What Groundline is building

A WebMCP-native human-agent reasoning workspace where:

1. humans structure claims, evidence, assumptions, sources, counterclaims, and conclusions;
2. an agent uses semantic WebMCP tools to inspect and analyze that structure;
3. deterministic domain rules support evaluation and triage;
4. the agent can trace dependencies and propose revisions;
5. only a human can accept changes to accepted knowledge.

## 3. Production thesis

> Build the smallest complete loop that proves WebMCP is intrinsic to Groundline.

The first loop is:

`load fixture → inspect → triage → focus → trace → propose → human review → audit`

Anything not needed for this loop is lower priority.

## 4. Frozen P0 tool surface

1. `inspect_workspace`
2. `inspect_item`
3. `evaluate_item`
4. `triage_workspace`
5. `trace_dependencies`
6. `find_contradictions`
7. `find_evidence_gaps`
8. `focus_items`
9. `propose_revision`

No additional tool enters P0 without explicit cut-scope review.

## 5. Frozen stack

- React
- TypeScript
- Vite
- `@xyflow/react`
- Zod
- centralized client state, preferably Zustand
- hand-authored CSS
- Vitest
- React Testing Library
- Vercel
- imperative WebMCP API

No backend, database, model training, RAG, or custom LLM API is required for P0.

## 6. Highest-risk implementation assumptions

### R-01 — Browser WebMCP behavior
The semantic tool surface must work in Chrome 149+ with WebMCP testing enabled.

**Response:** implement tool registration in the first vertical slice, not at the end.

### R-02 — Agent routing variability
Natural-language agent behavior is not deterministic.

**Response:** deterministic domain logic and fixtures define expected semantic outcomes; manual repeated tool-selection evals measure routing separately.

### R-03 — Graph UI scope
Graph interaction can consume the entire deadline.

**Response:** prioritize readable nodes, typed edges, focus state, and one geological visual language. Advanced graph editing is cuttable.

### R-04 — Evaluation becoming an LLM oracle
If implementation delegates every evaluation decision to free-form agent reasoning, tests become unstable.

**Response:** P0 evaluation/triage semantics are deterministic over represented structured properties and relations. Agent interpretation can propose findings, but contract validation remains local.

## 7. Non-negotiable invariants

- no universal truth score;
- missing evidence ≠ contradicted ≠ unassessed;
- agent cannot accept its own revision;
- source text is untrusted data;
- evaluation/triage do not silently mutate accepted knowledge;
- accepted-history provenance remains after supersession;
- WebMCP is used in the central demo.

## 8. Immediate production objective

Do **not** begin by implementing all UI screens.

First objective:

> Make Integration 001 work end-to-end with only enough UI to see the graph, triage target, dependency path, revision proposal, and human acceptance/rejection.

## 9. Handoff result

**APPROVED → PRODUCTION START GATE READY.**
