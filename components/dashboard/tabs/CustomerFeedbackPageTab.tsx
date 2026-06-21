'use client';

/**
 * Renders one page of customer-feedback-main inside an OS tab, styled with the
 * same .sr-scope card system the OP tabs (SummaryReportTab, ServiceQualityImprovementTab,
 * GsePerformanceTab, JoumpaServiceTab, CgoCargoReportTab, DelayCodeReportTab) use.
 *
 * Speed: dashboard config is module-cached, and on first mount the component
 * prefetches all 5 pages in parallel — subsequent tab switches read from cache
 * and render instantly.
 */

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { QueryResult } from '@/types/builder';

const DONUT_COLORS = [
  'var(--sr-accent)',
  'var(--sr-gold)',
  'var(--sr-chart-3)',
  'var(--sr-chart-4)',
  'var(--sr-chart-5)',
  'var(--sr-neg)',
];

const SLUG = 'customer-feedback-main';
const ALL_PAGES = [0, 1, 2, 3, 4];

interface ChartTile {
  id: string;
  title?: string;
  chart_type?: string;
  visualization_config?: { chartType?: string };
  layout?: { x?: number; y?: number; w?: number; h?: number };
  position?: number;
  page_name?: string;
}

interface DashboardConfig {
  id: string;
  name: string;
  config?: { pages?: string[] };
  dashboard_charts: ChartTile[];
}

interface PagePayload {
  chartResults: Map<string, ChartResult>;
  investigativeResult?: QueryResult;
}

interface ChartResult {
  type: string;
  queryResult?: QueryResult;
  stats?: unknown;
}

// ── module-level cache + prefetch ──────────────────────────────────────────
let dashboardCache: DashboardConfig | null = null;
let dashboardPromise: Promise<DashboardConfig> | null = null;
const pageCache: Map<number, PagePayload> = new Map();
const pagePromises: Map<number, Promise<PagePayload>> = new Map();
let prefetchKicked = false;

async function loadDashboard(): Promise<DashboardConfig> {
  if (dashboardCache) return dashboardCache;
  if (!dashboardPromise) {
    dashboardPromise = fetch(`/api/dashboards?slug=${SLUG}`).then(async (r) => {
      if (!r.ok) throw new Error(r.status === 403 ? 'Akses ditolak' : 'Gagal memuat dashboard');
      return r.json();
    });
  }
  dashboardCache = await dashboardPromise;
  return dashboardCache;
}

async function loadPage(pageIndex: number): Promise<PagePayload> {
  const hit = pageCache.get(pageIndex);
  if (hit) return hit;
  const existing = pagePromises.get(pageIndex);
  if (existing) return existing;

  const params = new URLSearchParams({
    slug: SLUG,
    includeData: '1',
    pageIndex: String(pageIndex),
    range: 'all',
    dateFrom: '1900-01-01',
    dateTo: '2099-12-31',
  });
  const promise = fetch(`/api/dashboards?${params}`)
    .then(async (r) => {
      if (!r.ok) throw new Error(r.status === 403 ? 'Akses ditolak' : 'Gagal memuat data');
      const payload = await r.json();
      const map = new Map<string, ChartResult>();
      for (const [id, value] of Object.entries(payload.chartResults || {})) {
        map.set(id, value as ChartResult);
      }
      const out: PagePayload = { chartResults: map, investigativeResult: payload.investigativeResult };
      pageCache.set(pageIndex, out);
      return out;
    })
    .finally(() => {
      pagePromises.delete(pageIndex);
    });
  pagePromises.set(pageIndex, promise);
  return promise;
}

export function prefetchCustomerFeedback() {
  if (prefetchKicked) return;
  prefetchKicked = true;
  loadDashboard().then(() => {
    ALL_PAGES.forEach((p) => loadPage(p).catch(() => {}));
  }).catch(() => { prefetchKicked = false; });
}

function kickPrefetch() {
  prefetchCustomerFeedback();
}

// ── component ──────────────────────────────────────────────────────────────
interface Props {
  pageIndex: number;
}

export function CustomerFeedbackPageTab({ pageIndex }: Props) {
  const [dashboard, setDashboard] = useState<DashboardConfig | null>(dashboardCache);
  const [page, setPage] = useState<PagePayload | null>(pageCache.get(pageIndex) || null);
  const [loading, setLoading] = useState(!pageCache.has(pageIndex));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    kickPrefetch();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [dash, pg] = await Promise.all([loadDashboard(), loadPage(pageIndex)]);
        if (cancelled) return;
        setDashboard(dash);
        setPage(pg);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pageIndex]);

  const pages = useMemo(() => {
    if (!dashboard) return [];
    const charts = dashboard.dashboard_charts || [];
    const hasPages = charts.some((c) => c.page_name && c.page_name !== 'Ringkasan Umum');
    const configPages = dashboard.config?.pages;
    if (hasPages || (configPages && configPages.length > 1)) {
      const pageMap = new Map<string, ChartTile[]>();
      for (const pn of configPages || []) pageMap.set(pn, []);
      for (const chart of charts) {
        const pn = chart.page_name || 'Ringkasan Umum';
        if (!pageMap.has(pn)) pageMap.set(pn, []);
        pageMap.get(pn)!.push(chart);
      }
      return Array.from(pageMap.entries())
        .filter(([, t]) => t.length > 0)
        .map(([name, tiles]) => ({
          name,
          tiles: tiles.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
        }));
    }
    return [{ name: 'Ringkasan Umum', tiles: [...charts].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) }];
  }, [dashboard]);

  const currentPage = pages[pageIndex];
  // KPI-borrowing rule from CustomDashboardContent: pages 0/3 borrow KPIs from 1/4.
  const kpiSourceIndex = pageIndex === 0 ? 1 : pageIndex === 3 ? 4 : pageIndex;
  const extraKpis = useMemo(() => {
    const src = pages[kpiSourceIndex];
    return src?.tiles.filter((t) => t.visualization_config?.chartType === 'kpi' || t.chart_type === 'kpi') || [];
  }, [pages, kpiSourceIndex]);

  const contentTiles = useMemo(() => {
    if (!currentPage) return [];
    return currentPage.tiles
      .filter((t) => !(t.visualization_config?.chartType === 'kpi' || t.chart_type === 'kpi'))
      .slice()
      .sort((a, b) => {
        const ay = a.layout?.y ?? 0;
        const by = b.layout?.y ?? 0;
        if (ay !== by) return ay - by;
        const ax = a.layout?.x ?? 0;
        const bx = b.layout?.x ?? 0;
        if (ax !== bx) return ax - bx;
        return (a.position ?? 0) - (b.position ?? 0);
      });
  }, [currentPage]);

  const rows = useMemo(() => {
    const grouped = new Map<number, ChartTile[]>();
    for (const tile of contentTiles) {
      const y = tile.layout?.y ?? 0;
      if (!grouped.has(y)) grouped.set(y, []);
      grouped.get(y)!.push(tile);
    }
    return Array.from(grouped.keys()).sort((a, b) => a - b).map((y) => grouped.get(y)!);
  }, [contentTiles]);

  if (loading && !page) {
    return (
      <div className="sr-scope bg-[color:var(--sr-canvas)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="sr-card flex items-center justify-center gap-3 px-6 py-12 text-[13px] font-bold text-[color:var(--sr-text-3)]">
          <Loader2 size={18} className="animate-spin text-[color:var(--sr-accent)]" />
          Memuat data...
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="sr-scope bg-[color:var(--sr-canvas)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="sr-card border border-red-200 bg-red-50 px-6 py-8 text-center text-sm font-bold text-red-600">
          {error}
        </div>
      </div>
    );
  }
  if (!currentPage) {
    return (
      <div className="sr-scope bg-[color:var(--sr-canvas)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="sr-card px-6 py-8 text-center text-sm font-bold text-[color:var(--sr-text-3)]">
          Tidak ada data.
        </div>
      </div>
    );
  }

  const getResult = (id: string) => page?.chartResults.get(id)?.queryResult;

  const toChartData = (id: string) => {
    const rs = getResult(id)?.rows || [];
    return rs.map((r: Record<string, unknown>) => {
      const entries = Object.entries(r || {});
      const numericEntry = entries.find(([, v]) => typeof v === 'number');
      const textEntry =
        entries.find(([, v]) => typeof v === 'string' && Number.isNaN(Number(v))) ||
        entries.find(([, v]) => typeof v === 'string') ||
        entries[0];
      return {
        name: String(textEntry?.[1] || 'Unknown'),
        value: Number(numericEntry?.[1] || 0),
      };
    });
  };

  const rowGridClass = (rowItems: ChartTile[]) => {
    const widthSignature = rowItems.map((t) => t.layout?.w).join('-');
    if (widthSignature === '3-3-3-3') return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
    if (widthSignature === '4-4-4') return 'grid-cols-1 lg:grid-cols-3';
    if (widthSignature === '6-6') return 'grid-cols-1 lg:grid-cols-2';
    if (widthSignature === '8-4') return 'grid-cols-1 xl:grid-cols-[2fr_1fr]';
    const len = rowItems.length;
    if (len === 1) return 'grid-cols-1';
    if (len === 2) return 'grid-cols-1 md:grid-cols-2';
    if (len === 3) return 'grid-cols-1 md:grid-cols-3';
    if (len === 4) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
    return 'grid-cols-1 md:grid-cols-3 xl:grid-cols-4';
  };

  const renderChartBody = (chart: ChartTile, isFullWidth: boolean) => {
    const title = String(chart.title || '').toLowerCase();
    const type = String(chart.visualization_config?.chartType || chart.chart_type || '').toLowerCase();
    const isExplicitDonut = type === 'donut' || type === 'pie';
    const isExplicitBar = type === 'bar' || type === 'horizontal_bar' || type === 'column';
    const isTable = type === 'table';
    const isDetailTable =
      title.includes('detail report landside & airside') ||
      title.includes('detail report cgo cargo') ||
      title.includes('investigative');
    const isDonut = isExplicitDonut ||
      ((title.includes('report by case category') || title.includes('category by area')) && !isExplicitBar);
    const isPivot = type === 'pivot' || type === 'heatmap' ||
      title.includes('category by branch') ||
      title.includes('category by airlines') ||
      title.includes('category by airline') ||
      title.includes('identification of root') ||
      title.includes('total area report') ||
      title.includes('detail root cause summary') ||
      title.includes('primary indicators') ||
      title.includes('root cause result');
    const result = getResult(chart.id);

    if (isTable || isDetailTable) return <SrTable result={result} maxRows={isFullWidth ? 500 : 120} />;
    if (isPivot) return <SrPivot result={result} isFullWidth={isFullWidth} />;
    if (isDonut) return <SrDonut data={toChartData(chart.id)} />;
    return (
      <SrHBar
        data={toChartData(chart.id)}
        limit={title.includes('monthly') || title.includes('bulan') ? 0 : 8}
        sortByValue={!(title.includes('monthly') || title.includes('bulan'))}
      />
    );
  };

  return (
    <div className="sr-scope space-y-6 bg-[color:var(--sr-canvas)] px-3 py-5 text-[color:var(--sr-text)] sm:px-4 md:space-y-8 md:px-6 lg:px-8">
      <div className="sr-card relative flex flex-col gap-3 overflow-hidden px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="absolute inset-x-0 top-0 h-[5px] bg-[color:var(--sr-accent)]" aria-hidden="true" />
        <div className="flex min-w-0 items-center gap-4">
          <span className="inline-block h-10 w-[6px] shrink-0 rounded bg-[color:var(--sr-accent)] shadow-[5px_0_0_var(--sr-gold,#f59e0b)]" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(20px,2vw,28px)] font-bold leading-tight tracking-[-0.02em] text-[color:var(--sr-text)]">
              {currentPage.name}
            </h1>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--sr-text-3)]">
              Customer Feedback · {dashboard?.name}
            </p>
          </div>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--sr-text-3)]">
            <Loader2 size={12} className="animate-spin" /> Memperbarui
          </div>
        )}
      </div>

      {extraKpis.length > 0 && (
        <section>
          <div className="sr-section-h">
            <span className="sr-section-rule" aria-hidden="true" />
            <h2>Key Indicators</h2>
          </div>
          {/* One full row on tablet+, 2-col wrap on mobile. Dynamic template avoids Tailwind purge issues. */}
          <div
            className="grid grid-cols-2 gap-3 sm:gap-4"
            style={{ gridTemplateColumns: `repeat(${extraKpis.length}, minmax(0, 1fr))` }}
          >
            {extraKpis.map((kpi) => {
              const total = Number(getResult(kpi.id)?.rows[0]?.total || 0);
              return (
                <div
                  key={kpi.id}
                  className="sr-card flex min-w-0 flex-col items-start justify-between gap-2 px-4 py-4"
                >
                  <span className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--sr-accent-dark)] w-full">
                    {kpi.title}
                  </span>
                  <span className="font-display text-2xl font-black tabular-nums tracking-tight text-[color:var(--sr-text)]">
                    {total.toLocaleString('id-ID')}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {contentTiles.length > 0 && (
        <div className="space-y-4">
          {rows.map((rowTiles, rowIndex) => (
            <div key={`row-${rowIndex}`} className={`grid items-stretch gap-4 ${rowGridClass(rowTiles)}`}>
              {rowTiles.map((chart) => (
                <article
                  key={chart.id}
                  className="sr-card flex h-full min-h-0 flex-col overflow-hidden"
                >
                  <header className="flex items-center justify-between gap-3 border-b border-[color:var(--sr-border)] px-4 py-2.5">
                    <h3 className="m-0 truncate text-[11px] font-black uppercase tracking-[0.14em] text-[color:var(--sr-accent-dark)]">
                      {chart.title}
                    </h3>
                  </header>
                  <div className="flex min-h-0 flex-1 overflow-hidden">
                    {renderChartBody(chart, rowTiles.length === 1)}
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      )}

      {page?.investigativeResult && (
        <section>
          <div className="sr-section-h">
            <span className="sr-section-rule" aria-hidden="true" />
            <h2>Investigative Report Details</h2>
          </div>
          <div className="sr-card overflow-hidden p-3">
            <SrTable result={page.investigativeResult} maxRows={500} />
          </div>
        </section>
      )}
    </div>
  );
}

// ── Visual primitives mirroring OP tab components ─────────────────────────
type Point = { name: string; value: number };

function SrEmpty({ label = 'No data available' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[10rem] items-center justify-center text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
      {label}
    </div>
  );
}

function SrHBar({
  data,
  limit,
  sortByValue,
}: {
  data: Point[];
  limit: number;
  sortByValue: boolean;
}) {
  if (!data.length) return <SrEmpty />;
  let rows = data.slice();
  if (sortByValue) rows.sort((a, b) => b.value - a.value);
  if (limit > 0) rows = rows.slice(0, limit);
  const longest = rows.reduce((m, r) => Math.max(m, r.name.length), 0);
  // Wider cap so multi-word labels like "Passenger, Baggage & Document Profiling" aren't pixel-clipped.
  const yAxisWidth = Math.min(220, Math.max(80, longest * 6.2));
  // ponytail: fixed pixel height per row keeps sparse charts (HUB REPORT = 1 bar) from
  // stretching to fill sibling height in the grid row.
  const chartHeight = Math.max(140, Math.min(440, rows.length * 30 + 56));
  const truncate = (s: string) => (s.length > 32 ? `${s.slice(0, 30)}…` : s);
  return (
    <div className="w-full p-2.5" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="var(--sr-border)" />
          <XAxis
            type="number"
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--sr-text-3)' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={yAxisWidth}
            interval={0}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--sr-text)' }}
            tickFormatter={truncate}
          />
          <Tooltip
            cursor={{ fill: 'var(--sr-accent-tint)' }}
            contentStyle={{ borderRadius: 4, borderColor: 'var(--sr-border-strong)', fontSize: 11 }}
          />
          <Bar dataKey="value" fill="var(--sr-accent)" radius={[0, 4, 4, 0]} barSize={16} maxBarSize={20}>
            <LabelList
              dataKey="value"
              position="right"
              style={{ fill: 'var(--sr-text)', fontSize: 10, fontWeight: 800 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SrDonut({ data }: { data: Point[] }) {
  const total = data.reduce((s, r) => s + r.value, 0);
  if (total === 0) return <SrEmpty />;
  return (
    <div className="grid w-full grid-cols-[1fr_minmax(0,1.1fr)] items-stretch gap-2 p-2.5" style={{ height: 240 }}>
      <div className="relative flex min-h-0 items-center justify-center">
        <ResponsiveContainer width="100%" height="100%" minHeight={140}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="92%"
              stroke="var(--sr-raised)"
              strokeWidth={2}
            >
              {data.map((row, idx) => (
                <Cell key={`${row.name}-${idx}`} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 4, borderColor: 'var(--sr-border-strong)', fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[18px] font-bold leading-none tabular-nums text-[color:var(--sr-text)]">
            {total.toLocaleString('id-ID')}
          </span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">Total</span>
        </div>
      </div>
      <ul className="flex flex-col gap-1 overflow-y-auto">
        {data.map((row, idx) => (
          <li key={`${row.name}-${idx}`} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
              <span className="truncate font-semibold text-[color:var(--sr-text-2)]">{row.name}</span>
            </span>
            <span className="shrink-0 font-mono text-[12px] font-bold tabular-nums text-[color:var(--sr-text)]">
              {row.value.toLocaleString('id-ID')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function isNumericCell(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// Strip leading underscores ("_COUNT" → "COUNT") and normalise to title-ish display.
function prettyHeader(c: string) {
  const cleaned = c.replace(/^_+/, '').replace(/_/g, ' ').trim();
  return cleaned || c;
}

const EVIDENCE_COL = /(evidence|link|url|attachment|bukti)/i;
const COUNT_COL = /^_?(count|total|jumlah|qty)$/i;
const REPORT_TEXT_COL = /^(report|root\s*caus(ed)?|action(\s*taken)?|preventive(\s*action)?|final\s*remarks?|remarks?|description|deskripsi)$/i;

// Drop redundant columns: constant-valued helpers like "_count" = 1, or numeric leaders that
// duplicate another column ("_count" alongside "record count").
function dedupeColumns(cols: string[], rows: Record<string, unknown>[]): string[] {
  if (cols.length <= 1 || rows.length === 0) return cols;
  const drop = new Set<number>();
  const sample = rows.slice(0, Math.min(rows.length, 20));
  const norm = (c: string) => c.toLowerCase().replace(/^_+/, '').replace(/[_\s]+/g, ' ').trim();

  for (let i = 0; i < cols.length; i++) {
    if (drop.has(i)) continue;
    const a = norm(cols[i]);
    if (!COUNT_COL.test(a)) continue;
    // Constant column (every value identical) → useless when count is just "1" per row.
    const first = sample[0]?.[cols[i]];
    const constant = sample.every((r) => r[cols[i]] === first);
    if (constant && (first === 1 || first === '1')) { drop.add(i); continue; }
    // Duplicate of another numeric column with a more descriptive name (e.g. "record count", "total").
    for (let j = 0; j < cols.length; j++) {
      if (i === j || drop.has(j)) continue;
      const b = norm(cols[j]);
      const moreDescriptive = b.length > a.length && (b.includes('count') || b.includes('total'));
      if (!moreDescriptive) continue;
      const match = sample.every((r) => r[cols[i]] === r[cols[j]]);
      if (match) { drop.add(i); break; }
    }
  }
  return cols.filter((_, i) => !drop.has(i));
}

// Relative column weights (0–1). Long text columns get the bulk; codes/dates stay narrow.
function colWeight(name: string): number {
  if (EVIDENCE_COL.test(name)) return 1.2;
  if (REPORT_TEXT_COL.test(name)) return 3;
  const n = name.toLowerCase().replace(/^_+/, '').replace(/_/g, ' ').trim();
  if (/(date|tanggal|tgl|periode|bulan)/.test(n)) return 0.9;
  if (/(count|total|jumlah|qty|no\.?)/.test(n)) return 0.5;
  if (/(branch|station|hub|flight|code|kode|airline)/.test(n)) return 0.8;
  if (/(status|severity|priority)/.test(n)) return 0.7;
  return 1;
}

function extractUrls(s: string): string[] {
  return s.match(/https?:\/\/[^\s,;|<>"')]+/g) ?? [];
}

function CellValue({ column, value }: { column: string; value: unknown }) {
  if (value == null || value === '') {
    return <span className="text-[color:var(--sr-text-3)]">–</span>;
  }
  if (EVIDENCE_COL.test(column)) {
    const links = extractUrls(String(value));
    if (links.length === 0) {
      return <span className="text-[color:var(--sr-text-3)]">–</span>;
    }
    return (
      <div className="flex flex-wrap items-center justify-center gap-1">
        {links.map((href, i) => (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 rounded-md bg-[color:var(--sr-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[color:var(--sr-accent-strong)]"
            title={href}
          >
            <ExternalLink size={10} />
            {links.length > 1 ? `Link ${i + 1}` : 'Open'}
          </a>
        ))}
      </div>
    );
  }
  if (isNumericCell(value)) {
    return <span className="font-mono tabular-nums">{value.toLocaleString('id-ID')}</span>;
  }
  return <span>{String(value)}</span>;
}

function SrPivot({ result, isFullWidth }: { result: QueryResult | undefined; isFullWidth: boolean }) {
  if (!result || !result.columns?.length || !result.rows?.length) return <SrEmpty />;
  const cols = result.columns;
  // Heatmap shading on numeric columns
  const numericMax = (() => {
    let max = 0;
    for (const r of result.rows) {
      for (const c of cols) {
        const v = (r as Record<string, unknown>)[c];
        if (isNumericCell(v)) max = Math.max(max, v);
      }
    }
    return max;
  })();
  const shade = (v: number) => {
    if (!v || !numericMax) return 'transparent';
    const intensity = Math.min(0.95, 0.12 + (v / numericMax) * 0.65);
    return `rgba(6, 78, 59, ${intensity.toFixed(3)})`;
  };
  const visibleCols = dedupeColumns(cols as string[], result.rows as Record<string, unknown>[]);
  const totalWeight = visibleCols.reduce((s, c) => s + colWeight(c), 0);
  return (
    <div
      className={`w-full overflow-y-auto overflow-x-hidden custom-scrollbar p-2 ${isFullWidth ? 'min-h-[240px]' : 'min-h-[160px]'}`}
      style={{ maxHeight: isFullWidth ? 540 : 400 }}
    >
      <table
        className="sr-table sr-table-compact text-[10.5px]"
        style={{ width: '100%', tableLayout: 'fixed' }}
      >
        <colgroup>
          {visibleCols.map((c) => (
            <col key={c} style={{ width: `${(colWeight(c) / totalWeight) * 100}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {visibleCols.map((c, i) => (
              <th
                key={c}
                className={i === 0 ? '!text-left' : 'sr-center'}
                style={{ whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word', padding: '6px 4px' }}
              >
                {prettyHeader(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, ri) => (
            <tr key={ri}>
              {visibleCols.map((c, ci) => {
                const v = (row as Record<string, unknown>)[c];
                if (ci === 0) {
                  return (
                    <td
                      key={c}
                      className="sr-label leading-tight !bg-[color:var(--sr-overlay)] font-bold"
                      style={{ verticalAlign: 'middle', padding: '6px 5px', whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word' }}
                    >
                      {String(v ?? '–')}
                    </td>
                  );
                }
                if (isNumericCell(v)) {
                  const fg = numericMax && v / Math.max(1, numericMax) > 0.5 ? 'white' : 'var(--sr-text)';
                  return (
                    <td key={c} className="sr-center align-middle !p-0">
                      <div
                        className="h-full w-full px-1.5 py-1.5 font-mono text-[11px] font-bold tabular-nums"
                        style={{ backgroundColor: shade(v), color: v ? fg : 'var(--sr-text-3)' }}
                      >
                        {v ? v.toLocaleString('id-ID') : '–'}
                      </div>
                    </td>
                  );
                }
                return (
                  <td
                    key={c}
                    className="sr-center align-middle text-[10.5px] text-[color:var(--sr-text-2)]"
                    style={{ whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word', padding: '6px 4px' }}
                  >
                    <CellValue column={c} value={v} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SrTable({ result, maxRows = 200 }: { result: QueryResult | undefined; maxRows?: number }) {
  if (!result || !result.columns?.length || !result.rows?.length) return <SrEmpty />;
  const rows = result.rows.slice(0, maxRows);
  const cols = dedupeColumns(result.columns as string[], result.rows as Record<string, unknown>[]);
  const totalWeight = cols.reduce((s, c) => s + colWeight(c), 0);
  return (
    <div className="w-full overflow-y-auto overflow-x-hidden custom-scrollbar p-2" style={{ maxHeight: 520 }}>
      <table
        className="sr-table sr-table-compact text-[10.5px]"
        style={{ width: '100%', tableLayout: 'fixed' }}
      >
        <colgroup>
          {cols.map((c) => (
            <col key={c} style={{ width: `${(colWeight(c) / totalWeight) * 100}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th
                key={c}
                className={i === 0 ? '!text-left' : 'sr-center'}
                style={{ whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word', padding: '6px 4px' }}
              >
                {prettyHeader(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {cols.map((c, ci) => {
                const v = (row as Record<string, unknown>)[c];
                return (
                  <td
                    key={c}
                    className={ci === 0 ? 'sr-label !bg-[color:var(--sr-overlay)] font-bold' : 'sr-center'}
                    style={{ whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word', verticalAlign: 'top', padding: '6px 4px' }}
                  >
                    <CellValue column={c} value={v} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {result.rows.length > maxRows && (
        <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
          Showing {maxRows.toLocaleString('id-ID')} of {result.rows.length.toLocaleString('id-ID')} rows
        </p>
      )}
    </div>
  );
}
