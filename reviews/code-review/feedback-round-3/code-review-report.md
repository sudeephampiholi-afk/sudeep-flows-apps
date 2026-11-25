# Asset 360 Investigation Workspace — Flows code review

This document is the platform review for Asset 360 Investigation Workspace, conducted as part of the Cognite Flows app certification process.

## Path to approval

This review found **0 must-fix item(s)** that block approval. The technical certification gate is satisfied and the app can proceed to `flows-design-review`. Two Should Fix and four Nice Fix items remain open.

### Reviewed commit

`d05202b62fa5946f02c1a8b5904c23b13b38df14`

## Review basis (round 3)

- Reviewed the committed HEAD `d05202b` (`fix(activities): render related activities with an Aura item list`); the working tree was clean.
- Scope of change since round 2 (`bcec39f`): the activities panel moved from Aura Data Grid to Aura `ItemGroup`/`Item`, with its tests, a `SPEC.md` update, and removal of `@tanstack/react-table` and `@tanstack/react-virtual`. No service, ViewModel, state, or host code changed.
- Pre-checks passed: `package.json` and `App-Brief.md` exist; the app root is a Git repository.
- `flows-review-checks` and `code-quality` were pulled with `npx @cognite/cli@latest apps skills pull --skill …`. The first attempt failed in the sandbox (`EPERM` in the npx cache); the retry outside the sandbox succeeded, so the `curl` fallback was not needed. `code-quality` fix instructions were not applied.
- Every hunt in `flows-review-checks` and every search in `code-quality` was run; results are in `review-findings.md`. Every non-trivial production file was read; the inventory is in `review-files.md` and package evidence is in `review-packages.md`.

## Checks performed

- Coverage and test-exclusion config inspected in `vitest.config.ts` (no production files excluded; no app tests excluded).
- ErrorBoundary, TODO, `useEffect` cleanup, and loading/error/empty-state hunts.
- CDF Raw (none), DMS operation, pagination, filtering, task-runner, and 429/backoff hunts.
- Type safety (`any`/`as unknown as`: none), `vi.mock` (none), context DI, service interfaces, ViewModel separation, direct client construction (`main.tsx` only), console, routes, dead/unused code, naming, duplication, structure, and component-size hunts.
- Verified the removed grid dependencies are referenced nowhere (`src/`, `package.json`, docs, manifests).
- Verified the new activities list: semantic list/list-item roles, one real button per row, `aria-pressed` and `selected` state, keyboard and pointer activation tests, and host-synced selection retained.
- `npm run lint`: passed, 0 errors, 0 warnings.
- `npx tsc --noEmit`: passed, 0 errors.
- `npm run build`: passed; Vite emitted a non-blocking large-chunk advisory (1,036 kB / 309 kB gzip).
- `npm outdated --json`, `npm audit --json`, and `npm view … deprecated` for flagged packages completed.
- Full-scope coverage run completed successfully.

## Test coverage

- Framework: Vitest 4.1.12 with V8 coverage.
- Scope: all `src/**/*.{ts,tsx}`.
- Coverage exclusions (allowed only): test/spec files, `src/vite-env.d.ts`, `src/main.tsx`. **No production files are excluded.**
- Test exclusions: Vitest defaults plus `.claude/**` and `.agents/**` (vendored skill reference code, not app tests). No app tests are hidden.
- Results: 24 test files passed; 124 tests passed; 0 failed; 0 skipped.
- Statements: 92.14% (716/777).
- Branches: 82.89% (572/690).
- Functions: 96.15% (250/260).
- Lines: **95.80% (662/691)**.
- The honest full-scope 80% line-coverage hard gate is satisfied. `ActivitiesPanel.tsx` is at 100% lines.

## Package audit result

- Full audit: 0 critical, **0 high, 0 moderate**, 8 low entries, all from one transitive KaTeX advisory (GHSA-238p-pmpm-9mq7) via Aura/streamdown.
- Removing `@tanstack/react-table` (previously one major behind) and `@tanstack/react-virtual` cleared two production dependencies from the audit surface.
- `react`/`react-dom` are one major behind (18→19); `@cognite/app-sdk` is two pre-1.0 minors behind (0.9→0.11); `@cognite/aura` is one release behind (1.50526→1.50644). None is deprecated and none has a high/critical CVE.
- Package health: **Warn**, with no vulnerability blocking certification.

## Scores

| Area | Criterion | Score | Notes |
| --- | --- | --- | --- |
| User & customer | 1.1 Known bugs | 5/5 | App ErrorBoundary (`src/app/AppErrorBoundary.tsx`), and loading/empty/no-access/error+retry states on every fetch panel including the new list (`ActivitiesPanel.tsx:60-91`). Effects clean up (`HostAppContext.tsx:33-55`), no TODOs, no crashes found in the changed path. |
| User & customer | 1.3 Packages | 3/5 | 0 high/critical/moderate CVEs, none deprecated, grid deps removed. React 18→19 and app-sdk 0.9→0.11 upgrades still pending, Aura one release behind, and a 1,036 kB main chunk. |
| User & customer | 1.4 Tests & coverage | 5/5 | Honest full-`src` scope at 95.80% lines with 124 passing tests; new list behavior has focused tests (count, 18 rows, pointer/Enter/Space, selected state, details/close). |
| User & customer | 1.5 Dead code | 4/5 | Lint/tsc clean; no production `any`, unused file, route, console call, TODO, or commented-out code, and the removed grid is fully gone. Minor cruft: pure helpers inline in 304- and 540-line panel files and two different date-format policies (`ActivitiesPanel.tsx:231-293`, `TimeSeriesPanel.tsx:466-539`). |
| User & customer | 1.6 Patterns & testability | 5/5 | Stateless ViewModels over shared storage, all dependencies via context, interface-backed services, `CogniteClient` built only in `main.tsx`, no `vi.mock`, no unsafe casts. The changed panel stays presentational. |
| Cognite services | 2.1 DMS query patterns | 5/5 | Ranked search uses `instances.search`; known IDs use `retrieve`; list-valued reverse relations use filtered `instances.list`. Unchanged since round 2. |
| Cognite services | 2.2 Server-side filter | 5/5 | Related activities and time series use server-side `containsAny`; search is server-side; no download-then-filter. |
| Cognite services | 2.3 Limits & pages | 3/5 | Requests use explicit limits and follow cursors, but activities (and linked time series) are fetched to exhaustion with no overall cap, and since the DataGrid + `react-virtual` removal every activity is rendered into the DOM at once with no paging, "show more", or windowing (`ActivitiesPanel.tsx:92-139`, `activityService.ts:45-60`). Round 2 scored 5 with virtualization in place. |
| Cognite services | 2.4 Call rate | 5/5 | 300 ms abortable type-ahead; remaining reads are manual, cached (`staleTime` and manual query options), serial, or batched. The change added no CDF calls. |
| Cognite services | 2.5 429 backoff | 5/5 | All six CDF read call sites use `withCdf429Retry`: four attempts, capped exponential backoff with jitter, `Retry-After` support, 30 s delay cap, 429-only. |
| Cognite services | 2.6 CDF Raw | N/A | No CDF Raw use found. |
| Brand | 3.1 Aura | 4/5 | Aura primitives (`Card`, `Alert`, `Item`/`ItemGroup`, `Button`, `EmptyState`, `Loader`), chart wrapper, semantic tokens, and accessible labels throughout. Minor: rows override Aura `Item` one-line truncation and pack four label/value pairs per row where Aura points to DataGrid for dense multi-column data, plus a raw `table.sr-only` and `dl`/`section` markup (`ActivitiesPanel.tsx:105-134`). |

## Must Fix

None.

## Should Fix

- [ ] Bound the activities display after the DataGrid/virtualization removal: add incremental "show more"/windowing, or an explicit cap with an "N shown of M" message, instead of fetching to exhaustion and rendering every row — `src/asset360/ActivitiesPanel.tsx:92-139`, `src/services/activityService.ts:45-60` — criterion 2.3.
- [ ] Plan and test the current production upgrades (`react`/`react-dom` 18→19 and `@cognite/app-sdk` 0.9→0.11) and review the 1,036 kB main chunk — `package.json:26,31,32` — criterion 1.3.

## Nice Fix

- [ ] Move the pure helpers (`formatDate`, `detailValues`, `optionalDetail`, `sourceSummary`; `formatFullTimestamp`, `formatShortTimestamp`, `capitalize`) out of the panel files into `src/utils/` or `src/domain/` with one shared date-format policy, and consider extracting `ActivityDetails` — `src/asset360/ActivitiesPanel.tsx:231-293`, `src/asset360/TimeSeriesPanel.tsx:466-539` — criterion 1.5.
- [ ] Update `@cognite/aura` to the latest published version (1.50644.0) — `package.json:27` — criteria 1.3/3.1.
- [ ] Reconcile the activity rows with Aura `Item` guidance (single-line truncating title/description, or DataGrid for multi-field rows) or document the intentional exception — `src/asset360/ActivitiesPanel.tsx:105-134` — criterion 3.1.
- [ ] Track the low-severity transitive KaTeX advisory (GHSA-238p-pmpm-9mq7) entering through Aura/streamdown until an upstream-compatible resolution is available — `package.json:27` — criterion 1.3.

## Summary

- Must Fix open: 0
- Should Fix open: 2
- Nice Fix open: 4
