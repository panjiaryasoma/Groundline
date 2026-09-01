# Integration 001 runtime tests

P-05 turns the frozen Integration 001 contract into one executable end-to-end domain flow:

`evaluate → triage → rank → trace → propose → HUMAN accept → audit`

Important semantic decision:
**support/challenge/dependency relations are not automatically cloned to revised text.**

Reason: a revision may materially change meaning. Blind relation rewiring would assert support semantics that have not been re-evaluated.

The replacement keeps lineage through `SUPERSEDES`. New semantic links require explicit analysis/review.
