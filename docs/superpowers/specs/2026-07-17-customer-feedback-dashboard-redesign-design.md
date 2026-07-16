# Customer Feedback Dashboard — Visual Redesign

Date: 2026-07-17
Status: Approved by user, pending implementation plan

## Goal

Full visual/structural redesign of the Customer Feedback Dashboard (`/embed/custom/[slug]` when slug/name includes "customer feedback"). Current UI is a mix of design maturities — the shell and charts use a plain flat cream/teal/olive-green style, while `InvestigativeTable` has already drifted onto its own `--sr-*` token system with framer-motion. Goal: one consistent, more polished visual system across all of it. **Visual/structural only — no data, query, filter, or feature logic changes.**

## Scope — files in play

1. `app/embed/custom/[slug]/CustomDashboardContent.tsx` — shell: sidebar, header, filter row, footer, export/date-picker menus.
2. `components/dashboard/customer-feedback/CustomerFeedbackView.tsx` — bento grid layout, card chrome (title bar, Detail/Share buttons), KPI tile row.
3. `components/dashboard/customer-feedback/FeedbackDonutChart.tsx`
4. `components/dashboard/customer-feedback/FeedbackBarChart.tsx`
5. `components/dashboard/customer-feedback/FeedbackPivotTable.tsx` — heatmap pivot table.
6. `components/chart-detail/InvestigativeTable.tsx` — searchable/sortable/paginated detail table with expandable rows.
7. `components/builder/DynamicFilterHeader.tsx` — filter dropdown row (used by the shell).

Out of scope: `app/globals.css` base tokens can gain new variables but existing unrelated consumers of `--brand-primary`/`--surface-*` elsewhere in the app must not visually break — new tokens should be additive (e.g. `--cf-*` namespace) or carefully scoped to this dashboard's tree, not a global retheme.

## Design direction (from brainstorm)

- **Style:** Bento Editorial — asymmetric bento grid, bold black uppercase headlines, warm cream canvas, teal brand accents. (Chosen over Modern SaaS Clean, Command Center Dark, Enterprise Data-Dense.)
- **Layout:** Keep today's persistent-left-sidebar + paginated-sections pattern (Report Category / Detail Category / Status Analytics / CGO – Report Category / CGO – Detail Report). Sidebar must be **light/cream, not dark** — this was an explicit correction during brainstorming.
- **Color system:** Teal + Warm Sunset — teal `#0f766e` primary/brand, amber `#f59e0b` (irregularity), coral `#ef4444` (complaint), lime `#84cc16` (compliment), slate `#78716c` (occurrence/neutral/default). (Chosen over a muted earth-tone palette and a traffic-light red/orange/green/blue palette.)
- **Motion:** Subtle/functional only — 150–200ms fades and hover states. No staggered entrance reveals, no animated chart draw-ins, no scale-bounce. `InvestigativeTable`'s existing framer-motion (row expand/collapse, fade-in) is the ceiling, not the floor — extend that level, don't exceed it.
- **Responsiveness:** True mobile parity — mobile is not an afterthought fallback, it gets equal design attention.

## Visual tokens

- Surfaces: cream `#faf6ec` (page/sidebar bg), white `#ffffff` (cards), ink `#1c1917` (headings/high-contrast text).
- Brand/accent: teal `#0f766e`, amber `#f59e0b`, coral `#ef4444`, lime `#84cc16`, slate `#78716c`.
- Typography: bold black uppercase tracked headings (keep current convention), medium-weight body, `tabular-nums` on every numeric value.
- Radius: bento asymmetric — hero/large tiles `rounded-2xl`, standard tiles `rounded-xl`.
- Shadow: single soft layer on hover lift only; no glass-morphism/blur panels (drop the existing `glass-morphism` class usage in the shell — doesn't fit bento-editorial).
- New CSS variables added under a `--cf-*` (customer-feedback) namespace in `app/globals.css` or a scoped stylesheet, so they don't collide with `--brand-primary`/`--surface-*` used by unrelated parts of the app.

## Component specs

### Shell (`CustomDashboardContent.tsx`)

Desktop:
- Sidebar: cream/white background (not dark), solid-teal pill for the active page, ink-gray text for inactive items, logo mark at top, "Back to Portal" pinned at the bottom.
- Header: bold black uppercase dashboard title (keep), date-range button and Dispatch (export) button restyled as bento pills — teal fill for the primary action (Dispatch), outline/cream for the date picker.
- Filter row: current native `<select>`-style dropdowns restyled as compact pill/chip selects on cream background.
- Footer: unchanged content, restyled to match new type/spacing.

Mobile (`<768px`):
- Sidebar becomes a bottom-sheet drawer (slides up from bottom edge, full-width nav pills) instead of the current corner-anchored hamburger overlay — better thumb reach.
- Header collapses to two rows: title + hamburger icon (row 1), then a horizontal scroll-snap chip strip replacing the filter dropdowns (row 2) — native multi-dropdown rows don't fit small screens.
- Export action becomes a floating action button, bottom-right, teal, restyled bento pill (this FAB pattern already exists in the current shell — keep the mechanism, restyle only).

Tablet (`768–1024px`):
- Sidebar auto-collapses to the existing icon-rail mode by default (collapse toggle already exists in the code — just default it to collapsed at this breakpoint).

### KPI tiles (in `CustomerFeedbackView.tsx`)

- Bento hero treatment: the first/primary KPI (e.g. "Report" total) renders as a large solid-teal tile with white numerals, spanning 2 grid columns on desktop.
- Remaining KPIs stay white cards. Label color maps by semantic meaning when the KPI title matches a known category (contains "irregularity" → amber, "complaint" → coral, "compliment" → lime); any KPI that doesn't match one of those keywords falls back to slate.
- Below `md`: grid collapses to a uniform single-column stack — no asymmetric spans on mobile.

### Donut chart (`FeedbackDonutChart.tsx`)

- Replace `FIXED_DONUT_RANK_COLORS`/`DONUT_FALLBACK_COLORS` with the new accent set (teal, amber, coral, lime, slate, cycling in that order by rank).
- Center total label unchanged in position/behavior.
- Legend: restyle from plain dot+label to small pill chips with a tint background of each slice's color.

### Bar chart (`FeedbackBarChart.tsx`)

- Replace the current hardcoded `barColor` logic (red for complaint/irregularity, olive-green default at `#7cb342`/`#ef5350`) with the new accent set: coral for complaint/irregularity, teal for default/compliment.
- Layout mechanics (horizontal bars, wrapped Y-axis ticks, value labels, scroll container) are unchanged — recolor and adjust padding/typography to match new card chrome only.

### Pivot / heatmap table (`FeedbackPivotTable.tsx`)

- Recolor `HEATMAP_SCALE` from the current green ramp to a teal ramp (light cream → mid teal → deep teal), keeping the same 5-step intensity structure and the "Intensity:" legend swatches.
- Sticky row-label column and sticky header row behavior unchanged.
- Cell click → drilldown behavior unchanged.

### Investigative detail table (`InvestigativeTable.tsx`)

- Currently the most visually "modern" piece (framer-motion expand rows, `--sr-*` token system, stat chips, sticky footer pagination) — fold its styling onto the *same* new bento tokens (cream/white/teal/accent set) instead of its separate `--sr-*` palette, so it reads as part of one system rather than a different app bolted on.
- Keep all behavior as-is: search box, column sort, pagination ("Start"/"Next Phase" become plain "First"/"Next" or similar — see copy note below), row-expand drawer with Logistics Metadata / Narrative Record / Root Cause / Remediation / Evidence sections, CSV export, evidence link chips.
- Copy cleanup: replace terminal/jargon-y copy ("SYPHONING DATA...", "Null result set in current query.", "SYNCING 001 — 005 / 120 RECORDS") with plain equivalents ("Loading...", "No results found.", "Showing 1–5 of 120") to match the rest of the dashboard's tone.
- Category badges (Complaint/Irregularity/Compliment) recolor to the new accent set instead of their current ad-hoc `oklch(...)` inline colors.

### Filter row (`DynamicFilterHeader.tsx`)

- Visual restyle only to match new pill/chip select treatment described above; no changes to filter fields, options, or behavior.

## Responsive breakpoints

Using Tailwind's default breakpoints already in the codebase:
- `<768px`: single-column stack everywhere; sidebar → bottom-sheet drawer; filters → horizontal scroll-snap chip strip; export → floating action button; all tables/pivots horizontal-scroll with sticky first column and sticky header retained.
- `768–1024px`: sidebar defaults to collapsed icon-rail; bento grid drops to 2 columns.
- `>1024px`: full asymmetric bento grid; sidebar expanded by default.

## Non-goals

- No changes to data fetching, query definitions, filter field lists, KPI selection, or which charts appear on which page.
- No dark mode.
- No rich/staggered entrance animation system.
- No global retheme of unrelated dashboards/pages that also consume `--brand-primary`/`--surface-*`.
