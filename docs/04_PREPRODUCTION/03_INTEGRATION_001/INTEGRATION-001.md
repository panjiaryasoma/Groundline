# INTEGRATION-001 — FACE RECOGNITION DECISION BOARD

**Purpose:** prove the smallest complete Groundline workflow against one coherent board.

## Why this fixture

NIST's demographic-effects work gives a documented example of why aggregate system-performance claims can fail to establish equivalent behavior across populations and conditions.

The fixture does **not** assert anything about a specific deployed vendor. The internal benchmark and organization are synthetic. The NIST evidence is used only to ground the generalization-risk pattern.

## Initial accepted conclusion

> Deploy face recognition as the sole access-control mechanism for the high-stakes process.

## Structural weakness

The conclusion depends on:

> Aggregate accuracy generalizes across demographic groups, capture conditions, and the intended high-stakes context.

That assumption is not established by the aggregate benchmark and is challenged by the represented NIST-derived evidence.

## Expected flow

### 1. User
"Triages this board. Show only issues that could change the conclusion."

### 2. Agent
Calls `triage_workspace`.

Expected primary target: `A-001 / CRITICAL`.

### 3. Agent/UI
Calls `focus_items` with `A-001, C-001, CONC-001`.

Accepted knowledge hash/state must not change.

### 4. User
"Why does that assumption matter?"

### 5. Agent
Calls `trace_dependencies("A-001")`.

Expected path:

`A-001 → C-001 → CONC-001`

### 6. User
"Repair the conclusion without deleting the original."

### 7. Agent
Calls `propose_revision`.

Example acceptable proposal:

> Do not use face recognition as the sole high-stakes access-control mechanism until performance is evaluated across the intended populations and capture conditions; retain an alternative review/access path.

The exact language is not contractually frozen. The state transition is.

Expected state: `PROPOSED`.

### 8. Human
Accepts, edits, rejects, or defers.

Only after human acceptance may the accepted conclusion change.

## Integration invariants

- NIST source text remains untrusted content.
- Primary-source status does not automatically yield high quality; relevance still matters.
- No truth percentage is shown.
- Triage priority is operational, not epistemic certainty.
- Original accepted conclusion remains in audit history after supersession.

## Pass

Integration 001 passes only if the observed state matches:
- `EXPECTED_SCORES.yaml`
- `EXPECTED_TRIAGE_OUTPUT.yaml`
- `EXPECTED_GATE_RESULTS.yaml`
