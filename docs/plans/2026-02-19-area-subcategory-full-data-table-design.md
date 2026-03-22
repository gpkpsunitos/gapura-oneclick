# Design: Full Data Table on Terminal / Apron / General Detail Pages

**Date:** 2026-02-19
**Status:** Approved

## Problem

The detail pages for Terminal Area Category, Apron Area Category, and General Category (`/dashboard/charts/[terminal|apron|general]-*/detail`) currently show a simple HTML table capped at 150 rows with no search, pagination, or CSV export. Users cannot investigate the full underlying dataset that powers the bar charts on page 2.

## Goal

Replace the basic table in `AreaSubCategoryDetail` with the full-featured `InvestigativeTable` component, giving users search, pagination (10 rows/page), CSV export, and expandable row drawers — consistent with the other detail pages.

## Scope

**Single file changed:** `components/charts/area-sub-category/AreaSubCategoryDetail.tsx`

All three category types (`terminal_area_category`, `apron_area_category`, `general_category`) share this component, so one change covers all three detail pages.

## Design

### Remove

- The `detailRows` useMemo (150-row cap via `.slice(0, 150)`)
- The basic `<table>` block (the "Investigative Table" section, lines ~494–530)

### Add

1. Import `InvestigativeTable` from `@/components/chart-detail/InvestigativeTable`

2. A `queryResult` useMemo that transforms `focusedReports` (all rows, no cap) into a `QueryResult`:

```ts
const queryResult = useMemo<QueryResult>(() => {
  const columns = ['date_of_event', 'branch', 'airlines', categoryField, 'category', 'severity', 'status', 'root_caused', 'action_taken'];
  const rows = focusedReports.map((r) => ({
    date_of_event: r.date_of_event || r.incident_date || r.created_at || '',
    branch: cleanLabel(r.branch || r.reporting_branch || r.station_code),
    airlines: cleanLabel(r.airlines || r.airline),
    [categoryField]: cleanLabel(r[categoryField]),
    category: normalizeMainCategory(r.main_category || r.category || r.irregularity_complain_category),
    severity: cleanLabel(r.severity || ''),
    status: cleanLabel(r.status || ''),
    root_caused: cleanLabel(r.root_caused) || '-',
    action_taken: cleanLabel(r.action_taken) || '-',
  }));
  return { columns, rows, rowCount: rows.length, executionTimeMs: 0 };
}, [focusedReports, categoryField]);
```

3. Render `InvestigativeTable` in place of the old table:

```tsx
<div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
  <h3 className="text-sm font-bold text-gray-800 mb-3">
    Full Data Table {focusedCategory ? `— ${focusedCategory}` : ''}
  </h3>
  <InvestigativeTable
    title={focusedCategory || title}
    data={queryResult}
    className="shadow-none border-0"
  />
</div>
```

### Result

- Search across all columns
- Paginated (10 rows/page)
- CSV export button
- Expandable row drawer
- Category badge coloring (category column drives badge color)
- No row cap — all `focusedReports` shown
- Responds to `focusedCategory` selector already on the page
