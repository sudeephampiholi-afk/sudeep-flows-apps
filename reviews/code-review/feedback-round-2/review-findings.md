# Findings: Asset 360 Investigation Workspace

Reviewed commit: `bcec39f13e685cad80dcae69e5354860547bf02c`

## Review standards

- The CLI skill pull was attempted first and failed because its sandboxed temporary clone could not create Git hooks.
- The prescribed fallback fetched both files from `cognitedata/builder-skills` `main` before scoring.
- Fetched `flows-review-checks` SHA-256: `1ba0ca3ef853d05e3e0de28baac69089447cb6b0f0769656e430d4f982c5c625`.
- Fetched `code-quality` SHA-256: `4aed33196f9a928315414d80c8a40cdb44254d98b6f250bfc081cf9179156196`.
- Every required review and code-quality search was run; no code-quality fix instruction was applied.

## Config inspected

- Coverage config: `vitest.config.ts`.
- Coverage include: `src/**/*.{ts,tsx}`.
- Production paths excluded from coverage: `src/main.tsx` only (allowed bootstrap exclusion).
- Other allowed coverage excludes: `src/**/*.{test,spec}.{ts,tsx}` and `src/vite-env.d.ts`.
- Tests excluded from the test run: no application tests. Vitest defaults plus `.claude/**` and `.agents/**` exclude vendored skill reference bundles only.
- Build config: `vite.config.ts`.

## Searches

| Check | Hits (file:line or none) |
| --- | --- |
| ErrorBoundary | `src/App.tsx:47-74`; `src/app/AppErrorBoundary.tsx:25-65`; focused tests at `src/app/AppErrorBoundary.test.tsx`. |
| Critical-path TODO/FIXME/HACK/XXX | none |
| `useEffect` cleanup | `src/host/HostAppContext.tsx:33-52` uses an active flag and cleanup; `src/asset360/useTimeSeriesViewModel.ts:102-120` performs no timer/listener subscription. |
| Fetch loading/error/empty states | ViewModels use `useQuery`; `AssetSearchView`, `AssetDetailsView`, `ActivitiesPanel`, and `TimeSeriesPanel` render explicit loading/error/no-access/empty states. |
| Coverage/test exclude | Full `src/**/*.{ts,tsx}` include; allowed coverage exclusions only; no application tests hidden. |
| CDF Raw | none |
| DMS operations | `instances.search` at `src/services/assetService.ts:61`; `instances.retrieve` at `src/services/assetService.ts:87`; filtered/paged `instances.list` at `src/services/activityService.ts:49` and `src/services/timeSeriesService.ts:69`. |
| Datapoint operations | `retrieveLatest` at `src/services/timeSeriesService.ts:100`; cursor-aware `retrieve` at `src/services/timeSeriesService.ts:158`. |
| QueuedTaskRunner / cdfTaskRunner | none; the app documents and implements bounded serial/batched reads plus per-request 429 handling. |
| 429 / Retry-After / backoff | Shared helper at `src/services/cdf429Retry.ts:1-117`; all five CDF read call sites use it. |
| Production `any` / `as any` / `as unknown as` | none |
| `vi.mock` | none |
| Context DI | Feature-colocated contexts/providers at `src/asset360/asset360ViewModelContext.ts`, `src/state/Asset360StateProvider.tsx`, and `src/host/HostAppContext.tsx`. |
| Hook imports under `src/hooks` | none; the app intentionally colocates ViewModels in `src/asset360/`. |
| `new CogniteClient` | `src/main.tsx:27` only, an allowed bootstrap location. |
| Interface-based service classes | `src/services/assetService.ts:42`, `activityService.ts:36`, and `timeSeriesService.ts:56`; each implements an explicit interface. |
| Fetching in `src/pages` / `src/views` | none; those directories do not exist and views receive ViewModels. |
| ViewModels | `src/asset360/useAssetSearchViewModel.ts`, `useAssetDetailsViewModel.ts`, `useActivitiesViewModel.ts`, and `useTimeSeriesViewModel.ts`. |
| `console.log` / `console.debug` / other console calls | none |
| Route definitions / unreachable routes | none; shared state selects the two connected views in `src/asset360/Asset360App.tsx:10-17`. |
| Lint / tsc | `npm run lint` and `npx tsc --noEmit` passed with zero errors and warnings. |
| Components over 150 lines | `TimeSeriesPanel.tsx` 540, `ActivitiesPanel.tsx` 272, `AssetDetailsView.tsx` 189, and `AssetSearchView.tsx` 174. All were read; they are presentational and do not mix CDF fetching into rendering. |
| Possibly unused files | Heuristic reported only test files, `src/main.tsx`, and `src/test/renderWithProviders.tsx`; manual review confirms entry/test roles and no dead production module. |
| Flag-bag state types | none |
| Manually duplicated `*Summary` / `*DTO` types | `AssetSummary` and `TimeSeriesSummary` in `src/domain/asset360Types.ts`; deliberate app-domain projections, not duplicated SDK DTOs. |
| Multiple same-primitive positional parameters | `normalizedEquals` at `src/services/assetService.ts:144` is a private symmetric comparison; `DetailValue` at `src/asset360/AssetDetailsView.tsx:170` uses a destructured object prop. |
| Repeated SDK asset/time-series/event/file fetch pattern | none |
| Date/formatting searches | Date handling is purpose-specific across activity display, chart display, range calculation, and service parsing; no material duplicate fetch/business logic found. |
| Long class strings | Semantic-token layout classes only; no raw color values or Aura visual overrides found. |
| Lowercase TSX / hook filename heuristics | Test/default files and bootstrap helpers only; production naming follows the documented repository convention. |
| Commented-out code blocks (3+ lines) | none |
| Feature/file organization | `README.md:3-5` documents feature colocation, PascalCase React component files, camelCase hook/context modules, and when to introduce subfolders. |

## Explicit fix verification

### True 300 ms abortable debounce

- `src/asset360/useAssetSearchViewModel.ts:42-48` awaits `searchDelay(300, signal)` before calling CDF.
- `src/asset360/asset360ViewModelContext.ts:106-125` implements the delay with `setTimeout`, listens to `AbortSignal`, and clears the timer on abort.
- `src/asset360/useAssetSearchViewModel.test.tsx:81-120` proves stale query keys and unmounts abort pending delays and only the final stable query reaches CDF.
- `src/asset360/asset360ViewModelContext.test.tsx:50-75` proves the real timer remains pending at 299 ms, resolves at 300 ms, and is removed when aborted.

### Bounded 429 handling on every CDF read

- `src/services/cdf429Retry.ts` allows four total attempts, retries only status 429, uses capped exponential backoff with 20% bounded jitter, supports `Retry-After` seconds and HTTP dates, and caps delays at 30 seconds.
- Wrapped reads: asset search and retrieve; activity list; time-series list; latest datapoints; range datapoints.
- `src/services/cdf429Retry.test.ts:10-88` covers delay growth/jitter, both `Retry-After` forms, maximum attempts, and non-retry of 400/401/403/404.
- Focused service tests prove every SDK read retries 429 without changing page/cursor semantics.

### Startup cross-field validation

- `src/state/asset360State.ts:54-89` validates fields and relationships: search view cannot retain asset/child state; asset view requires a selected asset; a chart range requires selected series.
- `src/state/asset360State.test.ts:65-125` directly covers six cross-field-invalid combinations, alongside malformed/version/length/control-character/range bounds.

### Focused context tests and feature convention

- `src/asset360/asset360ViewModelContext.test.tsx` covers the default service factories, host-sync adapter, and production debounce implementation without module mocks.
- `README.md:3-5` documents the repository's feature-colocation and naming convention.

## Verification commands

- Full audit: 0 critical, 0 high, 0 moderate, 8 low.
- Focused certification tests: 7 files passed, 58 tests passed.
- Full coverage: 24 files passed, 124 tests passed, 0 failed, 0 skipped.
- Full coverage scope: all `src/**/*.{ts,tsx}`, with only test/spec, `vite-env.d.ts`, and `main.tsx` excluded.
- Coverage: 91.93% statements, 82.33% branches, 96.18% functions, **95.82% lines**.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; Vite emitted a non-blocking large-chunk advisory.

## Must / should / nice

### Must Fix

None.

### Should Fix

- [ ] Plan and test the current production major/minor upgrades (`react`/`react-dom` 18→19, `@tanstack/react-table` 8→9, and `@cognite/app-sdk` 0.9→0.11), including bundle-impact validation — `package.json:26-35` — criterion 1.3.

### Nice Fix

- [ ] Track the low-severity transitive KaTeX advisory currently entering through Aura/streamdown until an upstream compatible resolution is available — `package.json:27` — criterion 1.3.

## Counts

- Must Fix open: 0
- Should Fix open: 1
- Nice Fix open: 1
