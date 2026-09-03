# P11.7 WebMCP-native semantic review

## Status

Implementation complete; local validation pending.

## Why P11.7 changed

An earlier P11.7 experiment embedded Chrome's on-device LanguageModel/Gemini Nano path so the page itself could perform semantic review. The hackathon rules do not forbid that integration, but it weakened Groundline's WebMCP architecture and introduced a device-dependent model preparation path that could stall the product UI.

Groundline therefore returns to its intended architecture: the web app exposes structured reasoning tools, the external WebMCP-aware agent performs semantic interpretation, Groundline validates and deterministically triages the structured result, and humans retain authority over accepted knowledge and semantic relations.

No page-local AI model is bundled or invoked by P11.7.

## Review lifecycle

1. Human creates or expands a CUSTOM reasoning workspace.
2. `Run analysis` performs the existing structural readiness check and creates a current agent review request.
3. `inspect_workspace` exposes the current `semantic_review.review_token`, exact `target_item_ids`, current `UNLINKED` cards, and the next WebMCP action.
4. If an UNLINKED card needs a defensible semantic relation, the agent may call `propose_relations`.
5. `propose_relations` stores a bounded pending proposal batch only. Canonical relations and accepted knowledge remain unchanged.
6. The human accepts selected lines or rejects the batch in the Groundline UI.
7. Human-approved relations are recorded with `created_by: HUMAN`, old semantic evaluation/triage is invalidated, and the accepted graph receives a new semantic review token.
8. The agent calls `inspect_workspace` again and submits one complete `triage_workspace` batch covering every current semantic target.
9. Groundline deterministically computes CRITICAL / REVIEW / STABLE. Priority remains an operational review mechanic, never a truth score.

## New WebMCP extension tool

`propose_relations` is a P11 extension and does not alter the frozen nine P0 tools validated in P09.

Allowed proposed relation types:

- `SUPPORTS`
- `CHALLENGES`
- `DEPENDS_ON`
- `QUALIFIES`

The tool requires:

- the latest `semantic_review.review_token`;
- one or more bounded proposals;
- accepted item IDs only;
- no self-relations;
- at least one currently UNLINKED human-authored endpoint in every proposal.

The tool explicitly returns:

- `canonical_relations_changed: false`;
- `accepted_knowledge_changed: false`;
- `human_approval_required: true`.

A stale token is rejected before pending or canonical relation state changes.

## Human authority

The agent can propose a semantic line but cannot make it canonical. The line becomes part of the accepted graph only after human approval. Relation acceptance invalidates semantic triage because downstream impact and contradiction judgments may change with the new graph.

This preserves the product contract:

**Agent proposes. Human decides.**

## Runtime expectation

In ChatGPT's in-app browser:

1. Create a custom workspace.
2. Add one or more reasoning cards.
3. Click `Run analysis again`.
4. Ask the agent to review the Groundline workspace.
5. Verify `inspect_workspace` reports the current review request and UNLINKED item IDs.
6. Verify the agent can call `propose_relations` and that no graph line appears before human approval.
7. Accept one proposed line in the UI.
8. Verify the line appears, the relevant UNLINKED state clears, and previous triage remains invalidated.
9. Ask the agent to continue.
10. Verify it re-inspects, uses the new review token, submits a complete `triage_workspace` batch, and CRITICAL / REVIEW / STABLE appears in the graph.

## Removed path

The following P11.7 experiment is intentionally removed:

- Chrome `LanguageModel` / Gemini Nano inference;
- local model availability checks;
- model download/preparation UI;
- on-device generation of relation proposals or semantic evaluations.

The browser page does not pretend to contain an AI model. Semantic intelligence belongs to the WebMCP-aware agent using Groundline's explicit tool contract.
