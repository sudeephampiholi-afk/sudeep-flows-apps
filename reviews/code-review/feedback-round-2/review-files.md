# File inventory — Asset 360 Investigation Workspace

Reviewed commit: `bcec39f13e685cad80dcae69e5354860547bf02c`

Legend: `✓` satisfactory, `△` review note, `—` not applicable.

## Application and configuration files

| File | Structure | Quality | Patterns | Tests | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/App.tsx` | ✓ | ✓ | ✓ | ✓ | Composition root with injected SDK creation and host fallbacks. |
| `src/App.test.tsx` | ✓ | ✓ | ✓ | — | App integration tests. |
| `src/__mocks__/asset360.ts` | ✓ | ✓ | ✓ | — | Shared typed test data. |
| `src/app/AppErrorBoundary.tsx` | ✓ | ✓ | ✓ | ✓ | Application-level recovery boundary. |
| `src/app/AppErrorBoundary.test.tsx` | ✓ | ✓ | ✓ | — | Boundary behavior tests. |
| `src/asset360/ActivitiesPanel.tsx` | ✓ | ✓ | ✓ | ✓ | Presentational Aura Data Grid and detail view; no fetching. |
| `src/asset360/ActivitiesPanel.test.tsx` | ✓ | ✓ | ✓ | — | Loading/error/empty/content behavior. |
| `src/asset360/Asset360App.tsx` | ✓ | ✓ | ✓ | ✓ | Connects shared storage and ViewModels. |
| `src/asset360/Asset360App.test.tsx` | ✓ | ✓ | ✓ | — | End-to-end view integration. |
| `src/asset360/AssetDetailsView.tsx` | ✓ | ✓ | ✓ | ✓ | Presentational detail composition. |
| `src/asset360/AssetDetailsView.test.tsx` | ✓ | ✓ | ✓ | — | Detail states and content. |
| `src/asset360/AssetSearchView.tsx` | ✓ | ✓ | ✓ | ✓ | Presentational Aura search and result states. |
| `src/asset360/AssetSearchView.test.tsx` | ✓ | ✓ | ✓ | — | Search view states. |
| `src/asset360/TimeSeriesPanel.tsx` | △ | ✓ | ✓ | ✓ | 540-line presentational/chart module; responsibilities are cohesive and CDF access remains in the ViewModel/service. |
| `src/asset360/TimeSeriesPanel.test.tsx` | ✓ | ✓ | ✓ | — | Selection, status, and chart behavior. |
| `src/asset360/asset360ViewModelContext.ts` | ✓ | ✓ | ✓ | ✓ | DI defaults, service factories, host adapter, and abortable delay. |
| `src/asset360/asset360ViewModelContext.test.tsx` | ✓ | ✓ | ✓ | — | Focused default-dependency and real debounce-timer tests. |
| `src/asset360/synchronizeAsset360State.ts` | ✓ | ✓ | ✓ | ✓ | Injected, bounded host synchronization. |
| `src/asset360/synchronizeAsset360State.test.ts` | ✓ | ✓ | ✓ | — | Success, failure, and size-limit tests. |
| `src/asset360/useActivitiesViewModel.ts` | ✓ | ✓ | ✓ | ✓ | Stateless ViewModel over shared storage. |
| `src/asset360/useActivitiesViewModel.test.tsx` | ✓ | ✓ | ✓ | — | Loading/success/error/state-sync tests. |
| `src/asset360/useAssetDetailsViewModel.ts` | ✓ | ✓ | ✓ | ✓ | Stateless ViewModel over shared storage. |
| `src/asset360/useAssetDetailsViewModel.test.tsx` | ✓ | ✓ | ✓ | — | Loading/success/error/navigation tests. |
| `src/asset360/useAssetSearchViewModel.ts` | ✓ | ✓ | ✓ | ✓ | TanStack query cancellation drives a true 300 ms abortable delay. |
| `src/asset360/useAssetSearchViewModel.test.tsx` | ✓ | ✓ | ✓ | — | Search, stale-key cancellation, unmount, and state-sync tests. |
| `src/asset360/useTimeSeriesViewModel.ts` | ✓ | ✓ | ✓ | ✓ | Stateless ViewModel; manual query behavior. |
| `src/asset360/useTimeSeriesViewModel.test.tsx` | ✓ | ✓ | ✓ | — | Loading/success/error/range tests. |
| `src/domain/activityDates.ts` | ✓ | ✓ | ✓ | ✓ | Pure date-selection helper. |
| `src/domain/activityDates.test.ts` | ✓ | ✓ | ✓ | — | Branch coverage. |
| `src/domain/asset360Types.ts` | ✓ | ✓ | ✓ | — | Type-only app-domain projections. |
| `src/domain/asset360Validation.ts` | ✓ | ✓ | ✓ | ✓ | Bounded field validation. |
| `src/domain/asset360Validation.test.ts` | ✓ | ✓ | ✓ | — | Input-boundary branches. |
| `src/domain/nodeId.ts` | ✓ | ✓ | ✓ | ✓ | Pure node-ID helpers. |
| `src/domain/nodeId.test.ts` | ✓ | ✓ | ✓ | — | Helper branches. |
| `src/host/HostAppContext.tsx` | ✓ | ✓ | ✓ | ✓ | Async cleanup is present. |
| `src/host/HostAppContext.test.tsx` | ✓ | ✓ | ✓ | — | Loading/ready/error/unmount tests. |
| `src/main.tsx` | ✓ | ✓ | ✓ | — | Allowed bootstrap exception; SDK client built here only. |
| `src/services/activityService.ts` | ✓ | ✓ | ✓ | ✓ | Interface-backed, filtered, cursor-paginated, bounded-429-retry service. |
| `src/services/activityService.test.ts` | ✓ | ✓ | ✓ | — | Request, parsing, pagination, 429, and error tests. |
| `src/services/assetService.ts` | ✓ | ✓ | ✓ | ✓ | Interface-backed bounded search/retrieve with bounded 429 retries. |
| `src/services/assetService.test.ts` | ✓ | ✓ | ✓ | — | Request, parsing, 429, and error tests. |
| `src/services/cdf429Retry.ts` | ✓ | ✓ | ✓ | ✓ | Four-attempt retry, exponential backoff, jitter, and capped `Retry-After`. |
| `src/services/cdf429Retry.test.ts` | ✓ | ✓ | ✓ | — | Backoff, header forms, max-attempt, and non-429 tests. |
| `src/services/cdfErrors.ts` | ✓ | ✓ | ✓ | ✓ | Typed error classifier. |
| `src/services/cdfErrors.test.ts` | ✓ | ✓ | ✓ | — | Status branches. |
| `src/services/timeSeriesService.ts` | ✓ | ✓ | ✓ | ✓ | Interface-backed, batched, cursor-paginated, bounded-429-retry service. |
| `src/services/timeSeriesService.test.ts` | ✓ | ✓ | ✓ | — | Request, parsing, pagination, 429, and error tests. |
| `src/state/Asset360StateProvider.tsx` | ✓ | ✓ | ✓ | ✓ | Shared state provider; ViewModels do not own local state. |
| `src/state/Asset360StateProvider.test.tsx` | ✓ | ✓ | ✓ | — | Initialization/storage behavior. |
| `src/state/asset360State.ts` | ✓ | ✓ | ✓ | ✓ | Bounded parse plus cross-field startup-state validation. |
| `src/state/asset360State.test.ts` | ✓ | ✓ | ✓ | — | Malformed, bounded, and cross-field-invalid state tests. |
| `src/test/renderWithProviders.tsx` | ✓ | ✓ | ✓ | — | Test helper. |
| `vite.config.ts` | ✓ | ✓ | ✓ | — | Build/server configuration. |
| `vitest.config.ts` | ✓ | ✓ | ✓ | — | Honest all-`src` coverage scope. |
| `vitest.setup.ts` | ✓ | ✓ | ✓ | — | Test setup. |

## Vendored skill reference TypeScript

These tracked files are reference bundles under `.agents/skills/` and mirrored under `.claude/skills/`. They are not imported by the application, are excluded from the Vitest test run, and are outside production scoring. They were inventoried as required.

| Files | Structure | Quality | Patterns | Tests | Notes |
| --- | --- | --- | --- | --- | --- |
| `.agents/skills/aura-review/scripts/scan-aura-usage.ts`; matching `.claude/` file | — | — | — | — | Skill tooling mirror. |
| `.agents/skills/call-cognite-function/code/{cogniteFunctionService.ts,useCogniteFunction.ts}`; matching `.claude/` files | — | — | — | — | Skill reference code. |
| `.agents/skills/graph-viewer/code/{GraphViewerCanvas.tsx,GraphViewerLegend.tsx,ZoomControls.tsx,graph-config.ts,graph-service.ts,index.ts,types.ts,useCanvasResize.ts,useDataModelLoader.ts,useGraphDataPipeline.ts,useGraphSelection.ts,useGraphViewer.tsx,useNodeBuffer.ts,useSeedNode.ts}`; matching `.claude/` files | — | — | — | — | Skill reference code. |
| `.agents/skills/integrate-atlas-chat/code/{client.ts,index.ts,pyodide-react.ts,pyodide-runtime.ts,pyodide.ts,python.ts,react.ts,session.test.ts,session.ts,types.ts,validation.test.ts,validation.ts}`; matching `.claude/` files | — | — | — | — | Skill reference code. |
| `.agents/skills/integrate-file-viewer/code/{CogniteFileViewer.tsx,DocumentAnnotationOverlay.tsx,fileResolution.ts,index.ts,mimeTypes.ts,types.ts,useDocumentAnnotations.ts,useFileResolver.ts,useViewport.ts}`; matching `.claude/` files | — | — | — | — | Skill reference code. |
| `.agents/skills/integrate-todo-list/code/{TodoContext.tsx,TodoItemRow.tsx,TodoPanel.tsx,TodoToolResultCard.tsx,todoWriteTool.ts,types.ts,useTodoList.ts,useTodoWriteTool.ts}`; matching `.claude/` files | — | — | — | — | Skill reference code. |

## Review reading scope

Every non-trivial application production file under `src/` was read. Tests, the type-only module, mocks, bootstrap code, and vendored skill reference bundles were inventoried but not treated as production modules.
