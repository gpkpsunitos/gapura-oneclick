'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
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

const SOURCE_CONFIG = getShortcutSourceConfig('topIrregularityComplaint');

const DIMENSION_LABELS: Record<TopDimension, string> = {
  category: 'Case Category',
  branch: 'Branch',
  airline: 'Airline',
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

export default function OPTopIrregularityComplaintCases() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realStatus, setRealStatus] = useState<AnalyticsRuntimeStatus>();
  const [aiStatus, setAiStatus] = useState<AnalyticsRuntimeStatus>();
  const [topDimension, setTopDimension] = useState<TopDimension>('category');

  const [filters, setFilters] = useState<OpFilterState>({
    dateFrom: undefined,
    dateTo: undefined,
    hub: undefined,
    branch: undefined,
    airlines: undefined,
    sourceSheet: 'all',
  });

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
        setError(loadError instanceof Error ? loadError.message : 'Failed to load top irregularity data');
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
      <Link
        href="/dashboard/op"
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to OP Dashboard
      </Link>

      {}
      <AnalyticsSourceStrip
        title="Top Irregularity & Complaint"
        description="This page separates the real ranking of irregularity/complaint cases from AI-calculated category priorities."
        realSource={SOURCE_CONFIG.realSource}
        realStatus={realStatus}
        aiSource={SOURCE_CONFIG.aiSource}
        aiStatus={aiStatus}
      />

      {}
      <OpAnalyticsFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        hubOptions={filterOptions.hubOptions}
        branchOptions={filterOptions.branchOptions}
        airlineOptions={filterOptions.airlineOptions}
        showSourceSheetToggle
      />

      {}
      <AnalyticsSection
        title="Top Cases from Real Data"
        description="The real charts below are sourced from actual reports and display category, branch, and airline rankings without AI model intervention."
        variant="real"
      >
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OpMetricCard
            icon={TrendingUp}
            label="Total Records"
            value={reports.length.toLocaleString('en-US')}
            caption="Irregularity + complaint cases"
            tone="real"
            currentValue={totalMoM.current}
            previousValue={totalMoM.previous}
          />
          <OpMetricCard
            icon={TriangleAlert}
            label="Top Category"
            value={topCategory?.name || '-'}
            caption={`${topCategory?.count || 0} cases`}
            tone="real"
            badge={topCategory ? 'TOP' : undefined}
            badgeTone="emerald"
          />
          <OpMetricCard
            icon={Building2}
            label="Top Branch"
            value={topBranches[0]?.name || '-'}
            caption={`${topBranches[0]?.count || 0} cases`}
            tone="real"
            currentValue={topBranches[0]?.count}
            previousValue={topBranches[1]?.count}
          />
          <OpMetricCard
            icon={Plane}
            label="Top Airline"
            value={topAirlines[0]?.name || '-'}
            caption={`${topAirlines[0]?.count || 0} cases`}
            tone="real"
          />
        </div>

        {}
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
              <h3 className="text-sm font-black text-slate-900">Monthly Case Trend</h3>
              <p className="text-xs text-slate-600">
                Real monthly trend comparison of irregularity vs complaint.
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

        {}
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Drill-Down: Top {DIMENSION_LABELS[topDimension]}
              </h3>
              <p className="text-xs text-slate-600">
                Ranking {DIMENSION_LABELS[topDimension].toLowerCase()} by real case volume.
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

          {}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 pr-4 font-black uppercase tracking-[0.12em]">#</th>
                  <th className="pb-2 pr-4 font-black uppercase tracking-[0.12em]">
                    {DIMENSION_LABELS[topDimension]}
                  </th>
                  <th className="pb-2 pr-4 font-black uppercase tracking-[0.12em] text-right">
                    Cases
                  </th>
                  <th className="pb-2 font-black uppercase tracking-[0.12em] text-right">
                    Proportion
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
                        {row.count.toLocaleString('en-US')}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-500">{pct}%</td>
                    </tr>
                  );
                })}
                {dimensionData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No data for this dimension.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <OpMetricCard
            icon={Layers}
            label="Irregularity this month"
            value={irregularityMoM.current.toLocaleString('en-US')}
            caption={`${irregularityMoM.previous} last month`}
            tone="real"
            currentValue={irregularityMoM.current}
            previousValue={irregularityMoM.previous}
          />
          <OpMetricCard
            icon={TriangleAlert}
            label="Complaint this month"
            value={complaintMoM.current.toLocaleString('en-US')}
            caption={`${complaintMoM.previous} last month`}
            tone="real"
            currentValue={complaintMoM.current}
            previousValue={complaintMoM.previous}
          />
        </div>

        {}
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
            Loading real data...
          </div>
        )}
      </AnalyticsSection>

      {}
      <AnalyticsSection
        title="AI Priority Highlights"
        description="The AI section uses action summary to show high-risk categories and follow-up recommendations. AI figures are separated from real volume."
        variant="ai"
      >
        <ActionSummaryInsightPanel onStatus={setAiStatus} />
      </AnalyticsSection>
    </div>
  );
}
