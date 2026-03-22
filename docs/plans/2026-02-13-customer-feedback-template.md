# Customer Feedback Template Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Customer Feedback" template mode to the AI dashboard builder that generates a fixed 5-page dashboard matching the screenshots exactly, using hardcoded QueryDefinitions.

**Architecture:** Create a template file that returns a complete `DashboardDefinition` with 5 pages. Add a new API endpoint that accepts date range and returns this template. Modify the BuilderLayout UI to offer a "Customer Feedback" quick-generate button alongside the existing AI prompt.

**Tech Stack:** TypeScript, Next.js API routes, existing QueryDefinition/DashboardDefinition types, existing CustomDashboardContent embed renderer.

---

### Task 1: Create Customer Feedback Template

**Files:**
- Create: `lib/builder/customer-feedback-template.ts`

**Step 1: Create the template file with all 5 pages**

This is the core file. It exports a function that takes `dateFrom` and `dateTo` and returns a complete `DashboardDefinition` with hardcoded queries matching the screenshots.

```typescript
// lib/builder/customer-feedback-template.ts
import type { DashboardDefinition, DashboardTile, DashboardPage, QueryDefinition } from '@/types/builder';

const LANDSIDE_FILTER = { table: 'reports', field: 'target_division', operator: 'not_in' as const, value: ['UQ'], conjunction: 'AND' as const };
const CGO_FILTER = { table: 'reports', field: 'target_division', operator: 'eq' as const, value: 'UQ', conjunction: 'AND' as const };

function dateFilters(dateFrom: string, dateTo: string) {
  return [
    { table: 'reports', field: 'created_at', operator: 'gte' as const, value: dateFrom, conjunction: 'AND' as const },
    { table: 'reports', field: 'created_at', operator: 'lte' as const, value: dateTo, conjunction: 'AND' as const },
  ];
}

let tileCounter = 0;
function tileId() { return `cft-${Date.now()}-${++tileCounter}`; }

export function generateCustomerFeedbackDashboard(dateFrom: string, dateTo: string): DashboardDefinition {
  tileCounter = 0;
  const df = dateFilters(dateFrom, dateTo);
  const fromYear = new Date(dateFrom).getFullYear();
  const toYear = new Date(dateTo).getFullYear();
  const yearRange = fromYear === toYear ? `${fromYear}` : `${fromYear} - ${toYear}`;

  // ═══════════════════════════════════════════════════════════
  // PAGE 1: Case Category (Landside/Airside)
  // ═══════════════════════════════════════════════════════════
  const page1Tiles: DashboardTile[] = [
    // KPI: Total Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'total' }],
        filters: [...df, LANDSIDE_FILTER], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 0, y: 0, w: 3, h: 1 },
    },
    // KPI: Branch count
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'branch', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...df, LANDSIDE_FILTER], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Branch', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 3, y: 0, w: 3, h: 1 },
    },
    // KPI: Airlines count
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'airline', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...df, LANDSIDE_FILTER], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Airlines', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 6, y: 0, w: 3, h: 1 },
    },
    // KPI: Compliment Report count
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'total' }],
        filters: [...df, LANDSIDE_FILTER, { table: 'reports', field: 'main_category', operator: 'eq' as const, value: 'Compliment', conjunction: 'AND' as const }],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Compliment Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 9, y: 0, w: 3, h: 1 },
    },
    // Donut: Report by Case Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'main_category', alias: 'category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, LANDSIDE_FILTER],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'donut', title: 'Report by Case Category', xAxis: 'category', yAxis: ['count'], showLegend: true, showLabels: true },
      layout: { x: 0, y: 1, w: 3, h: 2 },
    },
    // Horizontal Bar: Branch Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'branch', alias: 'branch' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, LANDSIDE_FILTER],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 15,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Branch Report', xAxis: 'branch', yAxis: ['count'], showLegend: false, showLabels: true },
      layout: { x: 3, y: 1, w: 3, h: 2 },
    },
    // Horizontal Bar: Airlines Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'airline', alias: 'airline' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, LANDSIDE_FILTER],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Airlines Report', xAxis: 'airline', yAxis: ['count'], showLegend: false, showLabels: true },
      layout: { x: 6, y: 1, w: 3, h: 2 },
    },
    // Horizontal Bar: Monthly Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'created_at', alias: 'month', dateGranularity: 'month' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, LANDSIDE_FILTER],
        sorts: [{ field: 'month', direction: 'asc' }], limit: 24,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Monthly Report', xAxis: 'month', yAxis: ['count'], showLegend: false, showLabels: true },
      layout: { x: 9, y: 1, w: 3, h: 2 },
    },
    // Donut: Category by Area
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'area', alias: 'area' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, LANDSIDE_FILTER],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 5,
      },
      visualization: { chartType: 'donut', title: 'Category by Area', xAxis: 'area', yAxis: ['count'], showLegend: true, showLabels: true },
      layout: { x: 0, y: 3, w: 3, h: 2 },
    },
    // Heatmap: Case Category by Branch
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'branch' },
          { table: 'reports', field: 'main_category', alias: 'category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, LANDSIDE_FILTER],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 200,
      },
      visualization: { chartType: 'heatmap', title: 'Case Category by Branch', xAxis: 'category', yAxis: ['branch'], colorField: 'count', showLegend: false, showLabels: false },
      layout: { x: 3, y: 3, w: 4, h: 2 },
    },
    // Heatmap: Case Category by Airlines
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airline', alias: 'airline' },
          { table: 'reports', field: 'main_category', alias: 'category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, LANDSIDE_FILTER],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 200,
      },
      visualization: { chartType: 'heatmap', title: 'Case Category by Airlines', xAxis: 'category', yAxis: ['airline'], colorField: 'count', showLegend: false, showLabels: false },
      layout: { x: 7, y: 3, w: 5, h: 2 },
    },
  ];

  // ═══════════════════════════════════════════════════════════
  // PAGE 2: Detail Category (Landside/Airside)
  // ═══════════════════════════════════════════════════════════
  const page2Tiles: DashboardTile[] = [
    // Same 4 KPIs
    ...page1Tiles.slice(0, 4).map(t => ({ ...t, id: tileId() })),
    // Heatmap: Case Report by Area (Branch × Airlines × Area)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'branch' },
          { table: 'reports', field: 'airline', alias: 'airlines' },
          { table: 'reports', field: 'area', alias: 'area' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, LANDSIDE_FILTER],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 500,
      },
      visualization: { chartType: 'heatmap', title: 'Case Report by Area', xAxis: 'area', yAxis: ['branch', 'airlines'], colorField: 'count', showLegend: false, showLabels: false },
      layout: { x: 0, y: 1, w: 6, h: 2 },
    },
    // Table: Terminal Area Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'sub_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, LANDSIDE_FILTER, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'TERMINAL', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 50,
      },
      visualization: { chartType: 'table', title: 'Terminal Area Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: false },
      layout: { x: 6, y: 1, w: 2, h: 2 },
    },
    // Table: Apron Area Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'sub_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, LANDSIDE_FILTER, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'APRON', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 50,
      },
      visualization: { chartType: 'table', title: 'Apron Area Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: false },
      layout: { x: 8, y: 1, w: 2, h: 2 },
    },
    // Table: General Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'sub_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, LANDSIDE_FILTER, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'GENERAL', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 50,
      },
      visualization: { chartType: 'table', title: 'General Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: false },
      layout: { x: 10, y: 1, w: 2, h: 2 },
    },
    // Horizontal Bar: HUB Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'hub', alias: 'hub' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, LANDSIDE_FILTER],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'HUB Report', xAxis: 'hub', yAxis: ['count'], showLegend: false, showLabels: true },
      layout: { x: 0, y: 3, w: 4, h: 2 },
    },
    // Table: Detail Report Landside & Airside
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'created_at', alias: 'Date' },
          { table: 'reports', field: 'main_category', alias: 'Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'flight_number', alias: 'Flight' },
          { table: 'reports', field: 'report_content', alias: 'Report' },
          { table: 'reports', field: 'root_cause', alias: 'Root Caused' },
          { table: 'reports', field: 'action_taken', alias: 'Action Taken' },
        ],
        measures: [],
        filters: [...df, LANDSIDE_FILTER],
        sorts: [{ field: 'Date', direction: 'desc' }], limit: 5000,
      },
      visualization: { chartType: 'table', title: 'Detail Report Landside & Airside', yAxis: [], showLegend: false, showLabels: false },
      layout: { x: 4, y: 3, w: 8, h: 2 },
    },
  ];

  // ═══════════════════════════════════════════════════════════
  // PAGE 3: Detail Report (full detail table)
  // ═══════════════════════════════════════════════════════════
  const page3Tiles: DashboardTile[] = [
    ...page1Tiles.slice(0, 4).map(t => ({ ...t, id: tileId() })),
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'created_at', alias: 'Date' },
          { table: 'reports', field: 'main_category', alias: 'Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'flight_number', alias: 'Flight' },
          { table: 'reports', field: 'area', alias: 'Area' },
          { table: 'reports', field: 'sub_category', alias: 'Sub Category' },
          { table: 'reports', field: 'report_content', alias: 'Report' },
          { table: 'reports', field: 'root_cause', alias: 'Root Caused' },
          { table: 'reports', field: 'action_taken', alias: 'Action Taken' },
        ],
        measures: [],
        filters: [...df, LANDSIDE_FILTER],
        sorts: [{ field: 'Date', direction: 'desc' }], limit: 5000,
      },
      visualization: { chartType: 'table', title: 'Detail Report Landside & Airside', yAxis: [], showLegend: false, showLabels: false },
      layout: { x: 0, y: 1, w: 12, h: 3 },
    },
  ];

  // ═══════════════════════════════════════════════════════════
  // PAGE 4: CGO - Case Category (UQ division only)
  // ═══════════════════════════════════════════════════════════
  // Same structure as page 1 but with CGO_FILTER instead of LANDSIDE_FILTER
  const page4Tiles: DashboardTile[] = page1Tiles.map(t => ({
    ...t,
    id: tileId(),
    query: {
      ...t.query,
      filters: t.query.filters.map(f =>
        f === LANDSIDE_FILTER ? CGO_FILTER : f
      ),
    },
  }));

  // ═══════════════════════════════════════════════════════════
  // PAGE 5: CGO - Detail Report (UQ division only)
  // ═══════════════════════════════════════════════════════════
  // Combine page 2's structure (without redundant KPIs) + detail table with CGO filter
  const page5Tiles: DashboardTile[] = page2Tiles.map(t => ({
    ...t,
    id: tileId(),
    query: {
      ...t.query,
      filters: t.query.filters.map(f =>
        f === LANDSIDE_FILTER ? CGO_FILTER : f
      ),
    },
    visualization: {
      ...t.visualization,
      title: t.visualization.title?.replace('Landside & Airside', 'CGO Cargo') || t.visualization.title,
    },
  }));

  const pages: DashboardPage[] = [
    { name: '1. Case Category', tiles: page1Tiles },
    { name: '2. Detail Category', tiles: page2Tiles },
    { name: '3. Detail Report', tiles: page3Tiles },
    { name: 'CGO - Case Category', tiles: page4Tiles },
    { name: 'CGO - Detail Report', tiles: page5Tiles },
  ];

  return {
    name: `Customer Feedback ${yearRange}`,
    description: `Landside & Airside Customer Feedback ${yearRange} - Irregularity, Complaint & Compliment Report`,
    tiles: pages.flatMap(p => p.tiles),
    pages,
    globalFilters: [],
    refreshInterval: 300,
  };
}
```

**Step 2: Verify types are compatible**

Check that `COUNT_DISTINCT` exists in the `AggregateFunction` type in `types/builder.ts`. If not, add it.

Run: Check `types/builder.ts` for `AggregateFunction` type definition.

---

### Task 2: Add COUNT_DISTINCT to AggregateFunction (if needed)

**Files:**
- Modify: `types/builder.ts` (AggregateFunction type)
- Modify: `lib/builder/sql-builder.ts` (handle COUNT_DISTINCT in SQL generation)

**Step 1: Check if COUNT_DISTINCT exists in types**

Read `types/builder.ts` and look for `AggregateFunction`.

**Step 2: Add COUNT_DISTINCT if missing**

In `types/builder.ts`:
```typescript
export type AggregateFunction = 'COUNT' | 'COUNT_DISTINCT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
```

**Step 3: Handle COUNT_DISTINCT in sql-builder.ts**

In the measure SQL generation, ensure `COUNT_DISTINCT` maps to `COUNT(DISTINCT field)`.

**Step 4: Commit**

```bash
git add types/builder.ts lib/builder/sql-builder.ts
git commit -m "feat: add COUNT_DISTINCT aggregate function support"
```

---

### Task 3: Create Customer Feedback Generate API

**Files:**
- Create: `app/api/dashboards/customer-feedback-generate/route.ts`

**Step 1: Create the API route**

```typescript
// app/api/dashboards/customer-feedback-generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { generateCustomerFeedbackDashboard } from '@/lib/builder/customer-feedback-template';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore);
    if (!session || !['ANALYST', 'SUPER_ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { dateFrom, dateTo } = await request.json();
    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'dateFrom and dateTo required' }, { status: 400 });
    }

    const dashboard = generateCustomerFeedbackDashboard(dateFrom, dateTo);
    return NextResponse.json({ dashboard });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/dashboards/customer-feedback-generate/route.ts
git commit -m "feat: add customer feedback dashboard generate API endpoint"
```

---

### Task 4: Update useAIDashboard Hook

**Files:**
- Modify: `lib/hooks/useAIDashboard.ts`

**Step 1: Add generateCustomerFeedback method**

```typescript
async function generateCustomerFeedback(dateFrom: string, dateTo: string): Promise<DashboardDefinition | null> {
  setLoading(true);
  setError(null);
  try {
    const res = await fetch('/api/dashboards/customer-feedback-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateFrom, dateTo }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Gagal membuat dashboard');
      return null;
    }
    return data.dashboard as DashboardDefinition;
  } catch {
    setError('Gagal menghubungi server.');
    return null;
  } finally {
    setLoading(false);
  }
}
```

Return `generateCustomerFeedback` from the hook alongside existing `generate`.

**Step 2: Commit**

```bash
git add lib/hooks/useAIDashboard.ts
git commit -m "feat: add customer feedback template generation to useAIDashboard hook"
```

---

### Task 5: Update BuilderLayout UI

**Files:**
- Modify: `components/builder/BuilderLayout.tsx`

**Step 1: Add Customer Feedback section to the welcome screen**

Add a "Customer Feedback" card below the AI prompt card with:
- Date range inputs (from/to)
- "Generate Customer Feedback Dashboard" button
- Add to PROMPT_SUGGESTIONS a Customer Feedback option

**Step 2: Add handler**

```typescript
const [cfDateFrom, setCfDateFrom] = useState('');
const [cfDateTo, setCfDateTo] = useState('');

const handleCustomerFeedbackGenerate = useCallback(async () => {
  if (!cfDateFrom || !cfDateTo) return;
  const def = await ai.generateCustomerFeedback(cfDateFrom, cfDateTo);
  if (def) {
    dash.loadDashboard(def);
    setMode('dashboard');
  }
}, [cfDateFrom, cfDateTo, ai, dash]);
```

**Step 3: Add UI card between AI prompt and manual builder**

A green-themed card with:
- Title: "Customer Feedback Dashboard"
- Two date inputs (From/To)
- Generate button
- Description text explaining what it creates

**Step 4: Commit**

```bash
git add components/builder/BuilderLayout.tsx
git commit -m "feat: add Customer Feedback quick-generate UI to dashboard builder"
```

---

### Task 6: Ensure CustomDashboardContent handles the template correctly

**Files:**
- Modify: `app/embed/custom/[slug]/CustomDashboardContent.tsx` (if needed)

**Step 1: Verify heatmap rendering**

The template uses heatmap charts which need `HeatmapTable` component. Verify the embed page already handles:
- `chartType === 'heatmap'` → renders `HeatmapTable`
- KPI tiles with `chartType === 'kpi'`
- Table tiles with `chartType === 'table'`
- Horizontal bar charts

**Step 2: Check title logic**

The embed page has hardcoded title logic:
```typescript
if (pName.includes('CGO')) return 'CGO Cargo Customer Feedback 2025 - 2026';
return 'Landside & Airside Customer Feedback 2025 - 2026';
```

Update this to use dynamic year range from the dashboard config (dateFrom/dateTo).

**Step 3: Update dynamic title**

Replace hardcoded year range with dynamic calculation from `dashboard.config.dateFrom` and `dashboard.config.dateTo`:

```typescript
const yearRange = (() => {
  const from = dashboard?.config?.dateFrom;
  const to = dashboard?.config?.dateTo;
  if (from && to) {
    const fy = new Date(from).getFullYear();
    const ty = new Date(to).getFullYear();
    return fy === ty ? `${fy}` : `${fy} - ${ty}`;
  }
  return '2025 - 2026';
})();
```

Then use `yearRange` in the title rendering.

**Step 4: Ensure filters config includes customer feedback filter fields**

The template dashboard config should set `filters: ['hub', 'branch', 'airline', 'main_category', 'area']` to match the screenshot filter pills (HUB, Branch, Maskapai, Airlines, Category, Area).

**Step 5: Commit**

```bash
git add app/embed/custom/[slug]/CustomDashboardContent.tsx
git commit -m "feat: dynamic year range in embed title for customer feedback"
```

---

### Task 7: Update Dashboard Save to include dateFrom/dateTo in config

**Files:**
- Modify: `components/builder/BuilderLayout.tsx` (handleSave function)

**Step 1: Pass dateFrom/dateTo to config when saving**

When saving, if the dashboard was generated from customer feedback template, include `dateFrom` and `dateTo` in the config object so the embed page can use them for the dynamic title and date filtering.

```typescript
const config = {
  dateRange: '7d',
  autoRefresh: true,
  pages: dash.pages.map(p => p.name),
  dateFrom: cfDateFrom || undefined,
  dateTo: cfDateTo || undefined,
  subtitle: dash.description || undefined,
};
```

**Step 2: Commit**

```bash
git add components/builder/BuilderLayout.tsx
git commit -m "feat: include date range in saved dashboard config"
```

---

### Task 8: End-to-end verification

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Navigate to builder**

Go to `/dashboard/analyst/builder`

**Step 3: Test Customer Feedback generate**

1. Enter date range (e.g., 2025-01-01 to 2026-02-13)
2. Click "Generate Customer Feedback Dashboard"
3. Verify 5 pages appear in the dashboard composer
4. Save the dashboard
5. Open the embed URL
6. Verify all 5 pages render with correct charts, heatmaps, tables
7. Verify filters work (HUB, Branch, Maskapai, etc.)
8. Verify date range picker works
9. Verify CGO pages show only UQ data

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete customer feedback template dashboard implementation"
```
