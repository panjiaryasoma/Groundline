# P-06.9 CUSTOM ANALYSIS ACTION FEEDBACK

## Problem

P-06.8 exposed a `Run analysis` button in the custom-workspace toolbar.

The button technically changed local UI state, but its result appeared much lower on the page.

From the user's point of view, the button looked dead.

The placement was also wrong: analysis is a next-step action after reviewing the mapped input, not a global toolbar command.

## Fix

### Placement

The custom-workspace top toolbar has been removed.

`Run analysis` now lives directly inside:

`What do I do now?`

This places the action where the user naturally asks for the next step.

### Visible feedback

Clicking `Run analysis` now:

1. performs the structural readiness check;
2. renders a bordered `Analysis result` section immediately below;
3. smoothly scrolls the result into view;
4. shows either:
   - missing pieces + `Add the missing pieces`, or
   - `Ready for agent review`.

The user no longer has to infer that something happened elsewhere on the page.

## Semantic boundary

For custom free-text workspaces, this button still performs structural readiness only.

It does NOT invent:
- evidence strength;
- contradiction;
- primary semantic risk;
- source quality;
- repair language.

Those remain WebMCP agent-review responsibilities.

This is why `Focus primary risk` and `Propose repair` are not shown as fake local controls in the custom workspace.

The seeded example still retains its deterministic analysis toolbar because that fixture has frozen evaluations and triage expectations.

## Contract evaluation

- schema: unchanged
- custom workspace mapping: unchanged
- semantic evaluation contract: unchanged
- seeded deterministic analysis: unchanged
- human authority: unchanged
- WebMCP scope: unchanged

**CONTRACT CHANGE: NONE**

## Tests

Updated custom workspace UX coverage and added one complete-structure result test.

Previous expected total: 114
New expected total: **115 tests**
