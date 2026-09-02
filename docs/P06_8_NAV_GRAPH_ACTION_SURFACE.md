# P-06.8 NAVIGATION, GRAPH CONTROLS, AND ACTION SURFACE

## Problems found in browser smoke

The P-06.7 real-user intake solved the missing entry flow, but manual use exposed four UX regressions:

1. advanced reasoning-map access became too hidden;
2. the seeded example had no obvious way back to the real-user entry screen;
3. long user-authored node text could escape the graph card;
4. the familiar analysis controls disappeared even while the inspector still referenced analysis.

A fifth usability request was also valid:

5. moving the whole graph required manual multi-selection.

## Fixes

### Exit example

The seeded example now has a persistent `Exit example` control.

It returns to the Groundline start screen without refresh and without touching the browser URL.

### Example action toolbar

The seeded example restores the explicit power controls:

- Run analysis
- Focus primary risk
- Propose repair
- Exit example

The plain-language main flow still exists, so novice users can continue using the guided CTAs.

The toolbar is a parallel power surface, not a replacement for the simple flow.

### Custom workspace action toolbar

Custom workspaces now visibly expose:

- Run analysis
- Focus primary risk
- Propose repair
- Edit input

Important semantic boundary:

For custom free-text input, `Run analysis` currently performs only the structural readiness check.

`Focus primary risk` and `Propose repair` remain disabled until semantic agent analysis has produced triage/revision state.

This is intentional. The local TypeScript app must not invent semantic risk scores or repair text from arbitrary prose.

### Reasoning map discoverability

The advanced map is no longer buried inside a collapsed `<details>` disclosure.

It is shown as a visible secondary callout:

`Reasoning map → Open map`

This keeps it discoverable without pretending the graph is the primary novice workflow.

### Graph text containment

Reasoning nodes now enforce:

- fixed card width;
- box sizing;
- clipped card container;
- wrapping user text;
- safe overflow for IDs/meta;
- wrapping footer badges.

Long assumption/evidence text must remain inside the card.

### Select all

The graph toolbar now includes:

- Select all
- Clear selection
- selected-node count

Selecting all nodes uses the same React Flow `selected` state that existing grouped drag behavior already honors.

### Inspector copy

The inspector no longer says `Run analysis to populate triage` as if a universal local semantic-analysis button exists.

It now states that semantic analysis is required before a risk status appears.

## Contract evaluation

No domain semantics changed.

- schema: unchanged
- knowledge types: unchanged
- relation semantics: unchanged
- seeded deterministic analysis: unchanged
- human revision authority: unchanged
- no automatic semantic rewiring: unchanged
- custom free-text semantic inference: still prohibited
- WebMCP scope: unchanged

**CONTRACT CHANGE: NONE**

## Tests

Added:
- 2 graph selection tests
- 2 seeded example toolbar/navigation tests
- 2 custom workspace action-surface tests

Previous expected total: 108  
New expected total: **114 tests**
