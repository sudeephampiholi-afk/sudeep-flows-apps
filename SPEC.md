# Feature Specification: Asset 360 Investigation Workspace

## User Scenarios & Testing

### User Stories

1. As an Operations Analyst, I want to search for a piece of equipment by its tag, name, or description, so that I can quickly find the asset flagged in a shift report or alarm without logging in to multiple systems.
2. As an Operations Analyst, I want to open a single 360° detail page for the selected asset, so that I can see its identity, time series, and work orders in one unified view.
3. As an Operations Analyst, I want to plot the time series linked to the selected asset over a recent time window, so that I can judge current behavior versus normal without opening the historian tool.
4. As an Operations Analyst, I want to see the recent work orders / activities related to the selected asset, so that I can answer "has anyone already touched this?" without logging in to SAP.

### Acceptance Scenarios

- Given the analyst is on the home screen, when they type the first few characters of an equipment tag, then they see a ranked list of matching assets showing tag, name, and enough parent/location context to disambiguate.
- Given matching results are displayed, when the analyst selects one, then the host-synchronized state opens that asset's 360 detail view with the asset's external ID, name, description, and type relation (when populated) clearly shown at the top.
- Given the analyst has selected an asset, entered a search, selected time series, changed the chart range, or opened an activity detail, when they reload or share the CDF URL, then `initialState` restores the same meaningful investigation state.
- Given the analyst submits a search term that matches no assets, when the search completes, then the app shows a clear empty state explaining no assets matched and how to refine the search.
- Given the analyst types multiple search characters quickly, when fewer than 300 ms elapse between changes, then stale search delays are cancelled and only the final stable query reaches CDF.
- Given the analyst is on an asset 360 page, when the page loads, then the time series panel lists the series returned by the documented asset-relation lookup but plots none by default; the analyst must explicitly pick numeric series to chart.
- Given the analyst selects one or more time series, when the chart renders, then the default time window is the most recent week of data, ending at the most recent datapoint among the selected series (not at wall-clock "now"), and the chart updates when the analyst changes the selection or the time range.
- Given the analyst is viewing the time series chart, when they trigger the manual refresh control, then the chart re-fetches data for the currently selected series and time range; the chart never auto-polls or streams.
- Given the analyst is viewing an asset with related activities, when the page loads, then they see a list sorted by the first available verified date (`endTime`, `scheduledEndTime`, `startTime`, or `scheduledStartTime`), showing node external ID, name/description, and date; selecting one reveals its verified details without leaving the 360 page.
- Given the asset has no linked time series or no work orders, when the page loads, then each panel shows its own empty state independently and the rest of the page still renders.
- Given a CDF call for one panel fails or is slow while others succeed, when the page loads, then the failing panel shows an inline error with a retry control and the other panels keep working.
- Given the analyst's CDF token does not grant access to a data type (e.g., time series), when the page loads, then the affected panel shows a clear "no access" state instead of a generic error.
- Given saved host state is absent, malformed, or from an unsupported schema version, when the app starts, then it safely falls back to the default search view without crashing.
- Given an uncaught render error occurs in routing or shared layout, when the error is thrown, then an application-level error boundary shows a clear recovery affordance (reload) instead of a blank screen.

## Requirements

### Functional Requirements

- FR-001: The app MUST provide a single search entry point that accepts a partial or full equipment tag, name, or description and returns a ranked list of matching assets from CDF. Search input MUST be limited to 200 characters and reject control characters before reaching CDF.
- FR-002: Each search result MUST display the asset's tag/external id, human-readable name, and enough contextual information (e.g., description and parent/location) to disambiguate similarly named assets.
- FR-003: Selecting a search result MUST open a dedicated 360 detail view and synchronize the selected asset's `{ space, externalId }` through `HostAppAPI.syncInternalState`, making the resulting CDF URL reloadable and shareable.
- FR-004: The 360 detail view MUST show the asset node's `externalId`, `name`, `description`, and `type` direct relation when populated. It MUST not assume a resolved type name when only a relation reference is available.
- FR-005: The 360 detail view MUST include a time series panel that lists the linked time series returned by the verified relation lookup and discloses if an endpoint limit prevents a completeness guarantee. By default no series is plotted; the analyst explicitly selects which series to chart. When at least one series is selected, the chart's default time window MUST be the most recent week of data, anchored to the most recent datapoint available for the displayed series (i.e., end of window = latest datapoint timestamp, start = one week earlier), not to the current wall-clock time, because the time series data in this project is older.
- FR-006: Users MUST be able to add or remove plotted series and change the time range shown without leaving the 360 view. To keep host-synchronized URLs practical for sharing and charts readable, at most five numeric series MAY be selected at once.
- FR-006a: Only numeric `CogniteTimeSeries` instances are chartable in v1. String and state series MAY be listed but MUST be identified as unsupported for this chart. When no datapoints exist for a selected numeric series, the chart MUST show a clear empty state rather than an empty axis or error.
- FR-006b: The time series chart MUST NOT auto-poll or stream updates. The analyst MUST be able to trigger a manual refresh from the chart panel; the refresh re-fetches data for the currently selected series and time range.
- FR-007: The 360 detail view MUST include an activities panel labeled for the workshop as work orders / activities. It MUST show only verified `CogniteActivity:v1` fields: node `externalId`; `name`, `description`, and `tags`; source metadata when present; and `startTime`, `endTime`, `scheduledStartTime`, and `scheduledEndTime`. It MUST NOT require or display an activity `status`, because `CogniteActivity:v1` does not define that property.
- FR-007a: The activities list MUST render in pages of 25 rows. When more activities exist than are shown, the panel MUST display "Showing N of M" and a "Show more activities" action that reveals the next 25, so a large asset never renders every row at once. The page count is transient and is not host-synchronized. The selected activity's details remain visible regardless of the page.
- FR-007b: The time series chart (and its Recharts dependency) MUST load on demand, showing a "Loading chart..." state until it is ready, so the initial bundle stays small.
- FR-007c: Loading states for search, asset details, time series, chart, and activities MUST use Aura skeleton placeholders announced as a labelled status region. Each activity row MUST show a chevron cue and focusable button affordance so it reads as clickable.
- FR-008: Users MUST be able to view the verified details of a single activity without leaving the 360 view.
- FR-009: Each panel (time series, work orders) MUST render its own loading, empty, error, and no-access states independently so a failure or gap in one panel does not block the others.
- FR-010: The app MUST call `connectToHostApp` once at startup, safely parse and validate bounded `initialState`, and synchronize the complete versioned UI-state object after meaningful changes. Validation MUST reject serialized state over 2,000 characters, overlong/control-character identifiers or searches, more than five selected time series, and invalid or reversed chart timestamps. The synchronized state MUST include the active view, search query, selected asset node ID, selected time-series node IDs, chart range, and selected activity node ID. No duplicate browser-local persistence is permitted for these fields.
- FR-011: The app MUST authenticate the analyst against CDF and only display data the analyst is authorized to see.
- FR-012: All asset, time series, and work order data displayed MUST be retrieved live from CDF rather than from a separately maintained copy.
- FR-013: The app MUST be usable on a standard desktop/laptop screen size used in an office or control room (large monitor down to a 13" laptop) without requiring horizontal scrolling.
- FR-014: Beyond per-panel error boundaries, routed application content MUST be wrapped in an application-level error boundary so an uncaught render failure in routing or page layout shows a clear recovery affordance (reload) instead of a blank screen.
- FR-015: Every endpoint that returns a cursor MUST be consumed until no `nextCursor` remains when completeness is required. Interactive asset search MAY intentionally request only a small ranked result set. Datapoint retrieval MUST follow each series' cursor when a one-week response exceeds the request limit.
- FR-016: Asset type-ahead MUST wait for 300 ms of stable input before calling CDF. The delay MUST be abortable so a changed query or unmounted view clears its timer and never sends a stale request.
- FR-017: Every asset, time-series, and activity SDK request MUST retry only CDF `429 Too Many Requests` responses. Retries MUST have at most four total attempts, exponential backoff with bounded jitter, and `Retry-After` seconds/date support subject to a 30-second safety cap. Authentication/authorization errors and ordinary 4xx responses MUST NOT be retried.

## Success Criteria

- SC-001: An Operations Analyst can go from "I have an equipment tag" to "I am looking at that asset's tag, time series, and work orders on one page" in under 30 seconds for a typical asset.
- SC-002: For a typical investigation, the analyst completes the task without opening any other tool (no SAP tab, no historian tab) in at least 80% of sessions.
- SC-003: Median end-to-end investigation time (asset flagged → ready to brief maintenance) drops from 1–2 hours using the legacy multi-tool workflow to under 15 minutes using this app.
- SC-004: On a representative asset's 360 page, all three core panels (header, time series, work orders) render usable content (or a correct empty/error state) within 3 seconds on a standard office network.
- SC-005: At least 90% of analyst sessions in a week include at least one search executed and at least one work order opened, indicating the unified flow is being used end-to-end rather than abandoned partway through.
- SC-006: When one data source is unavailable (e.g., work orders), at least 95% of sessions still successfully render the remaining panels, demonstrating that panel-level resilience is working.

## Clarifications

- Default chart end is the maximum latest-datapoint timestamp across the selected numeric series; start is exactly seven days earlier. Because the datapoints range API treats `end` as exclusive, the retrieval request MUST use an exclusive bound that still includes the logical end datapoint.
- No time series is plotted by default when an asset has many linked series; the analyst explicitly picks which series to chart.
- The time series chart refreshes only on a manual refresh action; the app does not auto-poll or stream updates.
- Host-synchronized state, rather than a hand-built route or `localStorage`, owns the active view, search, selections, and chart range.

## Assumptions

- The target user is an Operations Analyst / Reliability Engineer working primarily on a desktop or laptop in an office or control room; mobile and tablet layouts are out of scope for v1.
- The analyst already has a valid CDF identity and the app authenticates against CDF using the standard Flows authentication pattern; user provisioning is out of scope.
- The app expects assets, time series, and activities in the public project, but their population and contextualization MUST be checked at runtime. Missing relations produce valid empty states. This app reads from CDF and does not write to SAP or historians.
- "Work orders" in this workshop are `CogniteActivity:v1` instances linked to the asset. The app does not call SAP and does not claim that every activity is a maintenance order.
- The public Cognite project has no contextualized documents, so documents are out of scope for this build.
- The time series data in the public Cognite project is older, so the chart defaults to the most recent week of data ending at the latest datapoint.
- The app is delivered as a Cognite Flows app and follows the workspace's standard auth, design (Aura), and data-modeling practices.

---

## Data Models & CDF Integration *(mandatory)*

### Existing views

All domain data is read live from the Cognite Core Data Model. No new views are introduced.

- `cdf_cdm.CogniteAsset:v1` — searchable asset nodes. Verified properties include hierarchy relations (`parent`, `children`, `root`, `path`), reverse relations (`timeSeries`, `activities`), `assetClass`, and `type`; inherited `CogniteDescribable` properties provide `name`, `description`, `tags`, and `aliases`.
- `cdf_cdm.CogniteTimeSeries:v1` — defines `isStep`, time-series `type` (`numeric`, `string`, or `state`), `sourceUnit`, `unit`, `stateSet`, and an `assets` list of direct relations. It inherits describable and sourceable properties.
- `cdf_cdm.CogniteActivity:v1` — defines `assets`, `equipment`, and `timeSeries` lists of direct relations. It inherits describable, sourceable, and schedulable properties. The schedulable fields are `startTime`, `endTime`, `scheduledStartTime`, and `scheduledEndTime`; no `status` property is defined.

### Verified read strategy

- Asset type-ahead search uses the installed SDK's `client.instances.search` against `cdf_cdm.CogniteAsset:v1`, with an explicit search operator and a small UI result limit. Exact external-ID and name matches are promoted first while preserving CDF's native relevance ordering within the exact and non-exact groups. The final search token supports prefix matching; fuzzy/typo matching is not promised.
- A selected asset is retrieved by its complete node ID `{ space, externalId }`; an external ID alone is not treated as a globally unique instance ID.
- `CogniteTimeSeries.assets` and `CogniteActivity.assets` point from the related node to one or more assets. Reverse relations whose target is a list cannot be traversed through the graph `/query` endpoint. Related series and activities are therefore looked up with `client.instances.list`, filtering with `containsAny` on their own `assets` property and the selected asset's `{ space, externalId }`.
- Related-node `instances.list` responses MUST follow `nextCursor` until no cursor remains so the time-series and activity panels are complete. Interactive asset type-ahead remains a deliberately bounded, relevance-ranked `client.instances.search`; `instances.search` is not used for complete related-node retrieval.
- The installed SDK exposes these operations through `client.instances.search`, `client.instances.list`, `client.instances.retrieve`, and `client.instances.query`. This feature uses `search` only for ranked asset search, cursor-paginated `list` for related-node filtering, and `retrieve` for known node IDs; it does not use `query` to reverse-traverse `assets`.
- The latest timestamp for each selected series is read with `client.timeseries.data.retrieveLatest` and an `instanceId`. The logical chart end is the greatest returned timestamp. The one-week data request then uses `client.timeseries.data.retrieve` with each series' `instanceId`, explicit `start` and exclusive `end`, a bounded limit, and returned cursors until complete.
- All SDK reads share a bounded 429 retry policy: four total attempts, capped exponential backoff with up to 20% jitter, and `Retry-After` seconds/date handling capped at 30 seconds. The UI issues only a small, bounded number of serial or batched reads, so a global semaphore would add queueing complexity without materially reducing concurrency; retrying only 429 responses directly addresses transient CDF throttling while 401/403 and ordinary 4xx failures surface immediately.
- Authentication and the CDF client come from the scaffold's host/App SDK integration. Cluster and project values are obtained from the host rather than hardcoded.

### Host-synchronized UI state

The serialized state contract is versioned and contains only JSON-safe values:

- `version`
- active view (`search` or `asset`)
- search query
- selected asset `{ space, externalId }`
- selected time-series IDs as `{ space, externalId }[]`
- chart range `{ start, end }`
- selected activity `{ space, externalId }`

On startup, `initialState` is parsed inside `try/catch` and validated before use. Unsupported, malformed, or cross-field-inconsistent state falls back to defaults. Asset view requires a selected asset; search view cannot retain an asset or hidden child selections; activity, series, and range selections require an asset; and a chart range requires at least one selected series. After any meaningful state change, the complete object is passed to `api.syncInternalState(JSON.stringify(state))`; the host replaces rather than merges the saved state.

### New views

None. This app does not introduce or modify any views, containers, or data models.

### Spaces

- `cdf_cdm` — the system space that hosts the Cognite Core Data Model views listed above. The app reads from this space only; it does not write to it.
- No project-defined spaces are created or written to by this app.

### Out of scope and runtime verification

- There is no documents panel.
- **Runtime verification status: satisfied.** An authenticated probe in `publicdatacdm` resolved asset tag `23-VA-9110-M01` to node `{ space: "valhall-assets", externalId: "WMT:23-VA-9110-M01" }`.
- The verified asset has two linked numeric `CogniteTimeSeries:v1` instances: `{ space: "valhall-tags", externalId: "pi:160995" }` and `{ space: "valhall-tags", externalId: "pi:160993" }`.
- The verified asset has 18 linked `CogniteActivity:v1` maintenance-order instances in space `valhall-maintenance-orders`. The product UI still uses the honest label "Work orders / activities" because the contract is the generic activity view.
- Latest-datapoint lookup by instance ID succeeded. The greatest returned timestamp was `2026-03-14T14:39:43.480Z`, so the verified default one-week chart range is `2026-03-07T14:39:43.480Z` through `2026-03-14T14:39:43.480Z`.
- Authenticated users can type ahead after two characters, inspect CDF-ranked matches with external ID, name, description, parent context, and tags, open the host-synchronized asset detail view, and return without losing the query.
- The asset detail view lists every linked time-series type, allows only numeric series to be selected, restores synchronized selections and ranges, and charts numeric datapoints with independent linked/latest/range request states. Selection changes anchor a new seven-day range to the greatest latest timestamp, range presets preserve the logical data end, and refresh is manual with no polling.
- The asset detail view independently loads all linked activities and presents a visible result count plus every activity's external ID, name or fallback, effective date, and source in a compact Aura Items list. Each row contains a semantic Aura button, so pointer, Enter, and Space activation opens verified activity details in the same view. The selected item is visibly indicated and restored through host state, and loading, empty, no-access, and retryable error states remain local to each panel.
- The activities list shows 25 rows at a time with a "Show more activities" action and a "Showing N of M" indicator. The chart loads lazily in its own bundle chunk, and no build chunk exceeds 500 kB.
- The app stays on React 18 because `@cognite/app-sdk` and `@cognite/aura` declare React `^18.3.1` as a peer dependency; `@cognite/app-sdk` 0.11 requires Vite 8.2.4.
- Related time series, activities, and range datapoints follow every returned cursor. Activity fields reflow from one to multiple columns at responsive breakpoints, wrap long values, and do not introduce horizontal page scrolling from large desktop monitors down to a 13-inch laptop.
