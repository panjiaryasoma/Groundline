# GROUNDLINE PREPRODUCTION — SECOND BRAIN

This package is the preproduction source of truth for Groundline.

## Order
1. Discovery & Problem
2. Product Requirements
3. Evaluation & Domain Rules

## Core rule
> **Agent analyzes and proposes. Human decides what becomes accepted knowledge.**

## Canonical loop
`MAP → EVALUATE → TRIAGE → TRACE → PROPOSE → HUMAN REVIEW → RE-EVALUATE`

## Knowledge objects
`QUESTION, CLAIM, COUNTERCLAIM, EVIDENCE, ASSUMPTION, SOURCE, CONCLUSION`

Evaluation, triage, contradiction findings, gaps and revisions are not peer knowledge nodes.

## Real-world grounding
NASA Challenger/Rogers Commission; NASA Columbia/CAIB; U.S. GAO Patriot report; UK CCRC Horizon cases; Therac-25 history/FDA; NIST face recognition evaluation; WHO living guideline.

## WebMCP grounding
- https://webmachinelearning.github.io/webmcp/
- https://developer.chrome.com/docs/ai/webmcp/secure-tools
- https://developer.chrome.com/docs/ai/webmcp/evals
- https://webmcp.devpost.com/rules

## P0 tools
1. inspect_workspace
2. inspect_item
3. evaluate_item
4. triage_workspace
5. trace_dependencies
6. find_contradictions
7. find_evidence_gaps
8. focus_items
9. propose_revision

## Do not build before P0 passes
search/RAG, accounts, database sync, multi-user collaboration, autonomous source collection, generic chat, truth score, auto-accepting agents.

## Implementation gate
Code must conform to `feature_schema_v1.0.yaml`, `domain_rules_v1.0.yaml`, and `evaluation_spec_v1.0.yaml`. Semantic changes require coordinated updates to PRD addendum, schema, traceability and validation. Code does not get to quietly become the constitution.
