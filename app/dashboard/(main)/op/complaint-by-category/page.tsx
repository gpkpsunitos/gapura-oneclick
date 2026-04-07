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
  type ComplaintCategoryRank,
  type ComplaintCategorySummary,
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

const SECTION_PANEL_CLASS_NAME =
  'min-w-0 flex w-full max-w-full flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/40 p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03] backdrop-blur-3xl shrink-0';

const QUIET_PANEL_CLASS_NAME =
  'min-w-0 rounded-[24px] border border-white/50 bg-white/30 p-5 shadow-sm backdrop-blur-md shrink-0';

export default function OPComplaintByCategory() {
  const [reports, setReports] = useState<ComplaintReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendMode, setTrendMode] = useState<ComplaintTrendMode>('sheet');
  const [hotspotDimension, setHotspotDimension] = useState<ComplaintHotspotDimension>('branch');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
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

  const rankedCategoryOptions = useMemo(
    () =>
      analytics.categoryRanking.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })),
    [analytics.categoryRanking],
  );

  const normalizedCategorySearchTerm = categorySearchTerm.trim().toLowerCase();

  const searchedCategoryOptions = useMemo(() => {
    if (!normalizedCategorySearchTerm) return rankedCategoryOptions;

    return rankedCategoryOptions.filter((entry) =>
      entry.name.toLowerCase().includes(normalizedCategorySearchTerm),
    );
  }, [rankedCategoryOptions, normalizedCategorySearchTerm]);

  const visibleCategoryOptions = useMemo(() => {
    if (normalizedCategorySearchTerm) {
      return searchedCategoryOptions;
    }

    if (showAllCategories || rankedCategoryOptions.length <= 8) {
      return rankedCategoryOptions;
    }

    const topOptions = rankedCategoryOptions.slice(0, 8);
    if (!selectedCategory || topOptions.some((entry) => entry.name === selectedCategory)) {
      return topOptions;
    }

    const selectedEntry = rankedCategoryOptions.find((entry) => entry.name === selectedCategory);
    if (!selectedEntry) return topOptions;

    return [...topOptions.slice(0, 7), selectedEntry];
  }, [
    normalizedCategorySearchTerm,
    rankedCategoryOptions,
    searchedCategoryOptions,
    selectedCategory,
    showAllCategories,
  ]);

  const selectedCategoryRank = useMemo(
    () => rankedCategoryOptions.find((entry) => entry.name === selectedCategory)?.rank || null,
    [rankedCategoryOptions, selectedCategory],
  );

  const selectedCategoryHiddenBySearch = Boolean(
    normalizedCategorySearchTerm &&
      selectedCategory &&
      !searchedCategoryOptions.some((entry) => entry.name === selectedCategory),
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
    <div className="min-h-screen min-w-0 max-w-full space-y-8 overflow-x-hidden bg-[#FAFAFA] text-slate-900 px-4 py-8 sm:px-8 md:px-12 selection:bg-emerald-200">
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

      <section className="relative min-w-0 flex flex-col gap-6">
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
            <div className="mb-6 flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 max-w-3xl flex-1">
                <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-black leading-none tracking-[-0.04em] text-slate-950 sm:text-3xl">
                  Complaint Per Category
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  Analytics of problem patterns categorized by primary intent.
                  Provides insights to eliminate recurring operational friction.
                </p>
              </div>

              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[280px] lg:shrink-0">
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
              <div className={SECTION_PANEL_CLASS_NAME}>
                <ResponsivePieChart
                  data={analytics.sheetMix}
                  title="Complaint Mix by Sheet"
                  donut
                  showLegend
                  percentageLabels
                  height="h-[280px]"
                />
              </div>

              <div className={SECTION_PANEL_CLASS_NAME}>
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

              <div className={SECTION_PANEL_CLASS_NAME}>
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

            <div className={cn('mt-5', SECTION_PANEL_CLASS_NAME)}>
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

            <div className={cn('mt-5', SECTION_PANEL_CLASS_NAME)}>
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
                <div className={QUIET_PANEL_CLASS_NAME}>
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
                  variant="minimal"
                />
              </div>
            </div>

            <div ref={recordsSectionRef} className={cn('mt-5', SECTION_PANEL_CLASS_NAME)}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Drill-down per Complaint Category</h3>
                  <p className="text-xs text-slate-600">
                    Pilih kategori complaint di bawah untuk membuka investigasi detail, record list, dan export CSV untuk subset yang aktif.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                    {analytics.categoryRanking.length} ranked categories
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                    {analytics.totalComplaints.toLocaleString('id-ID')} complaints in scope
                  </span>
                </div>
              </div>

              <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
                <SelectedComplaintCategoryPanel
                  category={selectedCategory}
                  rank={selectedCategoryRank}
                  summary={selectedCategorySummary}
                />

                <div className={cn(QUIET_PANEL_CLASS_NAME, "p-4 sm:p-5")}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                        Browse ranked categories
                      </div>
                      <h4 className="mt-2 text-lg font-black tracking-tight text-slate-950">
                        Compare volume, share, and open cases
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Start with the biggest drivers, then open a lower-ranked category only when you need detail.
                      </p>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          disabled={rankedCategoryOptions.length === 0}
                          value={categorySearchTerm}
                          onChange={(event) => setCategorySearchTerm(event.target.value)}
                          placeholder={
                            rankedCategoryOptions.length === 0
                              ? 'Belum ada category pada filter aktif'
                              : 'Cari complaint category...'
                          }
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition-all focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                        {visibleCategoryOptions.length} of {rankedCategoryOptions.length} shown
                      </span>
                      {!normalizedCategorySearchTerm && !showAllCategories && rankedCategoryOptions.length > 8 ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                          Top 8 + active selection
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {normalizedCategorySearchTerm ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCategorySearchTerm('')}
                          className="rounded-full border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        >
                          Clear search
                        </Button>
                      ) : null}
                      {!normalizedCategorySearchTerm && rankedCategoryOptions.length > 8 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllCategories((value) => !value)}
                          className="rounded-full border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        >
                          {showAllCategories
                            ? 'Show top categories'
                            : `Show all ${rankedCategoryOptions.length}`}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {selectedCategoryHiddenBySearch ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                      Selected category tetap aktif, tetapi tidak muncul pada hasil pencarian saat ini.
                    </div>
                  ) : null}

                  {visibleCategoryOptions.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {visibleCategoryOptions.map((entry) => (
                        <ComplaintCategoryOptionCard
                          key={entry.name}
                          entry={entry}
                          active={selectedCategory === entry.name}
                          onSelect={setSelectedCategory}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[26px] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center">
                      <div className="text-sm font-black text-slate-900">
                        {rankedCategoryOptions.length === 0 ? 'Belum ada category aktif' : 'Kategori tidak ditemukan'}
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {rankedCategoryOptions.length === 0
                          ? 'Ubah kombinasi filter di atas untuk memunculkan ranking complaint category.'
                          : 'Ubah kata kunci pencarian untuk melihat complaint category lain.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <ComplaintRecordsTable
                key={selectedCategory || 'all-categories'}
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
    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur transition-all hover:bg-white p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
          <div className="mt-1 break-words text-2xl font-bold leading-none tracking-[-0.03em] text-slate-900">{value}</div>
        </div>
      </div>
      <div className="text-xs leading-relaxed text-slate-500">{caption}</div>
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
        'relative min-w-0 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-sm',
        className,
      )}
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div>
          <div>
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 h-11 w-11 items-center justify-center rounded-[14px] bg-slate-900 text-white shadow-sm">
                <ClipboardList className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Filtered complaint volume
                </div>
                <div className="mt-3 text-4xl font-black tracking-[-0.04em] leading-none text-slate-950">
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
    <div className="min-w-0 rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm hover:bg-white transition-all">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
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
        'min-w-0 rounded-[20px] border border-slate-200/80 bg-white/80 p-5 shadow-sm transition-all hover:bg-white',
        className,
      )}
    >
      <div className="flex flex-col h-full justify-between gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={cn('flex shrink-0 h-10 w-10 items-center justify-center rounded-[12px] shadow-sm', toneStyles.icon)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
            </div>
          </div>
          {helper ? (
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold shadow-sm',
                toneStyles.badge,
              )}
            >
              {helper}
            </span>
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="break-words text-2xl font-bold leading-none tracking-tight text-slate-950">
            {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
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
        'relative min-w-0 rounded-[20px] border border-slate-200/80 bg-white/80 p-5 shadow-sm transition-all hover:bg-white',
        className,
      )}
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-[12px] bg-slate-900 text-white shadow-sm">
                <FolderTree className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Top complaint category
                </div>
              </div>
            </div>
            {shareLabel ? (
              <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[9px] font-bold text-amber-700 shadow-sm">
                {shareLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-3 min-w-0">
            <div className="break-words text-[clamp(1.5rem,3vw,2.25rem)] font-black leading-tight tracking-[-0.03em] text-slate-950">
              {categoryName}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm">
            {countLabel}
          </span>
          {openCountLabel ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 shadow-sm">
              {openCountLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SelectedComplaintCategoryPanel({
  category,
  rank,
  summary,
}: {
  category: string;
  rank: number | null;
  summary: ComplaintCategorySummary | null;
}) {
  if (!summary || !category) {
    return (
      <div className={cn(QUIET_PANEL_CLASS_NAME, "p-5")}>
        <div className="text-sm font-black text-slate-900">No active category</div>
        <p className="mt-2 text-sm text-slate-500">
          Pilih kategori dari ranking di sebelah kanan untuk membuka ringkasan dan record list.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(QUIET_PANEL_CLASS_NAME, "relative overflow-hidden p-5 border-emerald-200/50 bg-emerald-50/20")}>
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-emerald-200/65 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-8 h-36 w-36 rounded-full bg-sky-200/50 blur-3xl" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
              <ClipboardList className="h-3.5 w-3.5" />
              Active drill-down
            </div>
            <h4 className="mt-4 max-w-[16ch] break-words text-[clamp(1.85rem,4vw,2.8rem)] font-black leading-[0.92] tracking-[-0.055em] text-slate-950">
              {category}
            </h4>
          </div>

          {rank ? (
            <div className="rounded-[22px] border border-white/85 bg-white/80 px-4 py-3 text-right shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Rank
              </div>
              <div className="mt-1 text-2xl font-black leading-none tracking-[-0.05em] text-slate-950">
                #{rank}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/85 bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
            {summary.totalCount.toLocaleString('id-ID')} complaints
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            {formatPercent(summary.sharePct)} share
          </span>
          <span
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-bold',
              summary.openCount > 0
                ? 'border border-amber-200 bg-amber-50 text-amber-700'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700',
            )}
          >
            {summary.openCount > 0 ? `${summary.openCount} open` : 'All closed'}
          </span>
        </div>

        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
          Gunakan kategori aktif ini sebagai konteks utama. Record list dan export CSV di bawah selalu mengikuti pilihan yang sedang aktif.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <SelectionStatCard
            icon={AlertCircle}
            label="Open vs closed"
            value={`${summary.openCount} open`}
            caption={`${summary.closedCount} closed`}
          />
          <SelectionStatCard
            icon={MapPin}
            label="Top branch"
            value={summary.topBranch}
            caption={`Latest ${summary.latestDateLabel}`}
          />
          <SelectionStatCard
            icon={Plane}
            label="Top airline"
            value={summary.topAirline}
            caption="Most repeated carrier in this category"
          />
          <SelectionStatCard
            icon={ClipboardList}
            label="Investigation coverage"
            value={formatPercent(summary.rootCauseCoveragePct)}
            caption={`Action taken ${formatPercent(summary.actionTakenCoveragePct)}`}
          />
        </div>
      </div>
    </div>
  );
}

function SelectionStatCard({
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
    <div className="rounded-[24px] border border-slate-200/50 bg-white/50 p-4 shadow-sm backdrop-blur-md">
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
      </div>
      <div className="break-words text-base font-black leading-tight text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{caption}</div>
    </div>
  );
}

function ComplaintCategoryOptionCard({
  entry,
  active,
  onSelect,
}: {
  entry: ComplaintCategoryRank & { rank: number };
  active: boolean;
  onSelect: (category: string) => void;
}) {
  const barWidth = `${Math.min(100, Math.max(entry.sharePct, 6))}%`;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(entry.name)}
      className={cn(
        'group relative min-w-0 overflow-hidden rounded-[26px] border p-4 text-left transition-all duration-200',
        active
          ? 'border-emerald-500 bg-[linear-gradient(145deg,rgba(5,150,105,0.98),rgba(16,185,129,0.9)_58%,rgba(14,116,144,0.92))] text-white shadow-[0_22px_44px_-28px_rgba(5,150,105,0.65)]'
          : 'border-slate-200/80 bg-white/85 text-slate-800 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_22px_42px_-28px_rgba(15,23,42,0.28)]',
      )}
      title={`${entry.name}: ${entry.count} complaints`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
            active ? 'bg-white/16 text-white' : 'bg-slate-100 text-slate-600',
          )}
        >
          #{entry.rank}
        </span>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
            active ? 'bg-white/14 text-white/90' : 'bg-emerald-50 text-emerald-700',
          )}
        >
          {formatPercent(entry.sharePct)}
        </span>
      </div>

      <div className="mt-4 break-words text-base font-black leading-snug tracking-[-0.03em]">
        {entry.name}
      </div>

      <div
        className={cn(
          'mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-bold',
          active ? 'text-white/88' : 'text-slate-500',
        )}
      >
        <span
          className={cn(
            'rounded-full px-2.5 py-1',
            active ? 'bg-white/12 text-white' : 'bg-slate-100 text-slate-700',
          )}
        >
          {entry.count.toLocaleString('id-ID')} complaints
        </span>
        <span
          className={cn(
            'rounded-full px-2.5 py-1',
            active
              ? 'bg-white/12 text-white'
              : entry.openCount > 0
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700',
          )}
        >
          {entry.openCount > 0 ? `${entry.openCount} open` : 'All closed'}
        </span>
      </div>

      <div
        className={cn(
          'mt-4 h-2 overflow-hidden rounded-full',
          active ? 'bg-white/18' : 'bg-slate-100',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-200',
            active ? 'bg-white' : 'bg-[linear-gradient(90deg,#10b981,#14b8a6)]',
          )}
          style={{ width: barWidth }}
        />
      </div>
    </button>
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
    <section className="min-w-0 flex w-full max-w-full flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/40 p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03] backdrop-blur-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">Heatmap</div>
          <h2 className="text-[24px] font-medium tracking-tight text-slate-900">Area-to-Category Matrix</h2>
          <p className="mt-1 text-sm text-slate-500">
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
    </section>
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
  const normalizedSearchTerm = searchTerm.trim();

  const filteredReports = useMemo(() => {
    const term = normalizedSearchTerm.toLowerCase();
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
  }, [normalizedSearchTerm, reports]);

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
    <div className="overflow-hidden rounded-[28px] border border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/50 px-4 py-4 sm:px-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
              Record list
            </span>
            {category ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                {category}
              </span>
            ) : null}
          </div>
          <div className="mt-3 text-lg font-black tracking-tight text-slate-950">
            {category || 'Complaint Records'}
          </div>
          <div className="mt-1 text-xs leading-relaxed text-slate-500">
            {normalizedSearchTerm
              ? `${filteredReports.length} record cocok untuk kata kunci "${normalizedSearchTerm}" pada kategori aktif.`
              : `${filteredReports.length} record tersedia untuk kategori aktif. Cari judul, branch, airline, atau isi complaint untuk mempersempit subset.`}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[320px] sm:flex-row sm:items-center sm:justify-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari judul, branch, airline..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-all focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
          {normalizedSearchTerm ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="h-10 rounded-xl border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              Clear
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={filteredReports.length === 0}
            className="h-10 rounded-xl border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
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
                <td colSpan={5} className="px-4 py-10">
                  <div className="mx-auto max-w-md text-center">
                    <div className="text-sm font-black text-slate-900">
                      {normalizedSearchTerm ? 'Tidak ada hasil pencarian' : 'Tidak ada complaint records'}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {normalizedSearchTerm
                        ? 'Ubah atau hapus kata kunci pencarian untuk melihat record pada kategori ini.'
                        : 'Belum ada record yang cocok untuk kategori aktif.'}
                    </p>
                    {normalizedSearchTerm ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSearchTerm('');
                          setCurrentPage(1);
                        }}
                        className="mt-4 rounded-xl border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      >
                        Hapus pencarian
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              visibleReports.map((report) => (
                <tr key={report.id} className="bg-white/80 align-top transition-colors hover:bg-emerald-50/35">
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
