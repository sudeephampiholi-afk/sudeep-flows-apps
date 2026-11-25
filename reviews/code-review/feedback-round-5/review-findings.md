# Findings: Asset 360 Investigation Workspace

Reviewed commit: `bbb38ae94412c3cd677c5b6c385076d71f0e829c` (`feat(ui): use Aura skeletons for loading and add row cue`). Working tree was clean (`git status --short` empty) before and after all review commands. Review-only: no source, `SPEC.md`, commit, or dev-server changes (Vite dev server on port 3001 left alone).

## Config inspected

- Coverage config file(s): `vitest.config.ts` (`coverage.provider: 'v8'`, `include: ['src/**/*.{ts,tsx}']`, `thresholds.lines: 80`). No `jest.config.*`; `vite.config.ts` has no `test`/`coverage` block (it has `build.rolldownOptions.output.codeSplitting` groups).
- Production paths excluded from coverage: **none**. `coverage.exclude` is `src/**/*.{test,spec}.{ts,tsx}`, `src/vite-env.d.ts`, `src/main.tsx` (all allowed).
- Tests excluded from the test run: **none of the app's tests**. `test.exclude` is Vitest defaults plus `.claude/**` and `.agents/**` (vendored skill reference code, not app tests).

## Skill sources

- `npx @cognite/cli@latest apps skills pull --skill flows-review-checks` and `--skill code-quality` were run **outside the sandbox** (all permissions) and **succeeded** (CLI 1.14.0, from `cognitedata/builder-skills`, "Skills pulled successfully"). The copies were written to `.claude/skills/` and `.agents/skills/`; `.claude/skills/flows-review-checks/SKILL.md` and `.claude/skills/code-quality/SKILL.md` were read and followed. The `curl` fallback was not needed. `code-quality` fix instructions were not applied; only its searches were run. The pull produced no tracked change (`git status` still clean).

## Searches

| Check | Hits (file:line or none) |
| ----- | ------------------------ |
| ErrorBoundary | `src/app/AppErrorBoundary.tsx:25-37` (`getDerivedStateFromError`, `componentDidCatch`); mounted at `src/App.tsx:47-74`. Tests in `AppErrorBoundary.test.tsx`. It is the **only** boundary: a failed lazy-chart chunk load rejects through `Suspense` (`TimeSeriesPanel.tsx:283-288`) and replaces the whole app with "Something went wrong" (Nice, 1.1). |
| TODO/FIXME/HACK/XXX (non-test) | none |
| `useEffect` | `src/host/HostAppContext.tsx:33` (async connect; `active` cleanup) and `src/asset360/useTimeSeriesViewModel.ts:102` (synchronous state update only). Both safe. No effects added this round. |
| Loading / error / empty states | Present on every fetch UI: `ActivitiesPanel.tsx:63-93`, `TimeSeriesPanel.tsx` (`LinkedSeriesContent`, `ChartContent`, `RangeContent`, `Suspense` fallback at 283), `AssetDetailsView.tsx`, `AssetSearchView.tsx`, `App.tsx` host/SDK fallbacks. Loading UIs are now `LoadingSkeleton` (labelled `role="status"`) in the four views; `App.tsx:87-100` keeps the spinner. |
| coverage/test exclude | See Config inspected: none hiding production code or app tests. |
| CDF Raw | none |
| instances.list/query/search/retrieve | `activityService.ts:49` (`instances.list`, `containsAny`, limit 1000, **all cursors, no cap**), `timeSeriesService.ts:69` (same pattern), `assetService.ts:61` (`instances.search`, limit 25), `assetService.ts:87` (`instances.retrieve`). Also `timeseries.data.retrieveLatest` (batched 100) and `timeseries.data.retrieve` (batched 100, limit 10000/page, follows every cursor, raw datapoints) in `timeSeriesService.ts:98,156`. No call-site changed since round 4 (`git diff ee9d602 HEAD` touches no service). |
| QueuedTaskRunner / cdfTaskRunner | none. Equivalent control: serial `await` loops and 100-item batches; no parallel fan-out. |
| 429 / Retry-After / backoff | `src/services/cdf429Retry.ts` (4 attempts, capped exponential 250 ms→4 s, 20 % jitter, `Retry-After` seconds/date, 30 s cap) used at all 6 CDF read sites: `activityService.ts:47`, `timeSeriesService.ts:67,98,156`, `assetService.ts:59,85`. |
| `any` / `as any` / `<any>` / `as unknown as` | none (src, including tests) |
| `vi.mock` | none |
| createContext / useContext | `src/host/HostAppContext.tsx:10,72`, `src/state/Asset360StateProvider.tsx:25,70`, `src/asset360/asset360ViewModelContext.ts:63,66`. (No `src/hooks/` or `src/contexts/` directories; feature-colocated per `README.md`.) |
| hooks importing `../` (src/hooks) | none — `src/hooks/` does not exist. ViewModels get deps only through `useAsset360ViewModelDependencies()`. |
| `new CogniteClient` / `createCogniteClient` | `src/main.tsx:27` only (bootstrap, allowed). |
| `class …Service/Client/Repository/Manager` | `activityService.ts:36`, `timeSeriesService.ts:56`, `assetService.ts:42` — each `implements` an exported interface and is not referenced outside its file. `cdfErrors.ts:3` is an error class. |
| Pages with `useQuery`/SDK, no ViewModel | none — `src/pages/`/`src/views/` absent; `useQuery`/SDK appear only in `use*ViewModel.ts` and `src/services/*`. Views, including the new `LoadingSkeleton.tsx`, are presentational. |
| ViewModel hooks in `src/hooks/` | n/a (`src/hooks/` absent; ViewModels in `src/asset360/`). Stateless over `Asset360StateProvider` (no `useState` in ViewModels). |
| console.log/debug (and warn/error/info) | none |
| routes (`path:` / `<Route`) | none (single in-page view switch driven by host-synced `activeView`) |
| flag-bag types (`loading?`, `isLoading…isError`) | none; statuses are string unions |
| duplicated shapes (`*Summary`, `*DTO`) | `AssetSummary`, `TimeSeriesSummary` in `src/domain/asset360Types.ts:6,22` — app-domain projections, not restated SDK types |
| multi-string positional functions | `AssetDetailsView.tsx:162` (React props object), `assetService.ts:144` (`normalizedEquals`) — trivial |
| date formatting duplicates | `ActivitiesPanel.tsx:308-320` (`Intl.DateTimeFormat('en-US', …, timeZone: 'UTC')`) vs `NumericChart.tsx:183,195-198` (`toLocaleDateString/toLocaleString(undefined)`, local zone). Two policies for the same kind of value (carried Nice). |
| spinner vs skeleton usage | `Loader` only at `App.tsx:9,93`; `LoadingSkeleton` at `ActivitiesPanel.tsx:249`, `AssetSearchView.tsx:83`, `AssetDetailsView.tsx:73`, `TimeSeriesPanel.tsx:321` (new Nice for the startup spinner). |
| chevron cue | `ActivitiesPanel.tsx:29,160-163`; no test references it (`grep -rn -i chevron src/` → one component file only). Decorative `aria-hidden` icon; SPEC FR-007c requires it. |
| long `className` strings (>40 chars) | Aura-token layout classes only (e.g. `ActivitiesPanel.tsx:112,117,131`); same layout shell repeated in `App.tsx`, `AppErrorBoundary.tsx`, `AssetSearchView.tsx`, `AssetDetailsView.tsx`. Minor. |
| lint (`npm run lint`) | **pass**, exit 0, 0 errors / 0 warnings |
| `npx tsc --noEmit` | **pass**, exit 0 |
| `npm run build` (extra) | pass; no large-chunk warning. Chunks: `index` 310.80 kB (96.01 kB gzip), `react-vendor` 139.82 kB, `cognite-sdk` 132.11 kB, lazy `NumericChart` 426.33 kB (120.49 kB gzip), `rolldown-runtime` 0.72 kB. Largest is below 500 kB. |
| TSX naming (lowercase start) | only `main.tsx`, `use*ViewModel*.test.tsx`, `asset360ViewModelContext.test.tsx`, `renderWithProviders.tsx` — conventional non-component files |
| commented-out code | none (only intentional `eslint-disable` explanations in `HostAppContext.tsx` and `Asset360StateProvider.tsx`) |
| unused production files | none (`UNUSED:` loop printed nothing); `LoadingSkeleton.tsx` is imported by four views |
| components > 150 lines | `TimeSeriesPanel.tsx` 337, `ActivitiesPanel.tsx` 330, `NumericChart.tsx` 201, `AssetDetailsView.tsx` 181, `AssetSearchView.tsx` 169 (all read; presentational, no fetching). Every other production `.tsx` ≤ 130 lines. |
| `npx vitest run --coverage` | 26 files, 132 tests passed, 0 failed, 0 skipped; lines **96.03 %** (678/706), statements 92.53 %, branches 84.31 %, functions 96.62 %; full `src/` scope. `LoadingSkeleton.tsx` is fully covered (not listed among uncovered files). |

## Round-5 focus

- **`LoadingSkeleton`** (`src/asset360/LoadingSkeleton.tsx`): Aura `Skeleton` from the per-component subpath, `role="status"`, `aria-label` and a matching `sr-only` label, rows via `Array.from`, stateless and presentational, with its own tests. Correct replacement for the earlier spinner blocks; loading text stays available to assistive tech and existing view tests keep passing. SPEC FR-007c documents the behavior. Gap: the startup `LoadingState` in `App.tsx` still uses a spinner (Nice).
- **Row chevron cue** (`ActivitiesPanel.tsx:160-163`): decorative `IconChevronRight` (`aria-hidden`) inside the existing row `Button` (already focusable, `aria-pressed`, labelled). No regression to semantics. The cue is spec'd (FR-007c) but not asserted by a test (Nice, 1.4).
- **Data path**: unchanged since round 4, so the round-4 Should Fix (unbounded cursor-following reads, raw datapoints) is still open.
- **Carried a11y gap**: the final "Show more activities" click still unmounts the focused button (`ActivitiesPanel.tsx:166-181`).

## Must / should / nice

- [ ] _(none)_ — no Must Fix items found.
- [ ] **Should** — Cursor-following reads have no overall bound. `activityService.listByAsset` (`src/services/activityService.ts:45-60`) and `timeSeriesService.listByAsset` (`src/services/timeSeriesService.ts:65-81`) fetch every 1000-item page serially and sort/hold them all in memory (only the activities DOM is paged), and `retrieveRangeBatch` (`timeSeriesService.ts:148-176`) pulls **raw** datapoints (no aggregates, no point cap) for up to 5 series over up to 30 days, all of which `NumericChart` renders. Add a documented fetch cap with an "N of M / truncated" message, or fetch activity pages on "Show more" (cursor), and request aggregates/a point limit for long ranges. SPEC §Data access currently mandates "follow every cursor" (`SPEC.md:52,99,140`), so the spec needs to change with the code — criteria 2.2/2.3.
- [ ] **Nice** — Add a local error boundary (with a retry) around the lazy `NumericChart` so a failed chunk load does not replace the whole app, and test that path — `src/asset360/TimeSeriesPanel.tsx:49-51,283-288` — criterion 1.1.
- [ ] **Nice** — Keep keyboard focus when the last page is revealed (move focus to the first newly shown row, or manage focus before the button unmounts) — `src/asset360/ActivitiesPanel.tsx:166-181` — criteria 1.1/3.1.
- [ ] **Nice** — Move pure helpers (`formatDate`, `detailValues`, `optionalDetail`, `optionalDateDetail`, `sourceSummary`, `activityKey`; chart `formatShortTimestamp`/`formatTooltipTimestamp`/`formatFullTimestamp`; `capitalize`) out of the 330-, 201-, and 337-line presentational files into `src/utils/` or `src/domain/` with one shared date-format policy (UTC vs local today), and consider extracting `ActivityDetails` — `src/asset360/ActivitiesPanel.tsx:257-330`, `src/asset360/NumericChart.tsx:182-198`, `src/asset360/TimeSeriesPanel.tsx:331-337` — criterion 1.5.
- [ ] **Nice** — Reconcile the activity rows with Aura `Item` guidance (single-line truncating title/description, or DataGrid for four-field rows) or record the intentional exception; the details block and field cells still use raw `dl`/`section`/`p` markup — `src/asset360/ActivitiesPanel.tsx:131-163,185-245` — criterion 3.1.
- [ ] **Nice** — Pick up non-breaking updates (`@cognite/aura` 1.50644.0 → latest `1.50814.0` per the registry `latest` tag, `npm outdated` reported 1.50667.0; `vite` 8.2.4 → 8.3.8; peer `react ^18.3.1` unchanged) and plan the dev-tool majors (`eslint`/`@eslint/js` 10, `vitest`/`@vitest/coverage-v8`/`@vitest/ui` 5, `typescript` 7, `@testing-library/jest-dom` 8) — `package.json:27,36,38,45,46,48,57,59,60` — criterion 1.3.
- [ ] **Nice** — Track the low-severity transitive KaTeX advisory (GHSA-238p-pmpm-9mq7, 8 low entries) entering through Aura/streamdown until an upstream resolution exists — `package.json:27` — criterion 1.3.
- [ ] **Nice** — Align the startup `LoadingState` (still a Card with an Aura `Loader` spinner) with the new skeleton loading pattern, or note it as an intentional exception in SPEC FR-007c — `src/App.tsx:9,87-100` — criterion 3.1.
- [ ] **Nice** — Add a test asserting the new row chevron cue (decorative `aria-hidden` icon inside each activity row button) so FR-007c is enforced — `src/asset360/ActivitiesPanel.tsx:160-163`, `src/asset360/ActivitiesPanel.test.tsx` — criterion 1.4.

## Justified exception (not a defect)

- `react` / `react-dom` (and `@types/react*`) intentionally stay on **18.3.1** (`package.json:31,32`): `@cognite/app-sdk` 0.11.50644 and `@cognite/aura` 1.50644.0 both declare `react: ^18.3.1` peers (verified in `node_modules/@cognite/{app-sdk,aura}/package.json`; the current Aura `latest` also declares `^18.3.1`). Moving to 19 would break the supported peer range. npm lists React as one major behind, but this is recorded as a justified exception and does not lower 1.3 or create a finding.
