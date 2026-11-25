# Asset 360 Investigation Workspace — Flows code review

This document is the platform review for Asset 360 Investigation Workspace, conducted as part of the Cognite Flows app certification process.

## Path to approval

This review found **0 must-fix items** that block approval. The technical certification gate is satisfied and the app can proceed to `flows-design-review`.

### Reviewed commit

`bcec39f13e685cad80dcae69e5354860547bf02c`

## Review basis

- Repository pre-checks passed: `package.json` and `App-Brief.md` exist, and the working directory is the Git app root.
- The required CLI pull was attempted first. After its sandboxed temporary clone failed to create Git hooks, the prescribed fallback fetched current `flows-review-checks` and `code-quality` directly from `cognitedata/builder-skills` `main` before scoring.
- Every hunt in the fetched `flows-review-checks` and every search in the fetched `code-quality` skill was run. No fix instruction from `code-quality` was applied.
- Every non-trivial application production file was read. The complete inventory is in `review-files.md`; detailed hunt evidence is in `review-findings.md`; package evidence is in `review-packages.md`.

## Checks performed

- Coverage and test exclusions inspected in `vitest.config.ts`.
- Error boundary, TODO, effect cleanup, and async loading/error/empty-state hunts.
- CDF Raw, DMS operation, pagination, filtering, task-runner, and 429/backoff hunts.
- Type safety, `vi.mock`, context DI, service interfaces, ViewModel separation, direct client construction, console, routes, dead code, naming, duplication, feature structure, and component-size hunts.
- Verified a real 300 ms abortable type-ahead delay and focused stale-query/unmount tests.
- Verified every asset, activity, time-series metadata, latest-datapoint, and range-datapoint read uses the shared bounded 429 retry helper.
- Verified startup state field bounds and cross-field invariants with focused parser tests.
- Verified the feature-colocation convention is documented in `README.md`.
- `npm run lint`: passed with 0 errors and 0 warnings.
- `npx tsc --noEmit`: passed with 0 errors.
- `npm run build`: passed; Vite emitted a non-blocking large-chunk advisory.
- `npm outdated --json`, full `npm audit --json`, and flagged-package deprecation checks completed.
- Focused certification tests and full-scope coverage completed successfully.

## Test coverage

- Framework: Vitest 4.1.12 with V8 coverage.
- Scope: all `src/**/*.{ts,tsx}`.
- Allowed exclusions only: test/spec files, `src/vite-env.d.ts`, and `src/main.tsx`.
- Test exclusions do not hide application tests; `.agents/**` and `.claude/**` are vendored skill reference code, not app tests.
- Results: 24 test files passed; 124 tests passed; 0 failed; 0 skipped.
- Statements: 91.93% (718/781).
- Branches: 82.33% (564/685).
- Functions: 96.18% (252/262).
- Lines: **95.82% (665/694)**.
- The required honest full-scope 80% line-coverage gate is satisfied.

## Package audit result

- Full audit: 0 critical, **0 high, 0 moderate**, 8 low affected-package entries.
- The low entries trace to one transitive KaTeX advisory through Aura/streamdown.
- React, React DOM, and TanStack Table are one major behind; App SDK is more than one pre-1.0 minor behind. None of the flagged packages is deprecated.
- Package health: **Warn**, with no vulnerability blocking certification.

## Scores

| Area | Criterion | Score | Notes |
| --- | --- | --- | --- |
| User & customer | 1.1 Known bugs | 5/5 | Core loading/error/empty/no-access states and an app ErrorBoundary are present; effects clean up, and bounded startup parsing enforces cross-field consistency in `src/state/asset360State.ts`. |
| User & customer | 1.3 Packages | 3/5 | The full audit has 0 high/moderate/critical findings, but several production dependencies have pending major/pre-1.0 minor upgrades and the build reports a large main chunk. |
| User & customer | 1.4 Tests & coverage | 5/5 | Vitest covers the complete allowed `src` scope at 95.82% lines, with focused tests for all non-trivial modules and the remediated behaviors. |
| User & customer | 1.5 Dead code | 5/5 | Lint/tsc pass; no production `any`, dead module, unreachable route, console call, TODO, or commented-out block was found; the feature-colocation convention is documented. |
| User & customer | 1.6 Patterns & testability | 5/5 | ViewModels are stateless, dependencies come through context, services implement interfaces, the client is constructed only at bootstrap, and no module mocks or unsafe casts exist. |
| Cognite services | 2.1 DMS query patterns | 5/5 | Ranked search uses `instances.search`; documented list-valued reverse relations use filtered `instances.list`; known IDs use retrieve. |
| Cognite services | 2.2 Server-side filter | 5/5 | Related time series and activities use server-side `containsAny`; search is server-side; no download-then-filter pattern exists. |
| Cognite services | 2.3 Limits & pages | 5/5 | Search is deliberately bounded; relation and datapoint reads use explicit limits, batching, and consume every returned cursor. |
| Cognite services | 2.4 Call rate | 5/5 | Type-ahead waits for 300 ms of stable input with abort cancellation; remaining reads are manual, bounded, cached, serial, or batched. |
| Cognite services | 2.5 429 backoff | 5/5 | Every CDF read has four-attempt 429-only retry, capped exponential backoff, bounded jitter, `Retry-After` seconds/date support, and a 30-second delay cap. |
| Cognite services | 2.6 CDF Raw | N/A | No CDF Raw use was found. |
| Brand | 3.1 Aura | 5/5 | Aura primitives, chart wrapper, Data Grid, semantic tokens, accessible labels, and explicit feedback states are used consistently. |

## Must Fix

None.

## Should Fix

- [ ] Plan and test the current production major/minor upgrades (`react`/`react-dom` 18→19, `@tanstack/react-table` 8→9, and `@cognite/app-sdk` 0.9→0.11), including bundle-impact validation — `package.json:26-35` — criterion 1.3.

## Nice Fix

- [ ] Track the low-severity transitive KaTeX advisory currently entering through Aura/streamdown until an upstream compatible resolution is available — `package.json:27` — criterion 1.3.

## Summary

- Must Fix open: 0
- Should Fix open: 1
- Nice Fix open: 1
