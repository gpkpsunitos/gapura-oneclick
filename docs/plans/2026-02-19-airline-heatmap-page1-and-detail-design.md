# Design: Case Category by Airline — Page 1 Heatmap + New Detail Page

**Date:** 2026-02-19
**Status:** Approved

## Problem

The "Case Category by Airlines" pivot chart exists in the template but is cramped at `col-span-4` in Row 2 alongside the Donut chart. The existing detail page (`AirlineIntelligenceDetail`) is a heavy 10-section intelligence report, not tailored to the heatmap context.

## Goal

1. Give the two category-by-branch/airline heatmaps their own full-width side-by-side row on Page 1 (`col-span-6` each).
2. Replace the existing airline detail page content with a new lightweight heatmap-focused component.

## Scope

**Files to change:**
- Modify: `components/dashboard/customer-feedback/CustomerFeedbackView.tsx` — add Row 3 with both pivots at col-span-6
- Create: `components/charts/case-category-by-airline/AirlineHeatmapDetail.tsx` — new lightweight detail component
- Modify: `app/dashboard/charts/case-category-by-airline/detail/page.tsx` — swap `AirlineIntelligenceDetail` for `AirlineHeatmapDetail`

## Part 1 — Page 1 Layout Change

### Current Row 2
```
Donut(col-span-4) | Branch Pivot(col-span-4) | Airline Pivot(col-span-4)
```

### New Layout

**Row 2** — Donut only (or with remaining non-pivot content):
```
Donut(col-span-4) | [existing row2 non-pivot content]
```

**New Row 3** — Dedicated pivot row:
```
Branch Pivot(col-span-6) | Airline Pivot(col-span-6)
```

### CustomerFeedbackView.tsx changes

- Extract `row2Pivots` out of Row 2's grid into a separate third `<div>` grid below Row 2
- Row 3 grid: `grid-cols-1 md:grid-cols-12`, each pivot at `md:col-span-6`
- Each pivot card retains the same header (title + DETAIL button) and `FeedbackPivotTable` body
- Row 2 keeps only `row2Feature` (Donut)

## Part 2 — New Heatmap-Focused Detail Page

### Route
`/dashboard/charts/case-category-by-airline/detail` (existing, already wired in routing)

### Component
New: `components/charts/case-category-by-airline/AirlineHeatmapDetail.tsx`

### Data source
`/api/reports/analytics` — same endpoint used by all other detail pages. Fetches all reports, filters client-side.

### Filter props
```ts
interface FilterParams {
  hub?: string;
  branch?: string;
  airlines?: string;
  area?: string;
  sourceSheet?: 'NON CARGO' | 'CGO';
}
```

### Sections (in order)

**1. KPI Cards (4 cards)**
- Total Records
- Distinct Airlines
- Top Airline (name + count)
- Dominant Category (most frequent `category` value)

**2. Category × Airline Heatmap**
- Rows: top 15 airlines by volume
- Columns: distinct categories (Irregularity, Complaint, Compliment + subcategories)
- Cell value: count of records for that airline × category intersection
- Color: green-scale intensity (same pattern as `FeedbackPivotTable` / `AreaSubCategoryDetail` HeatCell)
- Max height scrollable

**3. Monthly Trend**
- Top 3 airlines by total volume
- Line chart (12 months), one line per airline
- X-axis: month label, Y-axis: count

**4. Full Data Table**
- `InvestigativeTable` component
- Columns: date, branch, airline, category, severity, status, root_caused, action_taken
- All filtered records, paginated (10/page), searchable, CSV export

### Styling
- White card panels, `rounded-2xl`, `shadow-sm`, consistent with existing detail pages
- Brand green `#6b8e3d` for chart accents
- Loading spinner while fetching, error state with red banner
