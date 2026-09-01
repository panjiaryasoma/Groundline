# P-06 MINIMAL GRAPH UI — CONTRACT EVALUATION

**Milestone:** P-06 Minimal Graph UI  
**Artifact result:** PASS  
**Local runtime gate:** PENDING

## Goal

Expose already-approved domain state to a human without creating a second, UI-only semantic model.

The UI reads and invokes:
- active workspace state;
- deterministic analysis/triage engine;
- graph dependency helpers;
- revision authority functions;
- audit events.

## Reasoning graph

**PASS**

UI displays canonical knowledge objects:
- QUESTION
- CLAIM
- COUNTERCLAIM
- EVIDENCE
- ASSUMPTION
- SOURCE
- CONCLUSION

Relations come directly from `workspace.relations`.

No visual-only relation is invented.

## Geological visual metaphor

**PASS WITH IMPROVISATION**

The graph canvas uses:
- horizontal stratigraphic bands;
- one fault line;
- scientific annotation language;
- restrained earth palette.

The metaphor changes presentation only.

It does not:
- create knowledge types;
- change relation types;
- change triage;
- change revision authority.

## Triage presentation

**PASS**

Nodes and inspector display:
- CRITICAL
- REVIEW
- STABLE
- UNASSESSED

The UI labels numeric values as operational priority/weakness/impact.

It never presents them as truth or confidence.

## Focus state

**PASS**

Focused/selected node IDs live only in `ui` state.

Executable test verifies that focusing the critical path does not change serialized workspace knowledge.

This preserves the active contract's ephemeral UI-state boundary.

## Inspector

**PASS**

Inspector exposes:
- item type;
- accepted/superseded state;
- text;
- triage;
- reason codes;
- relations;
- source provenance.

External sources are visibly labeled:

`YES · UNTRUSTED CONTENT`

This prepares the human UI for later WebMCP `untrustedContentHint` enforcement.

## Revision proposal

**PASS**

The proposal panel shows:
- currently accepted text;
- agent-proposed text;
- editable human text;
- ACCEPT
- EDIT+ACCEPT
- REJECT
- DEFER

UI action handlers call the same P-04 domain authority functions.

No UI shortcut can directly mutate accepted knowledge without those functions.

## Audit

**PASS**

UI renders the existing typed audit events.

No separate UI history model exists.

## No automatic relation rewiring

**PRESERVED**

P-06 does not add semantic edges to revised text.

The accepted replacement retains lineage through `SUPERSEDES` only until explicit re-analysis/re-linking.

## WebMCP

**NOT IMPLEMENTED BY DESIGN IN P-06**

The header feature-detects WebMCP only.

Actual registration remains P-07/P-08.

This follows production task order and avoids coupling UI completion to untested agent semantics.

## Contract changes

**NONE**

No schema change request is required.

## New tests

P-06 adds:
- 6 workspace UI-action tests
- 3 inspector tests
- 3 revision-panel tests
- 1 audit-trail test

Total new: 13

Previous total: 61  
Expected total after P-06: **74 tests**

## Exit gate

P-06 may close after local:
- `npm run typecheck` PASS
- `npm run build` PASS
- `npm test` → 74/74 PASS
- manual browser smoke verifies graph is readable and controls operate as expected.
