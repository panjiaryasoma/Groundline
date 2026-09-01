# SCHEMA CHANGE REQUEST 001

**SCR:** SCR-001  
**Status:** ACCEPTED  
**From:** feature schema v1.0  
**To:** `FEATURE_SCHEMA_FINAL.yaml` v1.1.0

## Why this change exists

The first schema defined the correct conceptual objects, but the triage acceptance phase exposed several places where production behavior would otherwise remain ambiguous.

## Accepted changes

### 1. Add explicit `schema_version`
Reason: fixtures, browser state, and future migrations need to identify the contract they implement.

### 2. Rename workspace collection `triage` → `triage_records`
Reason: distinguish records from the triage operation/tool itself.

### 3. Make evaluation dimension results structured
Old schema listed dimension names only.

Final schema stores:
- rating;
- reason codes;
- referenced item IDs.

Reason: a rating without provenance is not auditable.

### 4. Add evaluation `status`
`COMPLETE | PARTIAL | UNASSESSED`

Reason: partial information must not masquerade as complete evaluation.

### 5. Add internal triage prioritization fields
- `weakness_score_internal`
- `impact_score_internal`
- `priority_score_internal`

Reason: the eight acceptance fixtures require deterministic priority ordering.

These values are explicitly operational and are not truth/confidence scores.

### 6. Add `direct_to_accepted_conclusion`
Reason: domain rule TRI-001 requires knowing whether a high weakness directly supports the accepted conclusion.

### 7. Add explicit source metadata contract
Reason: source provenance was only loosely represented in v1.0.

### 8. Add revision timestamps/reviewer fields
Reason: human approval and auditability require review provenance.

### 9. Add ephemeral UI state boundary
`focused_item_ids` and `selected_item_id` are not accepted knowledge.

Reason: `focus_items` changes the interface but must never count as knowledge mutation.

### 10. Add WebMCP tool-surface metadata
Reason: preproduction must freeze which operations can mutate accepted knowledge and which return untrusted content.

## Rejected changes

- Add `truth_score` → REJECTED.
- Make `EVALUATION` a knowledge type → REJECTED.
- Make `TRIAGE` a knowledge type → REJECTED.
- Allow agent direct accept → REJECTED.
- Add autonomous web search/RAG to P0 → REJECTED.
- Add natural-language semantic contradiction oracle to P0 → REJECTED.

## Compatibility

The new schema is conceptually backward compatible but not serialization-identical. Production starts directly on v1.1.0, so no runtime migration is required for the hackathon build.

## Decision

**ACCEPTED. FEATURE_SCHEMA_FINAL v1.1.0 becomes the active production contract.**
