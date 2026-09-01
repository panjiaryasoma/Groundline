# GROUNDLINE — TOOLCHAIN DECISION

**Status:** LOCKED FOR P0  
**Goal:** fastest path to a coherent WebMCP-native product without an unnecessary backend.

## Production stack

### Application
- React
- TypeScript
- Vite

### Graph UI
- `@xyflow/react`

Reason: Groundline's core object is a typed reasoning graph. Building pan/zoom/edge behavior from raw SVG would consume deadline without increasing WebMCP leverage.

### Runtime validation
- Zod

Reason: WebMCP tool parameters, workspace fixtures, and persisted state need one runtime validation layer.

### State
- small centralized client state store, preferably Zustand
- localStorage persistence for MVP
- seeded fixtures committed in repository

Reason: WebMCP handlers need access to the same state as the React UI without coupling tool execution to component-local state.

### Styling
- hand-authored CSS / CSS variables
- no component mega-framework required

Visual direction remains:
**geological cross-section / scientific atlas / stratigraphy**, not generic SaaS.

### Test stack
- Vitest for deterministic domain-rule/unit tests
- React Testing Library for human approval/state-transition tests
- manual Chrome 149+ WebMCP verification for agent/tool behavior
- optional Playwright only if normal UI end-to-end tests remain cheap

### Deployment
- Vercel static deployment

Reason: Groundline can be entirely client-side in P0. A backend adds credentials, latency, deployment risk, and little product value.

## WebMCP integration

Use imperative registration through `document.modelContext.registerTool(...)`.

Implementation must:
- feature-detect `document.modelContext`;
- register the nine frozen P0 tools;
- apply read-only/untrusted annotations where supported;
- return structured bounded data;
- avoid DOM automation for semantic reasoning tasks.

## No model/API dependency

Groundline does not require its own LLM API for P0.

The external browser agent performs natural-language reasoning; Groundline provides the structured state, deterministic evaluation/triage logic, and semantic WebMCP operations.

This is a strategic choice:
- less latency;
- no secret management;
- clearer WebMCP leverage;
- easier judging.

## Repository baseline

Recommended:

```text
groundline/
├── src/
│   ├── domain/
│   ├── state/
│   ├── webmcp/
│   ├── components/
│   ├── fixtures/
│   └── styles/
├── tests/
├── docs/
├── public/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Explicitly rejected for P0

- Python backend
- database
- RAG/vector store
- auth
- agent backend
- multiple LLM providers
- Next.js server features
- Tailwind dependency solely for speed
- multi-agent orchestration

## Toolchain gate

**PASS. Begin implementation with client-only React/TypeScript/Vite + WebMCP.**
