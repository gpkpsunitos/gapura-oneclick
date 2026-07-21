# Division Dashboard Performance Design

Date: 21 July 2026

Status: Approved by user

Approach: Exact server-side aggregates with on-demand detail data

## Objective

Make the first load of `/dashboard/op`, `/dashboard/os`, and the related division dashboards fast without omitting reports from any KPI, chart, filter, tab, or drilldown total.

The latest-report list displays at most ten rows. That display limit must never limit calculations. Every calculation uses all eligible rows from the tab's authoritative source.

This design narrows and extends the approved performance program in `2026-07-15-performance-optimization-design.md` and the report pagination foundation in `2026-07-16-instant-report-data-foundation-design.md`. If those documents suggest loading raw report collections for dashboard calculations, this design takes precedence for division dashboards.

## Current Evidence

The production Speed Insights snapshot shows healthy server response time but poor client experience on the affected routes:

- TTFB: about 0.5 seconds;
- FCP: 1.82 seconds;
- LCP: 2.94 seconds;
- INP: 360 milliseconds;
- CLS: 0.11;
- `/dashboard/op` RES: 49.

Repository and live Supabase diagnostics found:

- The live Ground Handling table contains 1,153 reports and occupies about 16 MiB including indexes.
- A representative first-page query uses the `created_at` index and executes in about 0.54 milliseconds. PostgreSQL is not the main bottleneck.
- The shared OP/Analyst/HT dashboard downloads all reports in 100-row cursor pages before rendering. With the current dataset, this is 12 sequential HTTP requests.
- The selected report payload is about 5.27 MiB raw JSON and about 501 KiB gzip before application normalization and comment enrichment.
- The same path queries comments for every page.
- The dashboard also requests `/api/admin/analytics`, although the current chart component does not consume the returned analytics fields. The request blocks the full dashboard skeleton.
- Division roles receive `403` from `/api/admin/analytics`; Analyst and Super Admin sessions make the server read the entire analytics projection before returning an unused response.
- JOUMPA data is fetched eagerly on the default dashboard even when no JOUMPA section is visible.
- The current production build places roughly 297 KiB gzip of JavaScript on the OP/OS path before the dashboard becomes usable.
- OS and OCS add a second client-only loading waterfall through an `ssr: false` orchestrator.
- Whole-page skeleton replacement waits for reports and analytics, contributing to LCP and layout shift.

The all-report client loop was introduced on 16 July 2026 to restore correct totals after pagination. It fixed completeness but moved the complete dataset onto the critical browser path. This design preserves completeness without retaining that transfer.

## Success Criteria

- Every KPI, chart, tab aggregate, filter option, and drilldown total includes every eligible report from its authoritative source.
- Pagination limits visible rows only; it never limits calculations.
- No division dashboard downloads the complete raw report collection during initial load.
- The initial route renders the header, exact KPIs, latest ten lightweight reports, tab bar, and exact Summary tab in server-rendered HTML.
- Initial dashboard data is at most 100 KiB gzip under the representative production dataset.
- No unused analytics or JOUMPA request blocks the default dashboard.
- P75 LCP is below 2.5 seconds, INP below 200 milliseconds, CLS below 0.1, and RES above 90.
- Authorization, division switching, report visibility, exports, report details, and status updates remain correct.
- A failed source query is visible as an error and never produces a silently partial total.

## Non-Goals

- Do not approximate, sample, or cap report calculations.
- Do not hide missing reports behind pagination or stale client state.
- Do not add speculative indexes; the measured primary query is already fast.
- Do not introduce a materialized summary table in the first implementation.
- Do not publicly cache authenticated dashboard responses.
- Do not redesign the visual appearance or remove existing section tabs.
- Do not merge independent report sources into every tab.

## Authoritative Source Registry

Every tab has a declared source and eligibility rule. The registry is shared by the query layer, endpoint validation, tests, and UI labels.

| Section | Authoritative population |
|---|---|
| Summary Report | Every Ground Handling report |
| Landside & Airside Detail | Every Ground Handling report |
| JOUMPA Service | Every `joumpa_reports_sync` report |
| GSE Performance | Every Ground Handling report matching the canonical GSE eligibility rule |
| CGO Cargo | Every Ground Handling report whose canonical source is CGO |
| Delay Code | Every applicable Ground Handling report; rows without a delay code remain in any explicitly defined denominator and are excluded only from code breakdown groups |
| Report Status | Every Ground Handling report |
| Combined summary | The explicit union named by that summary, with canonical duplicate removal |

The source registry must not infer a smaller population from the number of rows currently displayed. Source selection happens before aggregation and independently of row pagination.

### Combined-source duplicate handling

When a summary explicitly combines sources, the canonical record key uses this priority:

1. `source_fingerprint` when present;
2. normalized source name plus `sheet_id` or `original_id`;
3. source name plus database `id`.

The response reports both pre-deduplication source counts and the final unique population count. This makes accidental omissions or double counting observable.

## Architecture

### Server-first route

Each division route authenticates once and calls a shared server-only `getDashboardOverview()` service directly. It does not make an internal HTTP call and does not serialize full report arrays through React Server Components.

The server renders:

- dashboard title and controls;
- exact KPI values;
- exact Summary-tab aggregate series;
- complete filter-option values for the active source;
- latest ten lightweight reports;
- tab bar;
- source count, filtered count, and generation time metadata.

The interactive boundary begins at a shared `DashboardShell`. OP, OS, OCS, HT, and Analyst use the same orchestration shell with division configuration. Division-specific tabs remain separate modules.

### Supabase aggregate layer

PostgreSQL calculates counts, grouped series, distinct filter values, and trends across all eligible rows. The browser never receives rows merely so it can count or group them.

Aggregate database functions must:

- use fixed, allowlisted source and grouping branches rather than dynamic SQL identifiers;
- execute as `SECURITY INVOKER`;
- set an explicit safe search path;
- have execution revoked from `PUBLIC`, `anon`, and `authenticated` unless a later direct-client design explicitly requires it;
- grant execution only to the server-side `service_role` in the first implementation;
- be called from authenticated server-only code;
- return complete aggregate data plus source-count metadata;
- perform all parts of one tab calculation against one consistent statement snapshot.

The Next.js server continues to own authorization. Service-role credentials never cross a client boundary.

### Overview and tab contracts

The overview contract is conceptually:

```ts
interface DashboardOverview {
  source: DashboardSourceKey;
  sourceCounts: Record<string, number>;
  uniquePopulationCount: number;
  filteredCount: number;
  summary: DashboardKpis;
  series: SummarySeries;
  filterOptions: DashboardFilterOptions;
  latestReports: readonly DashboardReportListItem[];
  generatedAt: string;
  completeness: 'complete';
}
```

Every tab response includes the authoritative source key, total eligible population, filtered population, generation time, and `completeness: 'complete'`. A response cannot claim completeness if any required source failed.

Lightweight report rows contain only fields visible in the latest-report list. Full narrative, evidence, documents, comments, and export fields remain in detail or export endpoints.

### Tab loading

The Summary tab is part of the initial server response. Inactive tabs load when selected. Lazy loading controls when a calculation is requested, not how many reports it covers.

Each tab endpoint:

1. verifies the session and requested division;
2. resolves the allowlisted tab definition;
3. validates filters;
4. runs the complete aggregate query for that tab's source;
5. returns exact aggregate data and completeness metadata.

The first implementation does not prefetch inactive tabs. JOUMPA is not requested on initial load unless the initial summary explicitly includes it.

### Filters and drilldowns

Filter changes execute against the complete authoritative population on the server. The existing result remains visible with a scoped updating indicator while the new result loads. Stale requests are aborted or ignored by request identity.

Drilldowns return:

- exact total matching rows;
- compact cursor-paginated display rows;
- the applied source and filter metadata;
- a next cursor where applicable.

The exact total and aggregate series are calculated before and independently of pagination. Opening a report then fetches its authorized detail record.

## Component Boundaries

- `dashboard-source-registry`: authoritative source, eligibility, filter, grouping, and deduplication rules.
- `dashboard-overview-query`: server-only overview orchestration and result validation.
- Supabase overview/tab functions: complete indexed aggregation.
- `DashboardOverviewServer`: server composition for first render.
- `DashboardShell`: small client boundary for filters, tab selection, refresh, and dialogs.
- Tab panels: dynamically loaded views consuming aggregate DTOs, not raw report arrays.
- `DashboardLatestReports`: at most ten lightweight rows.
- Existing paginated report/detail paths: full row access only on user intent.

The duplicated OS and OCS orchestrators are removed only after output parity is demonstrated. Shared behavior moves into the shell; genuinely division-specific content stays in its own module.

## Loading and Layout Behavior

- The route emits meaningful server-rendered content rather than an `ssr: false` full-dashboard placeholder.
- Above-the-fold regions use stable dimensions matching their final layout.
- Loading one tab never replaces the entire page.
- Filter refreshes preserve current content and show a local pending state.
- Chart libraries load with the selected chart tab, not with the route shell.
- Modal, export, document, and JOUMPA-specific code loads only on intent.
- Sidebar notification and PWA maintenance requests run after critical dashboard work and do not compete for the first data slot.

## Freshness and Caching

The first implementation uses fresh server queries and private, no-store HTTP responses. With approximately 1,200 rows and measured sub-millisecond indexed page reads, a time-based aggregate cache is not necessary for the target.

Client navigation retains the last complete aggregate response while revalidating. It displays its generation time and must not relabel a partial or failed refresh as current data.

If aggregate caching becomes necessary later, it requires a separate invalidation design tied to report synchronization and status mutations. A fixed TTL alone is not accepted because it can omit newly synchronized reports during its stale window.

## Error Handling

- Authentication or authorization failure returns before report access.
- Invalid source, tab, filter, or cursor input returns a bounded client error.
- A failed overview shows the dashboard shell and a retryable overview error; it does not show zeros as valid totals.
- A failed inactive tab is isolated to that panel.
- A combined summary fails as a unit if any required source fails.
- The last complete response remains visible with a clear stale/error state during refresh failure.
- Database failure never falls back to a capped raw page for calculations.
- Logs contain timing, source, filter fingerprint, and row counts but no report narrative, credentials, or tokens.

## Observability

Overview and tab responses emit `Server-Timing` metrics for authentication, database aggregation, latest-row query, and serialization. Structured logs record:

- route and tab key;
- authoritative source;
- eligible, filtered, and returned display-row counts;
- query and total durations;
- serialized response bytes;
- completeness state.

Vercel Speed Insights remains the production measure for route-level LCP, INP, CLS, and RES. Measurements compare OP, OS, OCS, HT, and Analyst before and after rollout.

## Verification

### Completeness and parity

- For each tab, compare the database aggregate result with a brute-force reference calculation over the complete fixture dataset.
- Include sentinel reports at the first, middle, 100th/101st boundary, 1,000th/1,001st boundary, and final position.
- Assert that source counts and grouped totals reconcile to the eligible population according to the tab's documented rules.
- Verify that filters produce the same result before and after pagination boundaries.
- Verify exact drilldown totals while loading rows across multiple cursors.
- Test combined-source duplicate cases for every canonical-key fallback.
- Confirm a source failure cannot yield `completeness: 'complete'`.

### Authorization

- Cover Super Admin, Analyst, division, partner, manager, staff, and unauthenticated sessions.
- Confirm direct RPC execution is unavailable to public client roles.
- Verify account and division switching cannot reuse another scope's aggregate response.

### UI and behavior

- Initial HTML contains title, KPIs, latest reports, tab bar, and Summary content.
- No initial request downloads every Ground Handling or JOUMPA row.
- Selecting each tab loads exact aggregates and preserves visual behavior.
- Filters keep previous content interactive while updating.
- Detail, comments, exports, status updates, and refresh continue to work.
- Stable placeholders prevent full-page layout replacement.

### Performance

- Record raw and gzip response sizes for overview and each tab.
- Record cold and warm server timings.
- Analyze initial and selected-tab JavaScript chunks after a production build.
- Run representative browser traces for OP and OS under throttled desktop and mobile profiles.
- Confirm initial data below 100 KiB gzip and the P75 Web Vitals targets.

## Rollout

1. Add the source registry, result contracts, fixture reference calculators, and completeness tests.
2. Add safe Supabase aggregate functions and verify live-shaped query plans in a development branch or local database.
3. Build the shared server overview path and exact Summary response.
4. Migrate `/dashboard/op` first and compare every total with production reference data.
5. Remove OP's all-report loop, unused analytics request, and eager JOUMPA request after parity passes.
6. Migrate OS and remove its full-dashboard `ssr: false` waterfall.
7. Migrate OCS, HT, and Analyst using the same contracts.
8. Migrate each inactive tab to its authoritative aggregate endpoint.
9. Remove duplicated OS/OCS orchestration only after visual and data parity.
10. Run production build, focused tests, security guardrails, bundle analysis, and browser performance verification.
11. Roll out route by route with a reversible feature flag or component switch until measured parity and performance targets hold.

No production schema change or deployment is performed as part of approving this design document.
