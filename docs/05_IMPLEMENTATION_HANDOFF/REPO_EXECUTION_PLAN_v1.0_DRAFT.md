# GROUNDLINE — REPOSITORY EXECUTION PLAN v1.0 DRAFT

## 1. Proposed repository

```text
Groundline/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── routes.ts
│   ├── components/
│   │   ├── graph/
│   │   ├── inspector/
│   │   ├── revision/
│   │   └── audit/
│   ├── domain/
│   │   ├── schema.ts
│   │   ├── evaluation.ts
│   │   ├── triage.ts
│   │   ├── dependencies.ts
│   │   ├── revisions.ts
│   │   └── errors.ts
│   ├── fixtures/
│   │   └── integration001.ts
│   ├── state/
│   │   └── workspaceStore.ts
│   ├── webmcp/
│   │   ├── registerTools.ts
│   │   ├── toolSchemas.ts
│   │   └── tools/
│   │       ├── inspectWorkspace.ts
│   │       ├── inspectItem.ts
│   │       ├── evaluateItem.ts
│   │       ├── triageWorkspace.ts
│   │       ├── traceDependencies.ts
│   │       ├── findContradictions.ts
│   │       ├── findEvidenceGaps.ts
│   │       ├── focusItems.ts
│   │       └── proposeRevision.ts
│   ├── styles/
│   │   ├── tokens.css
│   │   └── app.css
│   └── main.tsx
│
├── tests/
│   ├── triage/
│   │   ├── TRIAGE-001.test.ts
│   │   └── ...
│   ├── integration/
│   │   └── integration001.test.ts
│   ├── security/
│   └── webmcp/
│
├── docs/
│   ├── preproduction/
│   ├── TESTING.md
│   └── WEBMCP.md
│
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
├── LICENSE
└── .gitignore
```

## 2. Package intention

Runtime:
- `react`
- `react-dom`
- `@xyflow/react`
- `zod`
- `zustand` (preferred; replace only with an equally small state strategy)

Dev:
- `typescript`
- `vite`
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- standard Vite React tooling

Avoid adding dependencies until a concrete task needs them.

## 3. Branch strategy

For deadline speed:

- `main` = deployable
- short-lived task branches only if needed

Do not create a ceremony-heavy GitFlow hierarchy.

Recommended tags:
- `vertical-slice-pass`
- `submission-candidate`
- final submission tag

## 4. Commit strategy

Narrative commits:

1. `chore: bootstrap groundline web app`
2. `feat: add final reasoning schema and integration fixture`
3. `feat: implement deterministic triage engine`
4. `test: lock eight triage acceptance cases`
5. `feat: add reasoning graph and review state`
6. `feat: register core webmcp tools`
7. `feat: complete groundline webmcp tool surface`
8. `test: add security and integration gates`
9. `style: apply geological groundline visual system`
10. `docs: add judge testing and webmcp instructions`
11. `release: prepare submission candidate`

## 5. Persistence

MVP:
- state seeded client-side;
- optional localStorage;
- reset-to-demo fixture.

No database.

## 6. Error contract

Use typed errors such as:
- `NOT_FOUND`
- `INVALID_INPUT`
- `HUMAN_APPROVAL_REQUIRED`
- `UNASSESSED`
- `CYCLE_DETECTED_OR_BOUNDED`
- `OUTPUT_TRUNCATED`

WebMCP should return structured error information, not raw thrown stack traces.

## 7. Judge mode

The deployed app should have a visible:
`Reset demo`

This is not a separate admin/dashboard mode. It simply restores Integration 001 so judges can repeat the expected path.

## 8. README minimum

README must include:
- what Groundline does;
- why WebMCP;
- architecture;
- local setup;
- Chrome 149 WebMCP flag instructions;
- demo prompts;
- tests;
- limitations;
- license;
- live link/video when ready.

## 9. Repo execution decision

**APPROVED. Start with domain tests and WebMCP vertical slice, not decorative UI.**
