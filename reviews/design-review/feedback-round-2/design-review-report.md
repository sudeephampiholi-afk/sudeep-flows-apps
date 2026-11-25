# Design Review — Asset 360 Investigation Workspace — round 2

Reviewed commit: `e4972ae` (app code at `bbb38ae`)

## User and tasks

- **Primary user:** Operations Analyst / Reliability Engineer at an industrial facility, working at a desk on a desktop or laptop with a large monitor.
- **Tasks evaluated:**
  1. Search for a piece of equipment by tag (for example `WMT:23-VA-9110-M01`) and open it.
  2. Compare the asset's linked numeric time series over a recent range (1d / 7d / 30d).
  3. Review the asset's related work orders / activities and open one for details.
- **Context:** Tier 1 monitoring and reporting app, desktop-first, read-only, tested against the `publicdatacdm` project with the Valhall dataset.

## Task walkthrough findings

The maintainer re-walked all three tasks after the round 1 fixes and the latest polish (Aura loading skeletons, a chevron cue on activity rows, paged activities, lazily loaded chart). All tasks completed with no blockers.

- **Task 1 — Search and open an asset:** Completed. The asset opens with name, external ID and description.
- **Task 2 — Compare time series:** Completed. Two numeric series chart over 1d / 7d / 30d, and the chart loads on demand.
- **Task 3 — Review activities:** Completed. All 18 related activities show, 25 at a time with "Show more activities" for larger assets, and "Activity details" opens in the same view.
- **Observed friction:** Some activities have an empty source name, which shows as an "Unnamed activity" fallback.

## Changes since round 1

- Q5: activity rows gained a chevron cue (round 1 score 3).
- Q4: loading states now use Aura skeleton placeholders announced as a status region.
- Q9: chart lazy-loaded, vendor chunks split, main bundle cut from about 1,011 kB to 311 kB.
- Q9: activity list renders 25 rows at a time.

## Scores

Scores are the evidence-based proposals from repo probes. The maintainer reviewed them and accepted all of them.

| Question | Score | Rationale | Improvement note |
| --- | --- | --- | --- |
| Q1 Aura consistency | 4 | Aura imported in 8 source files, 0 hard-coded hex/rgb values, 0 inline styles, lint clean. A few layout utility classes sit on Aura items. | Keep layout overrides minimal. |
| Q2 Navigation & hierarchy | 4 | Two-view app with a clear "Back to asset search" button and distinct section headings. No breadcrumb. | Add an Aura Topbar with a breadcrumb. |
| Q3 Labels & language | 4 | 0 vague labels, inputs labelled, plain action wording. | Show "No name" wording consistently for unnamed activities. |
| Q4 Feedback & validation | 5 | Aura skeleton loading, empty, error and retry states in every data panel, app-level error boundary, share-state warning. | None. |
| Q5 Clickability | 4 | Real buttons only (0 div/span onClick), chevron cue plus Aura ghost-button hover and focus on rows. | Add a hover tint on the whole row. |
| Q6 Error prevention | 5 | Read-only app with no destructive actions (N/A default). | None. |
| Q7 Responsive | 4 | Viewport meta, `sm:`/`xl:` responsive layouts, 0 fixed-pixel sizes. Desktop-first per the brief. | Check layout at tablet width. |
| Q8 Empty states | 4 | Aura EmptyState in search, details, time series and activities. | Add a first-visit hint with example tags. |
| Q9 Performance | 4 | Largest chunk 426 kB (chart, lazy-loaded), main 311 kB, all CDF reads paginated, React Query caching, activity rows paged. No keyboard shortcuts. | Cap or aggregate very large reads. |
| Q10 Accessibility | 4 | Aura primitives, `aria-label` on controls, labelled status regions for loading, accessible chart summary table. No axe scan or `jsx-a11y` lint run. | Run an axe scan and add `eslint-plugin-jsx-a11y`. |

## Summary

- Average score: 4.2
- Quality level: Good — launch with minor fixes

Gate: average 4.2 meets the `flows-external-app-submit` threshold of 3.8 or higher.

## Must Fix (any score < 3)

- None.

## Should Fix (any score 3 – 3.7)

- None.

## Nice to Fix (any score 3.8 – 4.4)

- Q1: keep layout overrides on Aura components minimal.
- Q2: add a topbar or breadcrumb for location.
- Q3: consistent wording for unnamed activities.
- Q5: add a hover tint on the whole activity row.
- Q7: verify layout at tablet width.
- Q8: add a first-visit hint with example asset tags.
- Q9: cap or aggregate very large reads.
- Q10: run an axe scan and add `eslint-plugin-jsx-a11y`.
