# P12 Strata UI Pass

**Branch:** `P12`  
**Baseline:** merged `main` through P11  
**Scope:** visual system only

## Intent

P12 translates Groundline's geological reasoning metaphor into a coherent interface system without changing the P11 interaction lifecycle.

Reference inputs:

- Groundline thumbnail strata palette and fault metaphor;
- Scam Museum as a reference for editorial hierarchy, rectangular surfaces, typographic role separation, conceptual cohesion, and responsive composition;
- Groundline remains its own product. Museum-specific visual devices are not copied.

## Frozen behavior

P12 must not change:

`Run analysis -> Focus primary risk -> Propose repair -> Accept / Accept edited / Reject / Defer -> next unresolved item`

It also must not change:

- canonical workspace state;
- graph selection semantics;
- Inspector synchronization;
- revision authority;
- audit semantics;
- WebMCP tool behavior;
- human approval requirements.

## Visual system

### Surface

Warm paper, restrained grain, large editorial serif hierarchy, compact mono metadata.

### Strata

- Question / surface: warm paper
- Conclusion: pale sand
- Claim: warm earth
- Assumption: clay
- Evidence: mineral stone
- Source: muted olive
- Bedrock: deep slate

### Semantic accents

- Fault / critical review: rust
- Focus / orientation: restrained brass-gold
- Stable: muted green

Fault color remains exceptional. It is not a generic CTA color.

## Page-depth mapping

The visible interface descends conceptually:

1. masthead / surface;
2. decision framing / conclusion;
3. review status / claim layer;
4. reasoning workspace / evidence layer;
5. revision and audit surfaces / assumption + source layers;
6. footer / bedrock.

The reasoning graph keeps its six operational lanes while adopting the same palette.

## Implementation

P12 introduces:

- expanded design tokens in `src/styles/tokens.css`;
- `src/styles/p12.css` as a post-P11 visual overlay;
- Groundline field-mark and stronger masthead hierarchy;
- a start-screen field note and compact strata guide;
- thumbnail-derived graph strata colors;
- type-specific reasoning-card undertones;
- section-level depth progression;
- a bedrock footer;
- responsive behavior that preserves the current interaction model.

## Non-goals

P12 does not add decorative mountain illustrations, ornate museum frames, or literal landscape artwork to the product workspace. The geological metaphor is carried through hierarchy, color, surfaces, labels, and reasoning semantics rather than copied scenery.
