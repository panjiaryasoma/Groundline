# Groundline

**See what your conclusions stand on.**

Groundline is a WebMCP-native human-agent reasoning workspace for mapping claims, evidence, assumptions, sources, counterclaims, and conclusions so an agent can inspect reasoning, triage high-impact weaknesses, trace dependencies, and propose revisions without silently taking control of accepted knowledge.

## Current status

Development is active on branch `P11`.

The current P11 product model is a **live reasoning workspace**:

- plain-language decision intake for humans;
- graph-based reasoning objects with shared selection state;
- Inspector synchronized to the selected card;
- deterministic review/triage mechanics;
- WebMCP semantic review tools;
- sequential primary-risk review;
- human-reviewed revision proposals;
- `SUPERSEDES` lineage without silent semantic-link inheritance;
- add-card workflow with explicit `UNLINKED` state;
- human approval for proposed semantic relations;
- audit history and security/robustness guards.

The core authority invariant is:

> **Agents analyze and propose. Humans decide what becomes accepted knowledge.**

Groundline does not embed a hidden page-local LLM and does not pretend that an ordinary page button can start an external WebMCP agent.

## Product loop

```text
plain-language intake
        ↓
live reasoning workspace
        ↓
agent review / triage
        ↓
exact primary risk focused
        ↓
graph + Inspector + audit stay synchronized
        ↓
agent revision proposal
        ↓
human Accept / Edit / Reject / Defer
        ↓
accepted replacement + SUPERSEDES lineage
        ↓
fresh review when reasoning changed
```

DEMO uses deterministic seeded semantic results.

CUSTOM uses the same canonical workspace and receives semantic review from a WebMCP-capable external agent.

## Setup

Requirements:

- Node.js 22.12+
- npm
- Google Chrome with WebMCP testing enabled for WebMCP work

```bash
npm install
npm run dev
```

Verification:

```bash
npm run typecheck
npm run build
npm test
```

Branch `P11` also runs `.github/workflows/p11-verify.yml` on push.

## Authoritative product contract

The current interaction contract is:

```text
docs/05_IMPLEMENTATION_HANDOFF/P11_PRODUCT_JOURNEY_CONSOLIDATION.md
```

Active preproduction contracts remain under:

```text
docs/preproduction/active-contracts/
```

## WebMCP

Groundline exposes structured WebMCP tools for inspecting and acting on the current reasoning workspace. The current tool surface includes workspace/item inspection, evaluation, triage, contradiction and evidence-gap review, dependency tracing, focus, semantic-relation proposals, and revision proposals.

Protocol state such as semantic review tokens exists to reject stale agent work. It is not intended as normal user-facing product UI.

## License

MIT.
