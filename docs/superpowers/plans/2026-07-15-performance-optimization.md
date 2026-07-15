# Gapura OneClick Performance Optimization Implementation Plan

Date: 15 July 2026
Design: docs/superpowers/specs/2026-07-15-performance-optimization-design.md
Security report: security_best_practices_report.md

## Execution Rules

- Preserve visible UI, role behavior, PWA submission, report totals, and exports.
- Land work in dependency order: security boundary, data boundary, frontend boundary, types, verification.
- Do not deploy Supabase migrations or production changes without separate approval.
- Never replace a failed narrow query with select-star.
- Do not stage audit-generated .claude-flow or .next-analyze files.
- Measure before and after each material phase.

## Task 1: Protected cache boundary

Files:

- next.config.mjs
- app/api/dashboards and protected dashboard route families
- app/api/admin/stats/route.ts
- app/api/wsn/route.ts
- app/api/sla/full-service/route.ts
- app/api/joumpa/route.ts
- protected app/api/ai route families
- app/api/auth/me/route.ts
- app/api/reports/sync/route.ts

Actions:

1. Remove global protected API cache headers from Next configuration.
2. Replace public and private-stale protected responses with private, no-store.
3. Retain public caching only for verified public embed and master-data projections.
4. Add a static guardrail that detects public caching in protected route files.
5. Run privileged-to-basic cache isolation checks.

## Task 2: Service-worker isolation

Files:

- lib/pwa/constants.ts
- app/sw.ts
- PWA/auth switch flows if purge behavior requires coordination

Actions:

1. Remove protected APIs, protected navigation pages, and storage documents from runtime caching.
2. Keep static assets, Next image optimization output, offline shell, and offline write queue.
3. Bump the cache version and purge old dynamic caches during upgrade.
4. Restrict notification navigation to same-origin URLs.
5. Test logout, account switch, division switch, offline queue, and service-worker update.

## Task 3: Security telemetry and rate limiting

Files:

- new Supabase migrations
- components/security/LiveSecurityFeed.tsx
- new or existing protected security API route
- lib/security/rate-limit.ts
- public routes using checkDbRateLimit

Actions:

1. Add a migration revoking anonymous security_events access.
2. Replace browser select-star/Realtime with a minimal admin-authorized API projection.
3. Add one atomic generic rate-limit RPC migration.
4. Make checkDbRateLimit use the RPC and check every error.
5. Move expired-row deletion out of request execution.
6. Add concurrency and role tests where the repository test harness permits.

## Task 4: Session request deduplication

Files:

- lib/auth-utils.ts
- dashboard layouts/pages that repeat session parsing

Actions:

1. Separate request-scoped deduplication from cross-request mutable authorization caching.
2. Share one verified session result within each server request.
3. Shorten or remove process-local authorization caching.
4. Preserve database revocation, status, role, and station checks.
5. Test revoked, expired, suspended, downgraded, and logged-out sessions.

## Task 5: Typed report projections

Files:

- lib/services/reports-service.ts
- endpoint consumers under app/api
- report types

Actions:

1. Define readonly endpoint-owned list, analytics, filter, detail, and export projections.
2. Derive projection result types with generics, mapped types, and satisfies.
3. Push the selected column list into the Supabase select call.
4. Push safe authorization and request filters into the query.
5. Keep normalization projection-aware.
6. Migrate high-volume call sites first: admin reports, analytics, report analytics, embed reports/stats, filter options.
7. Verify list under 1 MiB and analytics under 300 KiB.

## Task 6: Pagination and duplicate transfer

Files:

- app/api/reports/route.ts
- analyst dashboard server/client files
- chart detail files

Actions:

1. Use created_at plus id in the cursor predicate and encoding.
2. Add duplicate-timestamp fixtures.
3. Stop full-report RSC serialization and immediate SWR refetch.
4. Bootstrap summary, series, and first page in parallel.
5. Remove duplicate chart-detail request.
6. Remove initial 100,000-row detail fetch; reserve export-scale retrieval for export.
7. Defer supporting analytics until near viewport.

## Task 7: Frontend initial weight

Files:

- app/layout.tsx
- components/Providers.tsx
- dashboard/embed layouts
- components/auth/LoginFormLoader.tsx
- app/auth/login/page.tsx
- public login image assets
- components/builder/BuilderLayout.tsx
- components/builder/TileCard.tsx
- PWA prompt/indicator components
- sidebar/mobile navigation
- employee report page font styles

Actions:

1. Scope SWR/PWA providers to route groups that need them.
2. Server-render login form markup.
3. Remove competing logo priority and hidden-mobile hero preload.
4. Re-encode large login images with visual verification.
5. Dynamically load ChartPreview after builder results exist.
6. Lazy-load modal/export/PWA visual code.
7. Replace small Framer Motion banners with CSS transitions where behavior matches.
8. Remove redundant font import.
9. Reduce duplicate navigation DOM only after responsive browser tests.

## Task 8: Dependencies and TypeScript

Files:

- package.json
- package-lock.json
- tsconfig.json
- modules reported by strict diagnostics

Actions:

1. Verify patched package releases from primary sources.
2. Upgrade Next.js, matching Next ESLint config, Nodemailer, UUID, PostCSS, and affected transitive dependencies without force fixes.
3. Run audit and regression tests after each dependency group.
4. Resolve strict diagnostics by module family.
5. Replace unsafe any at external boundaries with unknown and type guards.
6. Enable strict and noImplicitAny only after the project passes.

## Task 9: Background and database-gated work

Files:

- app/api/auth/login/route.ts
- lib/services/sync-service.ts
- new reviewed migrations

Actions:

1. Stop unconditional full Sheets sync after every login.
2. Gate sync by last-success time while retaining webhook/cron fallback.
3. Add change detection for unchanged rows.
4. Capture live table schema, policies, and query plans.
5. Prepare non-overlapping index migrations from measured plans.
6. Do not apply production migrations in this task without approval.

## Task 10: Final verification

Commands and checks:

1. npm run security:guardrails
2. npm run lint
3. strict TypeScript diagnostic
4. npm run build
5. npm audit --omit=dev
6. route bundle gzip comparison
7. Lighthouse login and representative dashboard routes
8. browser network check for duplicate requests
9. role/cache/account-switch matrix
10. Supabase projection payload benchmark

Record achieved values against the approved budgets. Document any remaining deployment-gated database work and do not label an unmeasured target complete.
