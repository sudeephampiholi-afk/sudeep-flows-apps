# File inventory — Asset 360 Investigation Workspace

Reviewed commit: `d05202b62fa5946f02c1a8b5904c23b13b38df14` (`fix(activities): render related activities with an Aura item list`)

Legend: `✓` satisfactory, `△` review note, `—` not applicable.

Changes since round 2 (`bcec39f`): `src/asset360/ActivitiesPanel.tsx` (Aura Data Grid → Aura `ItemGroup`/`Item`), its test, one assertion update in `Asset360App.test.tsx`, removal of `@tanstack/react-table` and `@tanstack/react-virtual` from `package.json`/`package-lock.json`, and a matching `SPEC.md` edit. No other production file changed.

## Application and configuration files

| File | Structure | Quality | Patterns | Tests | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/App.tsx` | ✓ | ✓ | ✓ | ✓ | Composition root with injected SDK creation and host fallbacks. Unchanged. |
| `src/App.test.tsx` | ✓ | ✓ | ✓ | — | App integration tests. |
| `src/__mocks__/asset360.ts` | ✓ | ✓ | ✓ | — | Shared typed test data. |
| `src/app/AppErrorBoundary.tsx` | ✓ | ✓ | ✓ | ✓ | Application-level recovery boundary. |
| `src/app/AppErrorBoundary.test.tsx` | ✓ | ✓ | ✓ | — | Boundary behavior tests. |
| `src/asset360/ActivitiesPanel.tsx` | △ | △ | ✓ | ✓ | **Changed.** 304 lines, presentational only (no fetching). Renders every activity in an Aura `ItemGroup` with no virtualization, paging, or cap (2.3). Pure date/detail helpers (`formatDate`, `detailValues`, ~lines 230–293) live in the component file and duplicate date formatting in `TimeSeriesPanel.tsx` with a different locale/time-zone policy. |
| `src/asset360/ActivitiesPanel.test.tsx` | ✓ | ✓ | ✓ | — | **Changed.** Loading/empty/no-access/error+retry, 18-row list, pointer/Enter/Space activation, selected state, details/close. |
| `src/asset360/Asset360App.tsx` | ✓ | ✓ | ✓ | ✓ | Connects shared storage and ViewModels. |
| `src/asset360/Asset360App.test.tsx` | ✓ | ✓ | ✓ | — | **Changed.** Queries now target the list/button roles. |
| `src/asset360/AssetDetailsView.tsx` | ✓ | ✓ | ✓ | ✓ | Presentational detail composition. |
| `src/asset360/AssetDetailsView.test.tsx` | ✓ | ✓ | ✓ | — | Detail states and content. |
| `src/asset360/AssetSearchView.tsx` | ✓ | ✓ | ✓ | ✓ | Presentational Aura search and result states (bounded to 25 results). |
| `src/asset360/AssetSearchView.test.tsx` | ✓ | ✓ | ✓ | — | Search view states. |
| `src/asset360/TimeSeriesPanel.tsx` | △ | ✓ | ✓ | ✓ | 540-line presentational/chart module; cohesive, no CDF access (ViewModel/service own that). Same inline-helper note as above (`formatFullTimestamp`, `formatShortTimestamp`, `capitalize`). |
| `src/asset360/TimeSeriesPanel.test.tsx` | ✓ | ✓ | ✓ | — | Selection, status, and chart behavior. |
| `src/asset360/asset360ViewModelContext.ts` | ✓ | ✓ | ✓ | ✓ | DI defaults, service factories, host adapter, and abortable delay. |
| `src/asset360/asset360ViewModelContext.test.tsx` | ✓ | ✓ | ✓ | — | Default-dependency and real debounce-timer tests. |
| `src/asset360/synchronizeAsset360State.ts` | ✓ | ✓ | ✓ | ✓ | Injected, bounded host synchronization. |
| `src/asset360/synchronizeAsset360State.test.ts` | ✓ | ✓ | ✓ | — | Success, failure, and size-limit tests. |
| `src/asset360/useActivitiesViewModel.ts` | ✓ | ✓ | ✓ | ✓ | Stateless ViewModel over shared storage. Unchanged. |
| `src/asset360/useActivitiesViewModel.test.tsx` | ✓ | ✓ | ✓ | — | Loading/success/error/state-sync tests. |
| `src/asset360/useAssetDetailsViewModel.ts` | ✓ | ✓ | ✓ | ✓ | Stateless ViewModel over shared storage. |
| `src/asset360/useAssetDetailsViewModel.test.tsx` | ✓ | ✓ | ✓ | — | Loading/success/error/navigation tests. |
| `src/asset360/useAssetSearchViewModel.ts` | ✓ | ✓ | ✓ | ✓ | Abortable 300 ms type-ahead delay via query cancellation. |
| `src/asset360/useAssetSearchViewModel.test.tsx` | ✓ | ✓ | ✓ | — | Search, stale-key cancellation, unmount, state-sync tests. |
| `src/asset360/useTimeSeriesViewModel.ts` | ✓ | ✓ | ✓ | ✓ | Stateless ViewModel; manual query behavior. |
| `src/asset360/useTimeSeriesViewModel.test.tsx` | ✓ | ✓ | ✓ | — | Loading/success/error/range tests. |
| `src/domain/activityDates.ts` | ✓ | ✓ | ✓ | ✓ | Pure date-selection helper. |
| `src/domain/activityDates.test.ts` | ✓ | ✓ | ✓ | — | Branch coverage. |
| `src/domain/asset360Types.ts` | ✓ | ✓ | ✓ | — | Type-only app-domain projections. |
| `src/domain/asset360Validation.ts` | ✓ | ✓ | ✓ | ✓ | Bounded field validation. |
| `src/domain/asset360Validation.test.ts` | ✓ | ✓ | ✓ | — | Input-boundary branches. |
| `src/domain/nodeId.ts` | ✓ | ✓ | ✓ | ✓ | Pure node-ID helpers. |
| `src/domain/nodeId.test.ts` | ✓ | ✓ | ✓ | — | Helper branches. |
| `src/host/HostAppContext.tsx` | ✓ | ✓ | ✓ | ✓ | Async effect has `active` cleanup. |
| `src/host/HostAppContext.test.tsx` | ✓ | ✓ | ✓ | — | Loading/ready/error/unmount tests. |
| `src/main.tsx` | ✓ | ✓ | ✓ | — | Allowed bootstrap exception; the only `new CogniteClient`. |
| `src/services/activityService.ts` | ✓ | ✓ | ✓ | ✓ | Interface-backed, server-filtered, 1000-per-page, follows every cursor (no overall cap), 429-retry. Unchanged. |
| `src/services/activityService.test.ts` | ✓ | ✓ | ✓ | — | Request, parsing, pagination, 429, error tests. |
| `src/services/assetService.ts` | ✓ | ✓ | ✓ | ✓ | Interface-backed; `instances.search` limit 25 and `retrieve`, with 429 retry. |
| `src/services/assetService.test.ts` | ✓ | ✓ | ✓ | — | Request, parsing, 429, error tests. |
| `src/services/cdf429Retry.ts` | ✓ | ✓ | ✓ | ✓ | Four attempts, exponential backoff, jitter, capped `Retry-After`. |
| `src/services/cdf429Retry.test.ts` | ✓ | ✓ | ✓ | — | Backoff, header forms, max-attempt, non-429. |
| `src/services/cdfErrors.ts` | ✓ | ✓ | ✓ | ✓ | Typed error classifier. |
| `src/services/cdfErrors.test.ts` | ✓ | ✓ | ✓ | — | Status branches. |
| `src/services/timeSeriesService.ts` | ✓ | ✓ | ✓ | ✓ | Interface-backed, batched (100), cursor-paginated, 429-retry. |
| `src/services/timeSeriesService.test.ts` | ✓ | ✓ | ✓ | — | Request, parsing, pagination, 429, error tests. |
| `src/state/Asset360StateProvider.tsx` | ✓ | ✓ | ✓ | ✓ | Shared state provider; ViewModels hold no local state. |
| `src/state/Asset360StateProvider.test.tsx` | ✓ | ✓ | ✓ | — | Initialization/storage behavior. |
| `src/state/asset360State.ts` | ✓ | ✓ | ✓ | ✓ | Bounded parse plus cross-field startup-state validation. |
| `src/state/asset360State.test.ts` | ✓ | ✓ | ✓ | — | Malformed, bounded, cross-field-invalid state tests. |
| `src/test/renderWithProviders.tsx` | ✓ | ✓ | ✓ | — | Test helper. |
| `vite.config.ts` | ✓ | ✓ | ✓ | — | Build/server configuration (`manifestCspPlugin` first). |
| `vitest.config.ts` | ✓ | ✓ | ✓ | — | Honest all-`src` coverage scope; only `.claude/**` and `.agents/**` excluded from the test run. |
| `vitest.setup.ts` | ✓ | ✓ | ✓ | — | Test setup. |

## Vendored skill reference TypeScript

These tracked files are reference bundles under `.agents/skills/` and mirrored under `.claude/skills/`. They are not imported by the application, are excluded from the Vitest test run, and are outside production scoring. The set is unchanged from round 2 (the round-3 `skills pull` produced no tracked diff).

| Files | Structure | Quality | Patterns | Tests | Notes |
| --- | --- | --- | --- | --- | --- |
| `.agents/skills/aura-review/scripts/scan-aura-usage.ts`; matching `.claude/` file | — | — | — | — | Skill tooling mirror (1 file each). |
| `.agents/skills/call-cognite-function/code/*` (2 files); matching `.claude/` files | — | — | — | — | Skill reference code. |
| `.agents/skills/graph-viewer/code/*` (14 files); matching `.claude/` files | — | — | — | — | Skill reference code. |
| `.agents/skills/integrate-atlas-chat/code/*` (12 files, includes `session.test.ts`, `validation.test.ts`); matching `.claude/` files | — | — | — | — | Skill reference code. |
| `.agents/skills/integrate-file-viewer/code/*` (9 files); matching `.claude/` files | — | — | — | — | Skill reference code. |
| `.agents/skills/integrate-todo-list/code/*` (8 files); matching `.claude/` files | — | — | — | — | Skill reference code. |

## Review reading scope

Every non-trivial application production file under `src/` was read at commit `d05202b` (all `.tsx` views, all ViewModels, context, services, state, host, domain, app boundary, bootstrap, and both Vite/Vitest configs). The changed `ActivitiesPanel.tsx` and its test were read line by line. Barrels (none exist), the type-only module, mocks, and bootstrap were inventoried but not treated as modules with logic.
