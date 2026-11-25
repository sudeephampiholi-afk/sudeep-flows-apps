# File inventory — Asset 360 Investigation Workspace

Reviewed commit: `bbb38ae94412c3cd677c5b6c385076d71f0e829c` (`feat(ui): use Aura skeletons for loading and add row cue`). `git status --short` was empty before and after the review (no source, SPEC, or commit changes by this review).

Legend: `✓` satisfactory, `△` review note, `—` not applicable.

Changes since round 4 (`ee9d602`; `git diff ee9d602 HEAD --stat`):

- `bbb38ae feat(ui)`: new `src/asset360/LoadingSkeleton.tsx` (+ test) replaces the spinner-style `Loader` blocks in `ActivitiesPanel.tsx`, `AssetDetailsView.tsx`, `AssetSearchView.tsx`, and `TimeSeriesPanel.tsx` (including the lazy-chart `Suspense` fallback) with Aura `Skeleton` rows inside a labelled `role="status"` region; `ActivitiesPanel.tsx` adds an `IconChevronRight` cue inside each activity row button; `SPEC.md` gains FR-007c.
- `e123cd2 docs(review)`: round-4 review artifacts only.
- No services, ViewModels, state, domain, host, or config files changed.

`.ts`/`.tsx` inventory excludes `node_modules`, `dist`, `.cognite-bundles`. Config files `vite.config.ts`, `vitest.config.ts` (and `vitest.setup.ts`) are included. There is no `jest.config.*`.

## Application and configuration files

| File | Lines | Structure | Quality | Patterns | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `src/main.tsx` | 38 | ✓ | ✓ | ✓ | — | Bootstrap; only place that constructs `CogniteClient` (injected via `createClient`). Excluded from coverage (allowed). |
| `src/App.tsx` | 130 | ✓ | △ | ✓ | ✓ | Composition root; `AppErrorBoundary` wraps host/SDK/app tree. Startup `LoadingState` (lines 87-100) still uses the Aura `Loader` spinner while every panel now uses skeletons (Nice). |
| `src/App.test.tsx` | 117 | ✓ | ✓ | ✓ | — | App integration tests. |
| `src/__mocks__/asset360.ts` | 58 | ✓ | ✓ | ✓ | — | Shared typed test data. |
| `src/app/AppErrorBoundary.tsx` | 69 | ✓ | ✓ | ✓ | ✓ | Whole-app recovery boundary; also the only catch for a failed lazy-chart chunk (△ 1.1, carried Nice). |
| `src/app/AppErrorBoundary.test.tsx` | 43 | ✓ | ✓ | ✓ | — | Boundary tests. |
| `src/asset360/ActivitiesPanel.tsx` | 330 | △ | △ | ✓ | ✓ | **Changed.** Presentational. Uses `LoadingSkeleton` for loading (line 248-250) and adds a decorative `IconChevronRight` (`aria-hidden`) inside each row button (lines 160-163). Transient `visibleCount` `useState` for 25-row paging (documented SPEC FR-007a). Carried notes: last "Show more activities" click unmounts the focused button; pure helpers (`detailValues`, `optionalDetail`, `optionalDateDetail`, `sourceSummary`, `formatDate`, `activityKey`, `activityCountLabel`) still inline (lines 257-330); `formatDate` is UTC while the chart uses local time. The chevron cue is not asserted by any test. |
| `src/asset360/ActivitiesPanel.test.tsx` | 273 | ✓ | ✓ | ✓ | — | Unchanged. Paging tests; no assertion for the chevron cue. |
| `src/asset360/Asset360App.tsx` | 38 | ✓ | ✓ | ✓ | ✓ | Connects shared storage and ViewModels. |
| `src/asset360/Asset360App.test.tsx` | 260 | ✓ | ✓ | ✓ | — | Integration tests. |
| `src/asset360/AssetDetailsView.tsx` | 181 | ✓ | ✓ | ✓ | ✓ | **Changed.** Loading branch now `<LoadingSkeleton label="Loading asset..." rows={2} />` (line 73). Presentational (no data access). |
| `src/asset360/AssetDetailsView.test.tsx` | 153 | ✓ | ✓ | ✓ | — | Detail states (loading assertion still passes via status role/label). |
| `src/asset360/AssetSearchView.tsx` | 169 | ✓ | ✓ | ✓ | ✓ | **Changed.** Loading branch now `<LoadingSkeleton label="Searching assets..." rows={4} />` (line 83). Presentational search view (25-result bound). |
| `src/asset360/AssetSearchView.test.tsx` | 96 | ✓ | ✓ | ✓ | — | Search states. |
| `src/asset360/LoadingSkeleton.tsx` | 27 | ✓ | ✓ | ✓ | ✓ | **New.** Stateless Aura `Skeleton` list (default 3 rows) in a `role="status"` region with `aria-label` and a matching `sr-only` label; imported from the Aura per-component subpath. Used by four views. |
| `src/asset360/LoadingSkeleton.test.tsx` | 34 | ✓ | ✓ | ✓ | — | **New.** Status role + label, requested row count, default row count (3 tests). |
| `src/asset360/NumericChart.tsx` | 201 | △ | △ | ✓ | ✓ | Unchanged. Presentational chart; local-time date formatters (lines 182-198). Lazy chunk 426 kB. |
| `src/asset360/NumericChart.test.tsx` | 87 | ✓ | ✓ | ✓ | — | Series rows, step lines, tooltip/label formatting. |
| `src/asset360/TimeSeriesPanel.tsx` | 337 | ✓ | ✓ | ✓ | ✓ | **Changed.** `LoadingMessage` now delegates to `LoadingSkeleton` (line 320-322), including the `Suspense` fallback "Loading chart..." (line 283). Still no local boundary for a chunk-load failure (carried Nice). |
| `src/asset360/TimeSeriesPanel.test.tsx` | 262 | ✓ | ✓ | ✓ | — | Awaits lazy chart; asserts "Loading chart..." fallback. |
| `src/asset360/asset360ViewModelContext.ts` | 133 | ✓ | ✓ | ✓ | ✓ | DI defaults, service factories, host adapter, abortable delay. |
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
| `vite.config.ts` | 49 | ✓ | ✓ | — | — | Unchanged. `base: './'`, `manifestCspPlugin()` first, port 3001, `build.rolldownOptions.output.codeSplitting.groups` for `cognite-sdk` and `react-vendor`. No `test`/`coverage` block. |
| `vitest.config.ts` | 32 | ✓ | ✓ | — | — | v8 coverage over all `src/**/*.{ts,tsx}`; threshold lines 80; excludes only tests, `vite-env.d.ts`, `main.tsx`. `test.exclude` = defaults + `.claude/**`, `.agents/**`. |
| `vitest.setup.ts` | 1 | ✓ | ✓ | — | — | jest-dom matchers / environment setup. |

## Component size (> 150 lines, read)

| File | Lines | Mixes fetching + UI? |
| --- | --- | --- |
| `src/asset360/TimeSeriesPanel.tsx` | 337 | No — presentational |
| `src/asset360/ActivitiesPanel.tsx` | 330 | No — presentational |
| `src/asset360/NumericChart.tsx` | 201 | No — presentational |
| `src/asset360/AssetDetailsView.tsx` | 181 | No — presentational |
| `src/asset360/AssetSearchView.tsx` | 169 | No — presentational |

All other production `.tsx` files are ≤ 130 lines (the new `LoadingSkeleton.tsx` is 27). Only `use*ViewModel.ts` and `src/services/*` access `useQuery`/SDK.
