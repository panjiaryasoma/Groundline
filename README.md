# Groundline

**See what your conclusions stand on.**

Groundline is a WebMCP-native human-agent reasoning workspace for mapping claims, evidence, assumptions, sources, counterclaims, and conclusions so an agent can inspect reasoning, triage high-impact weaknesses, trace dependencies, and propose revisions without silently taking control of accepted knowledge.

## Current status

**P-00, P-02, and P-03 complete in the artifact; local runtime verification for P-03 is the next gate.**

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

Next after P-03 runtime verification:
1. P-04 revision authority
2. P-05 Integration 001 runtime pass
3. P-06 minimal graph UI
4. P-07/P-08 WebMCP vertical slice

See `docs/preproduction/handoff/PRODUCTION_TASK_ORDER_v1.0_DRAFT.md`.

## License

MIT.
