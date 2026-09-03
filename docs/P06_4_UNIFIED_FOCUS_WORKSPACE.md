# P-06.4 UNIFIED FOCUS WORKSPACE — CONTRACT EVALUATION

**Decision:** Replace the split Guided View / Reasoning Map product model with one progressive workspace.

## Problem corrected

P-06.3 simplified onboarding but still created two separate mental models:
- a tutorial-like guided surface;
- a separate technical map.

Users still had to leave the explanation surface to understand the dependency chain.

## Unified interaction model

Groundline now presents one workspace.

Before analysis:
- decision;
- accepted conclusion;
- one primary action: `Check this reasoning`.

After analysis:
- the highest-impact weak point;
- its bridge claim/counterclaim;
- the accepted conclusion;
- plain-language reasons;
- evidence context;
- revision action.

The complete graph is available through progressive expansion in the same page.

## Focused reasoning chain

The focused chain is presentation-only and is derived from:
- existing `triage_records`;
- `downstream_accepted_ids`;
- canonical workspace relations;
- `accepted_conclusion_id`.

No new semantic relation is created.

## Evidence snapshot

Evidence is derived from existing graph relations.

The UI distinguishes:
- support;
- challenge;
- context.

Source provenance is read from existing SOURCE objects.

No new evidence classification is written to workspace state.

## Revision review

Revision review is inline with the reasoning problem that triggered it.

Actions still call the existing P-04 authority functions:
- accept;
- edit-and-accept;
- reject;
- defer.

Agent authority is unchanged.

## Full map

The existing draggable/multi-select ReasoningGraph remains intact.

It now expands inline instead of acting as a separate product mode.

Inspector and audit trail are disclosed with the expanded map, so they do not occupy the default novice experience.

## Post-review state

After a revision leaves PROPOSED:
- the accepted conclusion is shown;
- status explicitly says `Not re-evaluated yet`;
- previous semantic relations are not inherited;
- history remains available in the expanded map/audit trail.

This preserves P-05 and P-06.1 decisions.

## Visual changes

- removed the Guided/Map mode switcher;
- reduced masthead dominance;
- centered the product around the reasoning chain;
- preserved horizontal geological strata only where they aid the full map;
- moved technical inspector/audit surfaces behind progressive disclosure.

## Contract impact

- schema: unchanged
- triage semantics: unchanged
- dependency semantics: unchanged
- revision authority: unchanged
- source provenance: unchanged
- audit semantics: unchanged
- WebMCP scope: unchanged
- graph interaction semantics: unchanged

**CONTRACT CHANGES: NONE**

## Tests

Added 7 Unified Focus Workspace tests.

The prior P-06.3 GuidedExperience implementation remains unmounted for this patch to preserve overwrite-only patch application. It should be removed during the next repository cleanup checkpoint after UI direction is frozen.

Previous total: 85
New expected total: **92 tests**
