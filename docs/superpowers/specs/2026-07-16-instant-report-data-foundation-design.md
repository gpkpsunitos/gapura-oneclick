# Instant Report Data Foundation Design

Date: 16 July 2026
Status: Approved by user
Approach: Server-first pagination with session-scoped stale-while-revalidate

## Objective

Make report-driven screens feel immediate without weakening authorization or requiring every interaction to wait for fresh database data. Cached or server-rendered data appears within 100 milliseconds when available, while a compact fresh page revalidates silently in the background.

This is the first milestone of the broader performance program. It addresses the shared report data path before bundle reduction, secondary feature rendering, background synchronization, or navigation animation.

## Current Evidence

The live report table contains approximately 1,150 rows. Read-only measurements on 16 July 2026 produced:

| Query | Rows | JSON payload | Observed time |
|---|---:|---:|---:|
| Compact list projection | 50 | 48,550 bytes | 239 ms |
| Current report summary | 50 | 173,942 bytes | 304 ms |
| Complete records | 50 | 344,383 bytes | 156 ms on a warmed query |
| Compact list projection | 1,000 | 592,644 bytes | 664 ms |
| Comments for the first 50 reports | 5 | 1,603 bytes | 106 ms |

The complete-record timing benefited from database warming and does not offset its seven-times-larger transfer size. The deterministic problem is over-fetching: the current summary is about 3.6 times larger than the compact projection, and `/api/admin/reports` loads all matching reports before several filters are applied in application memory.

Current production bundle diagnostics also show key dashboard routes between roughly 214 and 390 KiB gzip of initial JavaScript. Bundle work remains important, but the first milestone prioritizes the shared report path because it affects multiple roles and screens.

## Success Criteria

- A valid session-scoped cached report page appears within 100 ms of client startup.
- A warm fresh first page completes within 500 ms under representative production conditions.
- A cold fresh first page targets 1.5 seconds or less, excluding an unavailable upstream service.
- A 50-report list response is at most 75 KiB before transport compression for the normal list projection and typical comment volume.
- Normal screens never load all approximately 1,150 reports.
- List responses are bounded to at most 50 records by default and 100 records at the validated hard maximum.
- Hydration does not immediately duplicate a server bootstrap request.
- Filters, sorting, and role scope execute in PostgreSQL before pagination.
- Report details and comments are available immediately when already bootstrapped or cached.
- No authenticated response is stored in a public or cross-account cache.
- Existing report totals, role visibility, detail content, comments, status updates, exports, and JOUMPA behavior remain correct.

## Scope

This milestone covers:

- the shared typed report query contract;
- `/api/reports` and `/api/admin/reports` list reads;
- dashboard, employee, division, analyst, admin, and drilldown consumers of those reads;
- first-page server bootstrap where a Server Component owns the route;
- SWR and session-scoped persistent first-page caching;
- visible-page comment enrichment for instant report dialogs;
- cursor pagination, server filters, mutation invalidation, and performance tests.

This milestone does not cover export-scale loading, chart bundle reduction, AI endpoints, Google Sheets synchronization policy, database index deployment, or View Transition animation. Those are separate milestones with independent measurements and rollback paths.

## Typed Data Contracts

The public list contract is distinct from the complete `Report` domain object. It uses endpoint-owned readonly projections and derived result types rather than returning partial objects typed as complete reports.

The contract has these conceptual shapes:

```ts
interface ReportPage<TItem> {
  reports: readonly TItem[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
  meta: {
    generatedAt: string;
    source: 'fresh' | 'cache';
  };
}

type ReportListItem = ProjectedReport<'list'> & {
  comments: readonly ReportComment[];
};
```

Projection tuples continue to use `as const satisfies` against the canonical synchronized report field union. Generic return types derive their fields from the selected tuple. External JSON is parsed from `unknown` through small type guards; ordinary callers do not use `any` or unchecked assertions.

The normal list projection contains only identifiers, stable cursor fields, visible row fields, authorization/filter keys required by the query, and fields needed to open the existing detail dialog without a blank shell. Complete narrative, evidence, document, and export-only fields belong to the detail or export path.

## Server Query Architecture

A shared server-only query function owns the report-page behavior used by Server Components and route handlers. It accepts primitives or a stable typed query object containing:

- verified session scope;
- projection name;
- cursor and bounded limit;
- status, station, branch, division, source, date, and validated search filters;
- deterministic sort order.

The query flow is:

1. Verify the session once.
2. Resolve role, user, station, and division scope.
3. Reject unauthorized roles before report access.
4. Select the endpoint-owned compact projection.
5. Push role scope and validated filters into the Supabase/PostgreSQL query.
6. Order by `created_at DESC, id DESC`.
7. Apply the compound cursor predicate.
8. Request `limit + 1` rows to determine `hasMore`.
9. Enrich only the returned page with comments in bounded batches.
10. Return at most `limit` rows plus the next cursor.

The cursor represents both `created_at` and `id`:

```text
created_at < cursor.createdAt
OR (created_at = cursor.createdAt AND id < cursor.id)
```

This prevents gaps and duplicates when reports share timestamps.

`/api/admin/reports` no longer retrieves the full collection and filters it in memory for normal list reads. Export requests remain explicit and use a separate export projection and action. No list failure falls back to `select('*')`.

## Server-First Bootstrap

Routes that already have Server Components call the shared server query directly instead of performing an internal HTTP round trip. The server starts independent session, shell, summary, and list work as early as their dependencies permit and uses parallel composition or `Promise.all` where appropriate.

The first `ReportPage<ReportListItem>` is passed as serializable fallback data to the smallest client boundary that owns interactive filtering and selection. Only the compact first page crosses the RSC boundary.

Client-only screens use the same HTTP contract through SWR. They do not maintain parallel `useEffect` fetch implementations for the same key.

## Stale-While-Revalidate Cache

The cache model has three layers:

1. **Request deduplication:** React request caching or an equivalent request-scoped helper deduplicates repeated session and direct database work within one server render.
2. **In-memory client cache:** one shared SWR provider deduplicates identical report-page keys across mounted components.
3. **Session-scoped persistent first page:** the latest compact first page is stored under the existing user/session-scoped PWA key with a schema version, timestamp, query fingerprint, and minimal data.

When a valid persistent entry exists, it renders immediately and SWR revalidates in the background. A server bootstrap prevents immediate mount revalidation when it is already fresh. Persistent entries older than five minutes may be displayed only as explicitly stale data while an immediate refresh runs; entries older than 24 hours are discarded.

The persistent cache stores only the compact page contract, not complete reports, credentials, tokens, export data, or unrestricted company-wide collections. Logout, account switch, division switch, and permission changes purge or change the cache namespace before the next protected render.

Authenticated HTTP responses remain `private, no-store`; the application cache, not a shared CDN, provides the instant repeat experience.

## Comments and Detail Behavior

The prior instant-feedback behavior is preserved without enriching the entire company dataset. Only the reports in the current page receive batched comments. The first page therefore keeps the measured comment overhead small while report dialogs display existing feedback on their first render.

Opening a report uses this priority:

1. matching full detail already in the detail cache;
2. the bootstrapped list item and its comments;
3. a deduplicated detail request started on selection or user intent.

Background detail or comment refreshes replace data only when their report ID matches the selected report. Revalidation failure preserves the last known matching snapshot.

## Client Rendering

- Search input state remains urgent; large-list filtering uses `useDeferredValue` and memoized derived results.
- Pagination changes and non-urgent filter result updates use React transitions so input and dialog interactions remain responsive.
- Long rows use `content-visibility: auto` with a stable intrinsic row size where browser testing confirms no accessibility or sticky-layout regression.
- Expensive export, chart, and document modules stay outside the initial list bundle and load only on intent or action.
- Revalidation does not trigger View Transition animations. Navigation animation is deferred to the later navigation milestone and will use `default="none"` for background updates.

## Mutation and Invalidation

After report creation, comment creation, status change, update, or deletion:

- update the selected detail and visible list item optimistically when the server response contains sufficient authoritative data;
- invalidate the affected report-detail key;
- invalidate report-page keys whose filters may include the record;
- refresh aggregate statistics independently;
- update or remove the persistent first-page snapshot during idle time.

Invalidation uses report IDs and typed cache-key builders. It does not clear every unrelated SWR entry.

## Error Handling

- Authorization failure returns before data access and never consumes another user's persistent snapshot.
- Invalid filters, cursors, fields, or limits return a bounded `400` response.
- Database failure preserves a valid session-scoped stale page and shows its age; it does not widen the query.
- A failed comment enrichment returns the compact report page and lets the existing per-report comment refresh recover.
- A failed next-page request leaves the current page interactive and exposes a retry action.
- Logs include timing, projection, page size, and error class without report contents, credentials, or session tokens.

## Verification

### Data correctness

- Typed projection tests reject invalid fields and prevent list callers from reading detail-only fields.
- Cursor fixtures with identical timestamps have no gaps or duplicates.
- Role tests cover super admin, analyst, manager, staff, division, partner, station, and unauthenticated access.
- Database filters and in-memory reference results match for representative fixtures before the old path is removed.
- Comments attach only to the matching visible report and remain deduplicated and chronological.

### Cache correctness

- Server fallback prevents an immediate duplicate SWR request.
- Cached first pages render within the 100 ms target in a browser trace.
- Revalidation updates data without clearing the visible list.
- Logout, account switch, division switch, and role downgrade cannot reuse the previous scope's data.
- Mutation invalidation updates the selected report without refetching unrelated pages.

### Performance

- Measure query duration, JSON bytes, row count, and end-to-end route duration for cold and warm runs.
- Record first-content, cached-content, and fresh-content timings for representative roles.
- Confirm normal report screens issue no unbounded report query.
- Compare route bundle diagnostics before and after the client hook consolidation.
- Run TypeScript, focused tests, lint, security guardrails, and a production build.

## Rollout

1. Add typed contracts, query primitives, and parity tests.
2. Migrate `/api/reports` to the shared page query.
3. Migrate `/api/admin/reports` and drilldown consumers.
4. Add Server Component bootstrap and SWR fallback to one representative dashboard.
5. Add session-scoped persistent first-page hydration and cache-purge tests.
6. Migrate remaining report-list consumers.
7. Remove unbounded compatibility paths after exports and details use explicit contracts.
8. Record achieved latency and payload budgets before starting the bundle/rendering milestone.

Each step remains independently revertible. Production database indexes or external cache infrastructure require separate evidence and approval.

## Later Milestones

After the report foundation meets its budgets:

1. reduce dashboard and chart initial JavaScript through route-owned dynamic imports and smaller client boundaries;
2. remove remaining fetch-on-mount waterfalls and duplicate SWR providers;
3. optimize long-table rendering, images, fonts, and secondary feature activation;
4. throttle and deduplicate background synchronization and AI/supporting requests;
5. add accessible View Transitions only for meaningful hierarchical navigation, never for silent revalidation.
