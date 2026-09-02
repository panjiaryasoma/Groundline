# P-08.1 REVIEW QUEUE + MULTI-REPAIR WORKFLOW

## Root problem

The custom workflow still treated review as one global action:

`Focus primary risk -> Propose repair`

That was wrong for a workspace containing multiple reviewable reasoning items.

It also made Human Decision look missing whenever no proposal existed.

## New interaction model

Groundline now uses a review queue.

### 1. Run analysis

This still performs structural readiness locally.

### 2. Focus primary risk

The button now opens a target picker.

If semantic triage exists:
- targets are sorted by priority score.

If semantic triage does not exist:
- accepted CLAIM / COUNTERCLAIM / ASSUMPTION / EVIDENCE / CONCLUSION items remain selectable;
- they are explicitly shown as UNRANKED.

The user chooses exactly one target.

That selection:
- updates selectedItemId;
- updates focusedItemIds;
- opens map + inspector;
- records FOCUS with `FOCUS_REVIEW_TARGET`.

### 3. Propose repair

Repair is disabled until a target has been chosen.

The repair request is tied to the chosen target, not automatically to the accepted conclusion.

Inspector immediately shows:
`Repair requested. This item is waiting for a proposal.`

Audit records a second FOCUS event with:
`requested_action = PROPOSE_REPAIR`.

### 4. Proposal source

There are now two honest paths.

#### Agent path

A connected WebMCP agent calls `propose_revision`.

The proposal is stored with:
`created_by = AGENT`.

#### Standalone/manual fallback

The human may choose:
`Write repair manually`

This creates the same PROPOSED revision object with:
`created_by = HUMAN`.

This is not presented as agent output.

The schema and revision domain already allow HUMAN-authored proposals, so no schema change is required.

### 5. Human decision

Every actual PROPOSED revision gets the same controls as the seeded example:

- Use suggestion
- Edit first
- Keep current
- Decide later

The controls are revision-specific.

Multiple proposals may be pending at the same time for different targets.

### 6. Review another risk

After requesting or receiving a repair, the user can click:

`Focus another risk`

and choose another target.

This supports:

Target A -> proposal A
Target B -> proposal B
Target C -> proposal C

before the human reviews them.

There is never more than one pending proposal for the same target.

## Important accepted-revision consequence

If the HUMAN accepts a proposal, the target is SUPERSEDED and its replacement is ACCEPTED.

Groundline still does not automatically copy old semantic support/dependency relations onto the replacement.

Therefore any prior semantic triage should be considered potentially stale after acceptance.

The queue remains usable for manual review, but a connected agent should re-triage if semantic priority must remain authoritative.

## Inspector and audit

Inspector now contains `Revision activity`.

For a selected item it shows:
- waiting repair state;
- proposal IDs;
- proposal state;
- proposer actor;
- proposed text.

Audit FOCUS entries now display requested action metadata.

PROPOSE_REVISION entries explicitly display `proposal created`.

## Multi-proposal store semantics

New revision-by-id human actions prevent one decision from accidentally consuming a different pending proposal.

- acceptRevisionById
- editAndAcceptRevisionById
- rejectRevisionById
- deferRevisionById

Replacement IDs use the target knowledge type prefix rather than always using CONC.

## WebMCP

`propose_revision` may create concurrent PROPOSED revisions for distinct targets.

A duplicate pending proposal for the same target is rejected.

## Contract evaluation

- schema unchanged
- agent-created revisions still start PROPOSED
- HUMAN remains the only actor allowed to accept/reject/defer
- HUMAN-authored manual proposals are explicitly labeled HUMAN, not disguised as agent output
- no automatic semantic rewiring
- triage is still operational priority, not truth
- WebMCP tool contract preserved

CONTRACT CHANGE: NONE
PRODUCT FLOW FIX: YES

## Validation note

The current repository contains **131 test cases** by direct artifact count. Runtime execution remains pending on the user's local install because the sandbox copy does not contain the project's installed npm dependencies.
