'use client';

import { useEffect, useMemo, useState } from 'react';
import { ActivitySquare, AlertTriangle, DatabaseZap, SearchSlash, Target } from 'lucide-react';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';
import { AnalyticsMetricCard } from '@/components/dashboard/analytics-metric-card';
import {
  AnalyticsSection,
  AnalyticsSectionLoading,
  AnalyticsSourceStrip,
  AnalyticsUnavailable,
} from '@/components/dashboard/analytics-source-strip';
import { ResponsiveBarChart } from '@/components/charts/ResponsiveBarChart';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { getShortcutSourceConfig } from '@/lib/op-shortcut-source-matrix';
import type { AnalyticsRuntimeStatus } from '@/lib/op-shortcut-source-matrix';
import { fetchAnalyticsReports, pickAirline } from '@/lib/op-shortcut-analytics';
import type { QueryResult } from '@/types/builder';

type ReportRow = {
  id: string;
  date_of_event?: string;
  created_at?: string;
  airlines?: string;
  airline?: string;
  area?: string;
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

const SOURCE_CONFIG = getShortcutSourceConfig('rootCauseDominant');
const INVALID_ROOT_CAUSE_VALUES = new Set(['', '-', '#n/a', 'n/a', 'na', 'unknown', 'null', 'none', 'belum diketahui']);

function normalizeRootCause(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (INVALID_ROOT_CAUSE_VALUES.has(normalized.toLowerCase())) return '';
  return normalized;
}

export default function OPRootCauseDominant() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [realLoading, setRealLoading] = useState(true);
  const [realError, setRealError] = useState<string | null>(null);
  const [realStatus, setRealStatus] = useState<AnalyticsRuntimeStatus>();

  const [stats, setStats] = useState<RootCauseStats | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AnalyticsRuntimeStatus>();

  useEffect(() => {
    let active = true;

    async function loadReal() {
      try {
        setRealLoading(true);
        setRealError(null);
        const response = await fetchAnalyticsReports<ReportRow>(
          {},
          [
            'id',
            'date_of_event',
            'created_at',
            'airlines',
            'airline',
            'area',
            'category',
            'main_category',
            'irregularity_complain_category',
            'root_cause',
            'root_caused',
            'action_taken',
            'preventive_action',
            'description',
            'report',
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
        setRealError(loadError instanceof Error ? loadError.message : 'Gagal memuat root cause real');
      } finally {
        if (active) setRealLoading(false);
      }
    }

    async function loadAi() {
      try {
        setAiLoading(true);
        setAiError(null);
        const response = await fetch('/api/ai/root-cause/stats', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
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

    loadReal();
    loadAi();

    return () => {
      active = false;
    };
  }, []);

  const normalizedReports = useMemo(() => {
    return reports.map((report) => ({
      ...report,
      resolvedRootCause: normalizeRootCause(report.root_cause || report.root_caused),
    }));
  }, [reports]);

  const coverageData = useMemo(() => {
    const withRootCause = normalizedReports.filter((report) => report.resolvedRootCause).length;
    const withoutRootCause = normalizedReports.length - withRootCause;
    return [
      { name: 'With Root Cause', value: withRootCause },
      { name: 'Missing Root Cause', value: withoutRootCause },
    ];
  }, [normalizedReports]);

  const topRootCauses = useMemo(() => {
    const counts = new Map<string, number>();
    normalizedReports.forEach((report) => {
      if (!report.resolvedRootCause) return;
      counts.set(report.resolvedRootCause, (counts.get(report.resolvedRootCause) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10);
  }, [normalizedReports]);

  const categoryCoverage = useMemo(() => {
    const counts = new Map<string, number>();
    normalizedReports.forEach((report) => {
      if (!report.resolvedRootCause) return;
      const category = report.irregularity_complain_category || report.category || report.main_category || 'Unknown';
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);
  }, [normalizedReports]);

  const rootCauseTable: QueryResult = useMemo(() => {
    const rows = normalizedReports.map((report) => ({
      date_of_event: report.date_of_event || report.created_at || '',
      airlines: pickAirline(report),
      area: report.area || '',
      category: report.category || report.main_category || '',
      irregularity_complain_category: report.irregularity_complain_category || '',
      root_cause: report.resolvedRootCause,
      action_taken: report.action_taken || '',
      preventive_action: report.preventive_action || '',
      description: report.description || report.report || '',
    }));

    return {
      columns: [
        'date_of_event',
        'airlines',
        'area',
        'category',
        'irregularity_complain_category',
        'root_cause',
        'action_taken',
        'preventive_action',
        'description',
      ],
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [normalizedReports]);

  const aiTopCategories = useMemo(() => {
    if (!stats) return [];
    const entries: TopCategoryEntry[] = stats.top_categories
      ? stats.top_categories
      : Object.entries(stats.by_category).map(([name, info]) => [name, { count: info.count, percentage: info.percentage }]);
    return [...entries]
      .sort((left, right) => (right[1]?.count || 0) - (left[1]?.count || 0))
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
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);
  }, [stats]);

  const aiClassificationRate = useMemo(() => {
    const value = parseFloat(String(stats?.classification_rate || 0).replace('%', ''));
    return Number.isFinite(value) ? value : 0;
  }, [stats]);

  return (
    <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
      <AnalyticsSourceStrip
        title="Root Cause Dominan"
        description="Bandingkan root cause yang benar-benar diisi pada Google Sheets dengan hasil klasifikasi AI root cause. Keduanya dipisah agar sumber kebenaran tetap jelas."
        realSource={SOURCE_CONFIG.realSource}
        realStatus={realStatus}
        aiSource={SOURCE_CONFIG.aiSource}
        aiStatus={aiStatus}
      />

      <AnalyticsSection
        title="Cakupan Root Cause pada Data Real"
        description="Section ini fokus pada field root cause yang diisi pada dataset Google Sheets, termasuk coverage dan pola penyebab yang benar-benar ditulis."
        variant="real"
      >
        {realError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{realError}</div> : null}

        <div className="grid gap-4 lg:grid-cols-4">
          <AnalyticsMetricCard icon={DatabaseZap} label="Total Records" value={normalizedReports.length.toLocaleString('id-ID')} caption="Baris laporan pada dataset" tone="real" />
          <AnalyticsMetricCard icon={ActivitySquare} label="Coverage" value={`${Math.round(((coverageData[0]?.value || 0) / Math.max(normalizedReports.length, 1)) * 100)}%`} caption="Laporan dengan root cause terisi" tone="real" />
          <AnalyticsMetricCard icon={Target} label="Top Root Cause" value={topRootCauses[0]?.name || '-'} caption={`${topRootCauses[0]?.count || 0} laporan`} tone="real" />
          <AnalyticsMetricCard icon={SearchSlash} label="Missing Root Cause" value={(coverageData[1]?.value || 0).toLocaleString('id-ID')} caption="Masih kosong atau invalid" tone="real" />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <ResponsivePieChart data={coverageData} title="Root Cause Coverage" donut showLegend percentageLabels height="h-[300px]" />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Top Root Cause Terisi</h3>
              <p className="text-xs text-slate-600">Hanya menghitung root cause yang benar-benar diisi pada dataset real.</p>
            </div>
            <ResponsiveBarChart data={topRootCauses} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[300px]" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900">Kategori dengan Root Cause Terbanyak</h3>
            <p className="text-xs text-slate-600">Distribusi kategori laporan yang paling sering menyertakan root cause.</p>
          </div>
          <ResponsiveBarChart data={categoryCoverage} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[320px]" />
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <DataTableWithPagination
            data={rootCauseTable}
            title="Daftar Root Cause Real"
            isLoading={realLoading}
            rowsPerPage={25}
            columnClasses={{
              root_cause: 'min-w-[20rem] max-w-[36rem] break-words whitespace-pre-wrap',
              action_taken: 'min-w-[20rem] max-w-[36rem] break-words whitespace-pre-wrap',
              preventive_action: 'min-w-[20rem] max-w-[36rem] break-words whitespace-pre-wrap',
              description: 'min-w-[24rem] max-w-[48rem] break-words whitespace-pre-wrap',
            }}
          />
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title="Klasifikasi Root Cause dari AI"
        description="AI section mengambil data dari `/api/ai/root-cause/stats`. Angka ini adalah hasil klasifikasi model, bukan isian manual dari Google Sheets."
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
            <div className="grid gap-4 lg:grid-cols-4">
              <AnalyticsMetricCard icon={DatabaseZap} label="Total Records" value={(stats.total_records || 0).toLocaleString('id-ID')} caption="Record yang dianalisis AI" tone="ai" />
              <AnalyticsMetricCard icon={ActivitySquare} label="Classified" value={(stats.classified || 0).toLocaleString('id-ID')} caption="Berhasil diklasifikasi" tone="ai" />
              <AnalyticsMetricCard icon={AlertTriangle} label="Unknown" value={(stats.unknown || 0).toLocaleString('id-ID')} caption="Masih unknown menurut model" tone="ai" />
              <AnalyticsMetricCard icon={Target} label="Classification Rate" value={`${aiClassificationRate.toFixed(1)}%`} caption="Coverage klasifikasi AI" tone="ai" />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
                <ResponsivePieChart data={aiTopCategories} title="Top Root Cause AI" donut showLegend percentageLabels height="h-[300px]" />
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-black text-slate-900">Breakdown Kategori AI</h3>
                  <p className="text-xs text-slate-600">Kategori root cause hasil klasifikasi model dengan jumlah record terbanyak.</p>
                </div>
                <ResponsiveBarChart data={aiCategoryBreakdown} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[300px]" />
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
                      {info.top_issue_categories ? `Top issues: ${Object.keys(info.top_issue_categories).slice(0, 3).join(', ')}` : 'Belum ada detail issue.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <AnalyticsUnavailable
            title="Klasifikasi root cause AI belum tersedia"
            description="Proxy AI tidak mengembalikan payload root cause yang valid, jadi section ini belum bisa menampilkan hasil klasifikasi."
          />
        )}
      </AnalyticsSection>
    </div>
  );
}
