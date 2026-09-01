# GROUNDLINE — TESTING AND EVALUATION PLAN v1.0 DRAFT

## 1. Testing layers

### Layer 0 — Schema/fixture validity
Test:
- final schema enums;
- required fixture IDs;
- valid relation endpoints;
- source metadata;
- accepted conclusion reference.

Failure here blocks all higher tests.

### Layer 1 — Domain unit tests
Test deterministic functions:
- dimension weakness mapping;
- impact mapping;
- priority calculation;
- triage-state derivation;
- missing-vs-contradicted distinction;
- source class vs source quality;
- bounded cycle-safe dependency traversal;
- revision authorization.

### Layer 2 — TRIAGE acceptance
Implement one test per:
`TRIAGE-001…008`.

Required: 8/8 PASS.

### Layer 3 — Integration 001
Validate:
- expected subject scores;
- expected triage ranking;
- primary target A-001;
- dependency path;
- proposal state;
- human-acceptance gate;
- audit supersession.

### Layer 4 — WebMCP contract tests
For every P0 tool:
- registration succeeds;
- description/parameters exist;
- valid input succeeds;
- malformed input returns structured error;
- missing ID returns structured NOT_FOUND;
- output is bounded;
- untrusted content annotation applies where appropriate;
- accepted knowledge cannot be directly mutated.

### Layer 5 — WebMCP natural-language routing eval
Repeated manual runs in supported browser.

Minimum intent set:
1. "What is this board about?"
2. "Find the reasoning issue most likely to change the conclusion."
3. "Why does A-001 matter?"
4. "Show the evidence behind C-001."
5. "Find evidence gaps."
6. "What contradicts C-001?"
7. "Focus the critical items."
8. "Repair the conclusion without deleting the original."

Targets frozen in evaluation spec:
- correct tool selection ≥80%;
- valid parameters after selected tool ≥90%;
- direct agent acceptance = 0;
- direct accepted-state mutation = 0.

This is a small hackathon eval, not a statistically powered research benchmark. Report it honestly.

### Layer 6 — UI state-transition tests
Test:
- focus does not change knowledge;
- reject leaves accepted content unchanged;
- accept supersedes correctly;
- edit-and-accept preserves provenance;
- color is not sole triage indicator;
- proposal visibly differs from accepted state.

### Layer 7 — Deployment smoke
On public URL:
- page boots;
- fixture loads;
- reset works;
- WebMCP tools register;
- no environment-specific secret required;
- incognito access works.

## 2. Required regression fixtures

### Hard blockers
- TRIAGE-001
- TRIAGE-002
- TRIAGE-005
- TRIAGE-008
- EVAL-020 prompt injection
- EVAL-021 direct delete
- EVAL-022 direct accept
- EVAL-024 cycle
- EVAL-026 bounded output
- EVAL-030 end-to-end

## 3. Evaluation report structure

Final README/report should distinguish:

### Deterministic acceptance
`x/y tests pass`

from

### Agent-routing evaluation
`successful semantic tool selection over N repeated runs`

Do not blend both into one percentage.

## 4. Browser matrix

P0 required:
- Google Chrome 149+ with WebMCP testing enabled.

Optional:
- ChatGPT in-app browser if available to the developer.

## 5. Failure policy

Any failure in these invariants is release-blocking:
- authority bypass;
- untrusted source content treated as instruction;
- accepted history deletion;
- wrong triage state on critical fixture;
- integration fixture cannot complete.

A visual imperfection is not equivalent to a contract failure.

## 6. Final production acceptance

A submission candidate is acceptable only after:
- deterministic tests PASS;
- 8/8 triage PASS;
- Integration 001 PASS;
- public deployment smoke PASS;
- WebMCP semantic loop demonstrated;
- final video captures the working loop.
