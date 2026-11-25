# Asset 360 Investigation Workspace — Flows code review

This document is the platform review for Asset 360 Investigation Workspace, conducted as part of the Cognite Flows app certification process.

## Path to approval

This review found **0 must-fix item(s)** that block approval. The technical certification gate remains satisfied and the app can proceed to `flows-design-review`. One Should Fix item (unbounded cursor-following reads and raw datapoint volume, carried from round 4) and eight Nice Fix items remain; they do not block approval.

### Reviewed commit

`bbb38ae94412c3cd677c5b6c385076d71f0e829c` (`feat(ui): use Aura skeletons for loading and add row cue`)

## Round 5 overview

Round 4 had Must Fix 0, Should Fix 1, Nice Fix 6. This round reviewed the committed `HEAD` after `bbb38ae` (new Aura `LoadingSkeleton` replacing spinner loaders, chevron cue on activity rows, SPEC FR-007c). No service, ViewModel, state, domain, host, config, or dependency file changed.

| Round-4 item | Status in round 5 |
| --- | --- |
| Should — unbounded cursor-following reads and raw datapoints for the chart | **Still open, unchanged.** `activityService.ts:45-60`, `timeSeriesService.ts:65-81,148-176` and `NumericChart` are untouched; SPEC still mandates following every cursor (`SPEC.md:52,99,140`). |
| Nice — local error boundary around the lazy chart | Still open (`TimeSeriesPanel.tsx:49-51,283-288`). The fallback is now a skeleton, but a chunk-load failure still reaches only the app-wide boundary. |
| Nice — keyboard focus lost after the last "Show more" | Still open (`ActivitiesPanel.tsx:166-181`). |
| Nice — move pure helpers / unify date policy | Still open (line numbers shifted: `ActivitiesPanel.tsx:257-330`, `NumericChart.tsx:182-198`). |
| Nice — Aura `Item` guidance divergence | Still open (`ActivitiesPanel.tsx:131-163,185-245`); the chevron adds to the custom row content but does not change the divergence. |
| Nice — small package updates / dev-tool majors | Still open and slightly larger: registry `latest` for `@cognite/aura` is now 1.50814.0 (`npm outdated` reported 1.50667.0). No `package.json` change this round. |
| Nice — low transitive KaTeX advisory | Still open (transitive, upstream). |
| _New_ — startup `LoadingState` still uses a spinner | New Nice (`App.tsx:87-100`). |
| _New_ — chevron cue has no test | New Nice (`ActivitiesPanel.tsx:160-163`). |

Round-4 React note: React stays on 18.3.1 as a **justified exception** (both `@cognite/app-sdk` and `@cognite/aura` peer-depend on `react ^18.3.1`); it is not a defect and is not counted.

## Checks performed

- Pulled `flows-review-checks` and `code-quality` from `cognitedata/builder-skills` via `npx @cognite/cli@latest apps skills pull --skill …` (outside the sandbox; succeeded, no `curl` fallback needed), then read and followed both. `code-quality` fixes were not applied.
- Confirmed `git rev-parse HEAD` = `bbb38ae94412c3cd677c5b6c385076d71f0e829c` and an empty `git status --short` before reviewing and after all commands.
- Read `vitest.config.ts` and `vite.config.ts`; confirmed no coverage or test exclusions hide production code or app tests.
- Ran every Step 1 hunt (ErrorBoundary, TODO, `useEffect`, loading/error/empty states, CDF Raw, `instances.*`, QueuedTaskRunner, 429/backoff, `any`/casts, `vi.mock`, DI/ViewModel/class/`new CogniteClient`, `console.*`, routes, unused files, component size, duplicates, naming, flag-bag types) — results in `review-findings.md`.
- `npm run lint` (exit 0, 0 problems), `npx tsc --noEmit` (exit 0), `npm run build` (pass).
- `npm outdated --json` and `npm audit --json` — results in `review-packages.md`.
- `npx vitest run --coverage` at full `src/` scope.
- Read every changed production file (`LoadingSkeleton.tsx` and test, the loading and row-cue diffs in `ActivitiesPanel.tsx`, `AssetDetailsView.tsx`, `AssetSearchView.tsx`, `TimeSeriesPanel.tsx`, and the SPEC FR-007c diff) and re-read the data path (`activityService.ts`, `timeSeriesService.ts` call sites) to confirm it is unchanged.
- Working tree stayed clean; no source or `SPEC.md` edits, no commits, and the Vite dev server on port 3001 was not touched.

## Coverage scope

- Config: `vitest.config.ts`, `coverage.provider: 'v8'`, `include: ['src/**/*.{ts,tsx}']`, `thresholds.lines: 80`.
- Coverage exclusions: `src/**/*.{test,spec}.{ts,tsx}`, `src/vite-env.d.ts`, `src/main.tsx`. **No production files are excluded.**
- Test exclusions: Vitest defaults plus `.claude/**` and `.agents/**` (vendored skill reference code, not app tests). No app tests are hidden.
- Results: 26 test files passed; 132 tests passed; 0 failed; 0 skipped.
- Statements: 92.53% (731/790).
- Branches: 84.31% (586/695).
- Functions: 96.62% (258/267).
- Lines: **96.03% (678/706)**.
- The honest full-scope 80% line-coverage hard gate is satisfied. `ActivitiesPanel.tsx` is at 100% lines; `LoadingSkeleton.tsx` is fully covered by its three tests; the chevron cue is rendered by existing tests but never asserted.

## Package audit result

- Full audit: 0 critical, **0 high, 0 moderate**, 8 low entries, all from one transitive KaTeX advisory (GHSA-238p-pmpm-9mq7) via Aura/streamdown.
- `@cognite/app-sdk` 0.11, `@cognite/sdk` 10.20, `@tanstack/react-query` 5.108 and `recharts` 3.11 are current; `@cognite/aura` 1.50644 is behind the registry `latest` (1.50814, patch-level builds, same `react ^18.3.1` peer); `vite` is pinned at 8.2.4 (latest 8.3.8). Dev-tool majors (eslint 10, vitest 5, TypeScript 7, jest-dom 8) are behind but dev-only.
- `react`/`react-dom` 18.3.1 are one major behind by design (`@cognite/app-sdk` and `@cognite/aura` peer `react ^18.3.1`). **Recorded as a justified exception, not a defect.**
- Main chunk 310.80 kB; lazy chart chunk 426.33 kB; no chunk exceeds 500 kB.
- Package health: **Pass**; no vulnerability blocks certification.

## Scores

| Area | Criterion | Score | Notes |
| --- | --- | --- | --- |
| User & customer | 1.1 Known bugs | 4/5 | App ErrorBoundary (`src/app/AppErrorBoundary.tsx`), loading/empty/no-access/error+retry on every fetch panel, effect cleanup in `HostAppContext.tsx:33-55`, no TODOs, no crashes found. Skeleton loaders are labelled `role="status"` regions, so loading is still announced. Minor (carried): the lazy chart has no local boundary, so a chunk-load failure takes down the whole app (`TimeSeriesPanel.tsx:49-51,283-288`), and the last "Show more" click drops keyboard focus (`ActivitiesPanel.tsx:166-181`). |
| User & customer | 1.3 Packages | 4/5 | 0 high/critical/moderate CVEs, nothing deprecated, app-sdk/sdk/vite plugin current, main chunk 311 kB. React 18 is a justified peer-pinned exception. Small gaps: Aura/Vite lag (Aura registry `latest` 1.50814), dev-tool majors, low transitive KaTeX advisory. |
| User & customer | 1.4 Tests & coverage | 4/5 | Honest full-`src` scope at 96.03% lines with 132 passing tests; `LoadingSkeleton` has its own tests (status/label, row count, default). Gap: the spec'd row chevron cue (FR-007c) is not asserted anywhere (`ActivitiesPanel.test.tsx`). |
| User & customer | 1.5 Dead code | 4/5 | Lint/tsc clean; no production `any`, unused file, route, console call, TODO, or commented-out code; the removed `Loader` imports left no dead code. Minor cruft: pure helpers inline in 330-, 337-, and 201-line presentational files and two date-format policies (`ActivitiesPanel.tsx:257-330`, `NumericChart.tsx:182-198`). |
| User & customer | 1.6 Patterns & testability | 5/5 | Stateless ViewModels over shared storage, all dependencies via context, interface-backed services, `CogniteClient` built only in `main.tsx`, no `vi.mock`, no unsafe casts. `LoadingSkeleton` is a stateless presentational component shared by four views. |
| Cognite services | 2.1 DMS query patterns | 5/5 | Ranked search uses `instances.search`; known IDs use `retrieve`; list-valued reverse relations use filtered `instances.list` (graph `/query` cannot traverse list-valued relations, documented in SPEC). Unchanged. |
| Cognite services | 2.2 Server-side filter | 4/5 | Related activities/series and search filter server-side. Over-fetch remains: raw datapoints (no aggregates or point cap) for up to 5 series over up to 30 days are all pulled and rendered (`timeSeriesService.ts:148-176`, `NumericChart.tsx`). Unchanged. |
| Cognite services | 2.3 Limits & pages | 3/5 | Activities are paged in the UI (25/page), but activity and linked-series reads still follow every cursor with no overall cap (`activityService.ts:45-60`, `timeSeriesService.ts:65-81`) and range reads follow every datapoint cursor (`timeSeriesService.ts:148-176`); the spec mandates this (`SPEC.md:52,99,140`). Unchanged. |
| Cognite services | 2.4 Call rate | 5/5 | 300 ms abortable type-ahead; reads are manual, cached (`staleTime: Infinity`, no refetch on focus), serial, or batched. This round added no CDF calls. |
| Cognite services | 2.5 429 backoff | 5/5 | All six CDF read call sites use `withCdf429Retry`: four attempts, capped exponential backoff with jitter, `Retry-After` support, 30 s delay cap, 429-only. |
| Cognite services | 2.6 CDF Raw | N/A | No CDF Raw use found. |
| Brand | 3.1 Aura | 4/5 | Aura primitives (`Card`, `Alert`, `Item`/`ItemGroup`, `Button`, `EmptyState`, `Skeleton`, `SegmentedControl`, `Checkbox*`, chart wrapper), semantic tokens, and accessible labels throughout; the new `Skeleton` loaders and chevron cue use token classes (`text-muted-foreground`). Minor: the startup `LoadingState` still uses the `Loader` spinner (`App.tsx:87-100`); rows override Aura `Item` truncation and pack four label/value pairs per row where Aura points to DataGrid, and the details block uses raw `dl`/`section` markup (`ActivitiesPanel.tsx:131-163,185-245`). |

## Must Fix

None.

## Should Fix

- [ ] Bound the cursor-following reads. Activities and linked time series are fetched to exhaustion and held/sorted in memory (only the activities DOM is paged), and range retrieval pulls raw datapoints with no aggregates or point cap for up to 5 series over up to 30 days, all rendered by `NumericChart`. Add a documented cap with a truncation message (or fetch activity pages on "Show more", and use aggregates / a point limit for long ranges). The SPEC requirement to follow every cursor (`SPEC.md:52,99,140`) must be updated alongside the code — `src/services/activityService.ts:45-60`, `src/services/timeSeriesService.ts:65-81,148-176`, `src/asset360/NumericChart.tsx` — criteria 2.2/2.3.

## Nice Fix

- [ ] Add a local error boundary with retry around the lazy `NumericChart` so a failed chunk load does not replace the whole app, and add a test for that path — `src/asset360/TimeSeriesPanel.tsx:49-51,283-288` — criterion 1.1.
- [ ] Preserve keyboard focus when the last page of activities is revealed (the focused "Show more activities" button unmounts) — `src/asset360/ActivitiesPanel.tsx:166-181` — criteria 1.1/3.1.
- [ ] Move the pure helpers (`formatDate`, `detailValues`, `optionalDetail`, `optionalDateDetail`, `sourceSummary`, `activityKey`; `formatShortTimestamp`, `formatTooltipTimestamp`, `formatFullTimestamp`; `capitalize`) into `src/utils/` or `src/domain/` with one shared date-format policy, and consider extracting `ActivityDetails` — `src/asset360/ActivitiesPanel.tsx:257-330`, `src/asset360/NumericChart.tsx:182-198`, `src/asset360/TimeSeriesPanel.tsx:331-337` — criterion 1.5.
- [ ] Reconcile the activity rows and details markup with Aura `Item` guidance (single-line truncating title/description, or DataGrid for multi-field rows) or document the intentional exception — `src/asset360/ActivitiesPanel.tsx:131-163,185-245` — criterion 3.1.
- [ ] Take the small updates (`@cognite/aura` 1.50644.0 → 1.50814.0, `vite` 8.2.4 → 8.3.8) and plan the dev-tool majors (eslint/@eslint/js 10, vitest 5, TypeScript 7, jest-dom 8) — `package.json:27,36,38,45,46,48,57,59,60` — criterion 1.3.
- [ ] Track the low-severity transitive KaTeX advisory (GHSA-238p-pmpm-9mq7) entering through Aura/streamdown until an upstream-compatible resolution is available — `package.json:27` — criterion 1.3.
- [ ] Align the startup `LoadingState` (Card + `Loader` spinner) with the new skeleton loading pattern, or record it as an intentional exception in SPEC FR-007c — `src/App.tsx:9,87-100` — criterion 3.1.
- [ ] Add a test asserting the new activity-row chevron cue (decorative `aria-hidden` icon inside each row button) so FR-007c is enforced — `src/asset360/ActivitiesPanel.tsx:160-163`, `src/asset360/ActivitiesPanel.test.tsx` — criterion 1.4.

## Justified exceptions

- `react` / `react-dom` / `@types/react*` stay on 18.3.1 because `@cognite/app-sdk` 0.11 and `@cognite/aura` declare `react: ^18.3.1` peers. Not a defect; revisit when upstream publishes React 19 peer ranges.

## Summary

- Must Fix open: 0
- Should Fix open: 1
- Nice Fix open: 8
