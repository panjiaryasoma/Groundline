# Security tests

P10 hard blockers cover:

- external SOURCE/EVIDENCE payloads are surfaced as untrusted data, never instructions;
- prompt-injection fixture inspection cannot mutate accepted knowledge or create revisions;
- agent direct accepted-state mutation remains rejected by authority tests;
- malformed and unknown item IDs fail instead of silently guessing;
- dependency traversal is cycle-safe even for malformed cyclic fixtures;
- workspace and item inspection remain bounded by item counts, relation counts, dependency limits, and text truncation;
- WebMCP output that can contain SOURCE/EVIDENCE content carries `untrustedContentHint: true` according to the frozen tool schema.

`p10-hard-blockers.test.ts` is the P10 security/robustness checkpoint suite.
