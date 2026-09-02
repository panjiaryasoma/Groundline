# P11.6 Runtime validation checklist

Use a CUSTOM workspace in a WebMCP-enabled browser.

1. Call `inspect_workspace` and save `semantic_review.review_token` plus `target_item_ids`.
2. Confirm the target list includes the current accepted claim, assumption, evidence, conclusion, and any accepted user-added claim/counterclaim/assumption/evidence cards.
3. Submit `triage_workspace` once with the saved token and exactly one structured evaluation for every target.
4. Confirm the tool returns `semantic_review.coverage_complete: true`, non-zero state counts, and `primary_risk` when CRITICAL or REVIEW items exist.
5. Confirm the graph immediately renders the returned triage states and selects the primary risk.
6. Add one new reasoning card. Reuse the old token and confirm `triage_workspace` rejects it as stale without adding triage records.
7. Call `inspect_workspace` again, confirm the token changed and the new card is in `target_item_ids`, then submit a fresh complete batch.
8. Confirm Focus primary risk and repair remain unavailable before fresh triage and become available after the fresh batch.

P11.6 is complete only after typecheck, build, full tests, and this browser runtime path pass.
