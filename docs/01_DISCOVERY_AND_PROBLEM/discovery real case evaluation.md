# GROUNDLINE — DISCOVERY & REAL-CASE EVALUATION

**Version:** 1.0  
**Purpose:** turn documented real-world reasoning failures into bounded product requirements and evaluation hypotheses.

## Method
For each case: record documented facts, extract a reasoning structure, derive a product implication, then create controlled evaluation hypotheses. Groundline does **not** claim it would have prevented the original event.

## Case 01 — Challenger STS-51L
**Source:** NASA Rogers Commission Report  
https://sma.nasa.gov/SignificantIncidents/assets/rogers_commission_report.pdf

Documented pattern: recurring O-ring erosion and blow-by were normalized; prior successful flights contributed to acceptance of escalating risk; relevant temperature concern was incompletely escalated.

Groundline implication:
- adverse evidence must remain visible even when a conclusion has precedent;
- prior success cannot automatically resolve current contradictory evidence;
- unresolved high-impact assumptions should triage high.

## Case 02 — Columbia STS-107
**Source:** NASA CAIB  
https://www.nasa.gov/history/columbia-accident-investigation-board-synopsis/

Documented pattern: foam strike evidence existed; later investigation established critical damage; assessment during mission occurred in a context where similar shedding had happened previously.

Groundline implication:
- direct condition evidence and historical precedent must be distinguishable;
- absence of direct inspection evidence should surface as an evidence gap;
- past non-failure must not masquerade as proof of safety.

## Case 03 — Patriot missile failure at Dhahran
**Source:** U.S. GAO IMTEC-92-26  
https://www.gao.gov/products/imtec-92-26

Documented pattern: accumulated timing error worsened with continuous runtime; the battery had run over 100 hours.

Groundline implication:
- operating assumptions must be explicit first-class objects;
- one weak assumption may propagate to multiple downstream claims.

## Case 04 — UK Post Office Horizon
**Source:** Criminal Cases Review Commission  
https://ccrc.gov.uk/post-office-horizon-cases/

Documented pattern: significant Horizon problems created a material risk that apparent shortfalls came from bugs/errors/defects; users had difficulty challenging system output.

Groundline implication:
- source authority and source quality are separate;
- provenance and independent evidence gaps must remain visible.

## Case 05 — Therac-25
**Source:** University of Virginia Online Ethics history  
https://onlineethics.virginia.edu/cases/therac-25/history-introduction-and-shut-down-therac-25

Documented pattern: repeated overdose reports; early inability to reproduce; later reproduction of a hazardous sequence.

Groundline implication:
- `MISSING_EVIDENCE`, `UNVERIFIED`, and `CONTRADICTED` must not collapse into one status;
- a failed reproduction attempt is not direct disproof.

## Case 06 — Face recognition demographic differentials
**Source:** NIST  
https://www.nist.gov/publications/face-recognition-vendor-test-part-3-demographic-effects

Documented pattern: demographic differentials were observed in many algorithms; error behavior depends on algorithm, application, data, image quality, and population.

Groundline implication:
- claim scope and evidence scope must be comparable;
- subgroup counterevidence can invalidate a universal claim without invalidating a narrower claim.

## Case 07 — WHO living guideline
**Source:** WHO  
https://www.who.int/publications/i/item/WHO-2019-nCoV-prophylaxes-2023.1

Documented pattern: recommendations changed as evidence changed.

Groundline implication:
- accepted conclusions must be revisable;
- superseding must preserve provenance and history.

# Cross-case failure modes

| ID | Failure mode | Product consequence |
|---|---|---|
| FM-01 | Normalization of prior success | prior success never silently resolves contradictory current evidence |
| FM-02 | Hidden operating assumption | assumptions are explicit and traceable |
| FM-03 | Authority substitution | source class != source quality |
| FM-04 | Non-confirmation treated as disconfirmation | missing/unverified/contradicted remain distinct |
| FM-05 | Overgeneralization | evidence scope vs claim scope evaluation |
| FM-06 | Conclusion fossilization | revision history + supersession |
| FM-07 | Weakness propagation | downstream dependency tracing |

# Discovery evaluation

| Question | Result |
|---|---|
| Does the problem recur across domains? | PASS |
| Is the failure only “bad facts”? | FAIL — assumptions, provenance, scope and governance matter |
| Is a flat chat transcript sufficient? | FAIL |
| Is a structured dependency graph justified? | PASS |
| Is triage justified? | PASS |
| Is human approval justified? | PASS |
| Is a universal truth score justified? | FAIL |
| Is WebMCP semantically justified? | PASS |

## Decision
**PASS TO PRODUCT REQUIREMENTS.**
