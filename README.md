# Groundline

**See what your conclusions stand on.**

Groundline is a WebMCP-native human-agent reasoning workspace for mapping claims, evidence, assumptions, sources, counterclaims, and conclusions so an agent can inspect reasoning, triage high-impact weaknesses, trace dependencies, and propose revisions without silently taking control of accepted knowledge.

## Current status

**P-00 through P-05 are locally verified; P-06 Minimal Graph UI is implemented in the artifact and awaits local runtime/browser verification.**

The scaffold already includes:
- React + TypeScript + Vite;
- final schema-aligned Zod definitions;
- Integration 001 fixture;
- centralized client state;
- frozen P0 WebMCP tool names;
- contract smoke tests;
- active preproduction contracts copied into `docs/preproduction`.

Not implemented yet:
- revision transition engine;
- reasoning graph UI;
- actual WebMCP tool registration/execution.

Those are intentionally the next production tasks. A scaffold that secretly implements untested semantics would rather defeat the point of having contracts.

## Setup

Requirements:
- Node.js 22.12+
- npm
- Google Chrome 149+ with WebMCP testing enabled for WebMCP work

```bash
npm install
npm run dev
```

Tests:

```bash
npm test
npm run typecheck
```

Build:

```bash
npm run build
```

## Contract

The implementation contract lives in:

```text
docs/preproduction/active-contracts/
```

Core invariant:

> **Agents analyze and propose. Humans decide what becomes accepted knowledge.**

## Production order

Next after P-06 runtime/browser verification:
1. P-07 WebMCP bootstrap
2. P-08 WebMCP vertical slice

See `docs/preproduction/handoff/PRODUCTION_TASK_ORDER_v1.0_DRAFT.md`.

## License

MIT.
