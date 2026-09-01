# TRIAGE EVALUATION SUITE — SECOND BRAIN

This folder freezes the **eight smallest acceptance cases** that production triage must pass before integration work is trusted.

The 30-case source evaluation suite remains broader. These eight cases are the executable minimum for the triage engine.

## Why eight

They cover the entire P0 triage state space and the major semantic boundaries:

- unsupported high-impact assumption;
- overgeneralization with counterevidence;
- missing evidence;
- disputed source reliability;
- direct contradiction;
- weak low-impact issue;
- stable reasoning;
- insufficient information.

## Triage state meaning

### CRITICAL
Material weakness plus high downstream impact or direct accepted-conclusion dependency.

### REVIEW
Material weakness exists but impact is lower, or review is necessary before a stable judgment.

### STABLE
No material represented weakness under the active rules.

### UNASSESSED
Insufficient represented information.

These states do not mean true/false.

## Fixture rule

A fixture describes a deterministic represented graph state. It is not a free-form LLM benchmark.

Agent phrasing may vary; semantic output may not.

## Required run order

1. schema validation
2. evaluate subject
3. compute internal weakness
4. compute impact
5. derive priority
6. assign triage state
7. verify no accepted-knowledge mutation

## Completion gate

All TRIAGE-001…008 must pass before Integration 001 is considered valid.
