# Gapura OneClick Performance Optimization Design

Date: 15 July 2026
Status: Approved by user
Approach: Phased hybrid optimization

## Objective

Make the application materially lighter and faster while preserving its current user interface, role behavior, reporting semantics, PWA workflow, exports, and operational integrations.

Optimization is measurement-led. The project will not use a blanket rewrite, remove important features, or trade authorization correctness for cache speed.

## Current Baseline

The production build succeeds on Next.js 16.2.4 and React 19.2.1. The repository contains 116 application pages and 119 route handlers. Of 345 TSX modules, 314 currently have client boundaries.

Initial JavaScript was measured by resolving each route's first-load chunks from the Next.js diagnostic bundle data and gzip-compressing those chunks:

| Route | Initial JavaScript gzip | Raw JavaScript |
|---|---:|---:|
| /auth/login | 165 KiB | 563 KiB |
| /dashboard/admin | 204 KiB | 685 KiB |
| /dashboard/employee | 232 KiB | 770 KiB |
| /dashboard/analyst | 297 KiB | 969 KiB |
| /dashboard/manager | 372 KiB | 1,256 KiB |
| /dashboard/chart-detail | 404 KiB | 1,380 KiB |
| /embed/chart | 405 KiB | 1,381 KiB |
| /dashboard/analyst/builder | 428 KiB | 1,441 KiB |

Other measured frontend costs:

- Global CSS: 267,036 raw bytes and 39,893 gzip bytes.
- Recharts shared chunk: about 104 KiB gzip.
- Framer Motion shared chunk: about 39 KiB gzip.
- Dashboard PWA UI/runtime: about 50 KiB gzip after hydration.
- The largest login hero source image is 4.1 MiB.

The dominant backend cost is report over-fetching. A direct live Supabase REST benchmark produced:

| Query shape | Payload | Observed time |
|---|---:|---:|
| 109 columns, 1,151 rows | 5.15 MiB | about 2.0 seconds |
| 18-column list projection | 0.75 MiB | about 296 milliseconds |
| 10-column analytics projection | 0.26 MiB | about 208 milliseconds |

Observed latency varies, but the 85 to 95 percent payload reduction is deterministic.

## Success Criteria

The initial optimization program targets:

- Login LCP below 2.5 seconds under a throttled mobile Lighthouse profile.
- Login initial JavaScript at or below 130 KiB gzip.
- Analyst initial JavaScript at or below 200 KiB gzip.
- Builder initial JavaScript at or below 280 KiB gzip.
- Report list responses below 1 MiB.
- Analytics responses below 300 KiB.
- No shared caching of authenticated or identity-dependent responses.
- No duplicate initial chart-detail query.
- No report pagination gaps or duplicates.
- Build, lint, security guardrails, focused integration tests, and role-matrix tests pass.
- Existing visible UI and report/export totals remain behaviorally equivalent.

Budgets are measured after each phase. A target may be refined only when a documented framework floor or required feature makes it impossible; it may not be silently removed.

## Non-Goals

- No complete application rewrite.
- No blanket conversion of every client component to a Server Component.
- No replacement of Recharts solely to reduce dependency count.
- No removal of PWA/offline report submission.
- No speculative index creation without query-plan evidence.
- No public cache of role-, station-, division-, or user-scoped data.
- No production database migration without explicit deployment approval.
- No Convex work; the repository has no Convex dependency or functions.

## Architecture Principles

1. Authenticate every protected request before using shared work.
2. Push projection, authorization scope, filters, sorting, and pagination to PostgreSQL.
3. Transfer compact view models rather than complete database rows.
4. Keep the root route tree server-first and place client boundaries around actual interaction.
5. Load large libraries only when their feature becomes visible or requested.
6. Cache only data whose authorization and invalidation behavior is explicit.
7. Use compile-time types to prevent projection drift and unsafe role handling.
8. Preserve a measurable rollback path for every phase.

## Phase 0: Security and Cache Correctness

Performance work begins by removing optimizations that can expose protected data.

### HTTP caching

- Remove global public cache headers for authenticated APIs from next.config.mjs.
- Use private, no-store for all responses varying by session, role, station, division, email, or user ID.
- Keep public caching only for audited, genuinely public, role-invariant resources.
- Do not use Vary: Cookie as the isolation mechanism.
- Where repeated computation is expensive, cache authorization-independent source data on the server and apply caller authorization after cache retrieval.

Affected route families include dashboards, filter options, admin statistics, WSN, SLA, Joumpa, AI summaries, dashboard queries, report analytics, and report synchronization.

### Service worker

- Remove protected APIs, authenticated HTML, and protected documents from shared service-worker runtime caches.
- Keep versioned static assets and safe public resources.
- Preserve the offline submission queue.
- If protected offline reads are later required, design user-scoped caches with explicit session handoff and purge-before-switch. This is outside the first implementation.
- Validate push-notification navigation as same-origin before navigating or opening a window.

### Supabase security telemetry

- Add a migration that revokes anonymous SELECT from security_events and removes the public-read policy.
- Replace browser-side select-star and public Realtime access with an admin-authorized Next.js endpoint.
- Return only fields needed by the security feed; avoid raw payload disclosure unless explicitly required.
- Keep the migration local and testable until production deployment is approved.

### Rate limiting and sessions

- Replace the generic delete-select-update rate-limiter flow with one atomic PostgreSQL RPC.
- Move expired-row cleanup out of the request path.
- Fail closed or in a deliberately degraded mode for expensive public writes when the rate-limit store fails.
- Separate immutable JWT verification from mutable revocation, role, and user-status checks.
- Use request-scoped memoization to deduplicate checks within one render/request.
- Do not rely on a 15-minute process-local authorization cache across server instances.

### Dependency security

- Upgrade Next.js from resolved 16.2.4 to a version containing the relevant proxy-bypass, SSRF, and denial-of-service fixes.
- Upgrade Nodemailer, UUID, PostCSS, ws, DOMPurify, and other affected transitive packages through targeted package updates.
- Do not use an unreviewed npm audit force fix or downgrade ExcelJS to satisfy an automated suggestion.
- Rebuild, run focused flows, and inspect bundle changes after dependency updates.

## Phase 1: Report Data Path

This phase has the highest expected latency and bandwidth return.

### Typed projections

Define explicit projection names:

    type ReportProjectionName =
      | "list"
      | "analytics"
      | "filterOptions"
      | "detail"
      | "export";

Each projection is a readonly field tuple checked against the canonical report row type. The projection map must use satisfies so misspelled or invalid fields fail at compile time without widening literal types.

The service return type is derived from the chosen tuple. Callers therefore cannot read a field that the database query did not request.

The service must never silently fall back to select-star when a projection is missing. Unknown public field requests receive a validation error. Internal programming mistakes fail tests and type checking.

### Query flow

The protected list/query flow becomes:

1. Read and verify the session once per request.
2. Resolve role, division, station, and user scope.
3. Reject unauthorized roles before querying report data.
4. Choose an endpoint-owned field projection.
5. Apply authorization predicates in PostgreSQL.
6. Apply validated date, status, branch, hub, airline, source, and search predicates.
7. Order by created_at descending and id descending.
8. Apply a bounded page size.
9. Normalize only the projected fields.
10. Return the compact response with private cache headers.

The cursor predicate is compound:

    created_at < cursor.createdAt
    OR (created_at = cursor.createdAt AND id < cursor.id)

This avoids gaps when records share a timestamp.

### Endpoint shapes

- List endpoints return the first page, total/next-cursor metadata where needed, and display/filter fields only.
- Detail endpoints return the full authorized record by ID only when a detail view opens.
- Analytics endpoints return aggregate series or the narrow grouping projection needed for a transitional server aggregation.
- Filter endpoints select distinct allowed dimensions, not complete rows.
- Export endpoints use an explicit export projection and run only after an export action.
- Embed endpoints receive their own narrow public projection and remain isolated from protected report shapes.

### Duplicate transfer removal

- Stop serializing the full report set through the analyst RSC payload.
- Bootstrap summary, chart series, and first list page in parallel.
- When valid SWR fallback data exists, prevent an immediate mount revalidation.
- Avoid independently loading the same report dataset for list and analytics.
- Do not activate the existing process-local report cache as a shortcut; it has inconsistent serverless invalidation.

### PostgreSQL work

The checked-in migration history targets reports_sync, while the live application reads ground_handling_irregularity_report. Before adding indexes:

1. Capture the canonical live table schema, existing indexes, constraints, and RLS policies.
2. Add the missing application-table definition or reconciliation migration to version control.
3. Capture EXPLAIN (ANALYZE, BUFFERS) for representative role, list, analytics, and detail queries in a safe environment.
4. Add only non-overlapping indexes supported by those plans.
5. Repeat plans and measure write overhead.

Candidate indexes for validation include:

- created_at descending plus id descending.
- user_id plus created_at descending, partial on non-null user_id.
- station_id plus created_at descending, partial on non-null station_id.
- target_division plus created_at descending, partial on non-null target_division.
- branch plus date_of_event descending, partial on non-null branch.
- status plus date_of_event descending.
- Security-event index variants matching event type, success payload, IP, and creation time filters.

Service-role queries bypass RLS. Client selection will not be changed for speed until policies are captured and tested.

## Phase 2: Frontend and Runtime Weight

### Root providers

- Remove the global client Providers wrapper from routes that do not need SWR or PWA state.
- Place dashboard PWA and SWR providers in the dashboard layout.
- Add a smaller SWR provider only to embed routes that use it.
- Keep telemetry deferred and route-scoped.
- Test auth, offline, embed, and dashboard route trees for provider coverage and hydration errors.

### Login

- Replace the ssr:false login loader with a normal import of the interactive client form so the form markup is server-rendered.
- Keep one meaningful desktop hero preload and remove logo priority contention.
- Ensure mobile does not preload a hidden desktop hero.
- Re-encode large login collage sources with visual QA at suitable AVIF/WebP quality.
- Preserve authentication errors, relative redirect validation, and keyboard behavior.

### Chart detail

- Remove the duplicated initial request that can ask for 100,000 records twice.
- Store both primary and reusable data from the first request when semantics match.
- Paginate detail rows.
- Fetch export-scale data only on explicit export.
- Defer supporting charts and tables until they approach the viewport.
- Preserve chart totals, filters, direct-link initialization, and export results.

### Builder and charts

- Dynamically load ChartPreview only after query results exist or a dashboard-composer mode requires it.
- Keep the roughly 104 KiB gzip Recharts chunk out of the empty builder state.
- Lazy-load save and export modals when opened.
- Keep stable placeholders and dimensions to prevent layout shift.

### Dashboard rendering

- Server-render safe dashboard shells.
- Fetch compact summaries, chart series, and first-page data in parallel.
- Use Suspense boundaries for independent regions.
- Remove hydration waterfalls caused by ssr:false loaders where browser-only APIs are not required.
- Do not send full report arrays through RSC.

### Navigation and PWA UI

- Remove the duplicate mobile and desktop sidebar navigation trees while preserving responsive behavior.
- Keep a tiny early beforeinstallprompt collector.
- Load install, offline, and update visual UI only when needed.
- Replace Framer Motion with CSS transitions for small PWA banners when visual parity is maintained.
- Keep the offline queue and service-worker upgrade path.

### CSS, fonts, and long content

- Remove the redundant Google Fonts import from the employee report page because the root already uses next/font.
- Split or remove globally emitted styles only when route ownership is clear.
- Apply pagination or content-visibility to long below-fold lists and tables.
- Retain accessible focus, reduced-motion, and responsive behavior.

## Phase 3: TypeScript Safety

The current strict diagnostic reports 62 errors, concentrated in assignability, argument typing, overload selection, and always-truthy checks.

Work proceeds in bounded slices:

1. Introduce projection and query types without changing behavior.
2. Replace unsafe any boundaries with unknown plus type guards.
3. Model request/result state with discriminated unions.
4. Make role and status switches exhaustive with never checks.
5. Resolve the remaining strict diagnostics by module family.
6. Enable strict and noImplicitAny in tsconfig after the tree is clean.

Advanced types must encode real invariants. They must not produce opaque type machinery that makes ordinary endpoint changes harder.

## Phase 4: Background Work

- Throttle or remove full Google Sheets synchronization after every successful login.
- Retain webhook and scheduled synchronization with a freshness fallback.
- Add content hashes or equivalent change detection so unchanged rows are not upserted.
- Move nonessential notification delivery into Next.js after handling only when required persistence has completed.
- Schedule expired session and rate-limit retention cleanup.
- Verify idempotence, failure recovery, and staleness behavior before enabling changes.

## Error Handling

- Authorization failure returns before data access and is never served from a shared cache.
- Database failure does not trigger a wider select-star fallback.
- Projection validation failure is explicit and observable.
- Aggregate failure may show a scoped dashboard error while independent regions continue through Suspense.
- Deferred component failure uses a stable local fallback and does not blank the page.
- Offline protected reads do not fall back to another account's cached response.
- Rate-limit storage failure follows the endpoint's documented deny/degraded policy.
- Background sync failure preserves the last known good dataset and records its age.
- Operational logs must avoid secrets, complete JWTs, raw credentials, and unnecessary security-event payloads.

## Verification Plan

### Correctness

- Snapshot parity for list, analytics, filter options, details, charts, and exports.
- Pagination fixture with identical timestamps; verify no gaps or duplicates.
- Role matrix for admin, analyst, manager, staff, division, station, and unauthenticated callers.
- Privileged request followed by basic and unauthenticated requests to the same URL.
- Account and division switching with service-worker caches inspected.
- Revoked, suspended, expired, and downgraded session tests.
- Concurrent rate-limit tests.
- Sync idempotence and freshness fallback tests.

### Frontend

- Production build and bundle-stat comparison.
- Lighthouse mobile and desktop for login and representative dashboard routes.
- Browser trace for duplicate requests, hydration waterfalls, and late chunks.
- Viewport tests at 390, 820, 1024, 1280, and 1440 pixels.
- PWA install, offline queue, update prompt, and service-worker upgrade tests.
- Accessibility checks for focus, labels, reduced motion, and keyboard navigation.

### Database

- Measure bytes, rows, and elapsed time for each projection.
- Capture query plans before and after each index.
- Verify index usage and write overhead.
- Confirm live schema, RLS, and migration parity.
- Verify service-role use remains server-only.

### Required commands

- npm run build
- npm run lint
- npm run security:guardrails
- TypeScript strict diagnostic
- Focused unit and integration tests added by each phase
- npm audit review without automatic force fixes

## Rollout and Rollback

Each phase lands separately:

1. Security/cache correction.
2. Typed projections and one endpoint family.
3. Remaining report families and pagination.
4. Frontend conditional loading and provider scoping.
5. TypeScript strictness and background work.
6. Database indexes after plan approval.

Feature-compatible old endpoint shapes may remain briefly behind internal adapters during migration. Each adapter is removed after parity tests.

Rollback uses small commits per phase. Database migrations include explicit down guidance where safe; destructive policy changes are restored only through reviewed migrations. Production database changes and deployment remain separate approvals.

## Risks

- A projection can omit a field required by normalization or export.
- Station scope currently mixes identifiers, codes, and names.
- Cached data can leak if any identity-dependent response remains public.
- Dashboard and restricted feedback paths share handler logic in places.
- Sync throttling can expose webhook reliability problems.
- Removing duplicate navigation can introduce responsive regressions.
- Provider movement can break SWR deduplication or PWA event capture.
- Session deduplication can become unsafe if immutable token parsing is confused with mutable authorization state.

Types, role-matrix tests, response parity tests, browser tests, and phased rollout mitigate these risks.

## Decision Record

The user approved this design on 15 July 2026.

The model-diverse council agreed on a targeted hybrid:

- Frontend review favored measured route-boundary and conditional-chunk fixes.
- Data review found the largest deterministic gain in database projection and filter pushdown.
- Security review required cache, RLS, service-worker, session, and rate-limit correction before aggressive caching.

The rejected alternatives were quick wins only, a blanket Server Component rewrite, removal of core PWA/chart functionality, and public caching of protected responses.
