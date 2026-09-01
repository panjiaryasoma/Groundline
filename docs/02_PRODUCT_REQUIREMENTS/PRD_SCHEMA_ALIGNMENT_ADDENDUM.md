# GROUNDLINE — PRD / SCHEMA ALIGNMENT ADDENDUM

**Version:** 1.0

## Canonical terms
| Concept | Canonical value |
|---|---|
| Knowledge types | `QUESTION, CLAIM, COUNTERCLAIM, EVIDENCE, ASSUMPTION, SOURCE, CONCLUSION` |
| Knowledge states | `DRAFT, ACCEPTED, SUPERSEDED` |
| Revision states | `PROPOSED, ACCEPTED, REJECTED, EDITED_AND_ACCEPTED, DEFERRED` |
| Triage | `CRITICAL, REVIEW, STABLE, UNASSESSED` |
| Dimension rating | `LOW, MODERATE, HIGH, UNASSESSED` |
| Source class | `PRIMARY, SECONDARY, TERTIARY, UNKNOWN` |

## Alignment decisions
1. Evaluation and triage are analysis records, not nodes.
2. Revision is a proposed state transition, not peer knowledge.
3. Source class is provenance, not quality.
4. Counterclaim remains a knowledge node.
5. Contradiction is a relation/finding.
6. Evidence gap is a finding.
7. Agent-generated substantive changes begin `PROPOSED` or `DRAFT`, never `ACCEPTED`.
8. Source content is untrusted payload.
9. No `truth_score` or equivalent exists in v1.
10. `CRITICAL` requires weakness plus high downstream impact/direct accepted-conclusion dependency.

## Tool-to-schema alignment
| Tool | Reads | Writes |
|---|---|---|
| inspect_workspace | workspace/items/relations/evaluations | none |
| inspect_item | item/relations/evaluation/source | none |
| evaluate_item | graph state | evaluation record |
| triage_workspace | graph + evaluations | triage records |
| trace_dependencies | relations | none |
| find_contradictions | relations/evidence | finding records |
| find_evidence_gaps | support relations | finding records |
| focus_items | IDs | ephemeral UI focus |
| propose_revision | target item | revision(PROPOSED) |

## Blocking checks
- accepted conclusion supported by schema: PASS
- audit required and modeled: PASS
- source provenance modeled: PASS
- reason codes modeled: PASS
- human approval represented: PASS
- untrusted source handling represented: PASS
- dependency tracing represented: PASS

**Decision: PASS.**
