# Mobile & Tablet Shell Redesign — Phase 1 (Shell + Shared Stat Components)

Date: 2026-07-27
Status: Approved by user, pending implementation plan

## Goal

The app has ~10 role/division sections (Admin, Analyst, Employee, Eskalasi, HC, HT, Manager Cabang, OCS, OS, OP), each with several pages. A full mobile/tablet redesign of all of them is too large for one plan. This is **Phase 1**: fix the shared shell (navigation, layout frame) and unify the stat-card pattern that every role's dashboard home page hand-rolls its own version of. Per-role deep content (charts, tables, forms) is out of scope here and gets its own follow-up spec once this foundation lands.

This scope was chosen deliberately over "one role at a time" or "audit everything first" because the shell and stat cards are shared infrastructure — fixing them once benefits all ~10 roles simultaneously, whereas a full page-by-page audit was diminishing-returns for a first pass.

## Audit method and findings

Findings come from live inspection with Claude-in-Chrome against the local dev server (`localhost:3000`), logged in as `SUPER_ADMIN` (`admin@gapura.demo`) and `MANAGER_CABANG` (`manager.cgk@gapura.id`), at phone width (~430px) and tablet width (confirmed by the user at ~1024px on their actual screen, not just automation measurements — the automation's own viewport-resize tooling proved unreliable mid-session, so the tablet finding was cross-checked against what the user visually saw).

### 1. Tablet layout gap — INVESTIGATED AND RETRACTED, not a real bug

Initially flagged as the highest-priority finding: at tablet width the content column appeared capped to a narrow phone-width column with a large blank area, and the user confirmed seeing this on their screen. Before implementing a fix, this was isolated further: `document.documentElement`/`body` measured 512px wide via JS while `window.innerWidth` reported 1024px in the automated tab — a split that only occurs under a CDP device-metrics override, not in normal browsing (and this session's `resize_window` tool had already proven unreliable, see method note above). A clean test in an Incognito window (extensions disabled by default, so no automation involved) at the same tablet width showed the page filling the window correctly, with no blank area. **Conclusion: this was an artifact of the automation tooling's own stuck viewport override, not an app bug.** `components/layout/DashboardFrame.tsx`'s tablet handling (sidebar only at `xl:` 1280px, full-width content + bottom nav below that) is left untouched — no fix needed, no task for it in the implementation plan. This is kept in the spec, rather than deleted, as a record of a false lead that was caught before wasting an implementation task on it.

### 2. Data bug: blank severity value on Admin dashboard

`app/dashboard/(main)/admin/page.tsx` (~line 160): the severity breakdown list is built from `severity.HIGH`, `severity.MEDIUM`, `severity.LOW`, where `severity` defaults to `{ HIGH: 0, MEDIUM: 0, LOW: 0, 'TOP RISK': 0 }` only when `stats?.severity` itself is entirely absent. When `stats.severity` exists but the backend omits a key with zero occurrences for the period (e.g. no HIGH-severity reports), `severity.HIGH` is `undefined`, and `{item.value}` renders nothing — not even "0" — while Medium/Low render their real counts. Confirmed via two separate page loads. Fix: default each field defensively (`severity.HIGH ?? 0`, etc.) rather than relying on the object-level fallback.

### 3. Design-language inconsistency across roles

There are three separate hand-rolled implementations of the same "labeled stat with an icon" card:

- `components/dashboard/analyst/StatsCard.tsx` — plain-surface card (`bg-surface-2`), gradient border, used on a normal page background. Correctly responsive (`sm:`/`md:`/`lg:`), hover/active states, `line-clamp` on labels, `toLocaleString()` on numbers. **The best-built of the three — promote this one.**
- The local `KPICard` function inside `app/dashboard/(main)/manager/page.tsx` — white card with a colored blur accent, `subtitle` support, per-instance hex `color`.
- The local `StatCard` function inside `components/dashboard/DashboardHeader.tsx` — frosted-glass card (`bg-white/95 backdrop-blur-xl`) designed to sit on top of `DashboardHeader`'s gradient hero background, with `variant`-based (default/warning/success) coloring.

The Analyst and Manager versions are both "plain card on a plain page background" — the same design context, worth unifying now. `DashboardHeader`'s `StatCard` is a deliberately different context (frosted glass over a colored gradient, not a plain surface) — unifying it would either break that frosted-hero look or force the shared component to grow a `variant="frosted"` mode it doesn't need yet. **Left alone in this phase**, noted here so it isn't mistaken for an oversight.

### 4. Bottom navigation and PWA install banner (needs a closer look, not blocking)

A "Install App" PWA prompt renders `fixed bottom-4 right-4 z-50`, overlapping the same bottom-right region as the bottom tab bar (`fixed bottom-0 left-0 right-0 z-[100]`). The tab bar's z-index is higher, so it should win, but the bottom nav also appeared to hide on scroll-down in a way that left the install banner as the only fixed element briefly visible. Not fully root-caused this pass — flagged for verification during implementation, not a launch blocker for this phase.

### 5. What already works and must not regress

- The bottom tab bar itself (icons + labels, primary "Create" action raised/circular) — already has its own recent spec (`2026-07-16-mobile-bottom-nav-equal-spacing-design.md`) for equal-spacing; don't reintroduce that bug.
- Admin's "more options" bottom-sheet menu (2–3 column icon grid: Dashboard / Import Data / Create Report / User Management / Security / External Links / Notifications / Logout) is a clean, reusable pattern.
- The login page (`/auth/login`) mobile layout (stacked hero + form) is clean — no changes needed.

## Scope — files in play

1. `components/dashboard/analyst/StatsCard.tsx` — promote to a shared location (`components/dashboard/StatsCard.tsx`), generalize the currently-hardcoded emerald color scheme into a `color` prop (accepts any valid CSS color, e.g. an `oklch(...)` string) with the current emerald as the default so Analyst's existing usage needs no prop changes. Add an optional `subtitle` prop (Manager's `KPICard` uses one; Analyst's doesn't).
2. `components/dashboard/analyst/ResponsiveStatsGrid.tsx` — update its import of `StatsCard` to the new shared path (only current importer, confirmed via repo-wide grep for `import.*StatsCard`).
3. `app/dashboard/(main)/admin/page.tsx` — replace the hand-rolled severity breakdown list (~lines 155–186) with the shared `StatsCard`, one per severity (High/Medium/Low), fixing the blank-value bug (`severity.HIGH ?? 0` etc.) as part of the migration. The `DashboardHeader`/"Ringkasan" hero row is NOT touched (see Finding 3 — different design context, out of scope).
4. `app/dashboard/(main)/manager/page.tsx` — replace the local `KPICard` function and its 3 call sites (Total Reports / Open / Closed) with the shared `StatsCard`; delete the now-unused `KPICard` function and `KPI_COLORS` constant if nothing else references them (confirm via grep before deleting).

`components/layout/DashboardFrame.tsx` and `components/dashboard/DashboardHeader.tsx` are explicitly NOT in scope — see Finding 1 (no real bug) and Finding 3 (different design context) above.

Out of scope for this phase: per-role content pages (charts, tables, calendar, documents, builder), the other ~8 roles' dashboard homes (Analyst, Employee, Eskalasi, HC, HT, OCS, OS, OP — Analyst already uses the shared component; the rest get migrated in follow-up specs once this phase proves out), the PWA install-banner investigation (item 4 above — separate follow-up if it turns out to be real).

## Design direction

- **Visual language:** standardize on the Analyst `StatsCard` look (rounded surface-2 card, soft gradient border, icon chip, mono-weight numeric value, uppercase tracked label) as the one shared stat-card style across roles, rather than inventing a new one. Per-role/per-severity accent color becomes a prop instead of hardcoded emerald.
- **Breakpoints:** reuse `StatsCard`'s existing `sm:`/`md:`/`lg:` scale as-is. No new breakpoint tier is introduced — `DashboardFrame`'s phone → tablet → `xl:` desktop-sidebar behavior was already correct (Finding 1), so this phase only needs the stat-card grids themselves to lay out sensibly at each existing breakpoint (e.g. Manager's `grid-cols-2 md:grid-cols-3` pattern, kept as the wrapping grid around the new shared cards).
- **Motion/interaction:** keep `StatsCard`'s existing hover/active treatment (already subtle, 400ms). No new animation work needed.

## Verification

- At phone width (~390–430px): Admin and Manager dashboards render correctly, stat cards single-column, bottom nav unobstructed.
- At tablet width (~768–1024px): content uses the available width (multi-column stat grid where the component supports it), matching the already-correct `DashboardFrame` behavior (no changes needed there per Finding 1).
- At desktop width (≥1280px): sidebar appears, existing desktop layout unchanged.
- Admin dashboard: all three severity rows (High/Medium/Low) show a numeric value, including when the value is zero.
- No visual regression to the bottom tab bar's equal-spacing behavior or the admin quick-menu bottom sheet.
