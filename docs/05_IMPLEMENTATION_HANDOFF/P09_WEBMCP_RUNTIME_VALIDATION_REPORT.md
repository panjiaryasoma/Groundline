# P09 WebMCP Runtime Validation Report

**Project:** Groundline  
**Branch:** `P09`  
**Date:** 2026-09-02  
**Status:** COMPLETE  
**Scope:** Remaining P0 WebMCP tools and browser runtime validation

---

## 1. Purpose

P09 completes the remaining P0 WebMCP tool surface and validates that the new tools are not only present in source code and covered by automated tests, but can also be discovered and executed through the browser WebMCP runtime.

This checkpoint exists to distinguish three different claims that are easy to accidentally blur together:

1. the tool is implemented in TypeScript;
2. the tool is registered and passes automated tests;
3. the tool can actually execute through `document.modelContext` in a WebMCP-enabled browser.

P09 is considered complete only after all three layers are satisfied for the remaining P0 tools.

---

## 2. P0 WebMCP Tool Surface

The browser runtime exposed the complete nine-tool P0 surface:

| Tool | Status |
| --- | --- |
| `inspect_workspace` | Registered |
| `inspect_item` | Registered |
| `evaluate_item` | Registered |
| `triage_workspace` | Registered |
| `trace_dependencies` | Registered |
| `find_contradictions` | Registered |
| `find_evidence_gaps` | Registered |
| `focus_items` | Registered |
| `propose_revision` | Registered |

Runtime discovery was performed through:

```js
const tools = await document.modelContext.getTools();
tools.map(tool => tool.name);
```

**Result:** `9/9` P0 tools discovered.

---

## 3. Automated Validation Baseline

Before browser runtime validation, the P09 branch passed the local engineering baseline.

| Check | Result |
| --- | --- |
| TypeScript typecheck | PASS |
| Production build | PASS |
| Test files | 32 passed |
| Tests | 165 passed |
| Failed tests | 0 |

The Rollup/Zod annotation messages emitted during build are dependency warnings and did not fail the production build.

---

## 4. Runtime Validation of P09 Tools

### 4.1 `inspect_item`

Runtime target:

```text
E-SUB-001
```

Observed result:

- item type: `EVIDENCE`
- item state: `ACCEPTED`
- represented relations returned
- source provenance resolved to `SRC-NIST-001`
- external source metadata returned
- upstream and downstream dependency information returned

Important implementation check: the seeded fixture represents provenance using `SOURCE -> EVIDENCE` through `SOURCED_FROM`. Runtime inspection follows the actual fixture direction rather than assuming an inverse relation from the relation name.

**Status:** PASS

---

### 4.2 `find_contradictions`

Runtime subject:

```text
C-001
```

Observed core result:

```text
finding_type: CONTRADICTED
subject_item_id: C-001
challenger_item_ids: [CC-001]
evidence_item_ids: [E-SUB-001]
source_item_ids: [SRC-NIST-001]
semantic_inference_performed: false
```

The result is based on contradiction signals already represented by explicit relations and structured records. The tool does not claim to independently determine truth.

**Status:** PASS

---

### 4.3 `find_evidence_gaps`

Runtime target:

```text
A-001
```

Observed core result:

```text
finding_type: MISSING_DIRECT_EVIDENCE
item_type: ASSUMPTION
declares_false: false
semantic_inference_performed: false
```

This preserves the frozen distinction:

```text
MISSING_EVIDENCE != CONTRADICTED != UNASSESSED
```

A missing support relation is reported as an evidence gap, not silently upgraded into a contradiction or truth judgment.

**Status:** PASS

---

### 4.4 `evaluate_item`

Runtime target:

```text
A-001
```

Observed core result:

```text
item_id: A-001
generated_by: AGENT
status: PARTIAL
accepted_knowledge_changed: false
triage_recompute_required: true
audit_event: EVALUATE
```

The `PARTIAL` status is expected for the tested payload because at least one evaluation dimension remained `UNASSESSED`.

Most importantly, `evaluate_item` respects the authority boundary:

- it may write structured evaluation data;
- it may append an `EVALUATE` audit event;
- it does not alter accepted knowledge;
- it does not silently recompute triage;
- it explicitly reports that triage recomputation is required.

**Status:** PASS

---

## 5. Contract Evaluation

P09 was checked against the active Groundline product and authority contracts.

### Agent proposes. Human decides.

**PASS.** `evaluate_item` writes analysis only. It does not accept, reject, supersede, or otherwise mutate accepted knowledge.

### Triage is operational prioritization, not a truth score.

**PASS.** P09 tools expose represented risk and evidence structure without converting risk mechanics into claims of truth.

### Missing evidence is not contradiction.

**PASS.** `find_evidence_gaps` returns `MISSING_DIRECT_EVIDENCE` with `declares_false: false`.

### Analysis must remain grounded in represented structure.

**PASS.** `find_contradictions` reports `semantic_inference_performed: false` and uses represented challenge/evidence relationships.

### Provenance must remain inspectable.

**PASS.** `inspect_item` resolves the seeded NIST evidence back to `SRC-NIST-001` and exposes source metadata.

### P0 WebMCP surface must be complete.

**PASS.** Browser discovery returned all nine P0 tools.

---

## 6. Exit Criteria

P09 exit criteria are satisfied:

```text
Implementation                PASS
9/9 P0 tools registered       PASS
Input validation              PASS
TypeScript                    PASS
Production build              PASS
Automated tests               165/165 PASS
inspect_item runtime          PASS
find_contradictions runtime   PASS
find_evidence_gaps runtime    PASS
evaluate_item runtime         PASS
```

**P09 STATUS: COMPLETE**

---

## 7. Non-Blocking Observations

During browser testing, DevTools may still show unrelated extension/content-script messages or development warnings. No observed message blocked the P09 WebMCP tool executions documented above.

These should only become Groundline blockers if a reproducible error originates from Groundline source or prevents a required WebMCP flow.

---

## 8. Next Production Stage

The next contract stage is **P10 Security / Robustness**.

Primary P10 targets:

- untrusted external source handling;
- prompt-injection fixture behavior;
- bad/unknown item IDs;
- graph-cycle robustness;
- bounded output behavior.

P10 should begin from the current `P09` implementation lineage rather than from stale `main` while P09 remains unmerged.

---

## 9. Final Checkpoint

P09 is the first checkpoint where the complete P0 WebMCP tool set has been validated across source implementation, automated tests, registration, and direct browser runtime execution.

No release tag or freeze is created at this checkpoint. The branch remains available for further iteration and later reconciliation.
