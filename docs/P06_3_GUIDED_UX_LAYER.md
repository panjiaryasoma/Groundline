# P-06.3 GUIDED UX LAYER — CONTRACT EVALUATION

**Problem:** The reasoning map is powerful but requires users to understand Groundline's ontology and triage vocabulary before understanding the product.

## UX decision

Groundline now has two presentation layers:

1. **Guided view — default**
2. **Reasoning map — advanced**

The guided view does not create a separate reasoning model. It only presents the same workspace state with simpler language and a staged interaction.

## Guided flow

1. Understand the decision
2. Check reasoning
3. Review the biggest issue
4. Human decision

The graph is opened when users want the detailed explanation.

## Presentation vocabulary

Internal contract terms remain unchanged.

Examples of presentation-only translation:

- `CRITICAL` → `Needs attention`
- highest priority → `Review first`
- `Accept proposal` → `Use suggestion`
- `Reject` → `Keep current version`
- `Defer` → `Decide later`

No enum, schema field, or domain transition was renamed.

## Biggest issue

The guided layer reads the existing ranked `triage_records`.

It does not independently score or classify reasoning.

Reason explanations are plain-language renderings of existing reason codes.

## Graph

The full draggable/multi-select reasoning map remains available and unchanged as the advanced view.

`Show why it matters` focuses the primary dependency path and opens the map.

## Revision authority

All guided review buttons call the existing P-04 domain transitions:

- accept
- edit-and-accept
- reject
- defer

The guided UI cannot bypass HUMAN review authority.

## Contract impact

- schema: unchanged
- triage semantics: unchanged
- dependency semantics: unchanged
- revision semantics: unchanged
- audit semantics: unchanged
- WebMCP scope: unchanged
- accepted knowledge authority: unchanged

**CONTRACT CHANGES: NONE**

## Tests

Added 6 guided-UX tests.

Previous expected total: 79  
New expected total: **85 tests**
