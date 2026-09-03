# P-06.6 PLAIN-LANGUAGE REVIEW FLOW

## Problem

P-06.5 fixed the runtime graph bug and bundle size, but manual use exposed a more important UX failure:

Groundline still treated the graph as the natural next step.

The clearest example was the completion CTA `Review evidence links`. The product did not actually provide a guided link-review workflow. It opened the technical graph, inspector, and audit trail instead.

That label promised one task and delivered another.

## Decision

The main Groundline demo no longer requires the graph.

The user journey is explicitly:

1. **Check**
2. **Understand**
3. **Decide**

The seeded fixture is clearly labeled as a demo.

## Main-flow changes

### Start

Primary:
- `Check this reasoning`

Advanced graph access:
- hidden under `Advanced tools`

### Weak-point review

The user sees:
- one weak reasoning point;
- the claim it affects;
- the accepted conclusion;
- why it matters;
- represented evidence.

Primary:
- `Show me a clearer conclusion`

Advanced map:
- hidden under `Advanced: inspect the graph`

### Human decision

Primary decision actions remain:
- use suggestion;
- edit first;
- keep current conclusion;
- decide later.

Graph access is optional and hidden under an Advanced disclosure.

### Completion

The fake `Review evidence links` CTA is removed.

The main workflow ends honestly:
- accepted replacement is shown;
- history preservation is explained;
- automatic relation inheritance is explicitly rejected;
- primary CTA is `Replay the example`.

The full reasoning map is available only under:
- `Advanced: inspect reasoning history`.

## Advanced map

The map now explicitly says it is optional.

It includes a compact interaction legend:
- Cards = reasoning objects
- Arrows = relationships
- Click = inspect one object
- Ctrl/Shift = select several

Inspector and audit trail are hidden by default and shown only after:
- `Show selected item and decision history`.

## Contract evaluation

No domain behavior changed.

- schema: unchanged
- triage semantics: unchanged
- revision authority: unchanged
- accepted knowledge semantics: unchanged
- no automatic relation inheritance: unchanged
- source provenance: unchanged
- audit semantics: unchanged
- WebMCP scope: unchanged
- graph drag/multi-select behavior: unchanged

This patch changes presentation and navigation only.

**CONTRACT CHANGE: NONE**

## Why this is safer

The UI no longer implies that Groundline supports a guided semantic-relinking workflow that does not exist yet.

The advanced graph remains available for judges and power users without being required for a novice to understand the seeded demo.
