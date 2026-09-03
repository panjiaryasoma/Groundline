# P-08 WebMCP Vertical Slice — Runtime Validation Report

**Project:** Groundline  
**Milestone:** P-08 / P-08.8.3  
**Date:** 2026-09-02  
**Status:** COMPLETE  
**Branch at validation:** `P08`

---

## 1. Purpose

This report records the final validation of Groundline's P-08 WebMCP vertical slice.

P-08 was considered complete only after the WebMCP tools were verified not just through unit and contract tests, but through a real browser runtime journey that connected:

1. WebMCP tool discovery
2. WebMCP tool execution
3. Groundline application state
4. Graph selection and inspector state
5. Semantic triage state
6. Revision proposal creation
7. Human review and acceptance
8. Supersession lineage
9. Audit history

The validation intentionally checked the full chain instead of treating successful tool registration as sufficient evidence of working integration.

---

## 2. Contract Baseline

The P-08 implementation was validated against the active Groundline behavioral contract.

### Core authority boundary

> **Agent proposes. Human decides.**

The agent may:

- inspect reasoning;
- evaluate or triage reasoning;
- trace dependencies;
- focus relevant items;
- propose revisions.

The agent may **not** directly turn a proposal into accepted knowledge.

Only a human action may:

- accept a proposal;
- accept an edited proposal;
- reject a proposal;
- defer a proposal;
- replace an accepted conclusion.

### Semantic lineage rule

When an accepted conclusion is revised:

- the previous conclusion remains traceable;
- the new conclusion receives a `SUPERSEDES` lineage relation;
- previous semantic support or dependency relations are **not automatically inherited**;
- the revised conclusion remains unassessed until a fresh reasoning review is performed.

### Triage rule

Priority and triage are operational review mechanics, not truth scores.

---

## 3. Automated Validation

The final P-08.8.3 implementation passed all local automated checks.

```text
Typecheck      PASS
Build          PASS

Test files     31 passed / 31
Tests          157 passed / 157
Failures       0
```

Build completed successfully.

Non-blocking dependency/build warnings were present from third-party packages, but they did not prevent compilation, test execution, or browser runtime operation.

---

## 4. WebMCP Surface Validated in P-08

P-08 exposes and validates the following five WebMCP tools:

| Tool | Purpose | Runtime Status |
|---|---|---|
| `inspect_workspace` | Inspect the active reasoning workspace and UI state | PASS |
| `triage_workspace` | Write semantic evaluations and triage results | PASS |
| `trace_dependencies` | Trace upstream/downstream reasoning dependencies | PASS |
| `focus_items` | Focus a reasoning context and select a primary item | PASS |
| `propose_revision` | Create an agent-authored revision proposal | PASS |

These are five of the nine planned P0 WebMCP tools.

The remaining four are deferred to P-09:

- `inspect_item`
- `evaluate_item`
- `find_contradictions`
- `find_evidence_gaps`

---

## 5. Browser Runtime Validation

### Environment

Runtime validation was performed in the browser with WebMCP enabled and the Groundline development build running locally.

The validation used the seeded **Face Recognition Deployment Decision** workspace.

### Seeded decision

Accepted conclusion before analysis:

```text
CONC-001
Deploy face recognition as the sole access-control mechanism for the high-stakes process.
```

Primary high-impact assumption:

```text
A-001
Aggregate accuracy generalizes across demographic groups, capture conditions,
and the intended high-stakes deployment context.
```

Critical dependency path:

```text
A-001
  ↓
C-001
  ↓
CONC-001
```

---

## 6. Runtime Sequence

The final end-to-end WebMCP sequence was:

```text
inspect_workspace
        ↓
triage_workspace
        ↓
trace_dependencies
        ↓
focus_items
        ↓
propose_revision
        ↓
inspect_workspace
        ↓
human accepts proposal in UI
        ↓
inspect_workspace
```

No reset or reload was performed during the continuity-sensitive portion of the sequence.

---

## 7. `inspect_workspace` Validation

`inspect_workspace` successfully exposed the active Groundline workspace and its current state.

It correctly surfaced:

- workspace identity;
- accepted conclusion;
- knowledge items;
- relations;
- evaluations;
- triage records;
- revisions;
- audit event counts;
- selected item;
- focused item set.

### Active-workspace boundary

P-08.8.3 also corrected an earlier problem where WebMCP could operate on the seeded workspace while the user was still on HOME/INTAKE.

The final behavior requires an actual active reasoning workspace before execution.

This prevents WebMCP from mutating a hidden seeded workspace that is not the workspace visible to the user.

**Result:** PASS

---

## 8. `triage_workspace` Validation

Runtime semantic triage produced the expected seeded result:

| Item | State | Weakness | Impact | Priority |
|---|---:|---:|---:|---:|
| `A-001` | CRITICAL | 3 | 3 | 9 |
| `C-001` | CRITICAL | 3 | 3 | 9 |
| `CONC-001` | CRITICAL | 3 | 3 | 9 |
| `CC-001` | STABLE | 0 | 2 | 0 |

The operation added the expected audit events:

```text
EVALUATE
TRIAGE
```

It also selected `A-001` as the primary item to review in the visible UI.

Observed state after triage:

```text
evaluations   4
triage        4
revisions     0
audit_events  2

selected_item_id  A-001
```

**Result:** PASS

---

## 9. `trace_dependencies` Validation

Downstream tracing from `A-001` returned:

```text
origin_id           A-001
direction           DOWNSTREAM
node_ids            C-001, CONC-001
cycle_detected      false
truncated           false
max_depth_reached   2
```

This matched the expected dependency path:

```text
A-001 → C-001 → CONC-001
```

**Result:** PASS

---

## 10. `focus_items` Validation

The WebMCP agent focused:

```text
A-001
C-001
CONC-001
```

with:

```text
primary_item_id = A-001
```

The final runtime result correctly persisted:

```text
selected_item_id = A-001

focused_item_ids =
- A-001
- C-001
- CONC-001
```

P-08.8.3 additionally preserved the semantic review context across the next tool call.

The agent focus became:

```text
primary_focus_id = A-001
primary_risk_id  = A-001
```

The visible graph selection and inspector were synchronized with the WebMCP state.

**Result:** PASS

---

## 11. `propose_revision` Validation

The WebMCP agent proposed a revision for:

```text
target_item_id = CONC-001
```

Proposal text:

```text
Do not use face recognition as the sole high-stakes access-control mechanism
until performance is evaluated across the intended populations and capture
conditions; retain an alternative review or access path.
```

Reason codes:

```text
UNSUPPORTED_ASSUMPTION
OVERGENERALIZATION
```

Affected reasoning context:

```text
A-001
C-001
CONC-001
```

The proposal was created as:

```text
revision_id   REV-AGENT-013
state         PROPOSED
created_by    AGENT
reviewed_by   null
reviewed_at   null
```

Most importantly, immediately after proposal creation:

```text
accepted_conclusion = CONC-001
knowledge_changed   = false
human_review_required = true
```

The agent therefore did **not** alter accepted knowledge.

### Continuity state after proposal

P-08.8.3 correctly retained:

```text
selected_item_id   CONC-001

focused_item_ids
- A-001
- C-001
- CONC-001

primary_focus_id   A-001
primary_risk_id    A-001
repair_target_id   CONC-001
```

Counts remained continuous:

```text
items         9
relations     8
evaluations   4
triage        4
revisions     1
audit_events  4
```

The audit chain at this point was:

```text
EVALUATE
TRIAGE
FOCUS
PROPOSE_REVISION
```

**Result:** PASS

---

## 12. Human Review and Acceptance Validation

The proposal was then accepted through the Groundline UI by a human action.

This was intentionally performed through the application's human review controls rather than through WebMCP.

### Resulting accepted conclusion

A new accepted conclusion was created:

```text
CONC-015
state: ACCEPTED
```

Text:

```text
Do not use face recognition as the sole high-stakes access-control mechanism
until performance is evaluated across the intended populations and capture
conditions; retain an alternative review or access path.
```

### Previous conclusion

The former accepted conclusion became:

```text
CONC-001
state: SUPERSEDED
```

### Revision state

The agent-created revision changed from:

```text
PROPOSED
```

to:

```text
ACCEPTED
```

and recorded:

```text
created_by   AGENT
reviewed_by  HUMAN
reviewed_at  populated
```

This proves the authority boundary remained intact.

---

## 13. Supersession and Semantic Rewiring Validation

Before acceptance:

```text
items       9
relations   8
```

After acceptance:

```text
items       10
relations   9
```

Exactly one new knowledge item and one new relation were introduced.

The additional relation is the conclusion lineage:

```text
CONC-015
   │
   └── SUPERSEDES → CONC-001
```

Groundline did **not** automatically copy the previous conclusion's semantic support or dependency edges onto `CONC-015`.

This means Groundline did not silently assume that the old evidence relationships still apply to the revised wording.

The new conclusion therefore requires fresh reasoning review before receiving new semantic assessment.

**Result:** PASS

---

## 14. Final Audit History

After human acceptance, the decision history contained:

```text
EVALUATE
TRIAGE
FOCUS
PROPOSE_REVISION
SUPERSEDE
ACCEPT_REVISION
```

Observed count:

```text
audit_events = 6
```

This preserves both agent activity and human authority decisions.

**Result:** PASS

---

## 15. Final Runtime Snapshot

Final observed state:

```text
accepted_conclusion
  id       = CONC-015
  state    = ACCEPTED

old conclusion
  id       = CONC-001
  state    = SUPERSEDED

revision
  id          = REV-AGENT-013
  state       = ACCEPTED
  created_by  = AGENT
  reviewed_by = HUMAN

selected_item_id = CONC-015

items         = 10
relations     = 9
evaluations   = 4
triage        = 4
revisions     = 1
audit_events  = 6
```

The previous review context remained traceable while the revised conclusion became the currently selected accepted conclusion.

---

## 16. Contract Evaluation

| Contract Requirement | Result |
|---|---|
| Agent may inspect reasoning | PASS |
| Agent may triage reasoning | PASS |
| Agent may trace dependencies | PASS |
| Agent may focus review targets | PASS |
| Agent may propose a revision | PASS |
| Agent cannot directly accept knowledge | PASS |
| Human explicitly reviews proposal | PASS |
| Human controls accept/edit/reject/defer | PASS |
| Previous conclusion remains traceable | PASS |
| Accepted revision creates a new conclusion | PASS |
| Old conclusion becomes `SUPERSEDED` | PASS |
| `SUPERSEDES` lineage is preserved | PASS |
| Semantic support/dependency edges are not auto-inherited | PASS |
| Triage remains review prioritization, not truth scoring | PASS |
| Visible active workspace matches WebMCP target | PASS |
| Cross-tool state continuity is preserved | PASS |

No contract change was required for P-08.8.3.

---

## 17. Bugs Found During Runtime Testing

Browser runtime testing exposed issues that the automated suite did not initially reveal.

### 17.1 Hidden workspace execution

Earlier behavior allowed WebMCP calls while the user was on HOME/INTAKE, causing operations against a seeded workspace that was not visibly active.

**Resolution:** WebMCP execution now requires an active DEMO or CUSTOM reasoning workspace.

### 17.2 Focus context loss

Earlier `focus_items` execution correctly selected items but the semantic primary-risk context was not preserved into the proposal flow.

**Resolution:** agent focus is now retained as the review context.

### 17.3 Repair target continuity

Earlier proposal creation could lose the distinction between:

```text
primary risk = A-001
repair target = CONC-001
```

**Resolution:** P-08.8.3 preserves both values through the runtime journey.

### 17.4 Programmatic graph selection

Earlier WebMCP state updates could succeed while ReactFlow did not visually select the corresponding card.

**Resolution:** programmatic selection is propagated into the graph and inspector state.

These fixes were regression-tested before final runtime validation.

---

## 18. Known Non-Blocking Notes

The following observations remain non-blocking:

1. React Flow may display its attribution/development warning during local development.
2. Browser extensions may emit unrelated console errors or warnings.
3. The accepted replacement conclusion intentionally requires a fresh reasoning review.
4. P-08 implements only five of the nine P0 WebMCP tools.

None of these invalidate the P-08 runtime acceptance criteria.

---

## 19. P-08 Completion Status

```text
P-08 WebMCP Vertical Slice

Typecheck                          PASS
Build                              PASS
Automated tests                    157 / 157 PASS

WebMCP detection                   PASS
inspect_workspace                  PASS
triage_workspace                   PASS
trace_dependencies                 PASS
focus_items                        PASS
propose_revision                   PASS

Cross-tool state continuity        PASS
Programmatic graph selection       PASS
Inspector synchronization          PASS
Agent proposal → visible UI        PASS
Human review controls              PASS
Accept proposal                    PASS
New conclusion creation            PASS
Old conclusion supersession        PASS
Audit trail                        PASS
Authority boundary                 PASS
No automatic semantic rewiring     PASS

P-08                               COMPLETE
```

---

## 20. Git Status at Completion

At the final checkpoint:

```text
Branch: P08
Working tree: clean
Remote tracking: up to date with origin/P08
```

An additional empty commit was not required because the runtime validation itself did not modify source files.

The runtime validation is documented here instead of creating an artificial code change solely to record completion.

---

## 21. Next Milestone

P-09 should complete the remaining four P0 WebMCP tools:

```text
inspect_item
evaluate_item
find_contradictions
find_evidence_gaps
```

P-09 should reuse the runtime discipline established in P-08:

```text
tool contract
→ automated contract tests
→ browser runtime execution
→ visible UI/state verification
→ cross-tool continuity verification
```

The remaining tools should not be considered complete solely because they register successfully or pass isolated unit tests.

---

**P-08 conclusion:** Groundline's first WebMCP vertical slice is functioning end-to-end in the browser, including agent inspection, semantic triage, dependency tracing, UI focus, agent revision proposal, human acceptance, supersession lineage, and audit preservation.
