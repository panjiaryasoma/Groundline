# P-06.7 REAL-USER ENTRY AND INTAKE FLOW

## Problem

Until this milestone, Groundline could demonstrate its reasoning workflow only through a seeded fixture.

A real user had no answer to:

- What am I supposed to enter?
- Where do I put it?
- What happens after I submit it?
- Do I need to understand CLAIM / ASSUMPTION / EVIDENCE?
- Do I need to organize the graph myself?

That is a missing core product flow, not a cosmetic issue.

## Product entry

Groundline now opens with two honest choices:

1. `Check my own decision`
2. `Try the example`

The seeded face-recognition fixture is explicitly an example, not the product itself.

## Human-facing intake

The custom flow asks four staged questions.

### Decision

Required:
- What are you trying to decide?
- What do you currently think the answer is?

### Reason

Required:
- What is your main reason?

Optional:
- What has to be true for that reason to hold?

### Evidence

Optional:
- What makes you think the reason is true?
- Source URL

### Review

Before workspace creation, the user sees exactly what Groundline understood.

The UI explicitly says:

`You do not need to place cards on the graph yourself.`

## Internal mapping

The builder translates user language into the active schema:

- decision question → QUESTION
- current answer → CONCLUSION
- main reason → CLAIM
- what must be true → ASSUMPTION
- what supports the reason → EVIDENCE
- where it came from → SOURCE

Relations are created deterministically:

- CLAIM SUPPORTS CONCLUSION
- ASSUMPTION SUPPORTS CLAIM
- EVIDENCE SUPPORTS CLAIM
- SOURCE SOURCED_FROM EVIDENCE

## Important epistemic boundary

Custom user prose is NOT automatically assigned semantic evaluation ratings.

Groundline does not infer from free text that:

- evidence is strong;
- a source is high quality;
- an assumption is unsupported;
- a claim is contradicted;
- a conclusion is overgeneralized.

Those remain semantic review tasks.

P-06.7 adds only a **structural readiness check**.

It may say:

- an assumption was not stated;
- evidence was not provided;
- evidence has no source provenance;
- the structure is ready for agent review.

This preserves P-03's prohibition against a hidden local truth oracle.

## After input

The user lands on a simple `Your reasoning workspace` view.

It answers two questions directly:

### Where did my input go?

The page repeats each answer in human language:

- You are deciding
- Your current answer
- Your main reason
- This must be true
- What supports the reason
- Where it came from

### What do I do now?

Primary CTA:

`Check what is missing`

If gaps exist:
- Groundline explains them;
- `Add the missing pieces` reopens the intake with existing values.

If the structure is complete:
- Groundline says `Ready for agent review`.

The WebMCP agent review remains the next implementation milestone rather than being faked locally.

## Advanced map

The technical graph remains optional and hidden behind an Advanced disclosure.

Real users never need to manually place semantic cards to create a workspace.

## Contract evaluation

- schema version: unchanged
- knowledge types: unchanged
- relation types: unchanged
- human authority: unchanged
- semantic evaluation contract: unchanged
- triage contract: unchanged
- source provenance rules: unchanged
- WebMCP scope: unchanged

Custom input is translated into already-approved schema objects.

**CONTRACT CHANGE: NONE**
**SCHEMA CHANGE REQUEST: NOT REQUIRED**

## New tests

- 5 custom workspace / structural diagnostic tests
- 3 intake UX tests
- 2 custom workspace next-step tests

Total new: 10

Previous expected total: 98  
New expected total: **108 tests**
