# GROUNDLINE — PRODUCT REQUIREMENTS DOCUMENT

**Version:** 1.0  
**Status:** Preproduction scope lock  
**Product type:** WebMCP-enabled human-agent reasoning workspace

## 1. Product statement
Groundline is a shared reasoning workspace where humans structure questions, claims, evidence, assumptions, counterclaims, sources, and conclusions while agents use WebMCP to inspect the structure, evaluate support, triage high-impact reasoning risks, trace dependencies, and propose revisions.

**Authority rule:** agents analyze and propose; humans decide what becomes accepted knowledge.

## 2. Primary user story
> I have a conclusion supported by several claims and sources. I want an agent to find the weakness most likely to change the conclusion, show exactly why it matters, and propose a repair without silently rewriting my accepted reasoning.

## 3. P0 scope
1. Open one seeded reasoning workspace.
2. Render typed reasoning nodes and relations.
3. Create/edit knowledge manually.
4. Inspect workspace and items through WebMCP.
5. Evaluate one item.
6. Triage the workspace.
7. Trace upstream/downstream dependencies.
8. Detect explicit contradiction relationships.
9. Detect evidence gaps.
10. Focus relevant nodes in the UI.
11. Propose a revision.
12. Human Accept / Edit / Reject.
13. Preserve accepted vs proposed state.
14. Maintain audit history.
15. Expose source/evidence as untrusted content.
16. Provide seeded demo cases.
17. Deploy to a public live URL.

### P1 only after P0 is stable
- Markdown/JSON import-export
- multiple workspaces
- shareable read-only board
- URL metadata capture

### Non-goals
- autonomous web research/RAG
- accounts/authentication
- database sync
- multi-user collaboration
- generic chatbot
- truth score
- automatic acceptance of agent revisions

## 4. Canonical knowledge model
- `QUESTION`
- `CLAIM`
- `COUNTERCLAIM`
- `EVIDENCE`
- `ASSUMPTION`
- `SOURCE`
- `CONCLUSION`

Evaluation, triage, contradiction findings, evidence gaps, and revisions are **not** peer knowledge-node types.

## 5. Evaluation model
Dimensions:
- `evidence_strength`
- `source_quality`
- `contradiction`
- `assumption_burden`
- `generalization_risk`
- `downstream_impact`

Rating enum: `LOW | MODERATE | HIGH | UNASSESSED`.

Triage enum: `CRITICAL | REVIEW | STABLE | UNASSESSED`.

Reason codes:
`WEAK_SUPPORT`, `MISSING_DIRECT_EVIDENCE`, `SOURCE_QUALITY_UNCLEAR`, `SOURCE_CONFLICT`, `UNSUPPORTED_ASSUMPTION`, `OVERGENERALIZATION`, `CONTRADICTED`, `STALE_EVIDENCE`, `SCOPE_MISMATCH`, `DEPENDENCY_ON_UNASSESSED_NODE`.

## 6. WebMCP tool contract

### inspect_workspace
Read-only. Returns bounded workspace summary, accepted conclusion, counts, unresolved items, selected item.

### inspect_item
Read-only. Returns type, text, state, relations, evaluation, provenance and dependency IDs.

### evaluate_item
Writes an evaluation record only; never accepted knowledge.

### triage_workspace
Writes/recomputes triage records; never accepted knowledge.

### trace_dependencies
Read-only, cycle-safe, bounded.

### find_contradictions
Analysis over represented relations/evidence. MVP does not claim universal semantic contradiction detection.

### find_evidence_gaps
Identifies insufficient represented support without declaring a claim false.

### focus_items
Changes ephemeral visual focus only.

### propose_revision
Creates `PROPOSED` revision with target, text, reason codes and affected IDs.

## 7. WebMCP annotations
- non-mutating tools: `readOnlyHint: true` where supported;
- source/evidence-returning tools: `untrustedContentHint: true`;
- `focus_items`: UI-state mutation only;
- `propose_revision`: not read-only, but cannot accept itself.

## 8. Human authority boundary
Only explicit human UI actions can:
- accept revision;
- edit accepted content;
- delete accepted knowledge;
- set/change the final accepted conclusion.

Direct agent attempt returns `HUMAN_APPROVAL_REQUIRED`.

## 9. State model
Knowledge: `DRAFT → ACCEPTED → SUPERSEDED`.

Revision: `PROPOSED → ACCEPTED | REJECTED | EDITED_AND_ACCEPTED | DEFERRED`.

MVP does not erase historical provenance.

## 10. Functional requirements
- **FR-01** render typed graph.
- **FR-02** stable IDs.
- **FR-03** semantic inspection without DOM scraping.
- **FR-04** evaluation returns dimensions + reason codes + references.
- **FR-05** triage ranks weakness × downstream impact.
- **FR-06** dependency tracing returns affected accepted conclusions.
- **FR-07** evidence gaps distinguish absence from contradiction.
- **FR-08** agent revision proposal is bounded.
- **FR-09** human approval is mandatory for accepted-state change.
- **FR-10** all material state transitions produce audit events.
- **FR-11** external/user evidence is untrusted.
- **FR-12** tool output is bounded.
- **FR-13** seeded demo state is deterministic.
- **FR-14** invalid tool inputs return structured errors.

## 11. Non-functional requirements
- client-first/local state acceptable for MVP;
- no backend required unless deployment architecture needs one;
- seeded board loads <2s on reference browser;
- desktop-first responsive layout;
- statuses not conveyed by color alone;
- English app/submission materials;
- public live URL usable in ChatGPT in-app browser or Chrome 149+ WebMCP testing.

## 12. Demo scenario
Question: **Should this organization deploy face recognition for a high-stakes access decision?**

Seeded structure:
- aggregate performance claim;
- NIST subgroup-performance evidence;
- assumption that aggregate accuracy generalizes;
- counterclaim about demographic differentials;
- accepted conclusion deliberately too broad.

Demo path:
1. “Triage this board and show only issues that could change the conclusion.”
2. `triage_workspace`
3. focus unsupported generalization assumption.
4. “Why does this matter?”
5. `trace_dependencies`
6. show assumption → claim → conclusion.
7. “Repair the conclusion without deleting the original.”
8. `propose_revision`
9. human accepts.
10. audit log shows old conclusion superseded, new one accepted.

## 13. Acceptance targets
- 30 defined evaluation fixtures;
- zero agent tool capable of direct accepted-state overwrite;
- all hard invariants pass;
- ≥80% intended WebMCP tool-selection success across repeated runtime eval prompts;
- ≥90% valid parameters given successful tool selection;
- live URL + public repo + open-source license + <3 min public YouTube demo with audio.

## 14. Release gate
Implementation may begin only if schema alignment and validation show no blocking mismatch.
