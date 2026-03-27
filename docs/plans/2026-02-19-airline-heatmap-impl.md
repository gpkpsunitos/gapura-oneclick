# Airline Heatmap — Page 1 Layout + Detail Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move both category pivot heatmaps to a dedicated full-width Row 3 on Page 1, and replace the heavy AirlineIntelligenceDetail page with a lightweight heatmap-focused component.

**Architecture:** Three changes in sequence: (1) layout refactor in CustomerFeedbackView, (2) new AirlineHeatmapDetail component, (3) swap the import in the detail page. All client-side, no new API routes. Data pattern mirrors AreaSubCategoryDetail.

**Tech Stack:** React, Next.js App Router, TypeScript, Tailwind CSS, Recharts, InvestigativeTable.

---

### Task 1: Refactor CustomerFeedbackView — Move Pivots to Row 3

**Files:**
- Modify: `components/dashboard/customer-feedback/CustomerFeedbackView.tsx`

**Context:**

Current Row 2 (lines 131–175) renders a 12-col grid with the Donut (`row2Feature`, col-span-4) and both pivots (`row2Pivots`, col-span-4 each) in the same row. We need to:
- Keep Row 2 as the Donut only
- Add a new Row 3 that renders the pivots at `col-span-6` each

**Step 1: Read the file to confirm current line numbers**

Open `components/dashboard/customer-feedback/CustomerFeedbackView.tsx`. Confirm the comment `{/* ── Row 2: One Donut + Two Pivots ── */}` is around line 131, and the closing `</div>` of that grid is around line 175.

**Step 2: Replace the Row 2 block**

Find and replace the entire Row 2 section (from the `{/* ── Row 2 ── */}` comment through its closing `</div>` at line 175) with:

```tsx
      {/* ── Row 2: Category by Area Donut ── */}
      {row2Feature && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4">
            <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
              <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50 bg-gray-50/30">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight m-0 truncate">{row2Feature.title}</h3>
                <button
                  onClick={() => onViewDetail?.(row2Feature, getResult(row2Feature.id)!)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-[#6b8e3d] hover:bg-[#5a7a3a] rounded shadow-sm transition-transform active:scale-95"
                >
                  DETAIL
                </button>
              </div>
              <div className="p-4 flex-1">
                <FeedbackDonutChart
                  title=""
                  data={toChartData(row2Feature.id)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Row 3: Case Category by Branch + Case Category by Airlines (full-width side-by-side) ── */}
      {row2Pivots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {row2Pivots.map(pivot => (
            <div key={pivot.id} className="md:col-span-6">
              <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50 bg-gray-50/30">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight m-0 truncate">{pivot.title}</h3>
                  <button
                    onClick={() => onViewDetail?.(pivot, getResult(pivot.id)!)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-[#6b8e3d] hover:bg-[#5a7a3a] rounded shadow-sm transition-transform active:scale-95"
                  >
                    DETAIL
                  </button>
                </div>
                <div className="p-4 flex-1">
                  <FeedbackPivotTable
                    title=""
                    result={getResult(pivot.id) || { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
```

**Step 3: Verify the build**

```bash
npx tsc --noEmit 2>&1 | grep "CustomerFeedbackView"
```

Expected: no output.

---

### Task 2: Create AirlineHeatmapDetail Component

**Files:**
- Create: `components/charts/case-category-by-airline/AirlineHeatmapDetail.tsx`

**Context:**

Follows the same pattern as `components/charts/area-sub-category/AreaSubCategoryDetail.tsx`. Fetches from `/api/reports/analytics`, filters client-side, renders 4 sections: KPI cards, heatmap grid, monthly trend line chart, full data table.

The `Report` type lives at `@/types` (same import used by AreaSubCategoryDetail).

**Step 1: Create the file with the following complete content**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Report } from '@/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { InvestigativeTable } from '@/components/chart-detail/InvestigativeTable';
import type { QueryResult } from '@/types/builder';

interface FilterParams {
  hub?: string;
  branch?: string;
  airlines?: string;
  area?: string;
  sourceSheet?: 'NON CARGO' | 'CGO';
}

interface AirlineHeatmapDetailProps {
  filters: FilterParams;
}

const INVALID_VALUES = new Set(['', '-', 'nil', 'none', 'unknown', 'n/a', '#n/a', 'null']);
const LINE_COLORS = ['#2e7d32', '#43a047', '#66bb6a'];

function cleanLabel(value: unknown): string {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidLabel(value: unknown): boolean {
  const normalized = cleanLabel(value).toLowerCase();
  return normalized.length > 0 && !INVALID_VALUES.has(normalized);
}

function monthKey(value: unknown): string {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function displayMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function parseDate(r: Report): number {
  const d = new Date(String(r.date_of_event || r.incident_date || r.created_at || ''));
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function HeatCell({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? value / max : 0;
  const alpha = value === 0 ? 0.07 : Math.min(0.95, 0.2 + ratio * 0.75);
  const background = `rgba(67, 160, 71, ${alpha})`;
  const color = alpha > 0.55 ? '#ffffff' : '#1f2937';
  return (
    <div
      className="h-8 rounded-md flex items-center justify-center text-[11px] font-bold"
      style={{ background, color }}
      title={`${value}`}
    >
      {value || '-'}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = 'green',
}: {
  label: string;
  value: string;
  tone?: 'green' | 'blue' | 'amber' | 'red';
}) {
  const tones: Record<string, string> = {
    green: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    blue: 'text-sky-700 bg-sky-50 border-sky-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    red: 'text-rose-700 bg-rose-50 border-rose-100',
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-2xl font-black mt-1 truncate">{value}</p>
    </div>
  );
}

export default function AirlineHeatmapDetail({ filters }: AirlineHeatmapDetailProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/reports/analytics?refresh=true', { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = await res.json();
        if (active) setReports(Array.isArray(data.reports) ? data.reports : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const sourceSheet = filters.sourceSheet || 'NON CARGO';
      if (sourceSheet === 'CGO') {
        if (r.source_sheet !== 'CGO') return false;
      } else if (r.source_sheet === 'CGO') {
        return false;
      }
      if (filters.hub && filters.hub !== 'all' && cleanLabel(r.hub) !== filters.hub) return false;
      if (filters.branch && filters.branch !== 'all' && cleanLabel(r.branch) !== filters.branch)
        return false;
      const airline = cleanLabel(r.airlines || r.airline);
      if (filters.airlines && filters.airlines !== 'all' && airline !== filters.airlines) return false;
      if (filters.area && filters.area !== 'all' && cleanLabel(r.area) !== filters.area) return false;
      return isValidLabel(r.airlines || r.airline);
    });
  }, [reports, filters]);

  // ── Heatmap: top 15 airlines × top 8 categories ──
  const heatmap = useMemo(() => {
    const airlineMap = new Map<string, number>();
    filteredReports.forEach((r) => {
      const airline = cleanLabel(r.airlines || r.airline);
      if (!isValidLabel(airline)) return;
      airlineMap.set(airline, (airlineMap.get(airline) || 0) + 1);
    });
    const topAirlines = Array.from(airlineMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([a]) => a);

    const catMap = new Map<string, number>();
    filteredReports.forEach((r) => {
      const cat = cleanLabel(r.category || r.main_category || (r as any).irregularity_complain_category);
      if (!isValidLabel(cat)) return;
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    const categories = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([c]) => c);

    const cells = new Map<string, number>();
    let max = 0;
    filteredReports.forEach((r) => {
      const airline = cleanLabel(r.airlines || r.airline);
      const cat = cleanLabel(r.category || r.main_category || (r as any).irregularity_complain_category);
      if (!topAirlines.includes(airline) || !categories.includes(cat)) return;
      const key = `${airline}::${cat}`;
      const next = (cells.get(key) || 0) + 1;
      cells.set(key, next);
      if (next > max) max = next;
    });

    return { airlines: topAirlines, categories, cells, max };
  }, [filteredReports]);

  const top3Airlines = useMemo(() => heatmap.airlines.slice(0, 3), [heatmap.airlines]);

  // ── Monthly trend for top 3 airlines ──
  const monthlyTrend = useMemo(() => {
    const monthMap = new Map<string, Record<string, number>>();
    filteredReports.forEach((r) => {
      const airline = cleanLabel(r.airlines || r.airline);
      if (!top3Airlines.includes(airline)) return;
      const key = monthKey(r.date_of_event || r.incident_date || r.created_at);
      if (!key) return;
      if (!monthMap.has(key)) monthMap.set(key, {});
      const obj = monthMap.get(key)!;
      obj[airline] = (obj[airline] || 0) + 1;
    });
    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, bucket]) => ({
        monthLabel: displayMonth(month),
        ...top3Airlines.reduce<Record<string, number>>((acc, a) => {
          acc[a] = bucket[a] || 0;
          return acc;
        }, {}),
      }));
  }, [filteredReports, top3Airlines]);

  // ── KPIs ──
  const distinctAirlines = useMemo(
    () =>
      new Set(
        filteredReports.map((r) => cleanLabel(r.airlines || r.airline)).filter(isValidLabel),
      ).size,
    [filteredReports],
  );

  const topAirlineName = heatmap.airlines[0] || '—';
  const topAirlineCount = useMemo(() => {
    let count = 0;
    heatmap.cells.forEach((v, k) => {
      if (k.startsWith(`${topAirlineName}::`)) count += v;
    });
    return count;
  }, [heatmap.cells, topAirlineName]);

  const dominantCategory = heatmap.categories[0] || '—';

  // ── Full data table ──
  const queryResult = useMemo<QueryResult>(() => {
    const columns = [
      'date_of_event',
      'branch',
      'airlines',
      'category',
      'severity',
      'status',
      'root_caused',
      'action_taken',
    ];
    const rows = [...filteredReports]
      .sort((a, b) => parseDate(b) - parseDate(a))
      .map((r) => ({
        date_of_event: String(r.date_of_event || r.incident_date || r.created_at || ''),
        branch: cleanLabel(r.branch || r.reporting_branch || r.station_code),
        airlines: cleanLabel(r.airlines || r.airline),
        category: cleanLabel(r.category || r.main_category || (r as any).irregularity_complain_category),
        severity: cleanLabel(r.severity || ''),
        status: cleanLabel(r.status || ''),
        root_caused: cleanLabel(r.root_caused) || '-',
        action_taken: cleanLabel(r.action_taken) || '-',
      }));
    return { columns, rows, rowCount: rows.length, executionTimeMs: 0 };
  }, [filteredReports]);

  if (loading) {
    return (
      <div className="min-h-[45vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading airline heatmap detail...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Records" value={filteredReports.length.toLocaleString('id-ID')} tone="green" />
        <StatCard label="Distinct Airlines" value={distinctAirlines.toLocaleString('id-ID')} tone="blue" />
        <StatCard
          label="Top Airline"
          value={`${topAirlineName} · ${topAirlineCount.toLocaleString('id-ID')}`}
          tone="amber"
        />
        <StatCard label="Dominant Category" value={dominantCategory} tone="red" />
      </div>

      {/* ── Category × Airline Heatmap ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-3">
          Category × Airline Heatmap (Top 15 Airlines)
        </h3>
        {heatmap.airlines.length === 0 ? (
          <p className="text-sm text-gray-400">No data available for current filters.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white text-left text-[10px] uppercase tracking-wide text-gray-500 min-w-[160px]">
                    Airline
                  </th>
                  {heatmap.categories.map((cat) => (
                    <th
                      key={cat}
                      className="text-[10px] font-bold text-gray-500 min-w-[90px] max-w-[130px] whitespace-normal break-words"
                    >
                      {cat}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.airlines.map((airline) => (
                  <tr key={airline}>
                    <td className="sticky left-0 bg-white text-[11px] font-semibold text-gray-700">
                      {airline}
                    </td>
                    {heatmap.categories.map((cat) => {
                      const value = heatmap.cells.get(`${airline}::${cat}`) || 0;
                      return (
                        <td key={cat}>
                          <HeatCell value={value} max={heatmap.max} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Monthly Trend ── */}
      {top3Airlines.length > 0 && monthlyTrend.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Monthly Trend (Top 3 Airlines)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                {top3Airlines.map((airline, idx) => (
                  <Line
                    key={airline}
                    type="monotone"
                    dataKey={airline}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2.3}
                    dot={{ r: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Full Data Table ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Full Data Table</h3>
        <InvestigativeTable
          title="Case Category by Airlines"
          data={queryResult}
          className="shadow-none border-0"
        />
      </div>
    </div>
  );
}
```

**Step 2: Verify the build**

```bash
npx tsc --noEmit 2>&1 | grep "AirlineHeatmapDetail\|case-category-by-airline"
```

Expected: no output (no errors for this file).

---

### Task 3: Swap AirlineIntelligenceDetail for AirlineHeatmapDetail in the Detail Page

**Files:**
- Modify: `app/dashboard/charts/case-category-by-airline/detail/page.tsx`

**Context:**

The page currently imports and renders `AirlineIntelligenceDetail` (line 6 and line 101). We swap it for `AirlineHeatmapDetail`. The page title should also be updated to match the new focus.

**Step 1: Replace the import on line 6**

```tsx
// Remove:
import AirlineIntelligenceDetail from '@/components/charts/case-category-by-airline/AirlineIntelligenceDetail';

// Add:
import AirlineHeatmapDetail from '@/components/charts/case-category-by-airline/AirlineHeatmapDetail';
```

**Step 2: Update the page title and subtitle in the header (lines 41–44)**

```tsx
// Remove:
<h1 className="text-xl font-black text-gray-900 tracking-tight">
  Case Category by Airlines — Airline Intelligence
</h1>
<p className="text-xs text-gray-500">Entity performance risk — is this airline high risk?</p>

// Replace with:
<h1 className="text-xl font-black text-gray-900 tracking-tight">
  Case Category by Airlines — Heatmap Detail
</h1>
<p className="text-xs text-gray-500">Category distribution across airlines — concentration, trend, and full data</p>
```

**Step 3: Replace the component render on line 101**

```tsx
// Remove:
<AirlineIntelligenceDetail filters={filters} />

// Replace with:
<AirlineHeatmapDetail filters={filters} />
```

**Step 4: Verify the build**

```bash
npx tsc --noEmit 2>&1 | grep "case-category-by-airline"
```

Expected: no output.

---

### Task 4: Visual Verification

Open the dev server (`npm run dev`) and verify:

**Page 1 (embed):**
- Navigate to `http://localhost:3000/embed/custom/customer-feedback-main`
- [ ] Row 2 shows only the "Category by Area" Donut (col-span-4, left-aligned)
- [ ] Row 3 shows "Case Category by Branch" and "Case Category by Airlines" side-by-side (col-span-6 each)
- [ ] Both heatmaps have a DETAIL button
- [ ] Clicking DETAIL on "Case Category by Airlines" navigates to the new detail page

**Airline Detail Page:**
- Navigate to `http://localhost:3000/dashboard/charts/case-category-by-airline/detail?sourceSheet=NON+CARGO`
- [ ] Page title reads "Case Category by Airlines — Heatmap Detail"
- [ ] 4 KPI cards visible (Total Records, Distinct Airlines, Top Airline, Dominant Category)
- [ ] Category × Airline heatmap grid renders with green-scale cells
- [ ] Monthly Trend line chart renders for top 3 airlines
- [ ] Full Data Table renders at the bottom (paginated, searchable, CSV export)
- [ ] Filter dropdowns (Hub, Branch, Airlines, Area) update the page content
