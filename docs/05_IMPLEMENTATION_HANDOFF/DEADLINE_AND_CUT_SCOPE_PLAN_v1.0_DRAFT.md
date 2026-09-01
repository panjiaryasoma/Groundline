# GROUNDLINE — DEADLINE & CUT-SCOPE PLAN v1.0 DRAFT

**Planning snapshot:** 2026-09-02 01:45 WIB  
**Official deadline:** 2026-09-04 03:00 WIB / 2026-09-03 13:00 PT  
**Available wall-clock at snapshot:** approximately 49 hours 15 minutes.

The plan assumes sleep and failure exist, despite hackathon folklore.

## 1. Internal deadlines

### T0 — 02 Sep 02:00 WIB
Start production.

### T1 — 02 Sep 07:00 WIB
**Vertical slice domain + first WebMCP registration**

Must exist:
- repo boots;
- Integration 001 loads;
- triage engine returns expected A-001;
- at least `inspect_workspace` and `triage_workspace` register.

If missed:
cut all advanced graph editing immediately.

### T2 — 02 Sep 14:00 WIB
**Core loop functional**

Must exist:
- graph;
- focus;
- trace;
- propose revision;
- human accept/reject;
- audit.

If missed:
freeze UI to seeded fixture only; no manual graph creation.

### T3 — 02 Sep 22:00 WIB
**All nine P0 tools + 8 triage tests**

If missed:
do not add visual effects or import/export.

### T4 — 03 Sep 08:00 WIB
**Public deploy + browser WebMCP smoke**

If missed:
all P1 and decorative work stop.

### T5 — 03 Sep 14:00 WIB
**Product/code freeze candidate**

Must have:
- full core test pass;
- readable UI;
- Vercel public;
- public repo/license;
- exact testing instructions.

### T6 — 03 Sep 19:00 WIB
**Video capture complete**

### T7 — 03 Sep 22:00 WIB
**Target submission**

Leaves ~5 hours before official deadline.

### Hard internal cutoff — 04 Sep 00:30 WIB
Submission must be in even if minor polish remains.

Official deadline is emergency buffer, not development time.

## 2. Cut hierarchy

Cut in this order if schedule slips:

### CUT-1
- Markdown/JSON import/export
- additional workspaces
- share card

### CUT-2
- manual graph node creation/editing beyond what demo requires
- drag-and-drop sophistication
- automated layout polish

### CUT-3
- non-demo sample boards
- animated geological transitions
- fancy audit filtering

### CUT-4
If critical:
keep only the five central demo WebMCP tools:
- inspect_workspace
- triage_workspace
- focus_items
- trace_dependencies
- propose_revision

**But:** submission narrative must accurately describe only what is actually implemented.

### Never cut
- human approval boundary;
- Integration 001;
- triage;
- public deployment;
- WebMCP working;
- open-source license;
- demo video;
- submission.

## 3. Scope escalation prohibition

No feature may be added because:
- "it would be cool";
- another submission has it;
- an SDK makes it look easy;
- the UI seems empty.

A new feature must either:
1. materially strengthen the core demo;
2. fix a judging risk;
3. satisfy a required deliverable.

## 4. Deadline decision

The project is currently viable **only if production remains a vertical-slice-first build**.

The plan explicitly rejects a full-platform-first strategy.
