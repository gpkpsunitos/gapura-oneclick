'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, FolderClock, Gauge, ShieldCheck } from 'lucide-react';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';
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
  getReportDate,
  normalizeStatus,
  pickAirline,
  pickBranch,
} from '@/lib/op-shortcut-analytics';
import type { QueryResult } from '@/types/builder';

type ReportRow = {
  id: string;
  created_at?: string;
  date_of_event?: string;
  status?: string;
  severity?: string;
  report?: string;
  title?: string;
  airlines?: string;
  airline?: string;
  branch?: string;
  hub?: string;
  category?: string;
  main_category?: string;
  reporter_name?: string;
  flight_number?: string;
  evidence_url?: string;
  evidence_urls?: string[];
};

const SOURCE_CONFIG = getShortcutSourceConfig('caseStatus');

export default function OPCaseStatus() {
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
            'status',
            'severity',
            'report',
            'title',
            'airlines',
            'airline',
            'branch',
            'hub',
            'category',
            'main_category',
            'reporter_name',
            'flight_number',
            'evidence_url',
            'evidence_urls',
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
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat status case');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const statusDistribution = useMemo(() => {
    const counts = reports.reduce<Record<'OPEN' | 'PROGRESS' | 'CLOSED', number>>((accumulator, report) => {
      const key = normalizeStatus(report.status);
      accumulator[key] += 1;
      return accumulator;
    }, { OPEN: 0, PROGRESS: 0, CLOSED: 0 });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const agingBuckets = useMemo(() => {
    const counts = {
      '0-7 Hari': 0,
      '8-30 Hari': 0,
      '31-90 Hari': 0,
      '>90 Hari': 0,
    };

    reports.forEach((report) => {
      if (normalizeStatus(report.status) === 'CLOSED') return;
      const date = getReportDate(report.created_at || report.date_of_event);
      if (!date) return;
      const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 7) counts['0-7 Hari'] += 1;
      else if (days <= 30) counts['8-30 Hari'] += 1;
      else if (days <= 90) counts['31-90 Hari'] += 1;
      else counts['>90 Hari'] += 1;
    });

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [reports]);

  const monthlyTrend = useMemo(() => {
    return buildMonthlySeries(
      reports,
      (report) => report.created_at || report.date_of_event,
      (report) => normalizeStatus(report.status)
    );
  }, [reports]);

  const openCases = useMemo(() => statusDistribution.find((entry) => entry.name === 'OPEN')?.value || 0, [statusDistribution]);
  const progressCases = useMemo(() => statusDistribution.find((entry) => entry.name === 'PROGRESS')?.value || 0, [statusDistribution]);
  const closedCases = useMemo(() => statusDistribution.find((entry) => entry.name === 'CLOSED')?.value || 0, [statusDistribution]);
  const closedRate = useMemo(() => {
    return reports.length > 0 ? Math.round((closedCases / reports.length) * 100) : 0;
  }, [closedCases, reports.length]);

  const tableData: QueryResult = useMemo(() => {
    const rows = reports
      .slice()
      .sort((left, right) => {
        const leftTime = getReportDate(left.created_at || left.date_of_event)?.getTime() || 0;
        const rightTime = getReportDate(right.created_at || right.date_of_event)?.getTime() || 0;
        return rightTime - leftTime;
      })
      .map((report) => ({
        id: report.id,
        created_at: report.created_at || report.date_of_event || '',
        status: normalizeStatus(report.status),
        severity: report.severity || '',
        report: report.report || report.title || '',
        airlines: pickAirline(report),
        branch: pickBranch(report),
        hub: report.hub || '',
        category: report.category || report.main_category || '',
        reporter_name: report.reporter_name || '',
        flight_number: report.flight_number || '',
        evidence_url: Array.isArray(report.evidence_urls) ? report.evidence_urls.join(' | ') : report.evidence_url || '',
      }));

    return {
      columns: ['created_at', 'status', 'severity', 'report', 'airlines', 'branch', 'hub', 'category', 'reporter_name', 'flight_number', 'evidence_url'],
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [reports]);

  return (
    <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
      <AnalyticsSourceStrip
        title="Status Case"
        description="Pisahkan distribusi status aktual dari laporan dan rekomendasi AI prioritisasi. Section real di bawah ini sepenuhnya berasal dari Google Sheets."
        realSource={SOURCE_CONFIG.realSource}
        realStatus={realStatus}
        aiSource={SOURCE_CONFIG.aiSource}
        aiStatus={aiStatus}
      />

      <AnalyticsSection
        title="Distribusi Status dan Aging Kasus"
        description="Semua chart di bawah ini berasal dari laporan real pada dataset utama dan dipakai untuk melihat status, aging bucket, dan trend status dari waktu ke waktu."
        variant="real"
      >
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-4">
          <AnalyticsMetricCard icon={Gauge} label="Total Cases" value={reports.length.toLocaleString('id-ID')} caption="Semua kasus pada dataset" tone="real" />
          <AnalyticsMetricCard icon={Clock} label="Open" value={openCases.toLocaleString('id-ID')} caption="Belum ditutup" tone="real" />
          <AnalyticsMetricCard icon={FolderClock} label="In Progress" value={progressCases.toLocaleString('id-ID')} caption="Masih berjalan" tone="real" />
          <AnalyticsMetricCard icon={ShieldCheck} label="Closed Rate" value={`${closedRate}%`} caption={`${closedCases.toLocaleString('id-ID')} kasus selesai`} tone="real" />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <ResponsivePieChart data={statusDistribution} title="Distribusi Status" donut showLegend percentageLabels height="h-[300px]" />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Aging Bucket Kasus Terbuka</h3>
              <p className="text-xs text-slate-600">Kasus closed dikeluarkan dari chart aging agar fokus pada backlog aktif.</p>
            </div>
            <ResponsiveBarChart data={agingBuckets} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[300px]" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900">Trend Bulanan Status</h3>
            <p className="text-xs text-slate-600">Trend dibangun dari data real tanpa rekomendasi atau pengayaan AI.</p>
          </div>
          <ResponsiveLineChart data={monthlyTrend} xAxisKey="month" dataKeys={['OPEN', 'PROGRESS', 'CLOSED']} showLegend height="h-[320px]" />
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <DataTableWithPagination
            data={tableData}
            title="Daftar Kasus Real"
            isLoading={loading}
            rowsPerPage={15}
            columnClasses={{
              created_at: 'whitespace-nowrap w-48',
              report: 'min-w-[36rem] w-[44rem] leading-relaxed',
            }}
            onRowClick={(row) => {
              const id = typeof row.id === 'string' ? row.id : undefined;
              if (id) window.open(`/dashboard/op/reports/${id}`, '_blank');
            }}
          />
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title="Prioritas Penanganan dari AI"
        description="AI action summary dipakai sebagai lapisan prioritisasi, bukan sebagai sumber jumlah kasus. Karena itu chart dan rekomendasinya ditempatkan terpisah."
        variant="ai"
      >
        <ActionSummaryInsightPanel onStatus={setAiStatus} />
      </AnalyticsSection>
    </div>
  );
}
