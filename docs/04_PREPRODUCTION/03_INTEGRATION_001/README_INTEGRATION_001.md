# INTEGRATION 001 — SECOND BRAIN

This is the first full preproduction integration fixture.

## Files

- `POLICY_FIXTURE.yaml` — complete deterministic board and policy
- `EXPECTED_SCORES.yaml` — expected evaluation/priority mechanics
- `EXPECTED_TRIAGE_OUTPUT.yaml` — expected ranked targets and tool path
- `EXPECTED_GATE_RESULTS.yaml` — hard invariants
- `INTEGRATION-001.md` — human-readable walkthrough
- `dll/` — reserved for generated implementation-time traces/artifacts; intentionally empty in preproduction

## Source boundary

The fixture includes one real public source (NIST) and synthetic internal benchmark content.

Do not rewrite the synthetic fixture as a real deployment claim.

## Completion sequence

1. validate schema
2. load fixture
3. evaluate
4. triage
5. compare expected scores
6. compare expected ranking
7. trace dependency
8. create revision proposal
9. verify accepted conclusion unchanged
10. perform explicit human acceptance in UI test
11. verify audit/supersession history

## Why not add another integration now

One deterministic end-to-end case is enough to validate the architecture before coding. More integrations before the vertical slice would mostly create paperwork with excellent posture.
