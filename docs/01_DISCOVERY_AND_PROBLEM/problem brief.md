# GROUNDLINE — PROBLEM BRIEF

**Version:** 1.0  
**Status:** Preproduction candidate  
**Date:** 2 September 2026  
**Hackathon:** The WebMCP Challenge  
**Product:** Groundline  
**Tagline:** *See what your conclusions stand on.*

## 1. Problem

People increasingly use AI to produce answers, summaries, plans, recommendations, research notes, and decisions. The interface is usually conversational: a user asks, an AI responds, and the result is stored as prose.

That interface hides a critical structure:
- which claims support the conclusion;
- which evidence supports each claim;
- which assumptions must hold;
- which sources are direct, indirect, stale, disputed, or missing;
- which contradictions remain unresolved;
- which weak dependency could change the final conclusion.

A polished paragraph can therefore look more certain than the reasoning underneath it.

Groundline addresses a narrower problem than “AI hallucination” or generic fact checking:

> **How can a human and an AI agent inspect the same structured reasoning object, identify the dependencies that matter most, and repair weak reasoning without allowing the agent to silently redefine accepted knowledge?**

## 2. Real-world evidence that the problem pattern recurs

These cases are evidence of recurring reasoning and decision-quality failure modes. They are **not** claims that Groundline would have prevented any event.

### Challenger STS-51L
The Rogers Commission documented recurring O-ring erosion/blow-by, incomplete escalation of temperature-related concerns, and normalization of escalating risk after prior successful flights.  
Source: https://sma.nasa.gov/SignificantIncidents/assets/rogers_commission_report.pdf

**Pattern:** repeated adverse evidence can coexist with a stable high-level conclusion when dependencies and escalation paths remain implicit.

### Columbia STS-107
The Columbia Accident Investigation Board identified foam impact damage as the physical cause and documented organizational and decision-process failures around assessment of the strike.  
Source: https://www.nasa.gov/history/columbia-accident-investigation-board-synopsis/

**Pattern:** prior non-failure can be mistaken for direct evidence of safety; missing direct evidence may remain invisible.

### Patriot missile failure at Dhahran
GAO found a software timing error that worsened with continuous operation; the battery had been operating for more than 100 hours, outside the historical operating pattern the system had been expected to sustain.  
Source: https://www.gao.gov/products/imtec-92-26

**Pattern:** a conclusion can depend on a hidden operating-range assumption.

### UK Post Office Horizon
The CCRC documented significant Horizon problems and a material risk that apparent shortfalls were caused by bugs/errors/defects, while users had limited ability to challenge system-generated figures.  
Source: https://ccrc.gov.uk/post-office-horizon-cases/

**Pattern:** institutional authority can be substituted for source reliability and provenance.

### Therac-25
The Therac-25 history documents repeated overdose reports, early difficulty reproducing failures, alternative explanations, and later reproduction of a hazardous sequence.  
Source: https://onlineethics.virginia.edu/cases/therac-25/history-introduction-and-shut-down-therac-25

**Pattern:** inability to reproduce is not equivalent to disproving an incident report.

### Face recognition demographic differentials
NIST documented demographic differentials across many algorithms and emphasized that performance depends on algorithm, application, data, population, and image quality.  
Source: https://www.nist.gov/publications/face-recognition-vendor-test-part-3-demographic-effects

**Pattern:** aggregate evidence can be overgeneralized beyond the evaluated population.

### WHO living guideline
WHO living guidance updated recommendations as new evidence accumulated.  
Source: https://www.who.int/publications/i/item/WHO-2019-nCoV-prophylaxes-2023.1

**Pattern:** accepted conclusions need revision history instead of permanent finality.

## 3. Primary user
A knowledge worker who must make or defend a consequential conclusion from multiple pieces of evidence: researcher, analyst, engineer, product/policy decision-maker, journalist, or student performing evidence-based analysis.

## 4. Job to be done
> When I am building or reviewing a conclusion from several claims, sources, assumptions, and counterarguments, help me see what the conclusion depends on, what is weak or unresolved, and what should be reviewed first.

## 5. Product thesis
Groundline models reasoning as an inspectable dependency structure rather than a flat answer.

Knowledge objects:
`QUESTION → CLAIM / COUNTERCLAIM → EVIDENCE → SOURCE + ASSUMPTION → CONCLUSION`

Agent analysis:
`EVALUATE → TRIAGE → TRACE → PROPOSE REVISION`

Authority:
`AGENT PROPOSES → HUMAN ACCEPTS / EDITS / REJECTS`

## 6. Why WebMCP is intrinsic
WebMCP lets a web application expose semantic JavaScript tools directly to agents instead of forcing an agent to infer meaning from visual DOM structure. Groundline therefore exposes bounded operations over claims, evidence, assumptions, provenance, dependencies, and revisions.

P0 tool family:
- `inspect_workspace`
- `inspect_item`
- `evaluate_item`
- `triage_workspace`
- `trace_dependencies`
- `find_contradictions`
- `find_evidence_gaps`
- `focus_items`
- `propose_revision`

The WebMCP draft defines `document.modelContext.registerTool()`. Chrome guidance recommends `readOnlyHint` for non-mutating tools and `untrustedContentHint` for user-generated or external content.  
Sources: https://webmachinelearning.github.io/webmcp/ ; https://developer.chrome.com/docs/ai/webmcp/secure-tools

## 7. Core analytical dimensions
1. Evidence strength
2. Source quality
3. Contradiction
4. Assumption burden
5. Generalization risk
6. Downstream impact

No universal truth percentage is produced.

## 8. Triage states
- `CRITICAL`
- `REVIEW`
- `STABLE`
- `UNASSESSED`

Triage answers **what deserves human attention first**, not “what is true.”

## 9. Product boundaries
Groundline is not a truth oracle, autonomous research system, legal/medical decision system, or numerical truth-score generator. It evaluates the **represented structure and support of reasoning**.

## 10. Risks and mitigations
- **False epistemic authority:** use categorical outputs, reason codes, referenced evidence, and limitations.
- **Agent overreach:** accepted knowledge changes require explicit human UI action.
- **Prompt injection through evidence:** source/evidence payloads are untrusted data.
- **Scope explosion:** one workspace, bounded graph, evaluate/triage/trace/propose loop only.

## 11. Success definition
The MVP succeeds if a judge can ask an agent to identify a high-impact weakness, see the semantic WebMCP tool call, trace why it matters, receive a bounded revision proposal, and verify that the agent cannot silently overwrite accepted knowledge.

## 12. Hackathon fit
Official rules require a WebMCP-powered web app where humans and agents interact, collaborate, and create together. Stage Two equally weights WebMCP Leverage, Execution, Potential Impact, and Creativity & Ambition.  
Source: https://webmcp.devpost.com/rules

## 13. Gate
**PASS TO REAL-CASE DISCOVERY + EVALUATION DESIGN**, with three conditions:
1. historical cases are failure-mode evidence, not prevention claims;
2. real-derived and synthetic evaluation fixtures remain explicitly separated;
3. no P0 feature enters implementation without traceability.
