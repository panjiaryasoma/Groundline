# P-06.1 SEEDED CYCLE CLOSURE FIX — CONTRACT EVALUATION

**Issue discovered by manual browser smoke:** repeated identical seeded revisions could be proposed and accepted after the original Integration 001 conclusion had already been superseded.

## Why this was incorrect

Integration 001's structured evaluations are frozen against the original graph and original accepted conclusion `CONC-001`.

P-05 also explicitly decided:

- semantic relations are NOT automatically rewired to revised text;
- replacement conclusions require explicit re-analysis/re-linking.

Therefore, once `CONC-001` is superseded, replaying the same seeded analysis/proposal against the replacement conclusion would falsely imply that the old evaluation context still applies.

## Fix

The seeded demo is now one complete reasoning-repair cycle per reset.

After any HUMAN review:
- seeded analysis cannot rerun;
- focus cannot rerun;
- the same seeded proposal cannot be generated again;
- UI shows `DEMO CYCLE COMPLETE`;
- revised conclusion remains visibly unassessed;
- user may use `Reset demo` to replay Integration 001.

## Analysis freshness

Added a derived freshness check:

An analysis is fresh only if triage contains the **current accepted conclusion**.

After acceptance of a replacement conclusion, prior analysis is therefore stale by construction.

## Minimap

Removed the React Flow minimap from P-06.

This is presentation-only cleanup. It was visually empty in browser smoke and contributed no contract-relevant information.

## Contract impact

- knowledge schema: unchanged
- relation semantics: unchanged
- triage semantics: unchanged
- authority boundary: unchanged
- no automatic semantic rewiring: preserved
- WebMCP scope: unchanged

**Contract changes: NONE.**

## New regression tests

2 tests added:
1. duplicate seeded proposal cannot be created after human review;
2. analysis becomes stale after accepted conclusion changes.

Previous total: 74  
Expected total: **76 tests**
