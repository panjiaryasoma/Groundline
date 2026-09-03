# P12.9 — Structural Review Overview

Scope: remove the P12.7/P12.8 overlay hack and make the paired review composition real in the DOM.

- creates one semantic 50/50 review overview band
- left panel: Primary Risk + Review Focus + dynamic runtime status
- right panel: Reasoning Workspace + Shared State
- hides only the duplicated map introduction when the overview is already shown
- Cards / graph / Inspector / Revision Proposal / Decision History remain in normal full-width flow below
- removes the negative-margin/pulled-up composition that caused ghost borders, white strips, and clipped decision content
- keeps all P11 state, authority, review, revision, and WebMCP behavior unchanged
