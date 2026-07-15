# Security Best-Practices Report

Date: 15 July 2026
Scope: Gapura OneClick JavaScript/TypeScript, Next.js, React, PWA, and Supabase implementation
Status: Findings documented; remediation pending user review

## Executive Summary

The application has meaningful security controls, including session verification, role checks, security headers, server-only Supabase service-role usage, input validation in several high-risk paths, and a passing custom security guardrail script.

However, the audit found one critical cache-isolation defect and four high-severity design defects. Several authenticated or role-filtered responses are marked publicly cacheable, security telemetry is exposed to the anonymous Supabase role by migration, and the service worker explicitly stores protected responses in caches shared by browser accounts.

These defects must be fixed before adding broader caching. The performance design deliberately places security/cache correction first.

## Method

- Read-only source inspection using the JavaScript/TypeScript React and Next.js security guidance.
- Review of authentication, authorization, API cache headers, service-worker caching, RLS migrations, client Supabase access, rate limiting, session revocation, CSP, and dependency audit output.
- Cross-check by independent frontend, data/backend, and security council reviewers.
- npm run security:guardrails passed.
- npm audit --omit=dev reported nine production dependency advisories: four high and five moderate at audit time.

No exploit was executed against production. Live database schema visibility was limited; migration deployment state is noted where relevant.

## Finding SEC-01: Public caching of protected responses

Severity: Critical
Confidence: High

### Evidence

- app/api/joumpa/route.ts:290-348 returns data filtered by caller role/email, but elevated results are marked public.
- app/api/admin/stats/route.ts:8-17 and 112-168 enforces privileged roles, returns recent report/user information, then marks it public.
- app/api/dashboards/route.ts:54-94 and 196-212 varies output by caller role while using public caching.
- app/api/dashboards/filter-options/route.ts:68-72 uses public cache headers after session verification.
- app/api/wsn/route.ts:104-114 uses public cache headers after session verification.
- app/api/sla/full-service/route.ts:177-186 uses public cache headers after session verification.
- app/api/ai/branch/summary/route.ts:11-45, app/api/ai/dashboard/summary/route.ts:9-58, and app/api/ai/summarize/route.ts:9-58 use public caching for data protected by role logic in lib/ai-route-helpers.ts:16-30.
- next.config.mjs:107-146 adds public cache headers to multiple protected API families.

### Impact

A shared cache key generally does not include the application's role, station, division, or owner scope. A cached privileged response can potentially be returned to another authenticated caller without executing route-level authorization again. Exact exploitation depends on the hosting cache layer, but the code violates safe cache isolation.

### Required remediation

- Return private, no-store for all identity-dependent responses.
- Remove protected API cache policies from next.config.mjs.
- Audit every route setting s-maxage or public.
- Cache only authorization-independent data on the server, authenticate every request, then apply caller filtering.
- Do not use Vary: Cookie as the main fix.

### Verification

Warm each URL as an elevated user, repeat as a basic user and unauthenticated caller, and inspect payload plus Age and platform cache headers. Add this sequence as an automated integration test.

## Finding SEC-02: Anonymous access to security telemetry

Severity: High
Confidence: High if the migration is deployed

### Evidence

- supabase/migrations/20260710112316_enable_rls_unprotected_tables.sql:26-33 grants anonymous SELECT and creates an unrestricted security_events read policy.
- components/security/LiveSecurityFeed.tsx:15-29 selects all columns and subscribes using the browser Supabase client.
- supabase/schema/exported_schema.sql:210-219 includes payload, IP address, actor ID, source, and severity.
- components/security/LiveSecurityFeed.tsx:109-115 renders IP and raw payload information.

### Impact

Anyone with the public Supabase project URL and anonymous key may be able to read security events outside the protected Next.js admin route. This can disclose actor, network, and authentication telemetry.

### Required remediation

- Revoke anonymous SELECT and remove the unrestricted policy through a reviewed migration.
- Serve a minimal security-feed projection through an admin-authorized Next.js route.
- Use protected polling or a deliberately authenticated Realtime design.
- Avoid returning raw payload fields by default.

### Verification

Use the anonymous client to assert that direct SELECT and subscriptions fail. Verify admin feed access and confirm non-admin denial.

## Finding SEC-03: Protected service-worker caches shared across accounts

Severity: High
Confidence: High

### Evidence

- lib/pwa/constants.ts:26-35 includes dashboard filter options, WSN, Joumpa, and Supabase storage documents in runtime cache categories.
- app/sw.ts:72-83 caches selected APIs for up to 24 hours in gapura-readonly-apis.
- app/sw.ts:108-127 caches documents for up to 14 days.
- Cache names contain no session or user scope.
- lib/pwa/client-state.ts:12-29 scopes browser state but not Cache API names.
- app/api/joumpa/route.ts:302-347 returns different data based on role and owner email.
- app/api/auth/switch-division/route.ts:202-229 switches authorization context without first purging these shared caches.

### Impact

On slow or offline requests, data cached under a previous account or division can be returned to the current account. HTTP private or no-store headers do not prevent an explicit service-worker Cache API write.

### Required remediation

- Remove authenticated APIs, protected HTML, and protected documents from runtime caching.
- Keep static public assets and the offline write queue.
- Purge existing dynamic caches during the service-worker upgrade.
- If protected offline reads become mandatory, implement reviewed user-scoped caches and purge-before-switch.

### Verification

Cache data under a privileged account, log out or switch account/division, go offline, and prove the previous response cannot be retrieved.

## Finding SEC-04: Process-local authorization cache delays revocation

Severity: High
Confidence: High for multi-instance deployment

### Evidence

- lib/auth-utils.ts:17-18, 20-27, and 36-52 defines a process-local Map with a 15-minute TTL.
- lib/auth-utils.ts:91-103 allows cache hits to skip database revocation/status checks.
- lib/auth-utils.ts:159-175 checks mutable user state only on a miss.
- app/api/auth/logout/route.ts:55-67 evicts only the current process before revoking the shared database session.

### Impact

Another server instance can continue accepting a revoked, suspended, or downgraded session until its local cache expires.

### Required remediation

- Separate JWT signature/payload parsing from mutable session authorization.
- Deduplicate within one request using request-scoped React cache.
- Use a short shared revocation/status cache or query shared state for sensitive actions.
- Add explicit shared invalidation/versioning if longer caching is later required.

### Verification

Test revocation, suspension, role downgrade, logout, and station-lock changes across at least two application instances.

## Finding SEC-05: Rate limiter is non-atomic, expensive, and can fail open

Severity: High
Confidence: High

### Evidence

- lib/security/rate-limit.ts:51-59 deletes expired rows during requests and treats select/no-row paths as insert-success without reliably checking the insert result.
- lib/security/rate-limit.ts:62-77 uses a read-modify-write increment.
- app/api/reports/public/route.ts:13-16 and app/api/joumpa/public/route.ts:23-26 rely on the limiter for expensive public flows.
- supabase/migrations/20260530085128_fix_virtual_assistant_rate_limit_rpc.sql:31-45 already demonstrates an atomic RPC pattern.

### Impact

Concurrent requests can lose increments and exceed limits. Each request performs unnecessary database work, while database errors can let expensive operations proceed.

### Required remediation

- Implement one atomic INSERT ON CONFLICT RPC for generic limits.
- Remove table cleanup from the request path and schedule it.
- Check all RPC errors.
- Define a fail-closed or explicitly degraded policy for expensive public writes.
- Add body size and field length bounds.

### Verification

Run concurrent requests above the configured threshold and prove exactly the allowed number succeeds. Simulate database failure and verify the documented policy.

## Finding SEC-06: Production dependency advisories

Severity: High
Confidence: High at audit time

### Evidence

- package.json:55 permits the currently resolved Next.js 16.2.4.
- package.json:56 uses Nodemailer 8.0.3.
- package.json:69 permits UUID 13.0.0.
- npm audit reported four high and five moderate production advisories.
- Relevant audit entries included Next.js proxy-bypass, SSRF/WebSocket-upgrade, and denial-of-service advisories; Nodemailer address parsing concerns; and affected transitive DOMPurify, PostCSS, ws, and UUID versions.

### Required remediation

- Select patched current versions and review release notes.
- Update narrowly; do not run an unreviewed force fix.
- Avoid the audit-suggested ExcelJS downgrade unless independently justified.
- Re-run build, tests, security guardrails, bundle analysis, and audit.

### Verification

The targeted advisories are absent, lockfile versions are patched, and all relevant runtime flows pass.

## Finding SEC-07: CSP permits broad script and network sources

Severity: Medium
Confidence: High

### Evidence

- next.config.mjs:85-96 allows unsafe-inline scripts, unsafe-inline styles, img-src https:, and connect-src https:.

### Impact

Broad sources and inline script permission reduce defense against injection. A global per-request nonce, however, can force dynamic rendering and create a performance regression.

### Required remediation

- Introduce a report-only CSP first.
- Inventory and narrow required third-party origins.
- Prefer hashes, SRI, and scoped nonce handling where appropriate.
- Do not force every route dynamic solely to add a nonce without measurement.

### Verification

Collect report-only violations, remove unnecessary origins, then enforce after login, dashboard, PWA, embed, analytics, and development tooling are tested.

## Existing Positive Controls

- Global nosniff, frame denial, referrer, permissions, HSTS, and CSP headers exist.
- Service-role Supabase construction is server-only and module-scoped.
- Relative login redirection is validated.
- Security guardrail checks currently pass.
- React Compiler, package import optimization, next/font, AVIF/WebP, and deferred telemetry are already enabled.
- User-provided table values pass through escaping utilities in the reviewed reporting path.

These controls should be preserved while the findings are remediated.

## Remediation Order

1. SEC-01 public protected caching.
2. SEC-03 service-worker account isolation.
3. SEC-02 anonymous security telemetry.
4. SEC-05 atomic rate limiting.
5. SEC-04 session revocation correctness.
6. SEC-06 dependency updates.
7. SEC-07 staged CSP hardening.

The first three should be treated as one cache/data-boundary release.

## Limitations

- Production CDN cache ordering and exact exploitability were not tested.
- The migration granting anonymous security-event access may or may not be deployed; it must be checked before production remediation.
- The live report table is absent from checked-in migrations, so its complete index and RLS state could not be confirmed through repository evidence.
- This report is a focused application best-practices review, not a penetration test or infrastructure/cloud-configuration audit.

## Review Gate

This report intentionally documents findings before source remediation. Implementation begins only after the user reviews this report and the approved performance design.
