# GROUNDLINE — IMPLEMENTATION HANDOFF PLAN v1.0 DRAFT

## 1. Objective

Translate frozen preproduction contracts into a runnable public WebMCP app without reopening product discovery.

## 2. Handoff inputs

Implementation MUST consume these artifacts as source of truth:

### Active contracts
- `04_PREPRODUCTION/01_CONTRACTS_ACTIVE/BASELINE_CONTRACT.md`
- `04_PREPRODUCTION/01_CONTRACTS_ACTIVE/FEATURE_SCHEMA_FINAL.yaml`
- `04_PREPRODUCTION/01_CONTRACTS_ACTIVE/TOOLCHAIN_DECISION.md`

### Acceptance
- `04_PREPRODUCTION/02_TRIAGE_ACCEPTANCE/TRIAGE_EVALUATION_SUITE.md`
- `TRIAGE-001…008`

### Integration
- `04_PREPRODUCTION/03_INTEGRATION_001/POLICY_FIXTURE.yaml`
- `EXPECTED_SCORES.yaml`
- `EXPECTED_TRIAGE_OUTPUT.yaml`
- `EXPECTED_GATE_RESULTS.yaml`

### Closure
- `PREPRODUCTION_READINESS_GATE.md`

## 3. Build strategy

### Stage A — Repository bootstrap
Deliver:
- Vite React TypeScript app;
- test runner;
- package scripts;
- clean source folders;
- committed Integration 001 fixture;
- schema/types.

Exit:
`npm test` runs and app boots locally.

### Stage B — Domain engine first
Implement:
- schema validation;
- graph lookup helpers;
- evaluation mapping;
- weakness/impact calculation;
- triage state derivation;
- cycle-safe dependency traversal;
- revision state transition rules.

Exit:
TRIAGE-001…008 pass deterministic tests.

### Stage C — Minimal UI
Implement:
- Groundline header;
- graph canvas;
- reasoning nodes;
- typed edges;
- inspector/review panel;
- triage state display;
- proposed revision card;
- accept/edit/reject controls;
- audit timeline.

Exit:
Integration 001 can be operated manually without WebMCP.

### Stage D — WebMCP vertical slice
Register:
1. `inspect_workspace`
2. `triage_workspace`
3. `focus_items`
4. `trace_dependencies`
5. `propose_revision`

Exit:
central demo loop works through WebMCP.

### Stage E — Complete tool surface
Add:
- `inspect_item`
- `evaluate_item`
- `find_contradictions`
- `find_evidence_gaps`

Exit:
all nine P0 tools validate inputs and return bounded outputs.

### Stage F — Visual polish
Apply geological cross-section / stratigraphy system:
- ivory background;
- charcoal typography;
- restrained earth strata;
- fault/weakness visual;
- scientific-atlas annotation language.

Do not rebuild graph architecture for decorative effect.

### Stage G — Deployment and judge path
- Vercel deploy;
- incognito public access test;
- Chrome 149+ WebMCP test;
- seeded demo reset;
- README exact test steps.

### Stage H — Submission assets
- <3 minute YouTube demo with audio;
- Devpost description;
- screenshots/thumbnail;
- repository license;
- final live URL.

## 4. Implementation boundaries

### Allowed local determinism
Groundline may compute:
- triage prioritization;
- relation traversal;
- source/evidence-gap state;
- explicit contradiction relations;
- state-transition authorization.

### Agent responsibility
Agent may:
- choose tools from natural language;
- synthesize explanations from structured tool results;
- propose narrowed/revised wording.

### Human responsibility
Human alone:
- accepts;
- edits accepted state;
- rejects;
- changes accepted conclusion.

## 5. Change management

If implementation exposes a real semantic contradiction:
1. stop the affected task;
2. create `SCHEMA_CHANGE_REQUEST_002.md`;
3. update final schema;
4. update affected fixtures;
5. rerun closure audit;
6. resume.

Do not change semantics inside TypeScript and rationalize it afterward.

## 6. Definition of handoff complete

This handoff is complete when a developer can start from the repository plan without needing a product-design clarification for P0 semantics.

**Status: READY FOR REPOSITORY EXECUTION.**
