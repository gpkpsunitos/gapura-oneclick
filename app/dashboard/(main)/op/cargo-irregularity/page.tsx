'use client';

import { useEffect, useMemo, useState } from 'react';
import { Boxes, Building2, Gauge, Plane } from 'lucide-react';
import { AiReportSummary } from '@/components/ai/AiReportSummary';
import { AnalyticsMetricCard } from '@/components/dashboard/analytics-metric-card';
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
  normalizeStatus,
  pickAirline,
  pickBranch,
} from '@/lib/op-shortcut-analytics';

type CargoReportRow = {
  id: string;
  created_at?: string;
  date_of_event?: string;
  category?: string;
  main_category?: string;
  irregularity_complain_category?: string;
  airlines?: string;
  airline?: string;
  branch?: string;
  reporting_branch?: string;
  report?: string;
  description?: string;
  status?: string;
  severity?: string;
  root_cause?: string;
  root_caused?: string;
};

const SOURCE_CONFIG = getShortcutSourceConfig('cargoIrregularity');

export default function OPCargoIrregularity() {
  const [reports, setReports] = useState<CargoReportRow[]>([]);
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
        const response = await fetchAnalyticsReports<CargoReportRow>(
          { sourceSheet: 'CGO' },
          [
            'id',
            'created_at',
            'date_of_event',
            'category',
            'main_category',
            'irregularity_complain_category',
            'airlines',
            'airline',
            'branch',
            'reporting_branch',
            'report',
            'description',
            'status',
            'severity',
            'root_cause',
            'root_caused',
          ]
        );
        if (!active) return;
        setReports(response.reports || []);
        setRealStatus({
          lastSyncAt: response.timestamp,
          count: response.count,
        });
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat cargo irregularity');
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
    const counts = new Map<string, number>();
    reports.forEach((report) => {
      const category = report.irregularity_complain_category || report.main_category || report.category || 'Unknown';
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);
  }, [reports]);

  const highPriorityCount = useMemo(() => {
    return reports.filter((report) => ['HIGH', 'CRITICAL'].includes(String(report.severity || '').toUpperCase())).length;
  }, [reports]);

  const statusBreakdown = useMemo(() => {
    const counts = reports.reduce<Record<string, number>>((accumulator, report) => {
      const key = normalizeStatus(report.status);
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, { OPEN: 0, PROGRESS: 0, CLOSED: 0 });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
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

  return (
    <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
      <AnalyticsSourceStrip
        title="Logistik Irregularity"
        description="Halaman ini memusatkan data cargo slice (`sourceSheet=CGO`), lalu menampilkan ringkasan AI cargo secara terpisah."
        realSource={SOURCE_CONFIG.realSource}
        realStatus={realStatus}
        aiSource={SOURCE_CONFIG.aiSource}
        aiStatus={aiStatus}
      />

      <AnalyticsSection
        title="Data Real Cargo Slice"
        description="Semua chart di bawah ini hanya membaca laporan real dari dataset `GOOGLE_SHEET_ID` dengan query `sourceSheet=CGO`."
        variant="real"
      >
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-4">
          <AnalyticsMetricCard icon={Boxes} label="Total Cargo Cases" value={reports.length.toLocaleString('id-ID')} caption="Laporan cargo OP" tone="real" />
          <AnalyticsMetricCard icon={Gauge} label="High Priority" value={highPriorityCount.toLocaleString('id-ID')} caption="Severity high atau critical" tone="real" />
          <AnalyticsMetricCard icon={Building2} label="Top Branch" value={topBranches[0]?.name || '-'} caption={`${topBranches[0]?.count || 0} kasus`} tone="real" />
          <AnalyticsMetricCard icon={Plane} label="Top Airline" value={topAirlines[0]?.name || '-'} caption={`${topAirlines[0]?.count || 0} kasus`} tone="real" />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <ResponsivePieChart data={statusBreakdown} title="Distribusi Status Cargo" donut showLegend percentageLabels height="h-[300px]" />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Top Kategori Cargo</h3>
              <p className="text-xs text-slate-600">Kategori kasus dominan pada cargo slice real.</p>
            </div>
            <ResponsiveBarChart data={categoryBreakdown} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[300px]" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Top Branches</h3>
              <p className="text-xs text-slate-600">Cabang dengan volume cargo irregularity tertinggi.</p>
            </div>
            <ResponsiveBarChart data={topBranches} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[300px]" />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Top Airlines</h3>
              <p className="text-xs text-slate-600">Maskapai yang paling sering muncul pada cargo slice real.</p>
            </div>
            <ResponsiveBarChart data={topAirlines} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[300px]" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900">Trend Bulanan Cargo</h3>
            <p className="text-xs text-slate-600">Trend real cargo per kategori yang sudah dinormalisasi.</p>
          </div>
          <ResponsiveLineChart data={monthlyTrend} xAxisKey="month" dataKeys={['Irregularity', 'Complaint', 'Compliment', 'Other']} showLegend height="h-[320px]" />
        </div>

        {loading ? <div className="mt-4 text-sm text-slate-500">Memuat data cargo real...</div> : null}
      </AnalyticsSection>

      <AnalyticsSection
        title="Ringkasan AI Cargo"
        description="AI section ini memakai internal proxy `/api/ai/summarize?category=cgo` dan tetap dipisahkan dari chart data real."
        variant="ai"
      >
        <AiReportSummary source="CGO" onStatus={setAiStatus} />
      </AnalyticsSection>
    </div>
  );
}
