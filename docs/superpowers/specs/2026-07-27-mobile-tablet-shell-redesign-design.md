# Mobile & Tablet Shell Redesign — Phase 1 (Shell + Shared Stat Components)

Date: 2026-07-27
Status: Approved by user, pending implementation plan

## Goal

The app has ~10 role/division sections (Admin, Analyst, Employee, Eskalasi, HC, HT, Manager Cabang, OCS, OS, OP), each with several pages. A full mobile/tablet redesign of all of them is too large for one plan. This is **Phase 1**: fix the shared shell (navigation, layout frame) and unify the stat-card pattern that every role's dashboard home page hand-rolls its own version of. Per-role deep content (charts, tables, forms) is out of scope here and gets its own follow-up spec once this foundation lands.

This scope was chosen deliberately over "one role at a time" or "audit everything first" because the shell and stat cards are shared infrastructure — fixing them once benefits all ~10 roles simultaneously, whereas a full page-by-page audit was diminishing-returns for a first pass.

## Audit method and findings

Findings come from live inspection with Claude-in-Chrome against the local dev server (`localhost:3000`), logged in as `SUPER_ADMIN` (`admin@gapura.demo`) and `MANAGER_CABANG` (`manager.cgk@gapura.id`), at phone width (~430px) and tablet width (confirmed by the user at ~1024px on their actual screen, not just automation measurements — the automation's own viewport-resize tooling proved unreliable mid-session, so the tablet finding was cross-checked against what the user visually saw).

### 1. Tablet layout gap (highest priority)

`components/layout/DashboardFrame.tsx` only reserves sidebar space at `xl:` (1280px, `SIDEBAR_QUERY = '(min-width: 1280px)'`). The code's own comment states the intent: *"portrait tablets (incl. iPad Pro 12.9\" @ 1024px) get full width + bottom nav."* In practice, at tablet widths the content column stays capped to a narrow phone-width column with a large unused blank area — confirmed visually by the user on the Manager Cabang dashboard at ~1024px. The shell's own `main` element has no width cap (`style={{ maxWidth: '100%', ... }}`), so the cap is happening deeper — either in a per-page container, a stale cached stylesheet (the component's comments call out aggressive dev-mode caching from a stable-URL stylesheet + Serwist service worker), or a stale service-worker-cached response. Root cause confirmation is implementation work, not spec work — but the fix must make the *intended* behavior (full-width content + bottom nav from phone size up through 1279px, sidebar only at 1280px+) actually hold, and must be verified at a real tablet width on an actual device/window, not just computed via automation.

### 2. Data bug: blank severity value on Admin dashboard

`app/dashboard/(main)/admin/page.tsx` (~line 160): the severity breakdown list is built from `severity.HIGH`, `severity.MEDIUM`, `severity.LOW`, where `severity` defaults to `{ HIGH: 0, MEDIUM: 0, LOW: 0, 'TOP RISK': 0 }` only when `stats?.severity` itself is entirely absent. When `stats.severity` exists but the backend omits a key with zero occurrences for the period (e.g. no HIGH-severity reports), `severity.HIGH` is `undefined`, and `{item.value}` renders nothing — not even "0" — while Medium/Low render their real counts. Confirmed via two separate page loads. Fix: default each field defensively (`severity.HIGH ?? 0`, etc.) rather than relying on the object-level fallback.

### 3. Design-language inconsistency across roles

Admin's dashboard home hand-rolls its own card/severity-list markup directly in the page file. Manager Cabang's dashboard home hand-rolls a different `KPICard` function directly in its page file. Analyst already has a shared, well-built, properly responsive component: `components/dashboard/analyst/StatsCard.tsx` (uses `sm:`/`md:`/`lg:` breakpoints correctly, hover/active states, `line-clamp` on labels, `toLocaleString()` on numbers). The three look and behave differently for what is structurally the same UI element. This is the component to promote and standardize on, not something to build from scratch.

### 4. Bottom navigation and PWA install banner (needs a closer look, not blocking)

A "Install App" PWA prompt renders `fixed bottom-4 right-4 z-50`, overlapping the same bottom-right region as the bottom tab bar (`fixed bottom-0 left-0 right-0 z-[100]`). The tab bar's z-index is higher, so it should win, but the bottom nav also appeared to hide on scroll-down in a way that left the install banner as the only fixed element briefly visible. Not fully root-caused this pass — flagged for verification during implementation, not a launch blocker for this phase.

### 5. What already works and must not regress

- The bottom tab bar itself (icons + labels, primary "Create" action raised/circular) — already has its own recent spec (`2026-07-16-mobile-bottom-nav-equal-spacing-design.md`) for equal-spacing; don't reintroduce that bug.
- Admin's "more options" bottom-sheet menu (2–3 column icon grid: Dashboard / Import Data / Create Report / User Management / Security / External Links / Notifications / Logout) is a clean, reusable pattern.
- The login page (`/auth/login`) mobile layout (stacked hero + form) is clean — no changes needed.

## Scope — files in play

1. `components/layout/DashboardFrame.tsx` — fix the tablet-width content-cap bug; keep the `xl:` (1280px) sidebar cutover as-is (that part of the design intent is correct, only the content width below it is broken).
2. `components/dashboard/analyst/StatsCard.tsx` — promote to a shared location (e.g. `components/dashboard/StatsCard.tsx`), generalize the currently-hardcoded emerald/green color scheme into a `color`/`accent` prop so Admin's per-severity colors (red/amber/green) can use the same component.
3. `app/dashboard/(main)/admin/page.tsx` — replace the hand-rolled "Ringkasan" stat row and severity breakdown list with the shared `StatsCard`; fix the blank-value bug as part of this migration.
4. `app/dashboard/(main)/manager/page.tsx` — replace the local `KPICard` function with the shared `StatsCard`.
5. Any import path updates needed where `components/dashboard/analyst/StatsCard.tsx` is currently imported from (grep before moving, keep a re-export shim only if there are many call sites — otherwise update imports directly).

Out of scope for this phase: per-role content pages (charts, tables, calendar, documents, builder), the other ~8 roles' dashboard homes (Analyst, Employee, Eskalasi, HC, HT, OCS, OS, OP — Analyst already uses the shared component; the rest get migrated in follow-up specs once this phase proves out), the PWA install-banner investigation (item 4 above — separate follow-up if it turns out to be real).

## Design direction

- **Visual language:** standardize on the Analyst `StatsCard` look (rounded surface-2 card, soft gradient border, icon chip, mono-weight numeric value, uppercase tracked label) as the one shared stat-card style across roles, rather than inventing a new one. Per-role/per-severity accent color becomes a prop instead of hardcoded emerald.
- **Breakpoints:** phone (default) → tablet (`sm:`/`md:` — content uses full available width, multi-column stat grids where more than 2–3 stats exist) → desktop sidebar (`xl:` 1280px+, unchanged). No new breakpoint tier is introduced; the existing `sm`/`md`/`xl` scale already used by `StatsCard` is reused, since the bug is that tablet was falling through to phone-width behavior, not that a tablet tier is missing from the Tailwind config.
- **Motion/interaction:** keep `StatsCard`'s existing hover/active treatment (already subtle, 400ms). No new animation work needed.

## Verification

- At phone width (~390–430px): Admin and Manager dashboards render correctly, stat cards single-column, bottom nav unobstructed.
- At tablet width (~768–1024px), verified both by automation viewport measurement *and* the user visually confirming on their actual Chrome window: content uses the available width (multi-column stat grid, no large blank area), bottom nav still present (sidebar must not appear before 1280px).
- At desktop width (≥1280px): sidebar appears, existing desktop layout unchanged.
- Admin dashboard: all three severity rows (High/Medium/Low) show a numeric value, including when the value is zero.
- No visual regression to the bottom tab bar's equal-spacing behavior or the admin quick-menu bottom sheet.
