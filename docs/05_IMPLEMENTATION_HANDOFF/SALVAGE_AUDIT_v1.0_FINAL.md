# GROUNDLINE — SALVAGE AUDIT v1.0 FINAL

**Purpose:** decide what existing work should be reused, adapted, or explicitly left behind when implementation begins.

## A. Reuse directly

### Final schema
`FEATURE_SCHEMA_FINAL.yaml`

**Decision:** REUSE AS CONTRACT.

### Domain rules
`domain_rules_v1.0.yaml`

**Decision:** REUSE SEMANTICS; encode as typed domain functions/tests.

### TRIAGE-001…008
**Decision:** REUSE AS ACCEPTANCE TEST SOURCE.

### Integration 001
**Decision:** REUSE AS FIRST SEEDED RUNTIME WORKSPACE.

### Source schema and security rules
**Decision:** REUSE.

### Geological visual direction
**Decision:** REUSE AS DESIGN LANGUAGE.

Keep:
- stratigraphic layers;
- fault metaphor;
- scientific annotation;
- restrained palette.

Do not make the entire interface a decorative illustration that damages usability.

## B. Adapt, do not copy literally

### YAML schemas
Production TypeScript types/Zod schemas should be generated or manually aligned, but YAML remains the contract reference.

### Evaluation matrix
Convert applicable rows into tests. Do not create a runtime "evaluation spreadsheet engine."

### Historical cases
Use for README/problem framing and fixtures only where clearly labeled.

Do not imply historical prevention.

### Internal triage score
Reuse the deterministic mapping only as an internal operational mechanism.

Do not expose it as "87% truth" or "confidence."

## C. Do not salvage

### Custom dataset/model pipeline
There is none for Groundline P0 and none should be imported from unrelated projects.

### Afterlife AI domain logic
Do not port surplus inventory rules, optimization, domain models, or datasets.

### Shipcheck product/domain code
Do not turn Groundline into a repository-quality analyzer.

### Scam Museum NLP pipeline
Do not add TF-IDF/classifier machinery because it exists elsewhere.

### Generic auth/dashboard scaffolding
No need.

## D. Generic patterns that may be reused carefully

Reusable engineering patterns are acceptable:
- test naming;
- README discipline;
- Vercel deployment practices;
- fixture organization;
- CI concepts;
- release tags.

They must be adapted to Groundline's actual stack and contracts.

## E. Salvage risk

The biggest danger is **conceptual sediment**: adding infrastructure simply because previous projects had it.

Groundline's strongest architecture is unusually small:
`browser agent + WebMCP + structured client state + deterministic rules`.

Do not punish that clarity by importing an ecosystem.

## Final salvage decision

**SALVAGE: contracts, fixtures, evaluation discipline, visual direction.**  
**DO NOT SALVAGE: unrelated model/domain/backend complexity.**
