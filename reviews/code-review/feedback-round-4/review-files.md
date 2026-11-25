# File inventory — Asset 360 Investigation Workspace

Reviewed commit: `ee9d602a2ee54f51f80a179e32fffd93269b0321` (`perf: page activity rows and lazy-load the chart`). `git status --short` was empty before and after the review (no source, SPEC, or commit changes by this review).

Legend: `✓` satisfactory, `△` review note, `—` not applicable.

Changes since round 3 (`d05202b`):

- `a8a600f build(deps)`: `@cognite/app-sdk` 0.11, `@cognite/aura` 1.50644, `@cognite/sdk` 10.20, `vite` 8.2.4, `@vitejs/plugin-react` 6, lockfile refresh. React intentionally stays on 18 (see `review-packages.md`).
- `ee9d602 perf`: `ActivitiesPanel.tsx` pages 25 rows with "Show more activities"; the chart moved from `TimeSeriesPanel.tsx` into new `NumericChart.tsx` (+ test) and is `React.lazy`-loaded; `vite.config.ts` gained `build.rolldownOptions.output.codeSplitting` groups; `SPEC.md` updated (FR-007a). No services or ViewModels changed.

`.ts`/`.tsx` inventory excludes `node_modules`, `dist`, `.cognite-bundles`. Config files `vite.config.ts`, `vitest.config.ts` (and `vitest.setup.ts`) are included. There is no `jest.config.*`.

## Application and configuration files

| File | Lines | Structure | Quality | Patterns | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `src/main.tsx` | 38 | ✓ | ✓ | ✓ | — | Bootstrap; only place that constructs `CogniteClient` (injected via `createClient`). Excluded from coverage (allowed). |
| `src/App.tsx` | 130 | ✓ | ✓ | ✓ | ✓ | Composition root; `AppErrorBoundary` wraps host/SDK/app tree. Unchanged. |
| `src/App.test.tsx` | 117 | ✓ | ✓ | ✓ | — | App integration tests. |
| `src/__mocks__/asset360.ts` | 58 | ✓ | ✓ | ✓ | — | Shared typed test data. |
| `src/app/AppErrorBoundary.tsx` | 69 | ✓ | ✓ | ✓ | ✓ | Whole-app recovery boundary; also the only catch for a failed lazy-chart chunk (△ 1.1, see findings). |
| `src/app/AppErrorBoundary.test.tsx` | 43 | ✓ | ✓ | ✓ | — | Boundary tests. |
| `src/asset360/ActivitiesPanel.tsx` | 334 | △ | △ | ✓ | ✓ | **Changed.** Presentational. Adds `ActivityList` with transient `visibleCount` `useState` (25-row pages; documented in SPEC FR-007a, correctly not host-synced) and "Showing N of M" live region. Notes: the last "Show more activities" click unmounts the focused button (focus drops to `body`); pure helpers (`formatDate`, `detailValues`, `optionalDetail`, `sourceSummary`) still inline (lines 260–330); `formatDate` is UTC while chart uses local time. |
| `src/asset360/ActivitiesPanel.test.tsx` | 273 | ✓ | ✓ | ✓ | — | **Changed.** Adds paging tests (button, count, reveal next 25, button disappears). |
| `src/asset360/Asset360App.tsx` | 38 | ✓ | ✓ | ✓ | ✓ | Connects shared storage and ViewModels. |
| `src/asset360/Asset360App.test.tsx` | 260 | ✓ | ✓ | ✓ | — | Integration tests. |
| `src/asset360/AssetDetailsView.tsx` | 189 | ✓ | ✓ | ✓ | ✓ | Presentational (no data access). |
| `src/asset360/AssetDetailsView.test.tsx` | 153 | ✓ | ✓ | ✓ | — | Detail states. |
| `src/asset360/AssetSearchView.tsx` | 174 | ✓ | ✓ | ✓ | ✓ | Presentational search view (25-result bound). |
| `src/asset360/AssetSearchView.test.tsx` | 96 | ✓ | ✓ | ✓ | — | Search states. |
| `src/asset360/NumericChart.tsx` | 201 | △ | △ | ✓ | ✓ | **New.** Chart extracted from `TimeSeriesPanel.tsx`; presentational, no fetching. Aura `ChartContainer` + Recharts. Contains date formatters (`formatShortTimestamp`, `formatTooltipTimestamp`, lines ~180–200, local time zone). Lazy chunk is 426 kB. |
| `src/asset360/NumericChart.test.tsx` | 87 | ✓ | ✓ | ✓ | — | **New.** Series rows, step lines, tooltip/label formatting. |
| `src/asset360/TimeSeriesPanel.tsx` | 345 | ✓ | ✓ | ✓ | ✓ | **Changed** (540 → 345 lines). Presentational; `NumericChart` is `lazy()`-loaded inside `Suspense` with a "Loading chart..." fallback (lines 49–51, 283–289). No local boundary for chunk-load failure (Nice). |
| `src/asset360/TimeSeriesPanel.test.tsx` | 262 | ✓ | ✓ | ✓ | — | **Changed.** Awaits lazy chart; asserts "Loading chart..." fallback. |
| `src/asset360/asset360ViewModelContext.ts` | 134 | ✓ | ✓ | ✓ | ✓ | DI defaults, service factories, host adapter, abortable delay. |
| `src/asset360/asset360ViewModelContext.test.tsx` | 96 | ✓ | ✓ | ✓ | — | Default-dependency tests. |
| `src/asset360/synchronizeAsset360State.ts` | 30 | ✓ | ✓ | ✓ | ✓ | Injected, bounded host sync. |
| `src/asset360/synchronizeAsset360State.test.ts` | 88 | ✓ | ✓ | ✓ | — | Success/failure/size-limit. |
| `src/asset360/useActivitiesViewModel.ts` | 118 | ✓ | ✓ | ✓ | ✓ | Stateless ViewModel over shared storage; React Query `retry: false`. Unchanged. |
| `src/asset360/useActivitiesViewModel.test.tsx` | 251 | ✓ | ✓ | ✓ | — | Loading/success/empty/error/selection. |
| `src/asset360/useAssetDetailsViewModel.ts` | 110 | ✓ | ✓ | ✓ | ✓ | Stateless ViewModel. |
| `src/asset360/useAssetDetailsViewModel.test.tsx` | 157 | ✓ | ✓ | ✓ | — | States and derived values. |
| `src/asset360/useAssetSearchViewModel.ts` | 130 | ✓ | ✓ | ✓ | ✓ | 300 ms abortable type-ahead. |
| `src/asset360/useAssetSearchViewModel.test.tsx` | 294 | ✓ | ✓ | ✓ | — | Debounce, states, sync. |
| `src/asset360/useTimeSeriesViewModel.ts` | 358 | ✓ | ✓ | ✓ | ✓ | Stateless ViewModel; cached queries (`staleTime: Infinity`, no refetch-on-focus); `useEffect` at line 102 is synchronous only. |
| `src/asset360/useTimeSeriesViewModel.test.tsx` | 443 | ✓ | ✓ | ✓ | — | Broad state/selection/range tests. |
| `src/domain/activityDates.ts` | 13 | ✓ | ✓ | ✓ | ✓ | Pure effective-date helper. |
| `src/domain/activityDates.test.ts` | 35 | ✓ | ✓ | ✓ | — | |
| `src/domain/asset360Types.ts` | 70 | ✓ | ✓ | ✓ | — | Types only (no logic). |
| `src/domain/asset360Validation.ts` | 65 | ✓ | ✓ | ✓ | ✓ | Bounded `initialState` validation. |
| `src/domain/asset360Validation.test.ts` | 41 | ✓ | ✓ | ✓ | — | |
| `src/domain/nodeId.ts` | 30 | ✓ | ✓ | ✓ | ✓ | Type guards, no casts. |
| `src/domain/nodeId.test.ts` | 28 | ✓ | ✓ | ✓ | — | |
| `src/host/HostAppContext.tsx` | 78 | ✓ | ✓ | ✓ | ✓ | Single `connectToHostApp`; `active` flag cleanup. |
| `src/host/HostAppContext.test.tsx` | 85 | ✓ | ✓ | ✓ | — | |
| `src/services/activityService.ts` | 162 | ✓ | ✓ | ✓ | ✓ | `ActivityService` interface + private class; `instances.list` with server `containsAny`, 1000/page, follows every cursor with no overall cap (2.3). Unchanged. |
| `src/services/activityService.test.ts` | 204 | ✓ | ✓ | ✓ | — | Request, parsing, error, pagination. |
| `src/services/assetService.ts` | 247 | ✓ | ✓ | ✓ | ✓ | `instances.search` (limit 25) + `retrieve`; 429 retry. |
| `src/services/assetService.test.ts` | 224 | ✓ | ✓ | ✓ | — | |
| `src/services/cdf429Retry.ts` | 119 | ✓ | ✓ | ✓ | ✓ | 4 attempts, capped exponential backoff + jitter, `Retry-After`. |
| `src/services/cdf429Retry.test.ts` | 101 | ✓ | ✓ | ✓ | — | |
| `src/services/cdfErrors.ts` | 35 | ✓ | ✓ | ✓ | ✓ | `CdfServiceError` classification. |
| `src/services/cdfErrors.test.ts` | 42 | ✓ | ✓ | ✓ | — | |
| `src/services/timeSeriesService.ts` | 366 | ✓ | ✓ | ✓ | ✓ | `instances.list` filtered server-side; latest/range retrieval batched 100; range follows every cursor, raw datapoints (no aggregates, no point cap) (2.2/2.3). Unchanged. |
| `src/services/timeSeriesService.test.ts` | 339 | ✓ | ✓ | ✓ | — | |
| `src/state/asset360State.ts` | 99 | ✓ | ✓ | ✓ | ✓ | Versioned host-synced state. |
| `src/state/asset360State.test.ts` | 217 | ✓ | ✓ | ✓ | — | |
| `src/state/Asset360StateProvider.tsx` | 78 | ✓ | ✓ | ✓ | ✓ | Shared storage layer for ViewModels. |
| `src/state/Asset360StateProvider.test.tsx` | 104 | ✓ | ✓ | ✓ | — | |
| `src/test/renderWithProviders.tsx` | 86 | ✓ | ✓ | ✓ | — | Test helper (provider wiring, no `vi.mock`). |
| `vite.config.ts` | 49 | ✓ | ✓ | — | — | **Changed.** `base: './'`, `manifestCspPlugin()` first, port 3001, `build.rolldownOptions.output.codeSplitting.groups` for `cognite-sdk` and `react-vendor`. Valid for Vite 8 (build passes). No `test`/`coverage` block. |
| `vitest.config.ts` | 32 | ✓ | ✓ | — | — | v8 coverage over all `src/**/*.{ts,tsx}`; threshold lines 80; excludes only tests, `vite-env.d.ts`, `main.tsx`. `test.exclude` = defaults + `.claude/**`, `.agents/**`. |
| `vitest.setup.ts` | 1 | ✓ | ✓ | — | — | jest-dom matchers / environment setup. |

## Component size (> 150 lines, read)

| File | Lines | Mixes fetching + UI? |
| --- | --- | --- |
| `src/asset360/TimeSeriesPanel.tsx` | 345 | No — presentational |
| `src/asset360/ActivitiesPanel.tsx` | 334 | No — presentational |
| `src/asset360/NumericChart.tsx` | 201 | No — presentational |
| `src/asset360/AssetDetailsView.tsx` | 189 | No — presentational |
| `src/asset360/AssetSearchView.tsx` | 174 | No — presentational |

All other production `.tsx` files are ≤ 130 lines. Only `use*ViewModel.ts` and `src/services/*` access `useQuery`/SDK.
