# P11 Geological UI Contract Evaluation

**Project:** Groundline  
**Branch:** `P11`  
**Date:** 2026-09-03  
**Status:** IMPLEMENTED / LOCAL REVALIDATION PENDING  
**Baseline:** `GL-BASELINE-1.1`

---

## 1. Purpose

P11 is a visual consolidation pass. It does not introduce a new reasoning model, new authority behavior, or a new WebMCP tool.

The production task order requires:

1. Groundline branding;
2. stratigraphy layers;
3. fault highlighting;
4. scientific annotation;
5. restrained typography;
6. no loss of graph usability.

Most of the visual language already existed before P11, so this pass deliberately avoids redesigning the application merely because a task number exists. The work closes the remaining gaps and makes the geological metaphor correspond to actual reasoning state.

---

## 2. What Was Already Present

Before P11, Groundline already had:

- the `GROUNDLINE` masthead and product descriptor;
- paper / geological material tokens;
- horizontal strata for Question, Conclusion, Claims, Assumptions, Evidence, and Sources;
- restrained serif/sans typography;
- triage labels and relationship annotations;
- focused-node highlighting;
- dashed challenge relations;
- draggable nodes, multi-select, Select all, and preserved graph positions.

P11 therefore does **not** revive the old decorative diagonal fault line. That line looked geological but did not identify an actual reasoning fault and previously reduced graph readability.

---

## 3. P11 Changes

### Semantic fault highlighting

A reasoning card with `triage.state === CRITICAL` now receives the class:

```text
reasoning-node--faulted
```

The P11 stylesheet renders that as a restrained rust-colored fault edge on the card itself.

This means the visual fault is attached to the reasoning object that actually needs review instead of floating decoratively across the graph.

### Focus and severity remain separate

`focused` and `critical` are not collapsed into one visual state.

A critical node can be:

- critical but not currently focused;
- focused but not critical;
- both focused and critical.

This preserves the distinction between:

- risk state;
- current review/navigation state.

### Scientific notation

The graph interaction strip now explains the geological conventions in plain language:

```text
Rust mark = critical review fault; dashed rust = challenge.
```

Existing strata labels continue to explain reasoning-object roles.

### Card containment hardening

P11 adds explicit wrapping constraints so long reasoning text, metadata, and status labels remain inside graph cards.

### No decorative fault line

P11 explicitly preserves the previous removal of the page-spanning diagonal fault line.

The contract test asserts that `.graph-fault-line` is absent.

---

## 4. Contract Evaluation

### Agent proposes. Human decides.

**UNCHANGED.** P11 changes presentation only.

### Priority scores are review mechanics, never truth scores.

**UNCHANGED.** P11 renders critical state as a review fault marker, not as a truth verdict.

### Triage remains operational prioritization.

**UNCHANGED.** The rust fault mark is derived from existing `CRITICAL` triage state and does not calculate or reinterpret risk.

### Graph semantics remain canonical.

**UNCHANGED.** No knowledge types, relation types, dependencies, lineage, or revision semantics are modified.

### No automatic semantic rewiring.

**UNCHANGED.** P11 does not touch revision acceptance or supersession behavior.

### Geological visual language must not reduce graph usability.

**PRESERVED BY DESIGN.** Fault emphasis is local to critical cards. The previous decorative diagonal line remains absent. Dragging, selection, multi-selection, Select all, programmatic focus, and inspector behavior are untouched.

### Lazy reasoning-map boundary

**UNCHANGED.** The full React Flow reasoning map remains lazy-loaded and appears only after the user requests it. P11 does not remove the code-splitting boundary merely to make a test execute faster.

---

## 5. Files Changed

```text
src/components/graph/ReasoningGraph.tsx
src/styles/p11.css
src/app/App.tsx
tests/contract/p11-geological-ui.test.tsx
tests/contract/focus-workspace.test.tsx
```

---

## 6. First Local Validation Observation

The first local P11 full-suite run reported:

```text
Test Files  1 failed | 35 passed
Tests       1 failed | 175 passed
```

The failing contract was:

```text
P-06.6 plain-language review flow
> expands the full map inline instead of switching modes
```

The rendered output showed the intended Suspense fallback:

```text
Loading reasoning map
Preparing the interactive graph only because you asked for it.
```

The failure occurred because Testing Library's default async query timeout expired while the cold lazy `ExpandedReasoningMap` chunk was still resolving. Other map-opening tests in the same run passed after the lazy module had been loaded.

This is a test-timing mismatch, not evidence that the product should abandon lazy loading.

### Test alignment applied

The affected test now:

1. asserts that the lazy-loading fallback appears after `Open map`;
2. allows up to 5 seconds for the first cold lazy module load;
3. still requires both `Live reasoning workspace` and `Groundline reasoning graph` to appear.

No product state logic, graph semantics, or authority behavior changed.

---

## 7. Required Local Revalidation

Pull the latest `P11`, then run:

```powershell
git pull origin P11
npm run typecheck
npm run build
npm test
```

Expected gate:

```text
TypeScript       PASS
Production build PASS
Tests            0 failed
```

Then visually inspect the analyzed seeded demo and confirm:

- strata are still readable;
- critical cards have a local rust fault edge;
- focused critical cards retain both focus and fault states;
- no diagonal page-spanning fault line appears;
- long card text stays inside card bounds;
- drag / select / Select all still work;
- inspector selection still follows card interaction.

---

## 8. P11 Exit Decision

Current state:

```text
Implementation                    DONE
Contract-preserving design        DONE
P11 contract test authored        DONE
Cold lazy-map test alignment      DONE
Local typecheck after alignment   PENDING
Local production build            PENDING
Local full test suite              PENDING
Manual visual validation          PENDING
```

**P11 STATUS: LOCAL REVALIDATION PENDING**

No release tag or freeze is created.
