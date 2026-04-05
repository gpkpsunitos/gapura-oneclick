'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FolderKanban, MessagesSquare, UserRound } from 'lucide-react';
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
  classifyReportSource,
  fetchAnalyticsReports,
  getReportDate,
  normalizeIssueCategory,
} from '@/lib/op-shortcut-analytics';

type ReportRow = {
  id: string;
  reporter_name?: string;
  reporter_email?: string;
  category?: string;
  main_category?: string;
  irregularity_complain_category?: string;
  case_classification?: string;
  report?: string;
  description?: string;
  created_at?: string;
  date_of_event?: string;
  source_sheet?: string;
  status?: string;
  severity?: string;
  branch?: string;
  title?: string;
  target_division?: string;
};

const SOURCE_CONFIG = getShortcutSourceConfig('complaintByCategory');
const CATEGORY_ORDER = ['Complaint', 'Irregularity', 'Compliment', 'Accidents / Incidents', 'Other'] as const;

export default function OPComplaintByCategory() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORY_ORDER)[number]>('Complaint');
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
            'reporter_name',
            'reporter_email',
            'category',
            'main_category',
            'irregularity_complain_category',
            'case_classification',
            'report',
            'description',
            'created_at',
            'date_of_event',
            'source_sheet',
            'status',
            'severity',
            'branch',
            'title',
            'target_division',
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
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat data');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const categorizedReports = useMemo(() => {
    return reports.map((report) => ({
      ...report,
      normalizedCategory: normalizeIssueCategory(
        report.case_classification ||
          report.main_category ||
          report.category ||
          report.irregularity_complain_category ||
          report.description ||
          report.report
      ),
      sourceType: classifyReportSource(report),
    }));
  }, [reports]);

  const sourceBreakdown = useMemo(() => {
    const customer = categorizedReports.filter((report) => report.sourceType === 'Customer').length;
    const internal = categorizedReports.length - customer;
    return [
      { name: 'Customer', value: customer },
      { name: 'Internal', value: internal },
    ];
  }, [categorizedReports]);

  const categoryBreakdown = useMemo(() => {
    return CATEGORY_ORDER.map((categoryName) => ({
      name: categoryName,
      count: categorizedReports.filter((report) => report.normalizedCategory === categoryName).length,
    }));
  }, [categorizedReports]);

  const monthlyTrend = useMemo(() => {
    return buildMonthlySeries(
      categorizedReports,
      (report) => report.date_of_event || report.created_at,
      (report) => report.normalizedCategory
    );
  }, [categorizedReports]);

  const byCategory = useMemo(() => {
    return CATEGORY_ORDER.reduce<Record<(typeof CATEGORY_ORDER)[number], ReportRow[]>>((accumulator, categoryName) => {
      accumulator[categoryName] = categorizedReports.filter((report) => report.normalizedCategory === categoryName);
      return accumulator;
    }, {
      Complaint: [],
      Irregularity: [],
      Compliment: [],
      'Accidents / Incidents': [],
      Other: [],
    });
  }, [categorizedReports]);

  const topCategory = useMemo(() => {
    return [...categoryBreakdown].sort((left, right) => right.count - left.count)[0];
  }, [categoryBreakdown]);

  const latestReportLabel = useMemo(() => {
    const latest = categorizedReports
      .map((report) => getReportDate(report.date_of_event || report.created_at))
      .filter((date): date is Date => Boolean(date))
      .sort((left, right) => right.getTime() - left.getTime())[0];
    return latest
      ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(latest)
      : '-';
  }, [categorizedReports]);

  return (
    <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
      <AnalyticsSourceStrip
        title="Complaint per Category"
        description="Audit kategori laporan menggunakan data real dari Google Sheets, lalu tampilkan rekomendasi AI secara terpisah."
        realSource={SOURCE_CONFIG.realSource}
        realStatus={realStatus}
        aiSource={SOURCE_CONFIG.aiSource}
        aiStatus={aiStatus}
      />

      <AnalyticsSection
        title="Distribusi Kategori dan Sumber Laporan"
        description="Section ini hanya menampilkan data real dari dataset laporan utama yang mengikuti `GOOGLE_SHEET_ID`."
        variant="real"
      >
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-4">
          <AnalyticsMetricCard
            icon={ClipboardList}
            label="Total Reports"
            value={categorizedReports.length.toLocaleString('id-ID')}
            caption="Semua laporan pada dataset"
            tone="real"
          />
          <AnalyticsMetricCard
            icon={MessagesSquare}
            label="Customer Source"
            value={(sourceBreakdown.find((entry) => entry.name === 'Customer')?.value || 0).toLocaleString('id-ID')}
            caption="Laporan yang berasal dari pelanggan"
            tone="real"
          />
          <AnalyticsMetricCard
            icon={UserRound}
            label="Internal Source"
            value={(sourceBreakdown.find((entry) => entry.name === 'Internal')?.value || 0).toLocaleString('id-ID')}
            caption="Laporan internal operasional"
            tone="real"
          />
          <AnalyticsMetricCard
            icon={FolderKanban}
            label="Top Category"
            value={topCategory?.name || '-'}
            caption={`Update terbaru ${latestReportLabel}`}
            tone="real"
          />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <ResponsivePieChart
              data={sourceBreakdown}
              title="Sumber Laporan"
              donut
              showLegend
              percentageLabels
              height="h-[300px]"
            />
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Kategori Laporan OP</h3>
              <p className="text-xs text-slate-600">Breakdown kategori setelah normalisasi case classification dan metadata laporan.</p>
            </div>
            <ResponsiveBarChart
              data={categoryBreakdown}
              xAxisKey="name"
              dataKeys={['count']}
              showLegend={false}
              height="h-[300px]"
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900">Trend Bulanan per Kategori</h3>
            <p className="text-xs text-slate-600">Chart trend menjaga pemisahan kategori real tanpa mencampur hasil AI.</p>
          </div>
          <ResponsiveLineChart
            data={monthlyTrend}
            xAxisKey="month"
            dataKeys={['Complaint', 'Irregularity', 'Compliment', 'Accidents / Incidents', 'Other']}
            showLegend
            height="h-[320px]"
          />
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {CATEGORY_ORDER.map((categoryName) => (
              <button
                key={categoryName}
                onClick={() => setSelectedCategory(categoryName)}
                className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] ${
                  selectedCategory === categoryName
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {categoryName} ({byCategory[categoryName].length})
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-[26rem] divide-y divide-slate-100 overflow-auto bg-white">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-sm text-slate-500">Memuat data real...</div>
              ) : byCategory[selectedCategory].length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-slate-500">Tidak ada laporan pada kategori ini.</div>
              ) : (
                byCategory[selectedCategory].slice(0, 100).map((report) => (
                  <div key={report.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {report.title || report.report || report.description || '(Tanpa Judul)'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedCategory} • {report.source_sheet || '-'} • {report.branch || '-'}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/op/reports/${report.id}`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700"
                    >
                      Detail
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title="Prioritas dan Rekomendasi dari AI"
        description="Layer AI menggunakan internal proxy `/api/ai/action-summary` dan tidak dicampur ke chart data real."
        variant="ai"
      >
        <ActionSummaryInsightPanel onStatus={setAiStatus} />
      </AnalyticsSection>
    </div>
  );
}
