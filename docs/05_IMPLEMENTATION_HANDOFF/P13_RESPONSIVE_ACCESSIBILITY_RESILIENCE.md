# P13 — Responsive, Accessibility, and Resilience Hardening

P13 hardens the frozen P12 interface without changing the P11 reasoning lifecycle, human-authority boundary, revision semantics, or WebMCP contracts.

## Viewport targets

- desktop: 1440 and 1366 widths
- smaller laptop: roughly 1024–1280
- tablet: roughly 681–980
- mobile: reasonable stacked fallback from 320px upward

## Accessibility

- strong `:focus-visible` treatment on all interactive controls
- native button/label semantics preserved
- relation approval presented as an ARIA modal dialog
- focus moves into the relation-review dialog, is trapped with Tab/Shift+Tab, and is restored when the batch is resolved
- reduced-motion preferences remain respected
- review/gold semantic text accents use contrast-safe darker values

## Resilience

- long reasoning text wraps inside cards instead of widening the graph
- long revision/current text gets bounded scroll regions rather than breaking the page width
- form/editor textareas remain vertically resizable with viewport-bounded height
- toolbars/actions wrap rather than overflow
- relation approval scales from desktop floating panel to tablet/mobile sheet-like dialog
- live review grid stacks graph → Inspector → Revision → Audit on tablet/mobile

## Graph loading

The reasoning graph is code-split with `React.lazy` and requested only when its host approaches the viewport (or immediately when a programmatic focus request needs it). A stable loading surface prevents layout collapse. Programmatic Focus retries until the exact selected card exists, then smooth-scrolls to it.

## State matrix

Existing runtime state copy remains canonical and is preserved across responsive layouts:

1. not reviewed — `Run analysis` available when the current mode permits it
2. reviewed — CRITICAL / REVIEW / STABLE triage remains visible and focusable
3. revision proposed — Revision Proposal and the four human decisions remain available
4. post-decision / refresh-needed — accepted changes invalidate stale semantic review and expose the next valid action
5. empty/missing content fallbacks — existing `No accepted conclusion`, `No pending proposal`, and empty graph rendering remain visible rather than crashing layout

No new epistemic state or AI behavior is introduced in P13.
