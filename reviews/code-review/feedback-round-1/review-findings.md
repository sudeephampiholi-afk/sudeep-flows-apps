# Findings: Asset 360 Investigation Workspace

Reviewed commit: `2e4bb7b2ab7230c68d541888285f5c2c999528d8`

## Config inspected

- Coverage config: `vitest.config.ts:18-29`; `vite.config.ts` contains no test/coverage block; no Jest config exists.
- Production paths excluded from coverage: none. `coverage.include` is `src/**/*.{ts,tsx}`.
- Allowed coverage exclusions: tests/specs, `src/vite-env.d.ts`, and `src/main.tsx`.
- Tests excluded from the test run: only default Vitest exclusions plus `.claude/**` and `.agents/**`; no application tests are excluded.

## Searches

| Check | Hits |
| --- | --- |
| ErrorBoundary | `src/App.tsx:47`; implementation at `src/app/AppErrorBoundary.tsx:25-36`. |
| TODO/FIXME/HACK/XXX in production | none |
| `useEffect` cleanup | `src/host/HostAppContext.tsx:33-52` cleans up its async continuation; `src/asset360/useTimeSeriesViewModel.ts:102-120` has no timer/listener subscription requiring cleanup. |
| Fetch loading/error/empty states | Present in the three ViewModels and corresponding views/panels; no missing core state found. |
| Coverage/test excludes | `vitest.config.ts:10,20-25`; no production exclusion and no app-test exclusion. |
| CDF Raw | none; criterion 2.6 is N/A. |
| `instances.list/query/search/retrieve` | `activityService.ts:40` list; `timeSeriesService.ts:60` list; `assetService.ts:52` search and `:71` retrieve. |
| QueuedTaskRunner / cdfTaskRunner | none |
| 429 / Retry-After / exponential / backoff | none |
| Production `any` / `as any` / `<any>` / `as unknown as` | none |
| `vi.mock` | none |
| Context injection | Contexts at `src/asset360/asset360ViewModelContext.ts:58-70`, `src/state/Asset360StateProvider.tsx:26-70`, and `src/host/HostAppContext.tsx:10-73`. |
| Hook parent imports (`src/hooks`) | none; the app organizes ViewModels in its feature folder. |
| `new CogniteClient` | `src/main.tsx:27` only, an allowed bootstrap location. |
| Interface-based service classes | `activityService.ts:32`, `assetService.ts:38`, `timeSeriesService.ts:52`; all implement explicit interfaces. |
| Fetching in `src/pages` / `src/views` | none; those directories do not exist and views receive ViewModels. |
| ViewModels under `src/hooks` | none; ViewModels are feature-colocated under `src/asset360/`. |
| `console.log` / `console.debug` | none |
| Any `console` call | none |
| Route definitions / unreachable routes | none; state selects the two connected views in `src/asset360/Asset360App.tsx:10-17`. |
| Lint | pass, 0 errors and 0 warnings. |
| TypeScript | `npx tsc --noEmit` pass, 0 errors. |
| Components over 150 lines | `TimeSeriesPanel.tsx` 540; `ActivitiesPanel.tsx` 272; `AssetDetailsView.tsx` 189; `AssetSearchView.tsx` 174. All were read; they are presentational and do not mix CDF fetching into rendering. |
| Possibly unused files | Heuristic reported only ViewModel test files, `main.tsx`, and `renderWithProviders.tsx`; manual review confirms these are entry/test files, not dead production code. |
| Flag-bag types | none |
| Manually duplicated `*Summary` / `*DTO` types | `AssetSummary` and `TimeSeriesSummary` in `src/domain/asset360Types.ts`; these are deliberate app-domain projections, not duplicate SDK DTOs. |
| Multiple same-primitive positional parameters | `src/asset360/AssetDetailsView.tsx:170` is a destructured object prop; no positional violation. |
| Repeated SDK asset/time-series/event/file fetch pattern | none |
| Repeated date/formatting patterns | Date formatting occurs in `ActivitiesPanel.tsx` and `TimeSeriesPanel.tsx`; outputs are intentionally different and no material duplicate was found. |
| Long class strings | Hits are layout-only semantic-token utility classes; no raw color/spacing values or Aura override issue found. |
| Lowercase TSX filenames heuristic | none |
| Hook filenames not prefixed `use` under `src/hooks` | none; directory does not exist. |
| Commented-out blocks (3+ lines) | none |
| Naming/file structure | Component and context files use PascalCase/camelCase and the feature is flat under `src/asset360/`, differing from the loaded code-quality skill's kebab-case/component-folder convention. |

## Build and test evidence

- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass; Vite warned that the main JS chunk is 1,189.23 kB (354.96 kB gzip).
- `npx vitest run --coverage`: 22 files passed, 104 tests passed, 0 failed, 0 skipped.
- Full-scope coverage: statements 91.26%, branches 81.97%, functions 95.29%, lines 95.62%.

## Must Fix

- [ ] Upgrade `happy-dom` beyond the audited vulnerable range and refresh the lockfile — `package.json:56` — criterion 1.3. The full audit reports two high-severity advisories, [GHSA-834v-8h66-3h79](https://github.com/advisories/GHSA-834v-8h66-3h79) and [GHSA-c8p4-j97h-3vg8](https://github.com/advisories/GHSA-c8p4-j97h-3vg8). The production-only audit has no high/critical finding, but the current certification bar makes any full-audit high/critical CVE blocking. _Impact:_ crafted content processed in test or CI environments could enable host code execution or SSRF, putting developer and CI credentials or network access at risk.

## Should Fix

- [ ] Add bounded 429 handling with exponential backoff/jitter and `Retry-After` support (or a platform task runner) around CDF calls — `src/services/activityService.ts:40`, `src/services/timeSeriesService.ts:60`, `src/asset360/useTimeSeriesViewModel.ts:29` — criterion 2.5.
- [ ] Debounce type-ahead requests rather than relying on `useDeferredValue`, which defers rendering but can still issue one CDF search per keystroke — `src/asset360/useAssetSearchViewModel.ts:40-46` — criterion 2.4.
- [ ] Align file and feature structure with the loaded code-quality convention (kebab-case files and component folders/public barrels), or document an approved repository convention — examples: `src/asset360/TimeSeriesPanel.tsx`, `src/asset360/asset360ViewModelContext.ts` — criterion 1.5.
- [ ] Resolve package-health warnings: Vitest 4.1.10 and its UI/coverage packages have moderate advisories fixed in 4.1.11/4.1.12, while React, React DOM, and `@tanstack/react-table` are one major behind — `package.json:31-34,48-49,62` — criterion 1.3.

## Nice Fix

- [ ] Reject cross-field-invalid startup state, such as `activeView: 'asset'` with `selectedAssetId: null`, instead of accepting it and rendering the not-found asset view — `src/state/asset360State.ts:61-68`, consumed at `src/asset360/Asset360App.tsx:13` — criterion 1.1.
- [ ] Add a focused test for default service creation and host-sync adaptation in `asset360ViewModelContext` — `src/asset360/asset360ViewModelContext.ts:33-54`; current file line coverage is 61.53% — criterion 1.4.
- [ ] Track the eight low production-audit findings inherited through Aura's streamdown/KaTeX/Mermaid graph; no high/critical production vulnerability is present — `package.json:27` — criterion 1.3.
