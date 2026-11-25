# Findings: Asset 360 Investigation Workspace

Reviewed commit: `ee9d602a2ee54f51f80a179e32fffd93269b0321`. Working tree was clean (`git status --short` empty) before and after all review commands. Review-only: no source, `SPEC.md`, commit, or dev-server changes (Vite dev server on port 3001 left alone).

## Config inspected

- Coverage config file(s): `vitest.config.ts` (`coverage.provider: 'v8'`, `include: ['src/**/*.{ts,tsx}']`, `thresholds.lines: 80`). No `jest.config.*`; `vite.config.ts` has no `test`/`coverage` block (it has `build.rolldownOptions.output.codeSplitting` groups).
- Production paths excluded from coverage: **none**. `coverage.exclude` is `src/**/*.{test,spec}.{ts,tsx}`, `src/vite-env.d.ts`, `src/main.tsx` (all allowed).
- Tests excluded from the test run: **none of the app's tests**. `test.exclude` is Vitest defaults plus `.claude/**` and `.agents/**` (vendored skill reference code, not app tests).

## Skill sources

- `npx @cognite/cli@latest apps skills pull --skill flows-review-checks` and `--skill code-quality` were run **outside the sandbox** and **succeeded** (CLI 1.14.0, from `cognitedata/builder-skills`). The copies were written to `.claude/skills/` and `.agents/skills/`; the `.claude/skills/flows-review-checks/SKILL.md` copy was read and followed, together with `.claude/skills/code-quality/SKILL.md`. The `curl` fallback was not needed. `code-quality` fix instructions were not applied; only its searches were run. The pull produced no tracked change (`git status` still clean).

## Searches

| Check | Hits (file:line or none) |
| ----- | ------------------------ |
| ErrorBoundary | `src/app/AppErrorBoundary.tsx:25-37` (`getDerivedStateFromError`, `componentDidCatch`); mounted at `src/App.tsx:47-74`. Tests in `AppErrorBoundary.test.tsx`. It is the **only** boundary: a failed lazy-chart chunk load rejects through `Suspense` (`TimeSeriesPanel.tsx:283-289`) and replaces the whole app with "Something went wrong" (Nice, 1.1). |
| TODO/FIXME/HACK/XXX (non-test) | none |
| `useEffect` | `src/host/HostAppContext.tsx:33` (async connect; `active` cleanup) and `src/asset360/useTimeSeriesViewModel.ts:102` (synchronous state update only). Both safe. No new effects in `ActivitiesPanel.tsx`/`NumericChart.tsx`. |
| Loading / error / empty states | Present on every fetch UI: `ActivitiesPanel.tsx:62-93`, `TimeSeriesPanel.tsx` (`LinkedSeriesContent`, `ChartContent`, `RangeContent`, plus `Suspense` fallback "Loading chart..." at 283), `AssetDetailsView.tsx`, `AssetSearchView.tsx`, `App.tsx` host/SDK fallbacks. |
| coverage/test exclude | See Config inspected: none hiding production code or app tests. |
| CDF Raw | none |
| instances.list/query/search/retrieve | `activityService.ts:49` (`instances.list`, `containsAny`, limit 1000, **all cursors, no cap**), `timeSeriesService.ts:69` (same pattern), `assetService.ts:61` (`instances.search`, limit 25), `assetService.ts:87` (`instances.retrieve`). Also `timeseries.data.retrieveLatest` (batched 100) and `timeseries.data.retrieve` (batched 100, limit 10000/page, follows every cursor, raw datapoints) in `timeSeriesService.ts:98,156`. No call-site changed since round 3. |
| QueuedTaskRunner / cdfTaskRunner | none. Equivalent control: serial `await` loops and 100-item batches; no parallel fan-out. |
| 429 / Retry-After / backoff | `src/services/cdf429Retry.ts` (4 attempts, capped exponential 250 ms→4 s, 20 % jitter, `Retry-After` seconds/date, 30 s cap) used at all 6 CDF read sites: `activityService.ts:47`, `timeSeriesService.ts:67,98,156`, `assetService.ts:59,85`. |
| `any` / `as any` / `<any>` / `as unknown as` | none (src, including tests) |
| `vi.mock` | none |
| createContext / useContext | `src/host/HostAppContext.tsx:10,72`, `src/state/Asset360StateProvider.tsx:25,70`, `src/asset360/asset360ViewModelContext.ts:63,66`. (No `src/hooks/` or `src/contexts/` directories; feature-colocated per `README.md`.) |
| hooks importing `../` (src/hooks) | none — `src/hooks/` does not exist. ViewModels get deps only through `useAsset360ViewModelDependencies()`. |
| `new CogniteClient` / `createCogniteClient` | `src/main.tsx:27` only (bootstrap, allowed). |
| `class …Service/Client/Repository/Manager` | `activityService.ts:36`, `timeSeriesService.ts:56`, `assetService.ts:42` — each `implements` an exported interface and is not referenced outside its file. `cdfErrors.ts:3` is an error class. |
| Pages with `useQuery`/SDK, no ViewModel | none — `src/pages/`/`src/views/` absent; `useQuery`/SDK appear only in `use*ViewModel.ts` and `src/services/*`. Views (including the new `NumericChart.tsx`) are presentational. |
| ViewModel hooks in `src/hooks/` | n/a (`src/hooks/` absent; ViewModels in `src/asset360/`). Stateless over `Asset360StateProvider` (no `useState` in ViewModels). |
| console.log/debug (and warn/error/info) | none |
| routes (`path:` / `<Route`) | none (single in-page view switch driven by host-synced `activeView`) |
| flag-bag types (`loading?`, `isLoading…isError`) | none; statuses are string unions |
| duplicated shapes (`*Summary`, `*DTO`) | `AssetSummary`, `TimeSeriesSummary` in `src/domain/asset360Types.ts:6,22` — app-domain projections, not restated SDK types |
| multi-string positional functions | `AssetDetailsView.tsx:170` (React props object), `assetService.ts:144` (`normalizedEquals`) — trivial |
| date formatting duplicates | `ActivitiesPanel.tsx:314-324` (`Intl.DateTimeFormat('en-US', …, timeZone: 'UTC')`) vs `NumericChart.tsx:183,196-198` (`toLocaleDateString/toLocaleString(undefined)`, local zone). Two policies for the same kind of value (carried Nice). |
| long `className` strings (>40 chars) | 24 hits; Aura-token layout classes only (e.g. `ActivitiesPanel.tsx:112,117,131`); same layout shell repeated in `App.tsx`, `AppErrorBoundary.tsx`, `AssetSearchView.tsx`, `AssetDetailsView.tsx`. Minor. |
| lint (`npm run lint`) | **pass**, exit 0, 0 errors / 0 warnings |
| `npx tsc --noEmit` | **pass**, exit 0 |
| `npm run build` (extra) | pass; no large-chunk warning. Chunks: `index` 310.67 kB (95.86 kB gzip), `react-vendor` 139.82 kB, `cognite-sdk` 132.11 kB, lazy `NumericChart` 426.33 kB (120.49 kB gzip), `rolldown-runtime` 0.72 kB. Largest is below 500 kB; main chunk fell from 1,036 kB (round 3) to 311 kB. |
| TSX naming (lowercase start) | only `main.tsx`, `use*ViewModel*.test.tsx`, `asset360ViewModelContext.test.tsx`, `renderWithProviders.tsx` — conventional non-component files |
| commented-out code | none (only intentional `eslint-disable` explanations in `HostAppContext.tsx` and `Asset360StateProvider.tsx`) |
| unused production files | none (`UNUSED:` loop printed nothing); `NumericChart.tsx` is imported by `TimeSeriesPanel.tsx:49-51` |
| components > 150 lines | `TimeSeriesPanel.tsx` 345, `ActivitiesPanel.tsx` 334, `NumericChart.tsx` 201, `AssetDetailsView.tsx` 189, `AssetSearchView.tsx` 174 (all read; presentational, no fetching). Every other production `.tsx` ≤ 130 lines. |
| `npx vitest run --coverage` | 25 files, 129 tests passed, 0 failed, 0 skipped; lines **96.02 %** (676/704), statements 92.51 %, branches 84.29 %, functions 96.60 %; full `src/` scope. |

## Round-4 focus

- **Activities paging** (`ActivitiesPanel.tsx:107-179`): renders `viewModel.activities.slice(0, visibleCount)` with `ACTIVITY_PAGE_SIZE = 25`, a "Showing N of M" `aria-live="polite"` line, and a "Show more activities" outline `Button` that adds 25. `visibleCount` is transient disclosure `useState` in a view component (the ViewModel stays stateless); per `AGENTS.md` §2 it is a local-only disclosure state and SPEC FR-007a documents it. `ActivityList` unmounts while the query is loading/refetching, so the page count resets for a new asset. The selected activity's details render independently of the page. Tests cover button, count, reveal, and button removal. **Round-3 Should Fix (every row rendered at once) is resolved for the DOM.** The network side is unchanged: `activityService.ts:45-60` still follows every cursor with no total cap (carried into the 2.3 Should Fix below).
- **Lazy chart** (`TimeSeriesPanel.tsx:49-51,283-289`, `NumericChart.tsx`): `React.lazy(() => import('./NumericChart').then(...))` inside `Suspense` with an Aura `Loader` fallback; test asserts the fallback then the chart. This removes Recharts from the entry chunk. Gap: no local error boundary, so a chunk-load failure (offline, stale deploy hash) hits the app-wide boundary (Nice).
- **Build config** (`vite.config.ts:33-47`): `build.rolldownOptions.output.codeSplitting.groups` is the Vite 8/Rolldown form and the build passes with the intended `cognite-sdk` and `react-vendor` chunks. `manifestCspPlugin()` remains first.
- **Accessibility**: the final "Show more activities" click removes the focused button (`ActivitiesPanel.tsx:165-175`), so keyboard focus falls to `body`; the live-region count is announced but focus is lost (Nice).

## Must / should / nice

- [ ] _(none)_ — no Must Fix items found.
- [ ] **Should** — Cursor-following reads have no overall bound. `activityService.listByAsset` (`src/services/activityService.ts:45-60`) and `timeSeriesService.listByAsset` (`src/services/timeSeriesService.ts:65-81`) fetch every 1000-item page serially and sort/hold them all in memory (only the activities DOM is now paged), and `retrieveRangeBatch` (`timeSeriesService.ts:148-176`) pulls **raw** datapoints (no aggregates, no point cap) for up to 5 series over up to 30 days, all of which `NumericChart` renders. Add a documented fetch cap with an "N of M / truncated" message, or fetch activity pages on "Show more" (cursor), and request aggregates/a point limit for long ranges. SPEC §Data access currently mandates "follow every cursor" (`SPEC.md:98,139`), so the spec needs to change with the code — criteria 2.2/2.3.
- [ ] **Nice** — Add a local error boundary (with a retry) around the lazy `NumericChart` so a failed chunk load does not replace the whole app, and test that path — `src/asset360/TimeSeriesPanel.tsx:49-51,283-289` — criterion 1.1.
- [ ] **Nice** — Keep keyboard focus when the last page is revealed (move focus to the first newly shown row or keep a disabled/hidden-after-focus-move button) — `src/asset360/ActivitiesPanel.tsx:165-175` — criteria 1.1/3.1.
- [ ] **Nice** — Move pure helpers (`formatDate`, `detailValues`, `optionalDetail`, `optionalDateDetail`, `sourceSummary`; chart `formatShortTimestamp`/`formatTooltipTimestamp`; `capitalize`) out of the 334-, 201-, and 345-line presentational files into `src/utils/` or `src/domain/` with one shared date-format policy (UTC vs local today), and consider extracting `ActivityDetails` — `src/asset360/ActivitiesPanel.tsx:260-330`, `src/asset360/NumericChart.tsx:180-200`, `src/asset360/TimeSeriesPanel.tsx:338-344` — criterion 1.5.
- [ ] **Nice** — Reconcile the activity rows with Aura `Item` guidance (single-line truncating title/description, or DataGrid for four-field rows) or record the intentional exception; the details block and field cells still use raw `dl`/`section`/`p` markup — `src/asset360/ActivitiesPanel.tsx:131-160,213-240` — criterion 3.1.
- [ ] **Nice** — Pick up non-breaking updates (`@cognite/aura` 1.50644.0 → 1.50667.0, `vite` 8.2.4 → 8.3.8) and plan the dev-tool majors (`eslint`/`@eslint/js` 10, `vitest`/`@vitest/coverage-v8`/`@vitest/ui` 5, `typescript` 7, `@testing-library/jest-dom` 8) — `package.json:27,36,38,48,57,59,60` — criterion 1.3.
- [ ] **Nice** — Track the low-severity transitive KaTeX advisory (GHSA-238p-pmpm-9mq7, 8 low entries) entering through Aura/streamdown until an upstream resolution exists — `package.json:27` — criterion 1.3.

## Justified exception (not a defect)

- `react` / `react-dom` (and `@types/react*`) intentionally stay on **18.3.1** (`package.json:31,32`): `@cognite/app-sdk` 0.11 and `@cognite/aura` 1.50644 both declare `react: ^18.3.1` peers (verified in `node_modules/@cognite/{app-sdk,aura}/package.json`). Moving to 19 would break the supported peer range. npm lists React as one major behind, but this is recorded as a justified exception and does not lower 1.3 or create a finding. The round-3 Should Fix to "plan React 19" is withdrawn on this basis; revisit when the host SDK and Aura publish React 19 peer ranges.
