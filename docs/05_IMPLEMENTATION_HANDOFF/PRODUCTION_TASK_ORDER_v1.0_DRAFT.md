# GROUNDLINE — PRODUCTION TASK ORDER v1.0 DRAFT

Tasks are ordered by dependency and risk, not by visual gratification.

## P-00 — Repository bootstrap
- create repo;
- Vite React TypeScript;
- install dependencies;
- add MIT/Apache-2.0 style open-source license;
- configure tests;
- commit preproduction docs or docs reference.

**Exit:** app boots + tests run.

## P-01 — Contract types
Implement:
- enums;
- Zod schemas;
- workspace;
- items;
- relations;
- evaluation;
- triage;
- revision;
- audit.

**Exit:** Integration 001 parses.

## P-02 — Graph domain helpers
- item lookup;
- inbound/outbound relations;
- accepted conclusion lookup;
- cycle-safe traversal;
- downstream accepted nodes.

**Exit:** dependency tests pass.

## P-03 — Evaluation/triage engine
Implement internal score mapping exactly from baseline.

**Exit:** TRIAGE-001…008 = 8/8 PASS.

## P-04 — State-transition authority
Implement:
- PROPOSED revision;
- accept;
- edit-and-accept;
- reject;
- defer;
- supersede;
- audit.

**Exit:** agent cannot direct-accept through domain API.

## P-05 — Seed Integration 001
Load the official fixture.

**Exit:** expected scores/ranking match files.

## P-06 — Minimal graph UI
- nodes;
- edges;
- selected/focused state;
- inspector;
- triage labels;
- revision card;
- audit.

**Exit:** manual workflow works.

## P-07 — WebMCP bootstrap
Feature-detect modelContext and create registration helper.

Register:
- `inspect_workspace`
- `triage_workspace`

**Exit:** manual tool invocation works in Chrome.

## P-08 — Vertical slice WebMCP
Add:
- `focus_items`
- `trace_dependencies`
- `propose_revision`

**Exit:** complete central demo works.

## P-09 — Remaining P0 WebMCP
- `inspect_item`
- `evaluate_item`
- `find_contradictions`
- `find_evidence_gaps`

**Exit:** 9/9 registered and input-validated.

## P-10 — Security/robustness
- untrusted source handling;
- prompt-injection fixture;
- bad ID;
- graph cycle;
- bounded output.

**Exit:** hard blocker tests pass.

## P-11 — Geological UI pass
Apply:
- Groundline branding;
- stratigraphy layers;
- fault highlighting;
- scientific annotation;
- restrained typography.

**Exit:** visually coherent without reducing graph usability.

## P-12 — Accessibility/responsive
- keyboard-visible controls;
- text statuses;
- usable desktop viewport;
- no color-only risk state.

## P-13 — Deploy
Vercel + public URL.

## P-14 — Live WebMCP evaluation
Run natural-language routing prompts repeatedly and record outcome.

## P-15 — README + judge instructions
Must state:
- Chrome/WebMCP setup;
- exact demo prompt path;
- no custom model;
- human authority boundary;
- limitations.

## P-16 — Demo video
<3 minutes, audio, public YouTube.

Show product working within first 15 seconds.

## P-17 — Submission QA
- repo public incognito;
- license visible;
- live site;
- WebMCP;
- video;
- English text;
- links;
- submit status not draft.

## Hard dependency path

`P-00 → P-01 → P-02 → P-03 → P-05 → P-07 → P-08`

That path outranks all visual polish.
