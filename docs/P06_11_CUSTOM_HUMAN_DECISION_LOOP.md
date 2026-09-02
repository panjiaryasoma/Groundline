# P-06.11 COMPLETE CUSTOM HUMAN-DECISION LOOP

## Problem

The custom workspace exposed:

- Run analysis
- Focus primary risk
- Propose repair

but after `Propose repair` it stopped at an agent-handoff notice.

The seeded example already demonstrated the complete authority loop:

- Use suggestion
- Edit first
- Keep current conclusion
- Decide later

The custom workflow should expose the same lifecycle.

## Fix

After the user clicks `Propose repair`, Groundline now opens a `Human decision` stage.

It contains:

- Suggested revision status
- Use suggestion
- Edit first
- Keep current conclusion
- Decide later

## Why the controls are initially disabled

A custom free-text workspace still does not have a locally generated semantic proposal.

Groundline must not invent a proposal simply to make the buttons clickable.

Therefore the stage says:

`Waiting for agent proposal`

and the four human-decision controls remain disabled until a real proposal object exists.

This is intentional and contract-correct.

## Final intended lifecycle

Custom input:

1. Run analysis
2. Focus primary risk
3. Propose repair
4. WebMCP agent writes proposal
5. Human decision stage activates
6. HUMAN accepts / edits / rejects / defers
7. Groundline preserves audit + supersession semantics

## Contract evaluation

- schema: unchanged
- local semantic inference: still prohibited
- proposal authority: AGENT
- final accepted-knowledge authority: HUMAN
- no automatic semantic rewiring: preserved
- audit semantics: unchanged
- WebMCP boundary: preserved

**CONTRACT CHANGE: NONE**

## Tests

Added:
- human-decision controls appear after Propose repair
- acceptance controls remain absent before repair stage

Previous expected total: 117
New expected total: **119 tests**
