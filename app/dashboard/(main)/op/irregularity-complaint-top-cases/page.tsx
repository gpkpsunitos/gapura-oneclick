'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Plane, TrendingUp, TriangleAlert } from 'lucide-react';
import { AnalyticsMetricCard } from '@/components/dashboard/analytics-metric-card';
import { ActionSummaryInsightPanel } from '@/components/dashboard/action-summary-insight-panel';
import { AnalyticsSection, AnalyticsSourceStrip } from '@/components/dashboard/analytics-source-strip';
import { ResponsiveBarChart } from '@/components/charts/ResponsiveBarChart';
import { ResponsiveLineChart } from '@/components/charts/ResponsiveLineChart';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { getShortcutSourceConfig } from '@/lib/op-shortcut-source-matrix';
import type { AnalyticsRuntimeStatus } from '@/lib/op-shortcut-source-matrix';
import {
  buildMonthlySeries,
  fetchAnalyticsReports,
  normalizeIssueCategory,
  pickAirline,
  pickBranch,
} from '@/lib/op-shortcut-analytics';

type ReportRow = {
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
};

const SOURCE_CONFIG = getShortcutSourceConfig('topIrregularityComplaint');

export default function OPTopIrregularityComplaintCases() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realStatus, setRealStatus] = useState<AnalyticsRuntimeStatus>();
  const [aiStatus, setAiStatus] = useState<AnalyticsRuntimeStatus>();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchAnalyticsReports<ReportRow>(
          {},
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
          ]
        );
        if (!active) return;
        const filtered = (response.reports || []).filter((report) => {
          const normalized = normalizeIssueCategory(report.category || report.main_category || report.irregularity_complain_category);
          return normalized === 'Irregularity' || normalized === 'Complaint';
        });
        setReports(filtered);
        setRealStatus({
          lastSyncAt: response.timestamp,
          count: filtered.length,
        });
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat top irregularity');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const categoryBreakdown = useMemo(() => {
    const categoryMap = new Map<string, number>();
    reports.forEach((report) => {
      const category = report.irregularity_complain_category || report.main_category || report.category || 'Unknown';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);
  }, [reports]);

  const topBranches = useMemo(() => {
    const branchMap = new Map<string, number>();
    reports.forEach((report) => {
      const branch = pickBranch(report);
      branchMap.set(branch, (branchMap.get(branch) || 0) + 1);
    });
    return Array.from(branchMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);
  }, [reports]);

  const topAirlines = useMemo(() => {
    const airlineMap = new Map<string, number>();
    reports.forEach((report) => {
      const airline = pickAirline(report);
      airlineMap.set(airline, (airlineMap.get(airline) || 0) + 1);
    });
    return Array.from(airlineMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);
  }, [reports]);

  const monthlyTrend = useMemo(() => {
    return buildMonthlySeries(
      reports,
      (report) => report.created_at || report.date_of_event,
      (report) => normalizeIssueCategory(report.category || report.main_category || report.irregularity_complain_category)
    );
  }, [reports]);

  const overallBreakdown = useMemo(() => {
    const irregularity = reports.filter((report) => normalizeIssueCategory(report.category || report.main_category || report.irregularity_complain_category) === 'Irregularity').length;
    const complaint = reports.length - irregularity;
    return [
      { name: 'Irregularity', value: irregularity },
      { name: 'Complaint', value: complaint },
    ];
  }, [reports]);

  const topCategory = categoryBreakdown[0];

  return (
    <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
      <AnalyticsSourceStrip
        title="Top Irregularity & Complaint"
        description="Halaman ini memisahkan ranking real kasus irregularity/complaint OP dari prioritas kategori yang dihitung AI."
        realSource={SOURCE_CONFIG.realSource}
        realStatus={realStatus}
        aiSource={SOURCE_CONFIG.aiSource}
        aiStatus={aiStatus}
      />

      <AnalyticsSection
        title="Top Kasus dari Data Real"
        description="Chart real di bawah ini berasal dari laporan aktual dan menampilkan ranking kategori, cabang, serta maskapai tanpa campur tangan model AI."
        variant="real"
      >
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-4">
          <AnalyticsMetricCard icon={TrendingUp} label="Total Records" value={reports.length.toLocaleString('id-ID')} caption="Kasus irregularity + complaint" tone="real" />
          <AnalyticsMetricCard icon={TriangleAlert} label="Top Category" value={topCategory?.name || '-'} caption={`${topCategory?.count || 0} kasus`} tone="real" />
          <AnalyticsMetricCard icon={Building2} label="Top Branch" value={topBranches[0]?.name || '-'} caption={`${topBranches[0]?.count || 0} kasus`} tone="real" />
          <AnalyticsMetricCard icon={Plane} label="Top Airline" value={topAirlines[0]?.name || '-'} caption={`${topAirlines[0]?.count || 0} kasus`} tone="real" />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <ResponsivePieChart data={overallBreakdown} title="Irregularity vs Complaint" donut showLegend percentageLabels height="h-[300px]" />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Top Kategori Kasus</h3>
              <p className="text-xs text-slate-600">Kategori kasus paling dominan berdasarkan data laporan real.</p>
            </div>
            <ResponsiveBarChart data={categoryBreakdown} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[300px]" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Top Branches</h3>
              <p className="text-xs text-slate-600">Cabang dengan kasus irregularity/complaint terbanyak.</p>
            </div>
            <ResponsiveBarChart data={topBranches} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[300px]" />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Top Airlines</h3>
              <p className="text-xs text-slate-600">Maskapai dengan kasus irregularity/complaint terbanyak pada data real.</p>
            </div>
            <ResponsiveBarChart data={topAirlines} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[300px]" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900">Trend Bulanan Kasus</h3>
            <p className="text-xs text-slate-600">Trend real per bulan untuk membedakan dominasi irregularity dan complaint.</p>
          </div>
          <ResponsiveLineChart data={monthlyTrend} xAxisKey="month" dataKeys={['Irregularity', 'Complaint']} showLegend height="h-[320px]" />
        </div>

        {loading ? <div className="mt-4 text-sm text-slate-500">Memuat data real...</div> : null}
      </AnalyticsSection>

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
