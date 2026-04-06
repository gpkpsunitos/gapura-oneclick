'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ActivitySquare,
  AlertTriangle,
  DatabaseZap,
  Download,
  SearchSlash,
  Target,
} from 'lucide-react';
import { OpMetricCard } from '@/components/dashboard/op-metric-card';
import {
  AnalyticsSection,
  AnalyticsSectionLoading,
  AnalyticsSourceStrip,
  AnalyticsUnavailable,
} from '@/components/dashboard/analytics-source-strip';
import { OpAnalyticsFilterBar, useFilterOptions } from '@/components/dashboard/op-analytics-filter-bar';
import { ResponsiveBarChart } from '@/components/charts/ResponsiveBarChart';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { getShortcutSourceConfig } from '@/lib/op-shortcut-source-matrix';
import type { AnalyticsRuntimeStatus } from '@/lib/op-shortcut-source-matrix';
import {
  fetchAnalyticsReports,
  getReportDate,
  normalizeStatus,
  pickAirline,
} from '@/lib/op-shortcut-analytics';
import { CB_SAFE_PALETTE } from '@/lib/chart-palette';
import type { OpFilterState } from '@/components/dashboard/op-analytics-filter-bar';

/* ─────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────── */

type ReportRow = {
  id: string;
  date_of_event?: string;
  created_at?: string;
  airlines?: string;
  airline?: string;
  area?: string;
  branch?: string;
  reporting_branch?: string;
  hub?: string;
  status?: string;
  category?: string;
  main_category?: string;
  irregularity_complain_category?: string;
  root_cause?: string;
  root_caused?: string;
  action_taken?: string;
  preventive_action?: string;
  description?: string;
  report?: string;
};

type EnrichedRow = ReportRow & {
  resolvedRootCause: string;
  normalizedStatus: 'OPEN' | 'PROGRESS' | 'CLOSED';
};

type TopCategoryEntry = [string, { count: number; percentage?: number }];

interface RootCauseStats {
  total_records: number;
  classified: number;
  unknown: number;
  classification_rate: number | string;
  by_category: Record<string, {
    count: number;
    percentage?: number;
    top_issue_categories?: Record<string, number>;
    top_areas?: Record<string, number>;
    top_airlines?: Record<string, number>;
  }>;
  top_categories?: TopCategoryEntry[];
  cached?: boolean;
  stale?: boolean;
  generatedAt?: string;
  sourceSyncAt?: string | null;
}

/* ─────────────────────────────────────────────────────
   Config & Helpers
   ───────────────────────────────────────────────────── */

const SOURCE_CONFIG = getShortcutSourceConfig('rootCauseDominant');
const INVALID_ROOT_CAUSE_VALUES = new Set(['', '-', '#n/a', 'n/a', 'na', 'unknown', 'null', 'none', 'belum diketahui']);

function normalizeRootCause(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (INVALID_ROOT_CAUSE_VALUES.has(normalized.toLowerCase())) return '';
  return normalized;
}

function computeMoMDelta(
  reports: EnrichedRow[],
  getDate: (r: EnrichedRow) => string | undefined,
  filter: (r: EnrichedRow) => boolean,
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

export default function OPRootCauseDominant() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [realLoading, setRealLoading] = useState(true);
  const [realError, setRealError] = useState<string | null>(null);
  const [realStatus, setRealStatus] = useState<AnalyticsRuntimeStatus>();

  const [stats, setStats] = useState<RootCauseStats | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AnalyticsRuntimeStatus>();

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

    async function loadReal() {
      try {
        setRealLoading(true);
        setRealError(null);
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
            'id', 'date_of_event', 'created_at', 'airlines', 'airline',
            'area', 'category', 'main_category', 'irregularity_complain_category',
            'root_cause', 'root_caused', 'action_taken', 'preventive_action',
            'description', 'report', 'branch', 'reporting_branch', 'hub', 'status',
          ],
          controller.signal,
        );
        if (!active) return;
        setReports(response.reports || []);
        setRealStatus({ lastSyncAt: response.timestamp, count: response.count });
      } catch (loadError) {
        if (!active) return;
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
        setRealError(loadError instanceof Error ? loadError.message : 'Gagal memuat root cause real');
      } finally {
        if (active) setRealLoading(false);
      }
    }

    loadReal();
    return () => {
      active = false;
      controller.abort();
    };
  }, [filters]);

  /* ── AI fetch ── */
  useEffect(() => {
    let active = true;

    async function loadAi() {
      try {
        setAiLoading(true);
        setAiError(null);
        const response = await fetch('/api/ai/root-cause/stats', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as RootCauseStats;
        if (!active) return;
        setStats(payload);
        setAiStatus({
          cached: payload.cached,
          stale: payload.stale,
          generatedAt: payload.generatedAt,
          sourceSyncAt: payload.sourceSyncAt,
        });
      } catch (loadError) {
        if (!active) return;
        setAiError(loadError instanceof Error ? loadError.message : 'Gagal memuat statistik AI');
      } finally {
        if (active) setAiLoading(false);
      }
    }

    loadAi();
    return () => { active = false; };
  }, []);

  /* ── Derived data ── */
  const enrichedReports: EnrichedRow[] = useMemo(() => {
    return reports.map((report) => ({
      ...report,
      resolvedRootCause: normalizeRootCause(report.root_cause || report.root_caused),
      normalizedStatus: normalizeStatus(report.status),
    }));
  }, [reports]);

  const filterOptions = useFilterOptions(reports);

  const coverageData = useMemo(() => {
    const withRootCause = enrichedReports.filter((r) => r.resolvedRootCause).length;
    const withoutRootCause = enrichedReports.length - withRootCause;
    return [
      { name: 'With Root Cause', value: withRootCause },
      { name: 'Missing Root Cause', value: withoutRootCause },
    ];
  }, [enrichedReports]);

  const topRootCauses = useMemo(() => {
    const counts = new Map<string, number>();
    enrichedReports.forEach((r) => {
      if (!r.resolvedRootCause) return;
      counts.set(r.resolvedRootCause, (counts.get(r.resolvedRootCause) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [enrichedReports]);

  const categoryCoverage = useMemo(() => {
    const counts = new Map<string, number>();
    enrichedReports.forEach((r) => {
      if (!r.resolvedRootCause) return;
      const category = r.irregularity_complain_category || r.category || r.main_category || 'Unknown';
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [enrichedReports]);

  /* MoM deltas */
  const totalMoM = useMemo(
    () => computeMoMDelta(enrichedReports, (r) => r.date_of_event || r.created_at, () => true),
    [enrichedReports],
  );
  const withRootCauseMoM = useMemo(
    () => computeMoMDelta(enrichedReports, (r) => r.date_of_event || r.created_at, (r) => Boolean(r.resolvedRootCause)),
    [enrichedReports],
  );

  /* AI-derived charts */
  const aiTopCategories = useMemo(() => {
    if (!stats) return [];
    const entries: TopCategoryEntry[] = stats.top_categories
      ? stats.top_categories
      : Object.entries(stats.by_category).map(([name, info]) => [name, { count: info.count, percentage: info.percentage }]);
    return [...entries]
      .sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0))
      .slice(0, 8)
      .map(([name, info]) => ({ name, value: info.count }));
  }, [stats]);

  const aiCategoryBreakdown = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.by_category)
      .map(([name, info]) => ({
        name,
        count: info.count,
        percentage: Math.round((info.percentage || 0) * 10) / 10,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [stats]);

  const aiClassificationRate = useMemo(() => {
    const value = parseFloat(String(stats?.classification_rate || 0).replace('%', ''));
    return Number.isFinite(value) ? value : 0;
  }, [stats]);

  /* ── Handlers ── */
  const handleExport = () => {
    const exportData = enrichedReports.map((r) => ({
      Date: r.date_of_event || r.created_at || '',
      Airline: pickAirline(r),
      Area: r.area || '',
      Category: r.category || r.main_category || '',
      Irregularity: r.irregularity_complain_category || '',
      RootCause: r.resolvedRootCause || '(empty)',
      ActionTaken: r.action_taken || '',
      PreventiveAction: r.preventive_action || '',
    }));
    exportToCSV(exportData, 'op_root_cause');
  };

  return (
    <div className="min-h-screen space-y-5 px-3 py-4 sm:px-4 md:px-6 md:py-6">
      {/* ── Source strip header ── */}
      <AnalyticsSourceStrip
        title="Root Cause Dominan"
        description="Bandingkan root cause yang diisi pada Google Sheets dengan hasil klasifikasi AI root cause. Keduanya dipisah agar sumber kebenaran tetap jelas."
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
        title="Cakupan Root Cause pada Data Real"
        description="Section ini fokus pada field root cause yang diisi pada dataset Google Sheets, termasuk coverage dan pola penyebab."
        variant="real"
      >
        {realError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{realError}</div>
        )}

        {/* ── KPI Cards with Trend Indicators ── */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OpMetricCard
            icon={DatabaseZap}
            label="Total Records"
            value={enrichedReports.length.toLocaleString('id-ID')}
            caption="Baris laporan pada dataset"
            tone="real"
            currentValue={totalMoM.current}
            previousValue={totalMoM.previous}
          />
          <OpMetricCard
            icon={ActivitySquare}
            label="Coverage"
            value={`${Math.round(((coverageData[0]?.value || 0) / Math.max(enrichedReports.length, 1)) * 100)}%`}
            caption="Laporan dengan root cause terisi"
            tone="real"
            currentValue={withRootCauseMoM.current}
            previousValue={withRootCauseMoM.previous}
          />
          <OpMetricCard
            icon={Target}
            label="Top Root Cause"
            value={topRootCauses[0]?.name || '-'}
            caption={`${topRootCauses[0]?.count || 0} laporan`}
            tone="real"
          />
          <OpMetricCard
            icon={SearchSlash}
            label="Missing Root Cause"
            value={(coverageData[1]?.value || 0).toLocaleString('id-ID')}
            caption="Masih kosong atau invalid"
            tone="real"
          />
        </div>

        {/* ── Charts Row 1: Coverage Pie + Top Root Causes Bar ── */}
        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <ResponsivePieChart
              data={coverageData}
              title="Root Cause Coverage"
              donut
              showLegend
              percentageLabels
              height="h-[300px]"
            />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Top Root Cause Terisi</h3>
              <p className="text-xs text-slate-600">Hanya menghitung root cause yang benar-benar diisi pada dataset real.</p>
            </div>
            <ResponsiveBarChart
              data={topRootCauses}
              xAxisKey="name"
              dataKeys={['count']}
              showLegend={false}
              height="h-[300px]"
            />
          </div>
        </div>

        {/* ── Charts Row 2: Category Coverage ── */}
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900">Kategori dengan Root Cause Terbanyak</h3>
            <p className="text-xs text-slate-600">Distribusi kategori laporan yang paling sering menyertakan root cause.</p>
          </div>
          <ResponsiveBarChart
            data={categoryCoverage}
            xAxisKey="name"
            dataKeys={['count']}
            showLegend={false}
            height="h-[320px]"
          />
        </div>

        {/* ── Export ── */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExport}
            disabled={enrichedReports.length === 0}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>

        {realLoading && (
          <div className="mt-4 text-sm text-slate-500">Memuat data real...</div>
        )}
      </AnalyticsSection>

      {/* ═══════════════════════════════════════════════════
          AI ROOT CAUSE CLASSIFICATION SECTION
         ═══════════════════════════════════════════════════ */}
      <AnalyticsSection
        title="Klasifikasi Root Cause dari AI"
        description="AI section mengambil data dari /api/ai/root-cause/stats. Angka ini adalah hasil klasifikasi model, bukan isian manual dari Google Sheets."
        variant="ai"
      >
        {aiError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{aiError}</div>
        ) : aiLoading ? (
          <AnalyticsSectionLoading
            variant="ai"
            title="Memuat klasifikasi root cause AI"
            description="Model AI sedang menyusun kategori root cause, coverage klasifikasi, dan ringkasan issue dominan."
            cards={4}
            panels={3}
          />
        ) : stats ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OpMetricCard
                icon={DatabaseZap}
                label="Total Records"
                value={(stats.total_records || 0).toLocaleString('id-ID')}
                caption="Record yang dianalisis AI"
                tone="ai"
              />
              <OpMetricCard
                icon={ActivitySquare}
                label="Classified"
                value={(stats.classified || 0).toLocaleString('id-ID')}
                caption="Berhasil diklasifikasi"
                tone="ai"
              />
              <OpMetricCard
                icon={AlertTriangle}
                label="Unknown"
                value={(stats.unknown || 0).toLocaleString('id-ID')}
                caption="Masih unknown menurut model"
                tone="ai"
              />
              <OpMetricCard
                icon={Target}
                label="Classification Rate"
                value={`${aiClassificationRate.toFixed(1)}%`}
                caption="Coverage klasifikasi AI"
                tone="ai"
              />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
                <ResponsivePieChart
                  data={aiTopCategories}
                  title="Top Root Cause AI"
                  donut
                  showLegend
                  percentageLabels
                  height="h-[300px]"
                />
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-black text-slate-900">Breakdown Kategori AI</h3>
                  <p className="text-xs text-slate-600">Kategori root cause hasil klasifikasi model dengan jumlah record terbanyak.</p>
                </div>
                <ResponsiveBarChart
                  data={aiCategoryBreakdown}
                  xAxisKey="name"
                  dataKeys={['count']}
                  showLegend={false}
                  height="h-[300px]"
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-white/90 p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(stats.by_category || {}).slice(0, 6).map(([name, info]) => (
                  <div key={name} className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-slate-900">{name}</h3>
                      <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                        {info.count} cases
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {info.top_issue_categories
                        ? `Top issues: ${Object.keys(info.top_issue_categories).slice(0, 3).join(', ')}`
                        : 'Belum ada detail issue.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <AnalyticsUnavailable
            title="Klasifikasi root cause AI belum tersedia"
            description="Proxy AI tidak mengembalikan payload root cause yang valid."
          />
        )}
      </AnalyticsSection>
    </div>
  );
}
