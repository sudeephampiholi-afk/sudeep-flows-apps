# Design Review — Asset 360 Investigation Workspace — round 1

Reviewed commit: `d05202b62fa5946f02c1a8b5904c23b13b38df14`

## User and tasks

- **Primary user:** Operations Analyst / Reliability Engineer at an industrial facility, working at a desk on a desktop or laptop with a large monitor.
- **Tasks evaluated:**
  1. Search for a piece of equipment by tag (for example `WMT:23-VA-9110-M01`) and open it.
  2. Compare the asset's linked numeric time series over a recent range (1d / 7d / 30d).
  3. Review the asset's related work orders / activities and open one for details.
- **Context:** Tier 1 monitoring and reporting app, desktop-first, read-only, tested against the `publicdatacdm` project with the Valhall dataset.

## Task walkthrough findings

The maintainer walked all three tasks end-to-end in Fusion development mode and reported all tasks completed with no blockers.

- **Task 1 — Search and open an asset:** Completed. Selecting `23-VA-9110-M01` opened the asset header with name, external ID and description.
- **Task 2 — Compare time series:** Completed. Two numeric series were selected by default and the chart rendered 1d / 7d / 30d ranges with a datapoint count.
- **Task 3 — Review activities:** Completed after an earlier defect (the data grid rendered blank inside the Fusion iframe) was fixed by switching to an Aura item list. All 18 related activities show, and "Activity details" opens in-view.
- **Observed friction:** Activity rows look like plain text, with no clear hint that they can be clicked. Some activities have an empty "Name" value because the source data has no name.

## Scores

Scores are the evidence-based drafts from repo probes. The maintainer reviewed the evidence and deferred to the proposed scores.

| Question | Score | Rationale | Improvement note |
| --- | --- | --- | --- |
| Q1 Aura consistency | 4 | Aura in 6 source files, 0 hard-coded hex/rgb values, lint clean. A few layout utility classes are used on Aura items. | Keep layout overrides minimal. |
| Q2 Navigation & hierarchy | 4 | Two-view app with a clear "Back to asset search" button and distinct section headings. No breadcrumbs. | Consider an Aura Topbar with a breadcrumb for location. |
| Q3 Labels & language | 4 | No vague labels, inputs labelled. Empty "Name" values show as a blank field. | Show "No name" instead of a blank value. |
| Q4 Feedback & validation | 5 | Loading and error states in every data panel, app-level error boundary, share-state warning. | None. |
| Q5 Clickability | 3 | Rows use real buttons (0 div/span onClick), but activity rows show no hover, cursor or arrow hint. | Add a visible hover/focus style and an "Open details" cue on rows. |
| Q6 Error prevention | 5 | Read-only app with no destructive actions (N/A default). | None. |
| Q7 Responsive | 4 | Viewport meta, `sm:`/`xl:` responsive layout, 0 fixed-px sizes. Desktop-first per the brief. | Test at tablet width. |
| Q8 Empty states | 4 | Empty/no-result copy in search, details, time series and activities. | Add a first-visit hint with example tags. |
| Q9 Performance | 4 | About 309 KB gzipped JavaScript in total, all CDF lists limited and paginated, React Query caching. No code-splitting (Vite chunk-size warning). | Lazy-load the chart. |
| Q10 Accessibility | 4 | Aura primitives, `aria-label` on controls, accessible list and chart text. No `jsx-a11y` lint or axe scan run. | Run an axe scan and add `eslint-plugin-jsx-a11y`. |

## Summary

- Average score: 4.1
- Quality level: Good — launch with minor fixes

Gate: average 4.1 meets the `flows-external-app-submit` threshold of 3.8 or higher.

## Must Fix (any score < 3)

- None.

## Should Fix (any score 3 – 3.7)

- Q5 Clickability (3): make activity rows look interactive with a hover state and an "Open details" cue.

## Nice to Fix (any score 3.8 – 4.4)

- Q1: keep layout overrides on Aura components minimal.
- Q2: add a topbar or breadcrumb for location.
- Q3: show "No name" for activities without a name.
- Q7: verify layout at tablet width.
- Q8: add a first-visit hint with example asset tags.
- Q9: lazy-load the chart to cut initial bundle size.
- Q10: run an axe scan and add `eslint-plugin-jsx-a11y`.
