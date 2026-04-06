'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ElementType } from 'react';
import {
  AlertCircle,
  Boxes,
  ClipboardList,
  Download,
  FolderTree,
  Map as MapIcon,
  MapPin,
  PackageSearch,
  Plane,
  Search,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  OpAnalyticsFilterBar,
  useFilterOptions,
  type OpFilterState,
} from '@/components/dashboard/op-analytics-filter-bar';
import { ResponsiveBarChart } from '@/components/charts/ResponsiveBarChart';
import { ResponsiveLineChart } from '@/components/charts/ResponsiveLineChart';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { ParetoChart } from '@/components/chart-detail/ParetoChart';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';
import { Button } from '@/components/ui/button';
import { fetchAnalyticsReports } from '@/lib/op-shortcut-analytics';
import type { QueryResult } from '@/types/builder';
import {
  buildComplaintAnalytics,
  buildComplaintCategorySummary,
  buildComplaintHotspotChart,
  buildComplaintHotspotTable,
  HOTSPOT_DIMENSION_LABELS,
  type ComplaintHotspotDimension,
  type ComplaintReportRow,
  type ComplaintTrendMode,
  type EnrichedComplaintReport,
} from './complaint-analytics';

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function exportRowsToCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
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

export default function OPComplaintByCategory() {
  const [reports, setReports] = useState<ComplaintReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendMode, setTrendMode] = useState<ComplaintTrendMode>('sheet');
  const [hotspotDimension, setHotspotDimension] = useState<ComplaintHotspotDimension>('branch');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filters, setFilters] = useState<OpFilterState>({
    dateFrom: undefined,
    dateTo: undefined,
    hub: undefined,
    branch: undefined,
    area: undefined,
    airlines: undefined,
    sourceSheet: 'all',
  });
  const recordsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchAnalyticsReports<ComplaintReportRow>(
          {
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            hub: filters.hub && filters.hub !== 'all' ? filters.hub : undefined,
            branch: filters.branch && filters.branch !== 'all' ? filters.branch : undefined,
            area: filters.area && filters.area !== 'all' ? filters.area : undefined,
            airlines: filters.airlines && filters.airlines !== 'all' ? filters.airlines : undefined,
            sourceSheet: filters.sourceSheet && filters.sourceSheet !== 'all' ? filters.sourceSheet : undefined,
          },
          [
            'id',
            'title',
            'report',
            'description',
            'created_at',
            'date_of_event',
            'source_sheet',
            'status',
            'branch',
            'reporting_branch',
            'airlines',
            'airline',
            'hub',
            'area',
            'category',
            'main_category',
            'irregularity_complain_category',
            'case_classification',
            'terminal_area_category',
            'apron_area_category',
            'general_category',
            'root_caused',
            'root_cause',
            'action_taken',
            'preventive_action',
          ],
          controller.signal,
        );

        if (!active) return;
        setReports(response.reports || []);
      } catch (loadError) {
        if (!active) return;
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat complaint analytics');
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

  const analytics = useMemo(() => buildComplaintAnalytics(reports), [reports]);
  const filterOptions = useFilterOptions(analytics.complaints as unknown as Record<string, unknown>[]);

  useEffect(() => {
    const topCategoryName = analytics.categoryRanking[0]?.name || '';
    if (!topCategoryName) {
      setSelectedCategory('');
      return;
    }

    if (!selectedCategory || !analytics.categoryRanking.some((entry) => entry.name === selectedCategory)) {
      setSelectedCategory(topCategoryName);
    }
  }, [analytics.categoryRanking, selectedCategory]);

  const selectedCategoryReports = useMemo(
    () => analytics.complaints.filter((report) => report.resolvedCategory === selectedCategory),
    [analytics.complaints, selectedCategory],
  );

  const selectedCategorySummary = useMemo(
    () =>
      selectedCategory
        ? buildComplaintCategorySummary(analytics.complaints, selectedCategory)
        : null,
    [analytics.complaints, selectedCategory],
  );

  const hotspotTable = useMemo(
    () => buildComplaintHotspotTable(analytics.complaints, hotspotDimension),
    [analytics.complaints, hotspotDimension],
  );

  const hotspotChartData = useMemo(
    () => buildComplaintHotspotChart(analytics.complaints, hotspotDimension),
    [analytics.complaints, hotspotDimension],
  );

  const trendData = trendMode === 'sheet' ? analytics.trendBySheet : analytics.trendByArea;
  const trendKeys = trendMode === 'sheet'
    ? analytics.sheetMix.map((entry) => entry.name)
    : analytics.areaMix.map((entry) => entry.name);
  const openSharePct =
    analytics.totalComplaints > 0 ? (analytics.openComplaints / analytics.totalComplaints) * 100 : 0;
  const sectionPanelClassName =
    'rounded-[28px] border border-emerald-200/70 bg-white/90 p-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.35)]';
  const quietPanelClassName = 'rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4';
  const sheetScopeLabel = analytics.sheetMix.length
    ? analytics.sheetMix
      .map((entry) => `${entry.name} ${entry.value.toLocaleString('id-ID')}`)
      .join(' / ')
    : 'No live sheet data';

  const handleParetoCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleViewCategoryRecords = (category: string) => {
    setSelectedCategory(category);
    requestAnimationFrame(() => {
      recordsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="min-h-screen space-y-5 px-3 py-4 sm:px-4 md:px-6 md:py-6">
      <OpAnalyticsFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        hubOptions={filterOptions.hubOptions}
        branchOptions={filterOptions.branchOptions}
        areaOptions={filterOptions.areaOptions}
        airlineOptions={filterOptions.airlineOptions}
        showAreaFilter
        showSourceSheetToggle
      />

      <section className="relative min-w-0 overflow-hidden rounded-[32px] border border-emerald-200/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.94))] p-4 shadow-spatial-sm sm:p-5 md:p-6">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && analytics.totalComplaints === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <XCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Tidak ada complaint pada filter aktif</h2>
            <p className="mt-2 text-sm text-slate-600">
              Ubah kombinasi filter di atas untuk memunculkan complaint rows dari Google Sheets.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div className="min-w-0 max-w-3xl">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Complaint Per Category
                </h1>
              </div>

              <div className="grid gap-2.5 xl:w-[220px]">
                <HeaderMetaCard
                  label="Latest complaint"
                  value={analytics.latestDateLabel}
                  caption="Most recent filtered record"
                />
              </div>
            </div>

            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
              <ComplaintHeroCard
                className="h-full"
                totalComplaints={analytics.totalComplaints}
                latestDateLabel={analytics.latestDateLabel}
                categoriesCount={analytics.categoryRanking.length}
                sheetScopeLabel={sheetScopeLabel}
              />
              <div className="grid auto-rows-min gap-4 sm:grid-cols-2">
                <ComplaintMetricPanel
                  icon={AlertCircle}
                  label="Open now"
                  value={analytics.openComplaints}
                  description={`${formatPercent(openSharePct)} of filtered complaints`}
                  helper={`${analytics.closedComplaints} closed`}
                  tone="amber"
                />
                <ComplaintMetricPanel
                  icon={Boxes}
                  label="Closure rate"
                  value={formatPercent(analytics.closureRatePct)}
                  description={`${analytics.closedComplaints} complaints already closed`}
                  helper={analytics.openComplaints > 0 ? `${analytics.openComplaints} open` : 'All closed'}
                  tone={analytics.openComplaints > 0 ? 'emerald' : 'sky'}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.52fr)_minmax(0,1fr)]">
              <ComplaintMetricPanel
                icon={PackageSearch}
                label="CGO share"
                value={formatPercent(analytics.cgoSharePct)}
                description={`${analytics.cgoCount} CGO vs ${analytics.nonCargoCount} NON CARGO`}
                helper={`${formatPercent(analytics.nonCargoSharePct)} non-cargo`}
                tone="sky"
              />
              <FeaturedComplaintCategoryCard
                categoryName={analytics.topCategory?.name || 'No complaint category yet'}
                countLabel={
                  analytics.topCategory
                    ? `${analytics.topCategory.count} complaints`
                    : 'No ranked complaint category in active filter'
                }
                shareLabel={
                  analytics.topCategory ? formatPercent(analytics.topCategory.sharePct) : undefined
                }
                openCountLabel={
                  analytics.topCategory ? `${analytics.topCategory.openCount} open cases` : undefined
                }
              />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <div className={sectionPanelClassName}>
                <ResponsivePieChart
                  data={analytics.sheetMix}
                  title="Complaint Mix by Sheet"
                  donut
                  showLegend
                  percentageLabels
                  height="h-[280px]"
                />
              </div>

              <div className={sectionPanelClassName}>
                <div className="mb-3">
                  <h3 className="text-sm font-black text-slate-900">Complaint Mix by Area</h3>
                  <p className="text-xs text-slate-600">
                    Distribusi complaint yang sudah dipisahkan ke Apron, Terminal, dan General.
                  </p>
                </div>
                <ResponsiveBarChart
                  data={analytics.areaMix.map((entry) => ({ ...entry, count: entry.value }))}
                  xAxisKey="name"
                  dataKeys={['count']}
                  showLegend={false}
                  height="h-[280px]"
                />
              </div>

              <div className={sectionPanelClassName}>
                <ResponsivePieChart
                  data={analytics.statusMix}
                  title="Complaint Status Mix"
                  donut
                  showLegend
                  percentageLabels
                  height="h-[280px]"
                />
              </div>
            </div>

            <div className={cn('mt-5', sectionPanelClassName)}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Trend Bulanan Complaint</h3>
                  <p className="text-xs text-slate-600">
                    Gunakan toggle untuk melihat perubahan complaint berdasarkan source sheet atau area operasional.
                  </p>
                </div>
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                  {([
                    { key: 'sheet', label: 'By Sheet' },
                    { key: 'area', label: 'By Area' },
                  ] as const).map((option) => (
                    <Button
                      key={option.key}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTrendMode(option.key)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-[11px] font-bold transition-all',
                        trendMode === option.key
                          ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-600 hover:text-white'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900',
                      )}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <ResponsiveLineChart
                data={trendData}
                xAxisKey="month"
                dataKeys={trendKeys}
                showLegend
                height="h-[340px]"
              />
            </div>

            <div className="mt-5 grid min-w-0 w-full gap-4 overflow-hidden">
              <ParetoChart
                result={analytics.paretoResult}
                title="Pareto Analysis"
                headline="Top Complaint Drivers"
                explanation="Kurva ini menunjukkan kategori complaint mana yang menyumbang porsi terbesar dari total complaint. Gunakan untuk memprioritaskan intervensi di sedikit kategori yang menghasilkan mayoritas volume."
                selectedCategory={selectedCategory}
                onCategorySelect={handleParetoCategorySelect}
                onViewCategoryRecords={handleViewCategoryRecords}
              />

              <ComplaintAreaCategoryHeatmap result={analytics.areaCategoryMatrix} />
            </div>

            <div className={cn('mt-5', sectionPanelClassName)}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Hotspot Ranking</h3>
                  <p className="text-xs text-slate-600">
                    Ranking entity berdasarkan volume complaint, porsi terhadap total complaint, open count, dan dominant complaint category.
                  </p>
                </div>
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                  {(['branch', 'hub', 'airline'] as const).map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setHotspotDimension(option)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-[11px] font-bold transition-all',
                        hotspotDimension === option
                          ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-600 hover:text-white'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900',
                      )}
                    >
                      {HOTSPOT_DIMENSION_LABELS[option]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.2fr]">
                <div className={quietPanelClassName}>
                  <div className="mb-3">
                    <h4 className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">
                      Top {HOTSPOT_DIMENSION_LABELS[hotspotDimension]}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Grafik cepat untuk volume complaint tertinggi pada entity terpilih.
                    </p>
                  </div>
                  <ResponsiveBarChart
                    data={hotspotChartData}
                    xAxisKey="name"
                    dataKeys={['count']}
                    layout="horizontal"
                    showLegend={false}
                    height="h-[360px]"
                  />
                </div>

                <DataTableWithPagination
                  data={hotspotTable}
                  title={`Hotspot ${HOTSPOT_DIMENSION_LABELS[hotspotDimension]}`}
                  rowsPerPage={8}
                />
              </div>
            </div>

            <div ref={recordsSectionRef} className={cn('mt-5', sectionPanelClassName)}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Drill-down per Complaint Category</h3>
                  <p className="text-xs text-slate-600">
                    Pilih kategori complaint di bawah untuk membuka investigasi detail, record list, dan export CSV untuk subset yang aktif.
                  </p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {analytics.categoryRanking.map((entry, index) => (
                  <Button
                    key={entry.name}
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedCategory(entry.name)}
                    className={cn(
                      'h-auto rounded-[22px] px-3 py-2 text-left transition-all',
                      selectedCategory === entry.name
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-600 hover:text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] opacity-80">
                      <span>#{index + 1}</span>
                      <span>{formatPercent(entry.sharePct)}</span>
                    </div>
                    <div className="mt-1 max-w-[220px] text-sm font-bold leading-snug">{entry.name}</div>
                    <div className="mt-1 text-xs opacity-80">
                      {entry.count} complaint • {entry.openCount} open
                    </div>
                  </Button>
                ))}
              </div>

              {selectedCategorySummary ? (
                <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile
                    icon={ClipboardList}
                    label="Selected Category"
                    value={`${selectedCategorySummary.totalCount} complaint`}
                    caption={formatPercent(selectedCategorySummary.sharePct)}
                  />
                  <SummaryTile
                    icon={AlertCircle}
                    label="Open vs Closed"
                    value={`${selectedCategorySummary.openCount} open`}
                    caption={`${selectedCategorySummary.closedCount} closed`}
                  />
                  <SummaryTile
                    icon={MapPin}
                    label="Top Branch"
                    value={selectedCategorySummary.topBranch}
                    caption={`Latest ${selectedCategorySummary.latestDateLabel}`}
                  />
                  <SummaryTile
                    icon={Plane}
                    label="Top Airline"
                    value={selectedCategorySummary.topAirline}
                    caption={`Root cause ${formatPercent(selectedCategorySummary.rootCauseCoveragePct)}`}
                  />
                </div>
              ) : null}

              <ComplaintRecordsTable
                reports={selectedCategoryReports}
                category={selectedCategory}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function HeaderMetaCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="min-w-0 rounded-[22px] border border-white/80 bg-white/85 px-4 py-3 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 break-words text-lg font-black leading-tight tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-500">{caption}</div>
    </div>
  );
}

function ComplaintHeroCard({
  totalComplaints,
  latestDateLabel,
  categoriesCount,
  sheetScopeLabel,
  className,
}: {
  totalComplaints: number;
  latestDateLabel: string;
  categoriesCount: number;
  sheetScopeLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[30px] border border-emerald-200/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(255,255,255,0.95)_58%,rgba(224,242,254,0.92))] p-5 shadow-[0_26px_60px_-34px_rgba(16,185,129,0.45)]',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-emerald-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-12 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="relative flex h-full flex-col justify-between gap-6">
        <div>
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-300/50">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                  Filtered complaint volume
                </div>
                <div className="mt-3 text-[clamp(3rem,8vw,5rem)] font-black tracking-[-0.06em] leading-none text-slate-950">
                  {totalComplaints.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <HeroStat label="Latest event" value={latestDateLabel} />
          <HeroStat label="Live categories" value={`${categoriesCount} buckets`} />
          <HeroStat label="Sheet scope" value={sheetScopeLabel} />
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[20px] border border-white/80 bg-white/80 px-4 py-3 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.45)]">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 break-words text-sm font-bold leading-snug text-slate-900">{value}</div>
    </div>
  );
}

function ComplaintMetricPanel({
  icon: Icon,
  label,
  value,
  description,
  helper,
  tone = 'emerald',
  className,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  description: string;
  helper?: string;
  tone?: 'emerald' | 'amber' | 'sky';
  className?: string;
}) {
  const toneStyles = {
    emerald: {
      border: 'border-emerald-200/80 bg-white/90',
      icon: 'bg-emerald-100 text-emerald-700',
      badge: 'bg-emerald-50 text-emerald-700',
    },
    amber: {
      border: 'border-amber-200/80 bg-white/90',
      icon: 'bg-amber-100 text-amber-700',
      badge: 'bg-amber-50 text-amber-700',
    },
    sky: {
      border: 'border-sky-200/80 bg-white/90',
      icon: 'bg-sky-100 text-sky-700',
      badge: 'bg-sky-50 text-sky-700',
    },
  }[tone];

  return (
    <div
      className={cn(
        'min-w-0 rounded-[28px] border p-5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.35)]',
        toneStyles.border,
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', toneStyles.icon)}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
          </div>
        </div>
        {helper ? (
          <span
            className={cn(
              'max-w-full rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
              toneStyles.badge,
            )}
          >
            {helper}
          </span>
        ) : null}
      </div>
      <div className="mt-5 break-words text-[clamp(2.25rem,5vw,3.75rem)] font-black leading-[0.92] tracking-[-0.05em] text-slate-950">
        {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

function FeaturedComplaintCategoryCard({
  categoryName,
  countLabel,
  shareLabel,
  openCountLabel,
  className,
}: {
  categoryName: string;
  countLabel: string;
  shareLabel?: string;
  openCountLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative min-w-0 overflow-hidden rounded-[30px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96)_55%,rgba(254,243,199,0.7))] p-5 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.35)]',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-14 top-0 h-32 w-32 rounded-full bg-amber-200/50 blur-3xl" />
      <div className="relative h-full">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200">
              <FolderTree className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Top complaint category
              </div>
              <div className="mt-4 max-w-[16ch] break-words text-[clamp(2rem,4.4vw,3.5rem)] font-black leading-[0.9] tracking-[-0.055em] text-slate-950">
                {categoryName}
              </div>
            </div>
          </div>
          {shareLabel ? (
            <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
              {shareLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 font-bold text-slate-700">
            {countLabel}
          </span>
          {openCountLabel ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-bold text-amber-700">
              {openCountLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: ElementType;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-4 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.4)]">
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-xl bg-white p-2 text-emerald-700 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
      </div>
      <div className="text-lg font-black text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{caption}</div>
    </div>
  );
}

function ComplaintAreaCategoryHeatmap({ result }: { result: QueryResult }) {
  const heatmap = useMemo(() => {
    const rows = result.rows as Array<Record<string, unknown>>;
    const areaOrder = ['Apron Area', 'Terminal Area', 'General', 'Unknown'];
    const categories = Array.from(new Set(rows.map((row) => String(row.category || ''))));
    const sortedCategories = categories.sort((left, right) => {
      const leftTotal = rows
        .filter((row) => String(row.category || '') === left)
        .reduce((sum, row) => sum + Number(row.count || 0), 0);
      const rightTotal = rows
        .filter((row) => String(row.category || '') === right)
        .reduce((sum, row) => sum + Number(row.count || 0), 0);
      return rightTotal - leftTotal;
    });

    const areas = areaOrder.filter((area) => rows.some((row) => String(row.area || '') === area));
    const matrix = new Map<string, number>();
    let maxCount = 0;

    rows.forEach((row) => {
      const area = String(row.area || 'Unknown');
      const category = String(row.category || 'Unclassified Complaint');
      const count = Number(row.count || 0);
      matrix.set(`${area}::${category}`, count);
      maxCount = Math.max(maxCount, count);
    });

    return {
      areas,
      categories: sortedCategories,
      matrix,
      maxCount,
    };
  }, [result]);

  const getCellStyle = (value: number) => {
    if (value === 0 || heatmap.maxCount === 0) {
      return {
        backgroundColor: '#f8fafc',
        color: '#94a3b8',
      };
    }

    const ratio = value / heatmap.maxCount;
    if (ratio >= 0.8) return { backgroundColor: '#065f46', color: '#ffffff' };
    if (ratio >= 0.55) return { backgroundColor: '#10b981', color: '#ffffff' };
    if (ratio >= 0.3) return { backgroundColor: '#6ee7b7', color: '#064e3b' };
    return { backgroundColor: '#d1fae5', color: '#065f46' };
  };

  const tableMinWidth = Math.max(1600, 220 + heatmap.categories.length * 280);

  return (
    <div className="min-w-0 overflow-hidden rounded-[28px] border border-emerald-200/70 bg-white/90 p-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.35)]">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
          <MapIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Area-to-Category Heatmap</h3>
          <p className="text-xs text-slate-600">
            Matriks ini menunjukkan kombinasi area dan complaint category yang paling dominan setelah normalisasi taxonomy.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-hidden pb-2">
        <table
          className="w-max border-separate border-spacing-2"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Area
              </th>
              {heatmap.categories.map((category) => (
                <th
                  key={category}
                  className="min-w-[120px] px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"
                  title={category}
                >
                  <span className="line-clamp-2">{category}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.areas.map((area) => (
              <tr key={area}>
                <td className="sticky left-0 z-10 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                  {area}
                </td>
                {heatmap.categories.map((category) => {
                  const value = heatmap.matrix.get(`${area}::${category}`) || 0;
                  const style = getCellStyle(value);

                  return (
                    <td key={`${area}-${category}`} className="min-w-[120px] px-1 py-1">
                      <div
                        className="rounded-xl px-2 py-3 text-center text-sm font-black shadow-sm"
                        style={style}
                        title={`${area} • ${category}: ${value} complaint`}
                      >
                        {value || '-'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplaintRecordsTable({
  reports,
  category,
}: {
  reports: EnrichedComplaintReport[];
  category: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const filteredReports = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return reports;

    return reports.filter((report) =>
      [
        report.reportTitle,
        report.resolvedCategory,
        report.branchLabel,
        report.hubLabel,
        report.airlineLabel,
        report.sourceSheetLabel,
        report.description,
        report.report,
      ]
        .filter(Boolean)
        .join(' | ')
        .toLowerCase()
        .includes(term),
    );
  }, [reports, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const visibleReports = filteredReports.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const handleExport = () => {
    const exportRows = filteredReports.map((report) => ({
      date: report.reportDateLabel,
      title: report.reportTitle,
      area: report.normalizedArea,
      category: report.resolvedCategory,
      branch: report.branchLabel,
      hub: report.hubLabel,
      airline: report.airlineLabel,
      status: report.normalizedStatus,
      source_sheet: report.sourceSheetLabel,
      root_cause: report.root_caused || report.root_cause || '',
      action_taken: report.action_taken || report.preventive_action || '',
      detail_url: `/dashboard/op/reports/${report.id}`,
    }));

    exportRowsToCsv(exportRows, `op_complaints_${slugify(category || 'all')}`);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/70 px-4 py-3">
        <div>
          <div className="text-sm font-black text-slate-900">
            {category || 'Complaint Records'}
          </div>
          <div className="text-xs text-slate-500">
            {filteredReports.length} record match untuk kategori dan search aktif.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari judul, branch, airline..."
              className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-all focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={filteredReports.length === 0}
            className="h-10 rounded-xl border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/80">
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Complaint</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Category Context</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Entity</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Tracking</th>
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visibleReports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  Tidak ada complaint records untuk kategori dan search aktif.
                </td>
              </tr>
            ) : (
              visibleReports.map((report) => (
                <tr key={report.id} className="bg-white/80 align-top">
                  <td className="px-4 py-4">
                    <div className="max-w-[360px]">
                      <div className="text-sm font-bold text-slate-900">{report.reportTitle}</div>
                      <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {report.description || report.report || 'Tanpa deskripsi tambahan'}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                          {report.reportDateLabel}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-1 text-[10px] font-bold',
                            report.normalizedStatus === 'OPEN' && 'bg-amber-100 text-amber-700',
                            report.normalizedStatus === 'PROGRESS' && 'bg-cyan-100 text-cyan-700',
                            report.normalizedStatus === 'CLOSED' && 'bg-emerald-100 text-emerald-700',
                          )}
                        >
                          {report.normalizedStatus}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1 text-xs text-slate-600">
                      <div><span className="font-bold text-slate-900">Area:</span> {report.normalizedArea}</div>
                      <div><span className="font-bold text-slate-900">Category:</span> {report.resolvedCategory}</div>
                      <div><span className="font-bold text-slate-900">Sheet:</span> {report.sourceSheetLabel}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1 text-xs text-slate-600">
                      <div><span className="font-bold text-slate-900">Branch:</span> {report.branchLabel}</div>
                      <div><span className="font-bold text-slate-900">Hub:</span> {report.hubLabel}</div>
                      <div><span className="font-bold text-slate-900">Airline:</span> {report.airlineLabel}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-[10px] font-bold',
                          report.rootCauseFilled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700',
                        )}
                      >
                        Root cause {report.rootCauseFilled ? 'filled' : 'blank'}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-[10px] font-bold',
                          report.actionTakenFilled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700',
                        )}
                      >
                        Action {report.actionTakenFilled ? 'filled' : 'blank'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                      <Link href={`/dashboard/op/reports/${report.id}`}>Buka</Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/70 px-4 py-3">
        <div className="text-xs text-slate-500">
          Menampilkan {filteredReports.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1}-
          {Math.min(safePage * rowsPerPage, filteredReports.length)} dari {filteredReports.length} record
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
            disabled={safePage === 1}
            className="rounded-lg border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            Prev
          </Button>
          <span className="text-xs font-bold text-slate-600">
            {safePage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
            disabled={safePage === totalPages || filteredReports.length === 0}
            className="rounded-lg border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
