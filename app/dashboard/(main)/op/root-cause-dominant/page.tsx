'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DatabaseZap,
  Download,
  ExternalLink,
  Layers3,
  Radar,
  SearchSlash,
  ShieldAlert,
  Target,
  Workflow,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { OpMetricCard } from '@/components/dashboard/op-metric-card';
import {
  OpAnalyticsFilterBar,
  useFilterOptions,
  type OpFilterState,
} from '@/components/dashboard/op-analytics-filter-bar';
import { ResponsiveLineChart } from '@/components/charts/ResponsiveLineChart';
import { STATUS_PALETTE } from '@/lib/chart-palette';
import { fetchAnalyticsReports } from '@/lib/op-shortcut-analytics';
import type { AnalyticsRuntimeStatus } from '@/lib/op-shortcut-source-matrix';
import { cn } from '@/lib/utils';
import {
  buildRootCauseAnalytics,
  buildSelectedRootCauseAnalysis,
  type MissingRootWatchlistSummary,
  type RootCauseHeatmap,
  type RootCauseParetoChartRow,
  type RootCauseRankingRow,
  type RootCauseReportRow,
  type RootCauseScopedReport,
  type RootCauseSheetComparisonCard,
  type SelectedRootCauseAnalysis,
  type SelectedRootCauseBreakdownRow,
  normalizeRootCauseReports,
} from './root-cause-analytics';
import { useExternalLinks } from '@/lib/hooks/useExternalLinks';
import { getLinkUrl } from '@/lib/external-links';

interface RootCauseStatsCategory {
  count: number;
  percentage?: number;
  top_issue_categories?: Record<string, number>;
  top_areas?: Record<string, number>;
  top_airlines?: Record<string, number>;
  description?: string;
}

interface RootCauseStats {
  total_records: number;
  classified: number;
  unknown: number;
  classification_rate: number | string;
  by_category: Record<string, RootCauseStatsCategory>;
  top_categories?: Array<[string, RootCauseStatsCategory]>;
  cached?: boolean;
  stale?: boolean;
  generatedAt?: string;
  sourceSyncAt?: string | null;
}

interface RootCauseCategoryMeta {
  name: string;
  description: string;
  severity_multiplier?: number;
  keyword_count?: number;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDateTimeLabel(value?: string | number | null) {
  if (!value) return null;
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function truncateLabel(value: string, maxLength = 28) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] ?? '');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractRootCauseCategories(payload: unknown): RootCauseCategoryMeta[] {
  if (!isRecord(payload)) return [];

  return Object.values(payload)
    .filter((value): value is Record<string, unknown> => isRecord(value) && typeof value.name === 'string')
    .map((value) => ({
      name: String(value.name),
      description: String(value.description || ''),
      severity_multiplier:
        typeof value.severity_multiplier === 'number' ? value.severity_multiplier : undefined,
      keyword_count: typeof value.keyword_count === 'number' ? value.keyword_count : undefined,
    }))
    .sort((left, right) => (right.severity_multiplier || 0) - (left.severity_multiplier || 0));
}

export default function OPRootCauseDominant() {
  const externalLinks = useExternalLinks();
  const aiDocsUrl = getLinkUrl(externalLinks, 'ai-docs');
  const searchParams = useSearchParams();
  const esklasiRegex = useMemo(
    () => searchParams.get('esklasi_regex')?.trim() || searchParams.get('esklasiRegex')?.trim() || undefined,
    [searchParams],
  );

  const [reports, setReports] = useState<RootCauseScopedReport[]>([]);
  const [realLoading, setRealLoading] = useState(true);
  const [realError, setRealError] = useState<string | null>(null);
  const [realStatus, setRealStatus] = useState<AnalyticsRuntimeStatus>();

  const [stats, setStats] = useState<RootCauseStats | null>(null);
  const [categories, setCategories] = useState<RootCauseCategoryMeta[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AnalyticsRuntimeStatus>();

  const [selectedRootCause, setSelectedRootCause] = useState('');
  const [filters, setFilters] = useState<OpFilterState>({
    dateFrom: undefined,
    dateTo: undefined,
    hub: undefined,
    branch: undefined,
    area: undefined,
    airlines: undefined,
    sourceSheet: 'all',
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadReal() {
      try {
        setRealLoading(true);
        setRealError(null);
        const response = await fetchAnalyticsReports<RootCauseReportRow>(
          {
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            hub: filters.hub && filters.hub !== 'all' ? filters.hub : undefined,
            branch: filters.branch && filters.branch !== 'all' ? filters.branch : undefined,
            area: filters.area && filters.area !== 'all' ? filters.area : undefined,
            airlines: filters.airlines && filters.airlines !== 'all' ? filters.airlines : undefined,
            sourceSheet:
              filters.sourceSheet && filters.sourceSheet !== 'all' ? filters.sourceSheet : undefined,
            esklasiRegex,
          },
          [
            'id',
            'title',
            'report',
            'description',
            'date_of_event',
            'created_at',
            'source_sheet',
            'status',
            'branch',
            'reporting_branch',
            'hub',
            'area',
            'airlines',
            'airline',
            'category',
            'main_category',
            'case_classification',
            'irregularity_complain_category',
            'root_cause',
            'root_caused',
            'action_taken',
            'preventive_action',
          ],
          controller.signal,
        );

        if (!active) return;
        setReports(normalizeRootCauseReports(response.reports || []));
        setRealStatus({
          lastSyncAt: response.timestamp,
          count: response.count,
        });
      } catch (error) {
        if (!active) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setRealError(error instanceof Error ? error.message : 'Failed to load root cause data.');
      } finally {
        if (active) setRealLoading(false);
      }
    }

    loadReal();
    return () => {
      active = false;
      controller.abort();
    };
  }, [filters, esklasiRegex]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadAi() {
      try {
        setAiLoading(true);
        setAiError(null);

        const params = new URLSearchParams();
        if (esklasiRegex) params.set('esklasi_regex', esklasiRegex);
        const suffix = params.toString() ? `?${params.toString()}` : '';

        const [statsResult, categoriesResult] = await Promise.allSettled([
          fetch(`/api/ai/root-cause/stats${suffix}`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal,
          }).then(async (response) => {
            if (!response.ok) throw new Error(`Stats HTTP ${response.status}`);
            return (await response.json()) as RootCauseStats;
          }),
          fetch(`/api/ai/root-cause/categories${suffix}`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal,
          }).then(async (response) => {
            if (!response.ok) throw new Error(`Categories HTTP ${response.status}`);
            return await response.json();
          }),
        ]);

        if (!active) return;

        if (statsResult.status === 'fulfilled') {
          setStats(statsResult.value);
          setAiStatus({
            cached: statsResult.value.cached,
            stale: statsResult.value.stale,
            generatedAt: statsResult.value.generatedAt,
            sourceSyncAt: statsResult.value.sourceSyncAt,
          });
        } else {
          setStats(null);
        }

        if (categoriesResult.status === 'fulfilled') {
          setCategories(extractRootCauseCategories(categoriesResult.value));
          if (statsResult.status !== 'fulfilled' && isRecord(categoriesResult.value)) {
            setAiStatus({
              cached: Boolean(categoriesResult.value.cached),
              stale: Boolean(categoriesResult.value.stale),
              generatedAt:
                typeof categoriesResult.value.generatedAt === 'string'
                  ? categoriesResult.value.generatedAt
                  : undefined,
              sourceSyncAt:
                typeof categoriesResult.value.sourceSyncAt === 'string'
                  ? categoriesResult.value.sourceSyncAt
                  : null,
            });
          }
        } else {
          setCategories([]);
        }

        if (statsResult.status === 'rejected' && categoriesResult.status === 'rejected') {
          setAiError('Failed to load AI root cause benchmark.');
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setAiError(error instanceof Error ? error.message : 'Failed to load AI root cause benchmark.');
      } finally {
        if (active) setAiLoading(false);
      }
    }

    loadAi();
    return () => {
      active = false;
      controller.abort();
    };
  }, [esklasiRegex]);

  const analytics = useMemo(() => buildRootCauseAnalytics(reports), [reports]);
  const filterOptions = useFilterOptions(reports);
  const activeSourceSheet = filters.sourceSheet ?? 'all';
  const scopeLabel = esklasiRegex ? `ESKLASI ${esklasiRegex}` : 'All divisions';
  const lastLoadedLabel = formatDateTimeLabel(realStatus?.lastSyncAt);
  const aiGeneratedLabel = formatDateTimeLabel(aiStatus?.generatedAt);
  const aiSourceSyncLabel = formatDateTimeLabel(aiStatus?.sourceSyncAt);
  const aiClassificationRate = useMemo(() => {
    const value = Number(String(stats?.classification_rate || 0).replace('%', ''));
    return Number.isFinite(value) ? value : 0;
  }, [stats]);

  useEffect(() => {
    if (!analytics.defaultSelectedRootCause) {
      setSelectedRootCause('');
      return;
    }

    if (!selectedRootCause || !analytics.ranking.some((entry) => entry.name === selectedRootCause)) {
      setSelectedRootCause(analytics.defaultSelectedRootCause);
    }
  }, [analytics.defaultSelectedRootCause, analytics.ranking, selectedRootCause]);

  const selectedAnalysis = useMemo(
    () => buildSelectedRootCauseAnalysis(analytics, selectedRootCause || analytics.defaultSelectedRootCause),
    [analytics, selectedRootCause],
  );

  const aiTopCategory = useMemo(() => {
    if (!stats) return null;
    const fromTop = stats.top_categories?.[0];
    if (fromTop) return { name: fromTop[0], count: fromTop[1]?.count || 0 };

    const [name, info] = Object.entries(stats.by_category || {}).sort(
      (left, right) => (right[1]?.count || 0) - (left[1]?.count || 0),
    )[0] || ['', null];

    if (!name || !info) return null;
    return { name, count: info.count || 0 };
  }, [stats]);

  const handleExport = () => {
    exportToCSV(
      analytics.scopedReports.map((report) => ({
        Date: report.date_of_event || report.created_at || '',
        SourceSheet: report.sourceSheetLabel,
        Branch: report.branchLabel,
        Hub: report.hubLabel,
        Area: report.areaLabel,
        Airline: report.airlineLabel,
        IssueCategory: report.issueCategoryLabel,
        RootCause: report.resolvedRootCause || '(empty)',
        Status: report.normalizedStatus,
        ActionTaken: report.action_taken || '',
        PreventiveAction: report.preventive_action || '',
        Report: report.reportTitle,
      })),
      'op_root_cause_command_view',
    );
  };

  return (
    <div className="min-h-screen min-w-0 max-w-full space-y-8 overflow-x-hidden bg-[#FAFAFA] text-slate-900 px-4 py-8 sm:px-8 md:px-12 selection:bg-emerald-200">
      <section className="min-w-0 relative">
        <div className="grid min-w-0 gap-10 xl:grid-cols-[1.45fr_1fr] items-end">
          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <HeaderChip tone="emerald">Google Sheets analytics</HeaderChip>
              <HeaderChip tone="cyan">{scopeLabel}</HeaderChip>
              <HeaderChip tone="slate">
                {activeSourceSheet === 'all' ? 'NON CARGO + CGO' : activeSourceSheet}
              </HeaderChip>
              {lastLoadedLabel ? <HeaderChip tone="slate">Loaded {lastLoadedLabel}</HeaderChip> : null}
              {realLoading && analytics.totalReports > 0 ? (
                <HeaderChip tone="amber">Refreshing scope</HeaderChip>
              ) : null}
            </div>
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md">
                <Radar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[32px] font-medium tracking-tight text-slate-950 sm:text-[40px] leading-none mb-3">
                  Root Cause Command View
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                  Prioritize the causes that explain the largest share of scoped reports, inspect their branch hotspots,
                  and surface missing-root-cause gaps before they hide recurring issues.
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex items-end justify-between gap-4 border-b border-slate-200/60 pb-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Current scope
                </div>
                <div className="mt-1 text-[32px] font-medium tracking-tight text-slate-950 leading-none">
                  {analytics.totalReports.toLocaleString('id-ID')}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  scoped reports, {formatPercent(analytics.rootCoveragePct)} with known root cause
                </p>
              </div>
              <Button
                type="button"
                onClick={handleExport}
                disabled={analytics.totalReports === 0}
                variant="outline"
                className="h-10 rounded-full px-5 text-xs font-bold uppercase tracking-wider"
              >
                Export
                <Download className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <QuickFact
                label="Dominant cause"
                value={analytics.dominantCause?.name || 'No known cause'}
                caption={
                  analytics.dominantCause
                    ? `${analytics.dominantCause.count.toLocaleString('id-ID')} reports`
                    : 'Waiting for root cause data'
                }
              />
              <QuickFact
                label="80% concentration"
                value={analytics.causesTo80Count > 0 ? `${analytics.causesTo80Count} causes` : 'No threshold yet'}
                caption="How many causes explain most known cases"
              />
            </div>
          </div>
        </div>
      </section>

      <OpAnalyticsFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        hubOptions={filterOptions.hubOptions}
        branchOptions={filterOptions.branchOptions}
        areaOptions={filterOptions.areaOptions}
        airlineOptions={filterOptions.airlineOptions}
        showAreaFilter
        showSourceSheetToggle
        className="sticky top-3 z-20 border border-slate-200/80 bg-white/90 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.4)] backdrop-blur-xl"
      />

      {realError ? (
        <section className="rounded-[26px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {realError}
        </section>
      ) : null}

      {realLoading && analytics.totalReports === 0 ? (
        <LoadingState />
      ) : !realLoading && analytics.totalReports === 0 ? (
        <EmptyState scopeLabel={scopeLabel} sourceSheetLabel={activeSourceSheet} />
      ) : (
        <>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <OpMetricCard
              icon={DatabaseZap}
              label="Scoped Reports"
              value={analytics.totalReports.toLocaleString('id-ID')}
              caption={
                activeSourceSheet === 'all'
                  ? 'Active sheet scope: NON CARGO + CGO'
                  : `Active sheet scope: ${activeSourceSheet}`
              }
              tone="real"
            />
            <OpMetricCard
              icon={Target}
              label="Root-Cause Coverage"
              value={formatPercent(analytics.rootCoveragePct)}
              caption={`${analytics.withRootCount.toLocaleString('id-ID')} known of ${analytics.totalReports.toLocaleString('id-ID')}`}
              tone="real"
            />
            <OpMetricCard
              icon={Workflow}
              label="Dominant Cause Share"
              value={analytics.dominantCause ? formatPercent(analytics.dominantCause.sharePct) : '0.0%'}
              caption={analytics.dominantCause?.name || 'No known cause'}
              tone="real"
            />
            <OpMetricCard
              icon={Layers3}
              label="Causes To 80%"
              value={analytics.causesTo80Count > 0 ? analytics.causesTo80Count : '-'}
              caption="Top known causes needed to explain 80%"
              tone="real"
            />
            <OpMetricCard
              icon={ShieldAlert}
              label="Highest Hotspot Branch"
              value={analytics.highestHotspot?.branch || '-'}
              caption={
                analytics.highestHotspot
                  ? `${analytics.highestHotspot.count.toLocaleString('id-ID')} on ${analytics.highestHotspot.rootCause}`
                  : 'No hotspot available'
              }
              tone="real"
            />
          </div>

          {activeSourceSheet === 'all' && analytics.sheetComparison.length > 1 ? (
            <SheetComparisonStrip cards={analytics.sheetComparison} />
          ) : null}

          <div className="grid min-w-0 gap-4 xl:grid-cols-[1.38fr_0.95fr]">
            <RootCauseParetoPanel
              ranking={analytics.ranking}
              chartRows={analytics.paretoChartRows}
              selectedRootCause={selectedAnalysis?.name || ''}
              causesTo80Count={analytics.causesTo80Count}
              onSelect={setSelectedRootCause}
            />
            <SelectedRootCausePanel analysis={selectedAnalysis} />
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[1.1fr_1fr]">
            <CommandPanel
              badge="Trend"
              title="Monthly Trend For Top Causes"
              description="Tracks the top 4 known causes across the current scope."
            >
              {analytics.monthlyTrendRows.length > 0 ? (
                <ResponsiveLineChart
                  data={analytics.monthlyTrendRows}
                  xAxisKey="month"
                  dataKeys={analytics.monthlyTrendKeys}
                  showLegend
                  height="h-[340px]"
                />
              ) : (
                <ZeroDataStub label="No monthly trend available for the current scope." />
              )}
            </CommandPanel>

            <BranchHotspotPanel heatmap={analytics.heatmap} />
          </div>



          {analytics.missingWatchlist.totalCount > 0 ? (
            <MissingWatchlistPanel watchlist={analytics.missingWatchlist} />
          ) : null}

          <AiBenchmarkFooter
            stats={stats}
            categories={categories}
            aiLoading={aiLoading}
            aiError={aiError}
            aiStatus={aiStatus}
            aiClassificationRate={aiClassificationRate}
            aiTopCategory={aiTopCategory}
            aiGeneratedLabel={aiGeneratedLabel}
            aiSourceSyncLabel={aiSourceSyncLabel}
            aiDocsUrl={aiDocsUrl}
          />
        </>
      )}
    </div>
  );
}

function HeaderChip({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'emerald' | 'cyan' | 'amber' | 'slate';
}) {
  const bgClass = {
    emerald: 'border-emerald-200/50 bg-emerald-50/50 text-emerald-700',
    cyan: 'border-cyan-200/50 bg-cyan-50/50 text-cyan-700',
    amber: 'border-amber-200/50 bg-amber-50/50 text-amber-700',
    slate: 'border-slate-200/50 bg-white/50 text-slate-600',
  }[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold tracking-[0.06em] shadow-[0_2px_10px_rgb(0,0,0,0.02)] backdrop-blur-xl',
        bgClass,
      )}
    >
      {children}
    </span>
  );
}

function QuickFact({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="flex flex-col border-l-2 border-emerald-500/20 pl-4 py-1">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</div>
      <div className="mt-1 text-[22px] font-medium leading-tight tracking-tight text-slate-900 break-words">{value}</div>
      <p className="mt-1 text-xs text-slate-500 break-words">{caption}</p>
    </div>
  );
}

function CommandPanel({
  badge,
  title,
  description,
  children,
  className,
}: {
  badge: string;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-[32px] border border-white/60 bg-white/40 p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03] backdrop-blur-3xl',
        className,
      )}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">{badge}</div>
          <h2 className="text-[24px] font-medium tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ZeroDataStub({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-6 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function SheetComparisonStrip({ cards }: { cards: RootCauseSheetComparisonCard[] }) {
  const dominantSheet = [...cards].sort((left, right) => right.count - left.count)[0];

  return (
    <section className="min-w-0 rounded-[30px] border border-cyan-200/70 bg-[linear-gradient(135deg,rgba(236,254,255,0.96),rgba(255,255,255,0.98)_55%,rgba(240,249,255,0.96))] p-5 shadow-[0_22px_48px_-38px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">
            Cross-sheet context
          </div>
          <h2 className="mt-2 text-[22px] font-black tracking-tight text-slate-950">NON CARGO vs CGO</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Keep sheet contribution visible so one source does not silently dominate the root cause ranking.
          </p>
        </div>
        {dominantSheet ? (
          <div className="rounded-[22px] border border-cyan-200 bg-white/90 px-4 py-3 text-sm text-slate-600">
            <span className="font-black text-slate-950">{dominantSheet.name}</span> contributes{' '}
            <span className="font-black text-cyan-700">{formatPercent(dominantSheet.sharePct)}</span> of the current scope.
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.name}
            className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.32)]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{card.name}</div>
                <div className="mt-2 text-[28px] font-black tracking-tight text-slate-950">
                  {card.count.toLocaleString('id-ID')}
                </div>
              </div>
              <HeaderChip tone="cyan">{formatPercent(card.sharePct)} of scope</HeaderChip>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <QuickFact label="Coverage" value={formatPercent(card.coveragePct)} caption="Known root cause fill rate" />
              <QuickFact
                label="Top Cause"
                value={card.topRootCause}
                caption="Largest known cause within this sheet"
              />
              <QuickFact
                label="Dominant Area"
                value={card.dominantArea}
                caption={`${card.activeCount.toLocaleString('id-ID')} active cases in this sheet`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RootCauseParetoPanel({
  ranking,
  chartRows,
  selectedRootCause,
  causesTo80Count,
  onSelect,
}: {
  ranking: RootCauseRankingRow[];
  chartRows: RootCauseParetoChartRow[];
  selectedRootCause: string;
  causesTo80Count: number;
  onSelect: (value: string) => void;
}) {
  return (
    <CommandPanel
      badge="Pareto"
      title="Root Cause Concentration"
      description="Focus first on the causes that drive the biggest share of known root cause volume."
    >
      {ranking.length === 0 ? (
        <ZeroDataStub label="No known root cause data in the current scope." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <HeaderChip tone="amber">
              {causesTo80Count > 0 ? `${causesTo80Count} causes to 80%` : 'No 80% threshold yet'}
            </HeaderChip>
            <span className="text-xs text-slate-500">
              Bars show case count. The line shows cumulative contribution.
            </span>
          </div>

          <div className="h-[380px] min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartRows}
                margin={{ top: 20, right: 18, bottom: 84, left: 6 }}
                barCategoryGap="18%"
                barGap={8}
              >
                <CartesianGrid stroke="#94a3b8" strokeOpacity={0.18} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  height={86}
                  tickLine={false}
                  axisLine={{ stroke: '#94a3b8' }}
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }}
                  tickFormatter={(value) => truncateLabel(String(value), 18)}
                  angle={-32}
                  textAnchor="end"
                />
                <YAxis
                  yAxisId="left"
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  width={58}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#9a3412', fontWeight: 700 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'Cumulative share'
                      ? formatPercent(Number(value))
                      : Number(value).toLocaleString('id-ID'),
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: '16px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 20px 40px -26px rgba(15,23,42,0.45)',
                  }}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={80}
                  stroke="#c2410c"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  label={{
                    value: '80%',
                    position: 'insideTopRight',
                    fill: '#9a3412',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />
                <Bar yAxisId="left" dataKey="value" name="Cases" barSize={34} radius={[10, 10, 0, 0]}>
                  {chartRows.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.isOthers
                          ? '#cbd5e1'
                          : entry.name === selectedRootCause
                            ? '#059669'
                            : '#86efac'
                      }
                      stroke={entry.name === selectedRootCause ? '#065f46' : '#047857'}
                      strokeWidth={1.5}
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativePct"
                  name="Cumulative share"
                  stroke="#b45309"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#b45309', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#92400e' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {ranking.map((entry) => {
              const isActive = entry.name === selectedRootCause;
              const thresholdLabel =
                causesTo80Count > 0 && entry.rank <= causesTo80Count ? 'Focus now' : 'Monitor';

              return (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => onSelect(entry.name)}
                  className={cn(
                    'w-full rounded-[22px] border px-4 py-3 text-left transition-all',
                    isActive
                      ? 'border-emerald-500 bg-emerald-50 shadow-[0_18px_34px_-28px_rgba(16,185,129,0.45)]'
                      : 'border-slate-200 bg-slate-50/70 hover:border-emerald-300 hover:bg-emerald-50/50',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={cn(
                          'inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[11px] font-black',
                          isActive ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-white',
                        )}
                      >
                        {entry.rank}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-950" title={entry.name}>
                          {entry.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{entry.count.toLocaleString('id-ID')} cases</span>
                          <span>{formatPercent(entry.sharePct)} share</span>
                          <span>{formatPercent(entry.cumulativePct)} cumulative</span>
                        </div>
                      </div>
                    </div>
                    <HeaderChip tone={entry.rank <= causesTo80Count ? 'emerald' : 'slate'}>
                      {thresholdLabel}
                    </HeaderChip>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </CommandPanel>
  );
}

function SelectedRootCausePanel({ analysis }: { analysis: SelectedRootCauseAnalysis | null }) {
  return (
    <CommandPanel
      badge="Focus"
      title="Selected Cause Summary"
      description="This panel updates when you select a cause from the Pareto ranking."
      className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]"
    >
      {!analysis ? (
        <ZeroDataStub label="Select a known root cause to inspect its hotspots." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <HeaderChip tone="emerald">Rank #{analysis.rank}</HeaderChip>
                <HeaderChip tone="amber">{formatPercent(analysis.sharePct)} of known cases</HeaderChip>
              </div>
              <h3 className="mt-3 text-[24px] font-black leading-8 tracking-tight text-slate-950">
                {analysis.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{analysis.thresholdContext}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <QuickFact label="Cases" value={analysis.count.toLocaleString('id-ID')} caption="Known cases in scope" />
            <QuickFact label="Active" value={analysis.activeCount.toLocaleString('id-ID')} caption="Open plus progress cases" />
            <QuickFact label="Branches" value={analysis.distinctBranches.toLocaleString('id-ID')} caption="Branches touched by this cause" />
            <QuickFact label="Areas" value={analysis.distinctAreas.toLocaleString('id-ID')} caption="Operational areas touched" />
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Status mix
            </div>
            <div className="space-y-2">
              {analysis.statusBreakdown.map((status) => {
                const tone = STATUS_PALETTE[status.name];
                return (
                  <div key={status.name} className="rounded-[18px] border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                        style={{ backgroundColor: tone.bg, color: tone.text }}
                      >
                        {status.name}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {status.count.toLocaleString('id-ID')} · {formatPercent(status.sharePct)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(status.sharePct, status.count > 0 ? 6 : 0)}%`,
                          backgroundColor: tone.fill,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryRow label="Top issue category" value={analysis.topIssueCategory} />
            <SummaryRow label="Latest seen" value={analysis.latestDateLabel} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <InlineBreakdown label="By Branch" data={analysis.branchBreakdown} />
            <InlineBreakdown label="By Area" data={analysis.areaBreakdown} />
            <InlineBreakdown label="By Airline" data={analysis.airlineBreakdown} />
          </div>
        </>
      )}
    </CommandPanel>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white/90 p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-bold leading-6 text-slate-950">{value}</div>
    </div>
  );
}

function InlineBreakdown({
  label,
  data,
}: {
  label: string;
  data: SelectedRootCauseBreakdownRow[];
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50/60 p-4 text-center text-xs text-slate-500">
        No {label.toLowerCase()} data
      </div>
    );
  }

  const maxCount = data[0].count;

  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
      <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="space-y-2">
        {data.map((entry) => (
          <div key={entry.name}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-xs font-bold text-slate-950" title={entry.name}>
                {entry.name}
              </span>
              <span className="shrink-0 text-[11px] font-bold text-slate-500">
                {entry.count.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${maxCount > 0 ? Math.max((entry.count / maxCount) * 100, 4) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const HOTSPOT_COLORS = [
  '#059669', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#ca8a04',
] as const;

function BranchHotspotPanel({ heatmap }: { heatmap: RootCauseHeatmap }) {
  const causeIndex = useMemo(
    () => heatmap.causes.map((cause, index) => ({
      code: `C${index + 1}`,
      fullName: cause,
      color: HOTSPOT_COLORS[index % HOTSPOT_COLORS.length],
    })),
    [heatmap.causes],
  );

  const codeMap = useMemo(
    () => new Map(causeIndex.map((entry) => [entry.fullName, entry.code])),
    [causeIndex],
  );

  const chartData = useMemo(() => {
    if (heatmap.rows.length === 0) return [];
    return heatmap.rows
      .map((row) => {
        const mapped: Record<string, string | number> = { branch: row.branch };
        for (const [cause, count] of Object.entries(row.cells)) {
          const code = codeMap.get(cause);
          if (code) mapped[code] = count;
        }
        mapped._total = row.total;
        return mapped;
      })
      .sort((left, right) => (right._total as number) - (left._total as number));
  }, [heatmap.rows, codeMap]);

  const reverseCodeMap = useMemo(
    () => new Map(causeIndex.map((entry) => [entry.code, entry.fullName])),
    [causeIndex],
  );

  const barHeight = Math.max(340, chartData.length * 52);

  return (
    <CommandPanel
      badge="Hotspot"
      title="Branch × Root Cause Distribution"
      description="Each branch bar shows its root cause composition. Longer segments signal concentration."
    >
      {chartData.length === 0 ? (
        <ZeroDataStub label="No branch hotspot data available for the current scope." />
      ) : (
        <>
          <div className="min-w-0" style={{ height: `${barHeight}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
                barCategoryGap="22%"
              >
                <CartesianGrid
                  stroke="#94a3b8"
                  strokeOpacity={0.14}
                  strokeDasharray="4 4"
                  horizontal={false}
                />
                <YAxis
                  dataKey="branch"
                  type="category"
                  width={80}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#334155', fontWeight: 700 }}
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 20px 40px -26px rgba(15,23,42,0.45)',
                    maxWidth: '320px',
                  }}
                  formatter={(value: number, code: string) => [
                    value.toLocaleString('id-ID'),
                    reverseCodeMap.get(code) || code,
                  ]}
                />
                {causeIndex.map((entry, index) => (
                  <Bar
                    key={entry.code}
                    dataKey={entry.code}
                    name={entry.code}
                    stackId="stack"
                    fill={entry.color}
                    radius={
                      index === causeIndex.length - 1
                        ? [0, 6, 6, 0]
                        : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {causeIndex.map((entry) => (
              <div
                key={entry.code}
                className="flex items-start gap-2.5 rounded-[16px] border border-slate-200/80 bg-slate-50/70 px-3 py-2.5"
              >
                <span
                  className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded-md"
                  style={{ backgroundColor: entry.color }}
                />
                <div className="min-w-0">
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {entry.code}
                  </span>
                  <p className="mt-0.5 text-xs font-bold leading-5 text-slate-950">
                    {entry.fullName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </CommandPanel>
  );
}


function MissingWatchlistPanel({ watchlist }: { watchlist: MissingRootWatchlistSummary }) {
  return (
    <CommandPanel
      badge="Data Quality"
      title="Missing Root Cause Watchlist"
      description="These branches still have reports without a usable root cause value."
      className="border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.92))]"
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <QuickFact
          label="Missing rows"
          value={watchlist.totalCount.toLocaleString('id-ID')}
          caption={`${formatPercent(watchlist.sharePct)} of the scoped reports`}
        />
        <QuickFact label="Top branch" value={watchlist.topBranch} caption="Highest missing volume" />
        <QuickFact label="Top area" value={watchlist.topArea} caption="Area most often missing root cause" />
      </div>

      <div className="overflow-auto rounded-[24px] border border-amber-200/80 bg-white/95">
        <table className="min-w-full">
          <thead className="bg-amber-50">
            <tr>
              {['Branch', 'Missing', 'Active', 'Share', 'Top area', 'Top airline'].map((column) => (
                <th
                  key={column}
                  className="border-b border-amber-100 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-amber-800"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {watchlist.rows.map((row) => (
              <tr key={row.name} className="odd:bg-white even:bg-amber-50/40">
                <td className="border-b border-amber-100 px-4 py-3 text-sm font-bold text-slate-950">
                  {row.name}
                </td>
                <td className="border-b border-amber-100 px-4 py-3 text-sm text-slate-700">
                  {row.missingCount.toLocaleString('id-ID')}
                </td>
                <td className="border-b border-amber-100 px-4 py-3 text-sm text-slate-700">
                  {row.activeCount.toLocaleString('id-ID')}
                </td>
                <td className="border-b border-amber-100 px-4 py-3 text-sm text-slate-700">
                  {formatPercent(row.sharePct)}
                </td>
                <td className="border-b border-amber-100 px-4 py-3 text-sm text-slate-700">{row.topArea}</td>
                <td className="border-b border-amber-100 px-4 py-3 text-sm text-slate-700">{row.topAirline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CommandPanel>
  );
}

function AiBenchmarkFooter({
  stats,
  categories,
  aiLoading,
  aiError,
  aiStatus,
  aiClassificationRate,
  aiTopCategory,
  aiGeneratedLabel,
  aiSourceSyncLabel,
  aiDocsUrl,
}: {
  stats: RootCauseStats | null;
  categories: RootCauseCategoryMeta[];
  aiLoading: boolean;
  aiError: string | null;
  aiStatus?: AnalyticsRuntimeStatus;
  aiClassificationRate: number;
  aiTopCategory: { name: string; count: number } | null;
  aiGeneratedLabel: string | null;
  aiSourceSyncLabel: string | null;
  aiDocsUrl: string;
}) {
  const sparsePayload = (stats?.total_records || 0) < 10;

  return (
    <section className="min-w-0 rounded-[30px] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98)_55%,rgba(255,247,237,0.96))] p-5 shadow-[0_22px_48px_-38px_rgba(15,23,42,0.35)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">AI benchmark</div>
          <h2 className="mt-2 text-[22px] font-black tracking-tight text-slate-950">Secondary Root Cause Intelligence</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            The page stays anchored on live Google Sheets data. AI remains a benchmark layer until the live root cause
            stats endpoint returns meaningful volume.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {aiGeneratedLabel ? <HeaderChip tone="amber">Generated {aiGeneratedLabel}</HeaderChip> : null}
          {aiSourceSyncLabel ? <HeaderChip tone="slate">Source sync {aiSourceSyncLabel}</HeaderChip> : null}
          {aiStatus?.cached ? <HeaderChip tone="slate">Cached</HeaderChip> : null}
          {aiStatus?.stale ? <HeaderChip tone="amber">Stale</HeaderChip> : null}
          <Button type="button" variant="outline" asChild className="h-10 rounded-xl border-amber-200 bg-white px-4 text-sm font-bold text-amber-800 hover:bg-amber-50">
            <a href={aiDocsUrl} target="_blank" rel="noreferrer">
              AI docs
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {aiLoading ? (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[0.95fr_1.25fr]">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`ai-skeleton-${index}`} className="h-28 animate-pulse rounded-[22px] border border-amber-100 bg-white/80" />
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={`taxonomy-skeleton-${index}`} className="h-32 animate-pulse rounded-[22px] border border-amber-100 bg-white/80" />
            ))}
          </div>
        </div>
      ) : aiError ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{aiError}</div>
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[0.95fr_1.25fr]">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <QuickFact
              label="Live records"
              value={(stats?.total_records || 0).toLocaleString('id-ID')}
              caption={sparsePayload ? 'Current payload is too small to drive layout decisions' : 'AI-classified records in live stats payload'}
            />
            <QuickFact
              label="Classified"
              value={(stats?.classified || 0).toLocaleString('id-ID')}
              caption={`Classification rate ${formatPercent(aiClassificationRate)}`}
            />
            <QuickFact
              label="Top AI category"
              value={aiTopCategory ? aiTopCategory.name : 'No live category'}
              caption={
                aiTopCategory
                  ? `${aiTopCategory.count.toLocaleString('id-ID')} records`
                  : 'Taxonomy is available, but live stats are sparse'
              }
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {categories.length > 0 ? (
              categories.slice(0, 8).map((category) => (
                <div
                  key={category.name}
                  className="rounded-[24px] border border-white/60 bg-white/40 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/[0.02] backdrop-blur-3xl transition-all hover:bg-white/60 hover:-translate-y-0.5"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <h3 className="pr-1 text-[15px] font-medium tracking-tight text-slate-900 line-clamp-2">{category.name}</h3>
                    {typeof category.severity_multiplier === 'number' ? (
                      <span className="shrink-0 inline-flex items-center rounded-full border border-amber-200/50 bg-amber-50/50 px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] text-amber-700 shadow-sm backdrop-blur-md">
                        x{category.severity_multiplier.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">{category.description}</p>
                  {typeof category.keyword_count === 'number' ? (
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {category.keyword_count} keywords
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <ZeroDataStub label="No AI taxonomy metadata returned for the current scope." />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={`metric-skeleton-${index}`} className="h-32 animate-pulse rounded-[24px] border border-slate-200 bg-white/85" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.38fr_0.95fr]">
        <div className="h-[620px] animate-pulse rounded-[30px] border border-slate-200 bg-white/85" />
        <div className="h-[620px] animate-pulse rounded-[30px] border border-slate-200 bg-white/85" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <div className="h-[440px] animate-pulse rounded-[30px] border border-slate-200 bg-white/85" />
        <div className="h-[440px] animate-pulse rounded-[30px] border border-slate-200 bg-white/85" />
      </div>
    </div>
  );
}

function EmptyState({
  scopeLabel,
  sourceSheetLabel,
}: {
  scopeLabel: string;
  sourceSheetLabel: string;
}) {
  return (
    <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-8 text-center shadow-[0_22px_48px_-38px_rgba(15,23,42,0.35)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <SearchSlash className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-[26px] font-black tracking-tight text-slate-950">No reports match this scope</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Try widening the date range, clearing branch or airline filters, or removing the current ESKLASI scope if it
        is too narrow for the live sheet data.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <HeaderChip tone="slate">{scopeLabel}</HeaderChip>
        <HeaderChip tone="slate">
          {sourceSheetLabel === 'all' ? 'NON CARGO + CGO' : sourceSheetLabel}
        </HeaderChip>
      </div>
    </section>
  );
}
