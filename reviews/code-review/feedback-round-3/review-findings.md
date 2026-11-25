# Findings: Asset 360 Investigation Workspace

Reviewed commit: `d05202b62fa5946f02c1a8b5904c23b13b38df14`. Working tree was clean (`git status --short` empty) before and after the review commands.

## Config inspected

- Coverage config file(s): `vitest.config.ts` (`coverage.provider: 'v8'`, `include: ['src/**/*.{ts,tsx}']`, `thresholds.lines: 80`). No `jest.config.*`; `vite.config.ts` has no `test`/`coverage` block.
- Production paths excluded from coverage: **none**. `coverage.exclude` is `src/**/*.{test,spec}.{ts,tsx}`, `src/vite-env.d.ts`, `src/main.tsx` (all allowed).
- Tests excluded from the test run: **none of the app's tests**. `test.exclude` is Vitest defaults plus `.claude/**` and `.agents/**` (vendored skill reference code, not app tests).

## Skill sources

- `npx @cognite/cli@latest apps skills pull --skill flows-review-checks` and `--skill code-quality` failed inside the sandbox (`EPERM` unlinking inside the npx cache). Both were retried outside the sandbox and **succeeded**; the copies were installed to `.agents/skills/flows-review-checks/SKILL.md` and `.agents/skills/code-quality/SKILL.md`, and the first Glob match for `**/skills/flows-review-checks/SKILL.md` (the `.agents/` copy) was read and followed. The `curl` fallback was not needed.
- `code-quality` fix instructions were not applied; only its searches were run. The pull produced no tracked change (`git status` still clean).

## Searches

| Check | Hits (file:line or none) |
| ----- | ------------------------ |
| ErrorBoundary | `src/app/AppErrorBoundary.tsx:25-37` (`getDerivedStateFromError`, `componentDidCatch`); mounted at `src/App.tsx:47-74` around host/SDK/app tree. Tests in `AppErrorBoundary.test.tsx`. |
| TODO/FIXME/HACK/XXX (non-test) | none |
| `useEffect` | `src/host/HostAppContext.tsx:33` (async connect; `active` flag cleanup at lines 51-53) and `src/asset360/useTimeSeriesViewModel.ts:102` (synchronous state update only; no timer/listener/async). Both safe. |
| Loading / error / empty states | Present on every fetch UI: `ActivitiesPanel.tsx:60-91` (loading, empty, noAccess/error + retry), `TimeSeriesPanel.tsx:95-125, 172-217, 263-298`, `AssetDetailsView.tsx:72-113`, `AssetSearchView.tsx:70-115`, `App.tsx` host/SDK fallbacks. |
| coverage/test exclude | See Config inspected: none hiding production code or app tests. |
| CDF Raw | none |
| instances.list/query/search/retrieve | `activityService.ts:49` (`instances.list`, `containsAny` server filter, limit 1000, all cursors), `timeSeriesService.ts:69` (same pattern), `assetService.ts:61` (`instances.search`, limit 25), `assetService.ts:87` (`instances.retrieve`). Also `timeseries.data.retrieveLatest` (batched 100) and `timeseries.data.retrieve` (batched 100, limit 10000/page, cursor follow-up) in `timeSeriesService.ts`. |
| QueuedTaskRunner / cdfTaskRunner | none. Equivalent concurrency control is serial `await` loops and 100-item batches; no parallel fan-out found. |
| 429 / Retry-After / backoff | `src/services/cdf429Retry.ts` (4 attempts, exponential 250 ms→4 s, 20 % jitter, `Retry-After` seconds/date, 30 s cap) used by all 6 CDF read call sites: `activityService.ts:47`, `timeSeriesService.ts:67,98,156`, `assetService.ts:59,85`. |
| `any` / `as any` / `<any>` / `as unknown as` | none (src, including tests) |
| `vi.mock` | none |
| createContext / useContext | `src/host/HostAppContext.tsx:10,72`, `src/state/Asset360StateProvider.tsx:25,70`, `src/asset360/asset360ViewModelContext.ts:63,66`. (No `src/hooks/` or `src/contexts/` directories exist; the feature-colocation convention is documented in `README.md`.) |
| hooks importing `../` (src/hooks) | none — `src/hooks/` does not exist. ViewModels import deps only through `useAsset360ViewModelDependencies()`. |
| `new CogniteClient` / `createCogniteClient` | `src/main.tsx:27` only (bootstrap, allowed). |
| `class …Service/Client/Repository/Manager` | `activityService.ts:36`, `timeSeriesService.ts:56`, `assetService.ts:42` — each `implements` an exported interface and is not referenced outside its file (factories returned as interface). `cdfErrors.ts:3` is an error class. |
| Pages with `useQuery`/SDK, no ViewModel | none — `src/pages/`/`src/views/` absent; views are presentational and `useQuery` lives only in `use*ViewModel.ts`. |
| ViewModel hooks in `src/hooks/` | n/a (`src/hooks/` absent; ViewModels in `src/asset360/`). Stateless over `Asset360StateProvider` (no `useState` in ViewModels). |
| console.log/debug (and warn/error/info) | none |
| routes (`path:` / `<Route`) | none (single in-page view switch driven by host-synced `activeView`) |
| flag-bag types (`loading?`, `isLoading…isError`) | none; statuses are string unions |
| duplicated shapes (`*Summary`, `*DTO`) | `AssetSummary`, `TimeSeriesSummary` in `src/domain/asset360Types.ts` — app-domain projections, not restated SDK types |
| multi-string positional functions | `AssetDetailsView.tsx:170` (React props object), `assetService.ts:144` (`normalizedEquals`) — both trivial |
| date formatting duplicates | `ActivitiesPanel.tsx:282-293` (`Intl.DateTimeFormat('en-US', …, timeZone 'UTC')`) vs `TimeSeriesPanel.tsx:508-524` (`toLocaleDateString/toLocaleString(undefined)` local time zone). Two policies for the same kind of value. |
| long `className` strings (>40 chars) | Aura-token layout classes only (e.g. `App.tsx:122`, `ActivitiesPanel.tsx:107,112`); same layout shell repeated in `App.tsx`, `AppErrorBoundary.tsx`, `AssetSearchView.tsx`, `AssetDetailsView.tsx`. Minor. |
| lint (`npm run lint`) | **pass**, exit 0, 0 errors / 0 warnings |
| `npx tsc --noEmit` | **pass**, exit 0 |
| `npm run build` (extra) | pass; `dist/assets/index-*.js` 1,036 kB (309 kB gzip) triggers Vite large-chunk advisory (non-blocking) |
| TSX naming (lowercase start) | only `main.tsx`, `use*ViewModel*.test.tsx`, `asset360ViewModelContext.test.tsx`, `renderWithProviders.tsx` — conventional non-component files |
| commented-out code | none (only 2 intentional `eslint-disable` explanations in `HostAppContext.tsx:69-70` and `Asset360StateProvider.tsx:67-68`) |
| unused production files | none (`UNUSED:` loop printed nothing) |
| removed deps still referenced | none — `@tanstack/react-table`, `@tanstack/react-virtual`, `DataGrid`/`data-grid` appear nowhere in `src/`, `package.json`, `README.md`, `SPEC.md`, `app.json`, `manifest.json` |
| components > 150 lines | `TimeSeriesPanel.tsx` 540, `ActivitiesPanel.tsx` 304 (read; presentational, no fetching). Also `AssetDetailsView.tsx` 189 and `AssetSearchView.tsx` 174 (presentational, no data access). Every other production `.tsx` is ≤ 130 lines. None mixes fetching with UI. |

## Behavior of the changed activities panel (round-3 focus)

- `ActivitiesPanel.tsx:92-139`: `ItemGroup` (`ul`) / `Item` (`li`) with a full-width Aura `Button` per row (`aria-label="Open activity details for <externalId>"`, `aria-pressed`). Selected row uses Aura `Item selected`. Verified by tests for role=list, 18 rows, pointer/Enter/Space activation, selected `data-selected`, and `aria-pressed`.
- The previous DataGrid + `@tanstack/react-virtual` row virtualization is gone. The service still follows **every** cursor (`activityService.ts:45-60`, no total cap), so `viewModel.activities` can be arbitrarily large and **every** row is now rendered into the DOM at once. No pagination, "show more", or cap exists. → Should Fix (2.3).
- Aura `Item` guidance says titles/descriptions truncate to one line and dense multi-column data belongs in DataGrid; this panel overrides wrapping (`whitespace-normal`, `wrap-break-word`) and places four label/value pairs in a responsive 4-column grid inside each row. Acceptable but a minor divergence. → Nice Fix (3.1).
- State: `selectedActivityId` remains host-synced via `useActivitiesViewModel.ts:54-72` (no new local `useState`). No new CDF calls were introduced.

## Must / should / nice

- [ ] _(none)_ — no Must Fix items found.
- [ ] **Should** — Activities are fetched to exhaustion and all rendered without virtualization/paging after the DataGrid removal; bound the display (incremental "show more"/windowing) or add an explicit cap with an "N shown of M" message — `src/asset360/ActivitiesPanel.tsx:92-139`, `src/services/activityService.ts:45-60` — criterion 2.3.
- [ ] **Should** — Plan and test pending production upgrades: `react`/`react-dom` 18→19 (one major behind), `@cognite/app-sdk` 0.9→0.11 (pre-1.0, two minors), and review the 1,036 kB main chunk — `package.json:26,31,32` — criterion 1.3.
- [ ] **Nice** — Move pure helpers (`formatDate`, `detailValues`, `optionalDetail`, `sourceSummary`) out of `ActivitiesPanel.tsx` and `formatFullTimestamp`/`formatShortTimestamp`/`capitalize` out of `TimeSeriesPanel.tsx` into `src/utils/` (or `src/domain/`) with one shared date-format policy; consider splitting `ActivityDetails` into its own file — `src/asset360/ActivitiesPanel.tsx:231-293`, `src/asset360/TimeSeriesPanel.tsx:466-539` — criterion 1.5.
- [ ] **Nice** — Bump `@cognite/aura` to the latest published version (`^1.50526.0` → 1.50644.0; project rules require keeping Aura current) — `package.json:27` — criteria 1.3/3.1.
- [ ] **Nice** — Reconcile the activities rows with Aura `Item` guidance (one-line truncating title/description; multi-field data → DataGrid or fewer fields per row) or note the intentional exception — `src/asset360/ActivitiesPanel.tsx:105-134` — criterion 3.1.
- [ ] **Nice** — Track the low-severity transitive KaTeX advisory (GHSA-238p-pmpm-9mq7) entering through Aura/streamdown until an upstream-compatible resolution exists — `package.json:27` — criterion 1.3.
