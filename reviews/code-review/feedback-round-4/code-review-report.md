# Asset 360 Investigation Workspace — Flows code review

This document is the platform review for Asset 360 Investigation Workspace, conducted as part of the Cognite Flows app certification process.

## Path to approval

This review found **0 must-fix item(s)** that block approval. The technical certification gate is satisfied and the app can proceed to `flows-design-review`. One Should Fix item (unbounded cursor-following reads and raw datapoint volume) and six Nice Fix items remain; they do not block approval.

### Reviewed commit

`ee9d602a2ee54f51f80a179e32fffd93269b0321` (`perf: page activity rows and lazy-load the chart`)

## Round 4 overview

Round 3 had Must Fix 0, Should Fix 2, Nice Fix 4. This round reviewed the committed `HEAD` after the dependency upgrade (`a8a600f`) and the performance change (`ee9d602`).

| Round-3 item | Status in round 4 |
| --- | --- |
| Should — activities rendered all at once after DataGrid removal | **Resolved for the DOM.** `ActivitiesPanel.tsx` pages 25 rows with "Showing N of M" and "Show more activities". The unbounded *fetch* remains and is re-filed as the single open Should Fix. |
| Should — plan React 18→19 and app-sdk 0.9→0.11; review 1,036 kB chunk | **Resolved / withdrawn.** app-sdk is on 0.11; the main chunk is 311 kB (chart lazy-loaded, 426 kB on demand). React stays on 18 as a **justified exception** (peer `react: ^18.3.1` in both `@cognite/app-sdk` and `@cognite/aura`) and is not a defect. |
| Nice — move pure helpers / unify date policy | Still open. |
| Nice — bump Aura to 1.50644 | Done; Aura is now one release behind (1.50667), re-filed as part of a small-updates Nice. |
| Nice — Aura `Item` guidance divergence | Still open. |
| Nice — KaTeX low advisory | Still open (transitive, upstream). |

## Checks performed

- Pulled `flows-review-checks` and `code-quality` from `cognitedata/builder-skills` via `npx @cognite/cli@latest apps skills pull --skill …` (outside the sandbox; succeeded, no `curl` fallback needed), then read and followed both. `code-quality` fixes were not applied.
- Read `vitest.config.ts` and `vite.config.ts`; confirmed no coverage or test exclusions hide production code or app tests.
- Ran every Step 1 hunt (ErrorBoundary, TODO, `useEffect`, loading/error/empty states, CDF Raw, `instances.*`, QueuedTaskRunner, 429/backoff, `any`/casts, `vi.mock`, DI/ViewModel/class/`new CogniteClient`, `console.*`, routes, unused files, component size, duplicates, naming) — results in `review-findings.md`.
- `npm run lint` (exit 0, 0 problems), `npx tsc --noEmit` (exit 0), `npm run build` (pass).
- `npm outdated --json` and `npm audit --json` — results in `review-packages.md`.
- `npx vitest run --coverage` at full `src/` scope.
- Read every non-trivial changed production file (`ActivitiesPanel.tsx`, `TimeSeriesPanel.tsx`, `NumericChart.tsx`, `vite.config.ts`) and re-read the data path (`activityService.ts`, `timeSeriesService.ts`, `useActivitiesViewModel.ts`, `AppErrorBoundary.tsx`).
- Working tree stayed clean; no source or `SPEC.md` edits, no commits, and the Vite dev server on port 3001 was not touched.

## Coverage scope

- Config: `vitest.config.ts`, `coverage.provider: 'v8'`, `include: ['src/**/*.{ts,tsx}']`, `thresholds.lines: 80`.
- Coverage exclusions: `src/**/*.{test,spec}.{ts,tsx}`, `src/vite-env.d.ts`, `src/main.tsx`. **No production files are excluded.**
- Test exclusions: Vitest defaults plus `.claude/**` and `.agents/**` (vendored skill reference code, not app tests). No app tests are hidden.
- Results: 25 test files passed; 129 tests passed; 0 failed; 0 skipped.
- Statements: 92.51% (729/788).
- Branches: 84.29% (585/694).
- Functions: 96.60% (256/265).
- Lines: **96.02% (676/704)**.
- The honest full-scope 80% line-coverage hard gate is satisfied. `ActivitiesPanel.tsx` is at 100% lines; the new `NumericChart.tsx` is at 93.5% lines.

## Package audit result

- Full audit: 0 critical, **0 high, 0 moderate**, 8 low entries, all from one transitive KaTeX advisory (GHSA-238p-pmpm-9mq7) via Aura/streamdown.
- `@cognite/app-sdk` 0.11, `@cognite/sdk` 10.20, `@tanstack/react-query` 5.108 and `recharts` 3.11 are current; `@cognite/aura` 1.50644 is one release behind (1.50667); `vite` is pinned at 8.2.4 (latest 8.3.8). Dev-tool majors (eslint 10, vitest 5, TypeScript 7, jest-dom 8) are behind but dev-only.
- `react`/`react-dom` 18.3.1 are one major behind by design: `@cognite/app-sdk` and `@cognite/aura` both peer-depend on `react ^18.3.1`. **Recorded as a justified exception, not a defect.**
- Main chunk is down from 1,036 kB to 311 kB; the lazy chart chunk is 426 kB; no chunk exceeds 500 kB.
- Package health: **Pass**; no vulnerability blocks certification.

## Scores

| Area | Criterion | Score | Notes |
| --- | --- | --- | --- |
| User & customer | 1.1 Known bugs | 4/5 | App ErrorBoundary (`src/app/AppErrorBoundary.tsx`), loading/empty/no-access/error+retry on every fetch panel, effect cleanup in `HostAppContext.tsx:33-55`, no TODOs, no crashes found. Minor: the lazy chart has no local boundary, so a chunk-load failure takes down the whole app (`TimeSeriesPanel.tsx:49-51,283-289`), and the last "Show more" click drops keyboard focus (`ActivitiesPanel.tsx:165-175`). |
| User & customer | 1.3 Packages | 4/5 | 0 high/critical/moderate CVEs, nothing deprecated, app-sdk/aura/sdk/vite plugin current, main chunk now 311 kB. React 18 is a justified peer-pinned exception. Small gaps: Aura/Vite patch-level lag, dev-tool majors, low transitive KaTeX advisory. |
| User & customer | 1.4 Tests & coverage | 5/5 | Honest full-`src` scope at 96.02% lines with 129 passing tests; new behavior is tested (paging button/count/reveal, lazy chart fallback, `NumericChart` rows/step/tooltip). |
| User & customer | 1.5 Dead code | 4/5 | Lint/tsc clean; no production `any`, unused file, route, console call, TODO, or commented-out code. Minor cruft: pure helpers inline in 334-, 345-, and 201-line presentational files and two date-format policies (`ActivitiesPanel.tsx:260-330`, `NumericChart.tsx:180-200`). |
| User & customer | 1.6 Patterns & testability | 5/5 | Stateless ViewModels over shared storage, all dependencies via context, interface-backed services, `CogniteClient` built only in `main.tsx`, no `vi.mock`, no unsafe casts. The new paging state is local-only disclosure state in the view (documented in SPEC FR-007a) and `NumericChart` is presentational. |
| Cognite services | 2.1 DMS query patterns | 5/5 | Ranked search uses `instances.search`; known IDs use `retrieve`; list-valued reverse relations use filtered `instances.list` (graph `/query` cannot traverse list-valued relations, documented in SPEC). Unchanged. |
| Cognite services | 2.2 Server-side filter | 4/5 | Related activities/series and search filter server-side. Over-fetch remains: raw datapoints (no aggregates or point cap) for up to 5 series over up to 30 days are all pulled and rendered (`timeSeriesService.ts:148-176`, `NumericChart.tsx`). |
| Cognite services | 2.3 Limits & pages | 3/5 | Activities are now paged in the UI (25/page), but activity and linked-series reads still follow every cursor with no overall cap (`activityService.ts:45-60`, `timeSeriesService.ts:65-81`) and range reads follow every datapoint cursor (`timeSeriesService.ts:148-176`); the spec currently mandates this (`SPEC.md:98,139`). |
| Cognite services | 2.4 Call rate | 5/5 | 300 ms abortable type-ahead; reads are manual, cached (`staleTime: Infinity`, no refetch on focus), serial, or batched. This round added no CDF calls. |
| Cognite services | 2.5 429 backoff | 5/5 | All six CDF read call sites use `withCdf429Retry`: four attempts, capped exponential backoff with jitter, `Retry-After` support, 30 s delay cap, 429-only. |
| Cognite services | 2.6 CDF Raw | N/A | No CDF Raw use found. |
| Brand | 3.1 Aura | 4/5 | Aura primitives (`Card`, `Alert`, `Item`/`ItemGroup`, `Button`, `EmptyState`, `Loader`, `SegmentedControl`, `Checkbox*`, chart wrapper), semantic tokens, and accessible labels throughout. Minor: rows override Aura `Item` truncation and pack four label/value pairs per row where Aura points to DataGrid, and the details block uses raw `dl`/`section` markup (`ActivitiesPanel.tsx:131-160,213-240`). |

## Must Fix

None.

## Should Fix

- [ ] Bound the cursor-following reads. Activities and linked time series are fetched to exhaustion and held/sorted in memory (only the activities DOM is paged now), and range retrieval pulls raw datapoints with no aggregates or point cap for up to 5 series over up to 30 days, all rendered by `NumericChart`. Add a documented cap with a truncation message (or fetch activity pages on "Show more", and use aggregates / a point limit for long ranges). The SPEC requirement to follow every cursor (`SPEC.md:98,139`) must be updated alongside the code — `src/services/activityService.ts:45-60`, `src/services/timeSeriesService.ts:65-81,148-176`, `src/asset360/NumericChart.tsx` — criteria 2.2/2.3.

## Nice Fix

- [ ] Add a local error boundary with retry around the lazy `NumericChart` so a failed chunk load does not replace the whole app, and add a test for that path — `src/asset360/TimeSeriesPanel.tsx:49-51,283-289` — criterion 1.1.
- [ ] Preserve keyboard focus when the last page of activities is revealed (the focused "Show more activities" button unmounts) — `src/asset360/ActivitiesPanel.tsx:165-175` — criteria 1.1/3.1.
- [ ] Move the pure helpers (`formatDate`, `detailValues`, `optionalDetail`, `optionalDateDetail`, `sourceSummary`; `formatShortTimestamp`, `formatTooltipTimestamp`; `capitalize`) into `src/utils/` or `src/domain/` with one shared date-format policy, and consider extracting `ActivityDetails` — `src/asset360/ActivitiesPanel.tsx:260-330`, `src/asset360/NumericChart.tsx:180-200`, `src/asset360/TimeSeriesPanel.tsx:338-344` — criterion 1.5.
- [ ] Reconcile the activity rows and details markup with Aura `Item` guidance (single-line truncating title/description, or DataGrid for multi-field rows) or document the intentional exception — `src/asset360/ActivitiesPanel.tsx:131-160,213-240` — criterion 3.1.
- [ ] Take the small updates (`@cognite/aura` 1.50644.0 → 1.50667.0, `vite` 8.2.4 → 8.3.8) and plan the dev-tool majors (eslint/@eslint/js 10, vitest 5, TypeScript 7, jest-dom 8) — `package.json:27,36,38,48,57,59,60` — criterion 1.3.
- [ ] Track the low-severity transitive KaTeX advisory (GHSA-238p-pmpm-9mq7) entering through Aura/streamdown until an upstream-compatible resolution is available — `package.json:27` — criterion 1.3.

## Justified exceptions

- `react` / `react-dom` / `@types/react*` stay on 18.3.1 because `@cognite/app-sdk` 0.11 and `@cognite/aura` 1.50644 declare `react: ^18.3.1` peers. Not a defect; revisit when upstream publishes React 19 peer ranges.

## Summary

- Must Fix open: 0
- Should Fix open: 1
- Nice Fix open: 6
