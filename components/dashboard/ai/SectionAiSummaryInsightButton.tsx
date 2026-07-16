'use client';

/**
 * "AI Summary & Insight" button — opens a side sheet with two tabs:
 *
 *  - Ringkasan : summary of the CURRENT section tab. The dashboard sends
 *                named datasets (per-month, per-station, YoY, …) to
 *                POST /api/ai/section-summary; every number displayed is
 *                computed server-side from the real data, and the LLM only
 *                writes the narrative around those facts.
 *  - Wawasan   : network-wide analysis from the Gapura ML Service
 *                (GET /api/ai/overview): executive summary, key numbers,
 *                14-day forecast, trends, risk leaderboard, 4-week outlook.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { buildCacheKey, readClientCache, writeClientCache } from '@/lib/ai/client-cache';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  useMLOverview, buildExecutiveSummary,
  EditorialSummary, HeroFigures, ForecastChart, SeasonalityPanel,
  RiskTable, MoversPanel, ReportCountForecast, CategoryOutlook,
  CaseRecurrencePanel,
} from '@/components/ai/ml-overview-sections';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionDatasetInput = {
  id: string;
  name: string;
  unit?: string;
  /** 'timeseries' | 'ranking' | 'comparison' — loose so tabs can pass literals. */
  kind: string;
  description?: string;
  rows: Array<{
    label: string;
    value: number;
    delta?: number;
    note?: string;
    breakdown?: Record<string, number>;
  }>;
};

type SectionAiContext = {
  section: string;
  title: string;
  chartType: string;
  /** Preferred: named datasets so incomparable numbers stay separate. */
  datasets?: SectionDatasetInput[];
  /** Legacy flat rows — still accepted by the API. */
  chartData?: unknown;
  featureHints?: string[];
  filters?: Record<string, unknown>;
};

type SummaryDatasetRow = { label: string; value: number; sharePct: number; delta?: number; note?: string };

type SummaryDataset = {
  id: string;
  name: string;
  unit: string;
  kind: string;
  total: number;
  headline: string;
  rows: SummaryDatasetRow[];
  narrative: string;
};

type SummaryRecommendation = {
  title: string;
  detail: string;
  priority: 'tinggi' | 'sedang' | 'rendah';
};

export type SectionSummaryResponse = {
  status: string;
  cached?: boolean;
  generatedAt: string;
  section: string;
  executiveSummary: string;
  keyPoints: string[];
  datasets: SummaryDataset[];
  recommendations: SummaryRecommendation[];
  predictiveSummary: string;
};

const SUMMARY_CACHE_NS = 'section-summary';
// The cacheKey already encodes the exact data snapshot (datasets/chartData),
// so a long TTL is safe — a different filter/data state gets its own key
// rather than reusing a stale one.
const SUMMARY_CACHE_TTL_MS = 60 * 60 * 1000;

function stableKey(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(Date.now());
  }
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? Math.round(value).toLocaleString('id-ID') : '—';
}

// ---------------------------------------------------------------------------
// Ringkasan — shared building blocks
// ---------------------------------------------------------------------------

const LABEL_CLASS = 'text-[10.5px] font-black uppercase tracking-[0.2em] text-emerald-900/80';
const CARD_CLASS = 'rounded-2xl border border-[#e7e1d2] bg-white shadow-[0_1px_3px_rgba(76,63,34,0.07)]';

function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className={cn(CARD_CLASS, 'h-32 animate-pulse bg-gradient-to-br from-amber-50/60 to-white')} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cn(CARD_CLASS, 'h-52 animate-pulse')} />
        <div className={cn(CARD_CLASS, 'h-52 animate-pulse')} />
      </div>
      <div className={cn(CARD_CLASS, 'h-40 animate-pulse')} />
      <p className="text-center text-[12px] text-stone-400">
        AI sedang membaca dan menyimpulkan data bagian ini — mohon tunggu sebentar…
      </p>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={cn(CARD_CLASS, 'p-10 text-center')}>
      <p className="break-words text-[13px] text-stone-500">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-lg border border-emerald-800/20 bg-emerald-50 px-4 py-1.5 text-[12px] font-bold text-emerald-900 transition hover:bg-emerald-100"
      >
        Coba lagi
      </button>
    </div>
  );
}

/** Signed change badge — rising incident counts are bad (rose), falling good (emerald). */
function DeltaBadge({ delta }: { delta: number }) {
  const rising = delta > 0;
  const flat = delta === 0;
  return (
    <span
      className={cn(
        'ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums',
        flat ? 'bg-stone-100 text-stone-500' : rising ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700',
      )}
    >
      {flat ? '±0%' : `${rising ? '▲' : '▼'} ${Math.abs(delta)}%`}
    </span>
  );
}

/** Ranked horizontal bars — gold for the leader, emerald for the rest. */
function RankedBars({ dataset }: { dataset: SummaryDataset }) {
  const rows = dataset.rows.slice(0, 8);
  const max = Math.max(...rows.map((row) => row.value), 1);
  // Share-of-total only makes sense when rows partition one whole.
  const showShare = dataset.kind === 'ranking';

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 break-words text-[13px] font-semibold text-stone-700">
              {row.label}
              {row.delta !== undefined && <DeltaBadge delta={row.delta} />}
            </p>
            <p className="shrink-0 text-[12px] font-bold tabular-nums text-stone-500">
              {formatNumber(row.value)}
              {showShare && row.sharePct > 0 && (
                <span className="ml-1.5 font-semibold text-stone-400">{row.sharePct}%</span>
              )}
            </p>
          </div>
          {row.note ? (
            <p className="mt-0.5 break-words text-[11px] leading-snug text-stone-400">{row.note}</p>
          ) : null}
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f1ede2]">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-700',
                index === 0
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-emerald-700 to-emerald-500',
              )}
              style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Chronological mini column chart for per-month datasets. */
function MonthlyColumns({ dataset }: { dataset: SummaryDataset }) {
  const rows = dataset.rows;
  const maxValue = Math.max(...rows.map((row) => row.value), 0);

  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 16, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#a8a29e' }}
            tickLine={false}
            axisLine={{ stroke: '#e7e1d2' }}
            interval={0}
            tickFormatter={(label: string) => label.slice(0, 3)}
          />
          <Tooltip
            cursor={{ fill: 'rgba(217,180,110,0.12)' }}
            contentStyle={{
              fontSize: 12,
              border: '1px solid #e7e1d2',
              borderRadius: 10,
              boxShadow: '0 4px 12px rgba(76,63,34,0.08)',
            }}
            formatter={(value: number) => [`${formatNumber(value)} ${dataset.unit}`, 'Jumlah']}
          />
          <Bar dataKey="value" radius={[5, 5, 0, 0]} isAnimationActive={false}>
            {rows.map((row, index) => (
              <Cell
                key={`${row.label}-${index}`}
                fill={row.value === maxValue && maxValue > 0 ? '#d97706' : '#047857'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DatasetCard({ dataset }: { dataset: SummaryDataset }) {
  return (
    <div className={cn(CARD_CLASS, 'flex flex-col p-6')}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h4 className={LABEL_CLASS}>{dataset.name}</h4>
        {/* Comparison rows may include their own "Total" row — summing them double-counts. */}
        {dataset.kind !== 'comparison' && (
          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-amber-800">
            {formatNumber(dataset.total)} {dataset.unit}
          </span>
        )}
      </div>

      <p className="mt-3 break-words text-[13.5px] font-semibold leading-relaxed text-emerald-950">
        {dataset.headline}
      </p>

      <div className="mt-4 flex-1">
        {dataset.kind === 'timeseries' && dataset.rows.length >= 3 ? (
          <MonthlyColumns dataset={dataset} />
        ) : (
          <RankedBars dataset={dataset} />
        )}
      </div>

      {dataset.narrative ? (
        <p className="mt-4 break-words border-l-2 border-amber-300 pl-3 text-[12.5px] leading-relaxed text-stone-500">
          {dataset.narrative}
        </p>
      ) : null}
    </div>
  );
}

const PRIORITY_STYLES: Record<SummaryRecommendation['priority'], { badge: string; label: string }> = {
  tinggi: { badge: 'border-rose-200 bg-rose-50 text-rose-700', label: 'Prioritas Tinggi' },
  sedang: { badge: 'border-amber-200 bg-amber-50 text-amber-800', label: 'Prioritas Sedang' },
  rendah: { badge: 'border-stone-200 bg-stone-50 text-stone-500', label: 'Prioritas Rendah' },
};

function RecommendationCards({ items }: { items: SummaryRecommendation[] }) {
  if (items.length === 0) {
    return <p className="text-[13px] text-stone-400">No recommendations for this section.</p>;
  }
  const order = { tinggi: 0, sedang: 1, rendah: 2 } as const;
  const sorted = [...items].sort((a, b) => order[a.priority] - order[b.priority]);

  return (
    <div className="space-y-3">
      {sorted.map((rec, index) => {
        const style = PRIORITY_STYLES[rec.priority];
        return (
          <div
            key={`${rec.title}-${index}`}
            className="rounded-xl border border-[#eee9dc] bg-[#fdfcf9] p-4 transition hover:border-amber-200"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
              <p className="break-words text-[13.5px] font-bold text-stone-800">{rec.title}</p>
              <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em]', style.badge)}>
                {style.label}
              </span>
            </div>
            <p className="mt-1.5 break-words text-[13px] leading-relaxed text-stone-600">{rec.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

function KeyPointList({ items }: { items: string[] }) {
  const cleaned = items
    .map((item) => String(item ?? '').replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  if (cleaned.length === 0) {
    return <p className="text-[13px] text-stone-400">No notes for this section.</p>;
  }

  return (
    <ul className="space-y-3">
      {cleaned.slice(0, 6).map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3 text-[13.5px] leading-relaxed text-stone-700">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-[10px] font-black text-amber-300">
            {index + 1}
          </span>
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Ringkasan tab
// ---------------------------------------------------------------------------

export function SummaryTab({
  loading, error, summary, onRetry,
}: {
  loading: boolean;
  error: string | null;
  summary: SectionSummaryResponse | null;
  onRetry: () => void;
}) {
  if (loading) return <SummarySkeleton />;
  if (error) return <ErrorCard message={error} onRetry={onRetry} />;
  if (!summary) return null;

  const datasets = summary.datasets ?? [];

  return (
    <div className="space-y-4">
      {/* Executive summary */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-emerald-50/70 p-6 shadow-[0_1px_3px_rgba(76,63,34,0.07)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-600" aria-hidden="true" />
        <h4 className={LABEL_CLASS}>Ringkasan Eksekutif</h4>
        <p className="mt-3 break-words text-[14.5px] leading-relaxed text-stone-800">
          {summary.executiveSummary}
        </p>
      </div>

      {/* One card per dataset — numbers computed from the dashboard data */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {datasets.map((dataset) => (
          <DatasetCard key={dataset.id} dataset={dataset} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cn(CARD_CLASS, 'p-6')}>
          <h4 className={LABEL_CLASS}>Poin Penting</h4>
          <div className="mt-4">
            <KeyPointList items={summary.keyPoints} />
          </div>
        </div>
        <div className={cn(CARD_CLASS, 'p-6')}>
          <h4 className={LABEL_CLASS}>Rekomendasi Tindakan</h4>
          <div className="mt-4">
            <RecommendationCards items={summary.recommendations ?? []} />
          </div>
        </div>
      </div>

      <div className={cn(CARD_CLASS, 'border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-6')}>
        <h4 className={LABEL_CLASS}>Perkiraan ke Depan</h4>
        <p className="mt-3 break-words text-[13.5px] leading-relaxed text-stone-700">
          {summary.predictiveSummary}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wawasan (network-wide ML analysis) tab
// ---------------------------------------------------------------------------

function InsightTab({
  loading, error, data, onRetry,
}: {
  loading: boolean;
  error: string;
  data: ReturnType<typeof useMLOverview>['data'];
  onRetry: () => void;
}) {
  const sentences = useMemo(() => (data ? buildExecutiveSummary(data) : []), [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-[24px] bg-white/80 ring-1 ring-black/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.10)] h-28 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[24px] bg-white/80 ring-1 ring-black/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.10)] h-40 animate-pulse" />
          ))}
        </div>
        <div className="rounded-[24px] bg-white/80 ring-1 ring-black/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.10)] h-72 animate-pulse" />
        <p className="text-center text-[12px] text-neutral-500 pt-2">
          Menganalisis pola laporan seluruh stasiun · biasanya &lt; 15 detik
        </p>
      </div>
    );
  }

  if (error) return <ErrorCard message={error} onRetry={onRetry} />;
  if (!data) return null;

  return (
    <div className="space-y-4 md:space-y-5">
      {sentences.length > 0 && <EditorialSummary sentences={sentences} />}
      <HeroFigures data={data} />
      {data.forecast?.forecast?.length ? <ForecastChart forecast={data.forecast} /> : null}
      {data.seasonality ? <SeasonalityPanel seasonality={data.seasonality} /> : null}
      {data.risk ? <RiskTable risk={data.risk} /> : null}
      <MoversPanel trends={data.trends} />
      {data.reportCounts ? <ReportCountForecast reportCounts={data.reportCounts} /> : null}
      {(data.categoryForecast || data.subcategoryForecast) ? (
        <CategoryOutlook
          categoryForecast={data.categoryForecast}
          subcategoryForecast={data.subcategoryForecast}
        />
      ) : null}
      {data.caseRecurrence ? <CaseRecurrencePanel recurrence={data.caseRecurrence} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SectionAiSummaryInsightButton({ context }: { context: SectionAiContext }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'insight'>('summary');

  // Ringkasan: per-section summary. cacheKey encodes the exact data shown
  // (datasets + filters), so a filter change naturally gets its own cache
  // entry instead of reusing a stale one.
  const cacheKey = useMemo(() => stableKey(context), [context]);
  const storageKey = useMemo(() => buildCacheKey(SUMMARY_CACHE_NS, cacheKey), [cacheKey]);

  const [summary, setSummary] = useState<SectionSummaryResponse | null>(() =>
    readClientCache<SectionSummaryResponse>(storageKey, SUMMARY_CACHE_TTL_MS),
  );
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  // Which cacheKey `summary` currently reflects — lets a context change
  // (different filters/data) trigger a real refetch instead of showing stale data.
  const loadedKeyRef = useRef<string | null>(summary ? cacheKey : null);

  // Wawasan: network-wide ML overview (fetched only when the tab is opened)
  const overview = useMLOverview({ enabled: open && activeTab === 'insight' });

  const loadSummary = useCallback(async (force = false) => {
    if (!force && loadedKeyRef.current === cacheKey) return;

    if (!force) {
      const cached = readClientCache<SectionSummaryResponse>(storageKey, SUMMARY_CACHE_TTL_MS);
      if (cached) {
        loadedKeyRef.current = cacheKey;
        setSummary(cached);
        setSummaryError(null);
        return;
      }
    }

    loadedKeyRef.current = cacheKey;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await fetch('/api/ai/section-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Failed to generate AI summary (${response.status})`);
      writeClientCache(storageKey, payload);
      // Context may have changed while this request was in flight; a stale
      // response must not clobber the summary for the now-current context.
      if (loadedKeyRef.current !== cacheKey) return;
      setSummary(payload);
    } catch (error) {
      if (loadedKeyRef.current !== cacheKey) return;
      loadedKeyRef.current = null;
      setSummaryError(error instanceof Error ? error.message : 'Failed to generate AI summary');
    } finally {
      if (loadedKeyRef.current === cacheKey || loadedKeyRef.current === null) setSummaryLoading(false);
    }
  }, [cacheKey, storageKey, context]);

  useEffect(() => {
    if (open && activeTab === 'summary') void loadSummary();
  }, [open, activeTab, loadSummary]);

  const refreshing = activeTab === 'summary' ? summaryLoading : overview.loading;
  const handleRefresh = () => {
    if (activeTab === 'summary') void loadSummary(true);
    else void overview.refresh(true);
  };


  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative inline-flex h-11 shrink-0 items-center gap-2 overflow-hidden rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 via-white to-emerald-50 px-5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-900 shadow-[0_12px_28px_-16px_rgba(4,120,87,0.55),0_0_0_1px_rgba(217,145,30,0.18)_inset] transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-[0_16px_34px_-18px_rgba(180,83,9,0.55),0_0_0_1px_rgba(217,145,30,0.28)_inset] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2"
      >
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(217,145,30,0.18)_46%,transparent_72%)] opacity-55 transition group-hover:opacity-80" aria-hidden="true" />
        <span className="relative z-10 whitespace-nowrap">AI Summary &amp; Insight</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[min(96vw,1040px)] overflow-y-auto bg-[#f7f5ef] p-0 sm:max-w-[1040px]">
          {/* Header */}
          <div className="border-b border-[#e7e1d2] bg-white px-6 py-5 pr-14">
            <SheetHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="break-words text-[18px] font-bold text-stone-800">
                    {context.title}
                  </SheetTitle>
                  <p className="mt-1 break-words text-[11px] leading-relaxed text-stone-400">
                    AI Summary &amp; Insight
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-stone-400 transition-colors hover:text-emerald-800 disabled:opacity-40"
                >
                  <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />
                  Perbarui
                </button>
              </div>
            </SheetHeader>
          </div>

          <div className="px-6 py-5">
            {/* Tabs */}
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[#e7e1d2] bg-white text-[12px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={cn(
                  'flex h-10 items-center justify-center border-r border-[#e7e1d2] transition-colors',
                  activeTab === 'summary' ? 'bg-emerald-900 text-amber-100' : 'text-stone-500 hover:bg-stone-50',
                )}
              >
                Ringkasan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('insight')}
                className={cn(
                  'flex h-10 items-center justify-center transition-colors',
                  activeTab === 'insight' ? 'bg-emerald-900 text-amber-100' : 'text-stone-500 hover:bg-stone-50',
                )}
              >
                Wawasan
              </button>
            </div>

            {/* Body */}
            <div className="mt-5 space-y-5">
              {activeTab === 'summary' ? (
                <SummaryTab
                  loading={summaryLoading}
                  error={summaryError}
                  summary={summary}
                  onRetry={() => loadSummary(true)}
                />
              ) : (
                <InsightTab
                  loading={overview.loading}
                  error={overview.error}
                  data={overview.data}
                  onRetry={() => overview.refresh()}
                />
              )}

              {/* Fine print */}
              <div className="border-t border-black/[0.06] pt-4 text-[11.5px] text-neutral-500 break-words">
                {activeTab === 'summary'
                  ? 'Semua angka diambil langsung dari data dashboard yang sedang Anda lihat — AI hanya menyusun narasinya.'
                  : 'Semua angka adalah estimasi berdasarkan pola laporan historis — bukan angka pasti. Gunakan sebagai panduan, bukan keputusan akhir.'}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
