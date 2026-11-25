# Asset 360 Investigation Workspace — Flows code review

This document is the platform review for Asset 360 Investigation Workspace, conducted as part of the Cognite Flows app certification process.

## Path to approval

This review found **1 must-fix item** that blocks approval. Once the must-fix items are addressed, re-run `flows-code-review`.

### Reviewed commit

`2e4bb7b2ab7230c68d541888285f5c2c999528d8`

## Review basis

- Repository pre-checks passed: `package.json` and `App-Brief.md` exist; branch is `main`; the repository was clean at the start; HEAD matched implementation commit `2e4bb7b`.
- The latest `flows-review-checks` and `code-quality` were pulled successfully from `cognitedata/builder-skills` before scoring. The first sandboxed CLI attempt could not create temporary Git hooks; retrying outside the sandbox succeeded. No fallback/stale copy was used for scoring.
- Every hunt in the pulled `flows-review-checks` and every search in the pulled `code-quality` skill was run. No fix instruction from `code-quality` was applied.
- Every non-trivial application production file was read. The complete inventory is in `review-files.md`; detailed hunt evidence is in `review-findings.md`; package evidence is in `review-packages.md`.

## Checks performed

- Coverage and test exclusions inspected in `vitest.config.ts`.
- Error boundary, TODO, effect cleanup, and async loading/error/empty-state hunts.
- CDF Raw, DMS operation, pagination, filtering, task-runner, and 429/backoff hunts.
- Type safety, `vi.mock`, context DI, service interfaces, ViewModel separation, direct client construction, console, routes, dead code, naming, duplication, and component-size hunts.
- `npm run lint`: passed with 0 errors and 0 warnings.
- `npx tsc --noEmit`: passed with 0 errors.
- `npm run build`: passed. Vite emitted a non-blocking 1,189.23 kB main-chunk warning.
- `npm outdated --json`, full `npm audit --json`, production-only audit clarification, and flagged-package deprecation checks.
- `npx vitest run --coverage`: passed.

## Test coverage

- Framework: Vitest 4.1.10 with V8 coverage.
- Scope: all `src/**/*.{ts,tsx}`.
- Allowed exclusions only: test/spec files, `src/vite-env.d.ts`, and `src/main.tsx`.
- Test exclusions do not hide application tests; `.agents/**` and `.claude/**` are vendored skill reference code, not app tests.
- Results: 22 test files passed; 104 tests passed; 0 failed; 0 skipped.
- Statements: 91.26% (637/698).
- Branches: 81.97% (514/627).
- Functions: 95.29% (223/234).
- Lines: **95.62% (590/617)**.
- The required true-scope line coverage gate of 80% is satisfied.

## Package audit result

- Full audit: 0 critical, **1 high**, 4 moderate, 8 low affected-package entries.
- Production-only clarification: 0 critical, 0 high, 0 moderate, 8 low.
- The high finding is in direct development dependency `happy-dom`, but the current review bar does not exempt development-only results from its full-audit high/critical Must Fix rule.
- Package health: **Fail** until `happy-dom` is upgraded beyond the audited vulnerable ranges and the lockfile is refreshed.

## Scores

| Area | Criterion | Score | Notes |
| --- | --- | --- | --- |
| User & customer | 1.1 Known bugs | 4/5 | Core loading/error/empty states and an app ErrorBoundary are present. Startup validation accepts a minor cross-field-invalid state (`asset` view with no selected asset). |
| User & customer | 1.3 Packages | 2/5 | Full audit contains a high-severity `happy-dom` finding. Production audit has low findings only, but the current bar makes the full-audit high blocking. |
| User & customer | 1.4 Tests & coverage | 4/5 | Honest full-scope line coverage is 95.62%; one secondary DI-default module lacks a focused matching test. |
| User & customer | 1.5 Dead code | 3/5 | Lint/tsc pass and no dead production files were confirmed, but file/feature organization differs from the loaded code-quality naming and barrel convention. |
| User & customer | 1.6 Patterns & testability | 5/5 | ViewModels are stateless, dependencies come through context, services implement interfaces, and no module mocks or production unsafe casts exist. |
| Cognite services | 2.1 DMS query patterns | 5/5 | Ranked search uses `instances.search`; relation reads use filtered `instances.list` because the documented list-valued reverse relation cannot be traversed with query. |
| Cognite services | 2.2 Server-side filter | 5/5 | Related time series and activities use server-side `containsAny`; search is server-side; no download-then-filter pattern exists. |
| Cognite services | 2.3 Limits & pages | 5/5 | Search is deliberately bounded; complete relation and datapoint reads use explicit limits and consume every cursor. |
| Cognite services | 2.4 Call rate | 3/5 | Requests are otherwise bounded/manual, but `useDeferredValue` does not debounce type-ahead network calls. |
| Cognite services | 2.5 429 backoff | 3/5 | Calls are serial/batched rather than highly parallel, but no task runner, `Retry-After`, or exponential backoff handling exists and query retries are disabled. |
| Cognite services | 2.6 CDF Raw | N/A | No CDF Raw use was found. |
| Brand | 3.1 Aura | 5/5 | Aura primitives, chart wrapper, semantic tokens, accessible labels, and explicit feedback states are used consistently. |

## Must Fix

- [ ] Upgrade `happy-dom` beyond the vulnerable ranges and refresh the lockfile — `package.json:56` — criterion 1.3. The required full audit reports high-severity host-code-execution and SSRF advisories. _Impact:_ crafted content processed in test or CI environments could expose developer/CI credentials or internal network access, and the current certification bar blocks on any full-audit high/critical CVE.

## Should Fix

- [ ] Add bounded 429 handling with exponential backoff, jitter, and `Retry-After` support (or a platform task runner) — `src/services/activityService.ts:40`, `src/services/timeSeriesService.ts:60` — criterion 2.5.
- [ ] Add a true debounce before type-ahead CDF search requests — `src/asset360/useAssetSearchViewModel.ts:40-46` — criterion 2.4.
- [ ] Align file/feature organization with the loaded code-quality kebab-case/component-folder convention, or document an approved alternative — `src/asset360/TimeSeriesPanel.tsx`, `src/asset360/asset360ViewModelContext.ts` — criterion 1.5.
- [ ] Upgrade the moderate-advisory Vitest packages and plan the one-major production dependency updates — `package.json:31-34,48-49,62` — criterion 1.3.

## Nice Fix

- [ ] Enforce startup-state cross-field consistency — `src/state/asset360State.ts:61-68` — criterion 1.1.
- [ ] Add a focused `asset360ViewModelContext` default-dependency test — `src/asset360/asset360ViewModelContext.ts:33-54` — criterion 1.4.
- [ ] Track the low production-transitive Aura/streamdown/KaTeX/Mermaid advisories — `package.json:27` — criterion 1.3.

## Summary

- Must Fix open: 1
- Should Fix open: 4
- Nice Fix open: 3
