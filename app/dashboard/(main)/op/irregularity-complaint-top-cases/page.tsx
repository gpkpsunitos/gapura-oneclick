'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Download,
  Filter,
  Layers,
  Loader2,
  Plane,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { OpMetricCard } from '@/components/dashboard/op-metric-card';
import {
  ActionSummaryInsightPanel,
} from '@/components/dashboard/action-summary-insight-panel';
import {
  AnalyticsSection,
  AnalyticsSectionLoading,
  AnalyticsSourceStrip,
} from '@/components/dashboard/analytics-source-strip';
import { OpAnalyticsFilterBar, useFilterOptions } from '@/components/dashboard/op-analytics-filter-bar';
import { ResponsiveBarChart } from '@/components/charts/ResponsiveBarChart';
import { ResponsiveLineChart } from '@/components/charts/ResponsiveLineChart';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { getShortcutSourceConfig } from '@/lib/op-shortcut-source-matrix';
import type { AnalyticsRuntimeStatus } from '@/lib/op-shortcut-source-matrix';
import {
  buildMonthlySeries,
  fetchAnalyticsReports,
  getReportDate,
  normalizeIssueCategory,
  pickAirline,
  pickBranch,
} from '@/lib/op-shortcut-analytics';
import type { OpFilterState } from '@/components/dashboard/op-analytics-filter-bar';

/* ─────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────── */

type ReportRow = {
  [key: string]: unknown;
  id: string;
  created_at?: string;
  date_of_event?: string;
  category?: string;
  irregularity_complain_category?: string;
  main_category?: string;
  airlines?: string;
  airline?: string;
  station_code?: string;
  branch?: string;
  reporting_branch?: string;
  target_division?: string;
  hub?: string;
  area?: string;
  status?: string;
  description?: string;
  report?: string;
};

type TopDimension = 'category' | 'branch' | 'airline';

/* ─────────────────────────────────────────────────────
   Config & Helpers
   ───────────────────────────────────────────────────── */

const SOURCE_CONFIG = getShortcutSourceConfig('topIrregularityComplaint');

const DIMENSION_LABELS: Record<TopDimension, string> = {
  category: 'Kategori Kasus',
  branch: 'Cabang',
  airline: 'Maskapai',
};

function computeMoMDelta(
  reports: ReportRow[],
  getDate: (r: ReportRow) => string | undefined,
  filter: (r: ReportRow) => boolean,
): { current: number; previous: number } {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let current = 0;
  let previous = 0;

  for (const r of reports) {
    const d = getReportDate(getDate(r));
    if (!d || !filter(r)) continue;
    if (d >= thisMonthStart) current++;
    else if (d >= lastMonthStart) previous++;
  }
  return { current, previous };
}

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? '');
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        })
        .join(','),
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────── */

export default function OPTopIrregularityComplaintCases() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realStatus, setRealStatus] = useState<AnalyticsRuntimeStatus>();
  const [aiStatus, setAiStatus] = useState<AnalyticsRuntimeStatus>();
  const [topDimension, setTopDimension] = useState<TopDimension>('category');

  /* ── Filters ── */
  const [filters, setFilters] = useState<OpFilterState>({
    dateFrom: undefined,
    dateTo: undefined,
    hub: undefined,
    branch: undefined,
    airlines: undefined,
    sourceSheet: 'all',
  });

  /* ── Data fetch ── */
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchAnalyticsReports<ReportRow>(
          {
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            hub: filters.hub && filters.hub !== 'all' ? filters.hub : undefined,
            branch: filters.branch && filters.branch !== 'all' ? filters.branch : undefined,
            airlines: filters.airlines && filters.airlines !== 'all' ? filters.airlines : undefined,
            sourceSheet: filters.sourceSheet && filters.sourceSheet !== 'all' ? filters.sourceSheet : undefined,
          },
          [
            'id',
            'created_at',
            'date_of_event',
            'category',
            'irregularity_complain_category',
            'main_category',
            'airlines',
            'airline',
            'station_code',
            'branch',
            'reporting_branch',
            'target_division',
            'hub',
            'area',
            'status',
            'description',
            'report',
          ],
          controller.signal,
        );
        if (!active) return;

        const filtered = (response.reports || []).filter((report) => {
          const normalized = normalizeIssueCategory(
            report.category || report.main_category || report.irregularity_complain_category,
          );
          return normalized === 'Irregularity' || normalized === 'Complaint';
        });

        setReports(filtered);
        setRealStatus({
          lastSyncAt: response.timestamp,
          count: filtered.length,
        });
      } catch (loadError) {
        if (!active) return;
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat top irregularity');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [filters]);

  /* ── Derived data ── */
  const filterOptions = useFilterOptions(reports);

  const categoryBreakdown = useMemo(() => {
    const categoryMap = new Map<string, number>();
    reports.forEach((report) => {
      const category =
        report.irregularity_complain_category || report.main_category || report.category || 'Unknown';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [reports]);

  const topBranches = useMemo(() => {
    const branchMap = new Map<string, number>();
    reports.forEach((report) => {
      const branch = pickBranch(report);
      branchMap.set(branch, (branchMap.get(branch) || 0) + 1);
    });
    return Array.from(branchMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [reports]);

  const topAirlines = useMemo(() => {
    const airlineMap = new Map<string, number>();
    reports.forEach((report) => {
      const airline = pickAirline(report);
      airlineMap.set(airline, (airlineMap.get(airline) || 0) + 1);
    });
    return Array.from(airlineMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [reports]);

  const monthlyTrend = useMemo(() => {
    return buildMonthlySeries(
      reports,
      (report) => report.created_at || report.date_of_event,
      (report) =>
        normalizeIssueCategory(
          report.category || report.main_category || report.irregularity_complain_category,
        ),
    );
  }, [reports]);

  const overallBreakdown = useMemo(() => {
    const irregularity = reports.filter((report) =>
      normalizeIssueCategory(
        report.category || report.main_category || report.irregularity_complain_category,
      ) === 'Irregularity',
    ).length;
    const complaint = reports.length - irregularity;
    return [
      { name: 'Irregularity', value: irregularity },
      { name: 'Complaint', value: complaint },
    ];
  }, [reports]);

  /* Drill-down dimension data */
  const dimensionData = useMemo(() => {
    switch (topDimension) {
      case 'category':
        return categoryBreakdown;
      case 'branch':
        return topBranches;
      case 'airline':
        return topAirlines;
    }
  }, [topDimension, categoryBreakdown, topBranches, topAirlines]);

  /* MoM deltas */
  const totalMoM = useMemo(
    () => computeMoMDelta(reports, (r) => r.date_of_event || r.created_at, () => true),
    [reports],
  );
  const irregularityMoM = useMemo(
    () =>
      computeMoMDelta(reports, (r) => r.date_of_event || r.created_at, (r) =>
        normalizeIssueCategory(
          r.category || r.main_category || r.irregularity_complain_category,
        ) === 'Irregularity',
      ),
    [reports],
  );
  const complaintMoM = useMemo(
    () =>
      computeMoMDelta(reports, (r) => r.date_of_event || r.created_at, (r) =>
        normalizeIssueCategory(
          r.category || r.main_category || r.irregularity_complain_category,
        ) === 'Complaint',
      ),
    [reports],
  );

  const topCategory = categoryBreakdown[0];

  /* ── Handlers ── */
  const handleExport = () => {
    const exportData = reports.map((r) => ({
      Date: r.date_of_event || r.created_at || '',
      Category: r.irregularity_complain_category || r.main_category || r.category || '',
      Type: normalizeIssueCategory(
        r.category || r.main_category || r.irregularity_complain_category,
      ),
      Branch: pickBranch(r),
      Airline: pickAirline(r),
      Hub: r.hub || '',
      Area: r.area || '',
      Status: r.status || '',
    }));
    exportToCSV(exportData, 'op_top_irregularity_complaint');
  };

  return (
    <div className="min-h-screen space-y-5 px-3 py-4 sm:px-4 md:px-6 md:py-6">
      {/* ── Source strip header ── */}
      <AnalyticsSourceStrip
        title="Top Irregularity & Complaint"
        description="Halaman ini memisahkan ranking real kasus irregularity/complaint OP dari prioritas kategori yang dihitung AI."
        realSource={SOURCE_CONFIG.realSource}
        realStatus={realStatus}
        aiSource={SOURCE_CONFIG.aiSource}
        aiStatus={aiStatus}
      />

      {/* ── Global filter bar ── */}
      <OpAnalyticsFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        hubOptions={filterOptions.hubOptions}
        branchOptions={filterOptions.branchOptions}
        airlineOptions={filterOptions.airlineOptions}
        showSourceSheetToggle
      />

      {/* ═══════════════════════════════════════════════════
          REAL DATA SECTION
         ═══════════════════════════════════════════════════ */}
      <AnalyticsSection
        title="Top Kasus dari Data Real"
        description="Chart real di bawah ini berasal dari laporan aktual dan menampilkan ranking kategori, cabang, serta maskapai tanpa campur tangan model AI."
        variant="real"
      >
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── KPI Cards with Trend Indicators ── */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OpMetricCard
            icon={TrendingUp}
            label="Total Records"
            value={reports.length.toLocaleString('id-ID')}
            caption="Kasus irregularity + complaint"
            tone="real"
            currentValue={totalMoM.current}
            previousValue={totalMoM.previous}
          />
          <OpMetricCard
            icon={TriangleAlert}
            label="Top Category"
            value={topCategory?.name || '-'}
            caption={`${topCategory?.count || 0} kasus`}
            tone="real"
            badge={topCategory ? 'TOP' : undefined}
            badgeTone="emerald"
          />
          <OpMetricCard
            icon={Building2}
            label="Top Branch"
            value={topBranches[0]?.name || '-'}
            caption={`${topBranches[0]?.count || 0} kasus`}
            tone="real"
            currentValue={topBranches[0]?.count}
            previousValue={topBranches[1]?.count}
          />
          <OpMetricCard
            icon={Plane}
            label="Top Airline"
            value={topAirlines[0]?.name || '-'}
            caption={`${topAirlines[0]?.count || 0} kasus`}
            tone="real"
          />
        </div>

        {/* ── Irregularity vs Complaint Split + Trend ── */}
        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <ResponsivePieChart
              data={overallBreakdown}
              title="Irregularity vs Complaint"
              donut
              showLegend
              percentageLabels
              height="h-[300px]"
            />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Trend Bulanan Kasus</h3>
              <p className="text-xs text-slate-600">
                Perbandingan tren real bulanan irregularity vs complaint.
              </p>
            </div>
            <ResponsiveLineChart
              data={monthlyTrend}
              xAxisKey="month"
              dataKeys={['Irregularity', 'Complaint']}
              showLegend
              height="h-[300px]"
            />
          </div>
        </div>

        {/* ── Drill-Down Tabs: Category / Branch / Airline ── */}
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Drill-Down: Top {DIMENSION_LABELS[topDimension]}
              </h3>
              <p className="text-xs text-slate-600">
                Ranking {DIMENSION_LABELS[topDimension].toLowerCase()} berdasarkan volume kasus real.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              {(['category', 'branch', 'airline'] as const).map((dim) => (
                <button
                  key={dim}
                  onClick={() => setTopDimension(dim)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    topDimension === dim
                      ? 'bg-emerald-100 text-emerald-800 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {DIMENSION_LABELS[dim]}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveBarChart
            data={dimensionData}
            xAxisKey="name"
            dataKeys={['count']}
            showLegend={false}
            height="h-[360px]"
          />

          {/* Drill-down table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 pr-4 font-black uppercase tracking-[0.12em]">#</th>
                  <th className="pb-2 pr-4 font-black uppercase tracking-[0.12em]">
                    {DIMENSION_LABELS[topDimension]}
                  </th>
                  <th className="pb-2 pr-4 font-black uppercase tracking-[0.12em] text-right">
                    Kasus
                  </th>
                  <th className="pb-2 font-black uppercase tracking-[0.12em] text-right">
                    Proporsi
                  </th>
                </tr>
              </thead>
              <tbody>
                {dimensionData.map((row, idx) => {
                  const pct =
                    reports.length > 0
                      ? ((row.count / reports.length) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <tr key={row.name} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-4 text-slate-400">{idx + 1}</td>
                      <td className="py-2 pr-4 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-slate-700">
                        {row.count.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-500">{pct}%</td>
                    </tr>
                  );
                })}
                {dimensionData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Tidak ada data untuk dimensi ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Irregularity & Complaint MoM cards ── */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <OpMetricCard
            icon={Layers}
            label="Irregularity bulan ini"
            value={irregularityMoM.current.toLocaleString('id-ID')}
            caption={`${irregularityMoM.previous} bulan lalu`}
            tone="real"
            currentValue={irregularityMoM.current}
            previousValue={irregularityMoM.previous}
          />
          <OpMetricCard
            icon={TriangleAlert}
            label="Complaint bulan ini"
            value={complaintMoM.current.toLocaleString('id-ID')}
            caption={`${complaintMoM.previous} bulan lalu`}
            tone="real"
            currentValue={complaintMoM.current}
            previousValue={complaintMoM.previous}
          />
        </div>

        {/* ── Export ── */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExport}
            disabled={reports.length === 0}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Memuat data real...
          </div>
        )}
      </AnalyticsSection>

      {/* ═══════════════════════════════════════════════════
          AI INSIGHTS SECTION
         ═══════════════════════════════════════════════════ */}
      <AnalyticsSection
        title="Highlight Prioritas dari AI"
        description="Section AI menggunakan action summary untuk menunjukkan kategori berisiko tinggi dan rekomendasi tindak lanjut. Angka AI ini dipisahkan dari volume real."
        variant="ai"
      >
        <ActionSummaryInsightPanel onStatus={setAiStatus} />
      </AnalyticsSection>
    </div>
  );
}
