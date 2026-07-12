'use client';

/**
 * Shared presentation blocks for the Gapura ML Service overview
 * (GET /api/ai/overview). Used by the AI reports dashboard and the
 * "AI Summary & Insight" sheet so both surfaces stay consistent.
 *
 * All copy is plain Indonesian, deliberately free of ML jargon.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus,
  Plane, Building2, MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import { buildCacheKey, readClientCache, writeClientCache } from '@/lib/ai/client-cache';
import type {
  ForecastResult, TrendsResult, TrendEntry, RiskScoreResult, RiskEntry,
  DimensionForecastResult, MLHealthResult,
} from '@/lib/ml-client';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export interface MLOverview {
  status: string;
  forecast: ForecastResult | null;
  trends: { branch: TrendsResult | null; subcategory: TrendsResult | null };
  risk: RiskScoreResult | null;
  subcategoryForecast: DimensionForecastResult | null;
  health: MLHealthResult | null;
  generatedAt?: string;
}

// Network-wide (not per-section), so one cache entry covers the whole app.
// TTL mirrors the server's own cache window (s-maxage=300, swr=600) with a
// little headroom, so a stale local copy still gets replaced in due time.
const OVERVIEW_CACHE_KEY = buildCacheKey('ml-overview', 'v1');
const OVERVIEW_CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Fetches the ML overview. Pass `enabled: false` to defer the request
 * (e.g. until a sheet or modal is opened) — it fires once when enabled
 * flips to true, unless a fresh cached copy is already on hand (from a
 * previous mount in this tab/session), in which case it's shown instantly.
 */
export function useMLOverview({ enabled = true }: { enabled?: boolean } = {}) {
  const [data, setData] = useState<MLOverview | null>(() =>
    readClientCache<MLOverview>(OVERVIEW_CACHE_KEY, OVERVIEW_CACHE_TTL_MS),
  );
  const [loading, setLoading] = useState(() => enabled && data === null);
  const [error, setError] = useState('');

  const refresh = useCallback(async (bypassCache = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/ai/overview${bypassCache ? '?bypass_cache=true' : ''}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load AI analysis (${res.status})`);
      }
      const json = (await res.json()) as MLOverview;
      setData(json);
      writeClientCache(OVERVIEW_CACHE_KEY, json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI analysis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !data) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refresh]);

  return { loading, error, data, refresh };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function longDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function riskEntityName(entry: RiskEntry): string {
  const named = Object.entries(entry).find(([, value]) => typeof value === 'string');
  return named ? String(named[1]) : '—';
}

/**
 * Turns the raw overview payload into short, plain-Indonesian sentences
 * a non-technical reader can act on.
 */
export function buildExecutiveSummary(data: MLOverview): string[] {
  const sentences: string[] = [];

  const points = data.forecast?.forecast ?? [];
  if (points.length > 0) {
    const total = points.reduce((sum, point) => sum + (point.predicted_count || 0), 0);
    const avg = total / points.length;
    sentences.push(
      `Dalam ${points.length} hari ke depan diperkirakan ada ±${Math.round(total)} laporan baru, atau rata-rata ${avg.toFixed(1)} laporan per hari.`,
    );
  }

  const topRising = data.trends.branch?.rising?.[0] ?? data.trends.subcategory?.rising?.[0];
  if (topRising) {
    sentences.push(
      `Perlu perhatian: ${topRising.entity} menunjukkan kenaikan ±${Math.abs(Math.round(topRising.percent_change))}% dibanding periode sebelumnya.`,
    );
  }

  const topFalling = data.trends.branch?.falling?.[0] ?? data.trends.subcategory?.falling?.[0];
  if (topFalling) {
    sentences.push(
      `Kabar baik: ${topFalling.entity} menurun ±${Math.abs(Math.round(topFalling.percent_change))}% pada periode yang sama.`,
    );
  }

  const topRisk = data.risk?.rankings?.airline?.[0];
  if (topRisk) {
    sentences.push(
      `${riskEntityName(topRisk)} is the top risk priority with ${topRisk.incident_count} reports recorded.`,
    );
  }

  const topOutlook = data.subcategoryForecast?.forecasts?.[0];
  if (topOutlook) {
    sentences.push(
      `Kategori "${topOutlook.entity}" diperkirakan paling sering muncul dalam 4 minggu ke depan (±${Math.round(topOutlook.predicted_total)} laporan).`,
    );
  }

  if (sentences.length === 0) {
    sentences.push('Not enough data yet to generate a summary. Try again after the model finishes training.');
  }

  return sentences;
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

export function StatTile({
  icon: Icon, label, value, hint, tone = 'violet',
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  hint?: string;
  tone?: 'violet' | 'emerald' | 'rose' | 'slate';
}) {
  const tones = {
    violet: 'text-violet-600 bg-violet-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    rose: 'text-rose-600 bg-rose-50',
    slate: 'text-slate-500 bg-slate-100',
  } as const;

  return (
    <div className="bg-white border border-slate-100 p-5 flex items-start gap-4">
      <div className={cn('w-9 h-9 flex items-center justify-center shrink-0', tones[tone])}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] leading-relaxed">{label}</p>
        <p className="text-[19px] font-semibold text-slate-800 leading-snug mt-1 break-words">{value}</p>
        {hint && <p className="text-[11px] text-slate-400 mt-0.5 leading-snug break-words">{hint}</p>}
      </div>
    </div>
  );
}

export function ForecastChart({ forecast }: { forecast: ForecastResult }) {
  const data = useMemo(
    () =>
      (forecast.forecast ?? []).map((point) => ({
        date: shortDate(point.date),
        prediksi: Number(point.predicted_count.toFixed(2)),
        bawah: Number((point.lower ?? 0).toFixed(2)),
        rentang: Number((((point.upper ?? 0) - (point.lower ?? 0))).toFixed(2)),
      })),
    [forecast],
  );

  if (data.length === 0) return null;

  return (
    <div className="bg-white border border-slate-100 p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.18em]">
            Daily Report Forecast — Next 14 Days
          </h4>
          <p className="text-[12px] text-slate-400 mt-1">
            The light purple area shows the possible range; the line is the main forecast.
          </p>
        </div>
      </div>
      <div className="h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 0 }}
              formatter={(value: number | string, name: string) =>
                name === 'rentang' ? [null, null] : [`${value} reports`, 'Forecast']}
            />
            <Area dataKey="bawah" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area dataKey="rentang" stackId="band" stroke="none" fill="#ede9fe" isAnimationActive={false} />
            <Line dataKey="prediksi" stroke="#7c3aed" strokeWidth={2} dot={false} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrendRow({ entry }: { entry: TrendEntry }) {
  const rising = entry.direction === 'rising';
  const change = Math.abs(Math.round(entry.percent_change));

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div
        className={cn(
          'w-7 h-7 flex items-center justify-center shrink-0',
          rising ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600',
        )}
      >
        {rising ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-700 break-words">{entry.entity}</p>
        <p className="text-[11px] text-slate-400 leading-snug">
          {rising ? 'Naik' : 'Turun'} ±{change}% dibanding periode sebelumnya · {entry.recent_count} laporan terakhir
        </p>
      </div>
    </div>
  );
}

const TREND_TABS = [
  { key: 'branch', label: 'Stasiun' },
  { key: 'subcategory', label: 'Kategori Area' },
] as const;

type TrendTabKey = (typeof TREND_TABS)[number]['key'];

export function TrendsPanel({ trends }: { trends: MLOverview['trends'] }) {
  const [tab, setTab] = useState<TrendTabKey>('branch');
  const current = trends[tab];
  const rising = current?.rising ?? [];
  const falling = current?.falling ?? [];
  const hasAny = rising.length + falling.length > 0;

  return (
    <div className="bg-white border border-slate-100 p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.18em]">Perubahan Signifikan</h4>
          <p className="text-[12px] text-slate-400 mt-1">12 minggu terakhir — hanya perubahan yang benar-benar berarti.</p>
        </div>
        <div className="flex gap-1">
          {TREND_TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'px-3 py-1.5 text-[11px] font-semibold transition-colors',
                tab === item.key ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {!hasAny ? (
        <p className="text-[13px] text-slate-400 py-6 text-center">
          No significant rise or drop — conditions are stable.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <p className="text-[11px] font-bold text-rose-500 uppercase tracking-widest mb-1">Sedang Naik</p>
            {rising.length === 0 && <p className="text-[12px] text-slate-400 py-3">None.</p>}
            {rising.slice(0, 5).map((entry) => <TrendRow key={entry.entity} entry={entry} />)}
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Sedang Turun</p>
            {falling.length === 0 && <p className="text-[12px] text-slate-400 py-3">None.</p>}
            {falling.slice(0, 5).map((entry) => <TrendRow key={entry.entity} entry={entry} />)}
          </div>
        </div>
      )}
    </div>
  );
}

const RISK_TABS = [
  { key: 'airline', label: 'Maskapai', icon: Plane },
  { key: 'branch', label: 'Stasiun', icon: Building2 },
  { key: 'area', label: 'Area', icon: MapPin },
] as const;

type RiskTabKey = (typeof RISK_TABS)[number]['key'];

export function RiskLeaderboard({ risk }: { risk: RiskScoreResult }) {
  const [tab, setTab] = useState<RiskTabKey>('airline');
  const entries = (risk.rankings?.[tab] ?? []).slice(0, 5);
  const maxScore = entries[0]?.risk_score || 1;

  return (
    <div className="bg-white border border-slate-100 p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.18em]">Prioritas Perhatian</h4>
          <p className="text-[12px] text-slate-400 mt-1">
            Gabungan jumlah kejadian, kasus yang masih terbuka, dan kejadian terbaru.
          </p>
        </div>
        <div className="flex gap-1">
          {RISK_TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors',
                tab === item.key ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100',
              )}
            >
              <item.icon size={12} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-[13px] text-slate-400 py-6 text-center">Belum ada data peringkat.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div key={riskEntityName(entry)} className="flex items-center gap-3">
              <span className="w-5 text-[12px] font-bold text-slate-300 tabular-nums">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold text-slate-700 break-words">{riskEntityName(entry)}</p>
                  <p className="text-[11px] text-slate-400 shrink-0">{entry.incident_count} laporan</p>
                </div>
                <div className="h-1.5 bg-slate-100 mt-1.5 overflow-hidden">
                  <motion.div
                    className={cn('h-full', index === 0 ? 'bg-rose-500' : 'bg-violet-400')}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(4, (entry.risk_score / maxScore) * 100)}%` }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SubcategoryOutlook({ outlook }: { outlook: DimensionForecastResult }) {
  const entries = (outlook.forecasts ?? []).slice(0, 5);
  if (entries.length === 0) return null;
  const maxTotal = Math.max(...entries.map((entry) => entry.predicted_total), 1);

  return (
    <div className="bg-white border border-slate-100 p-6">
      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.18em]">4-Week Forecast per Category</h4>
      <p className="text-[12px] text-slate-400 mt-1 mb-4">Kategori dengan perkiraan volume tertinggi ke depan.</p>
      <div className="space-y-3.5">
        {entries.map((entry) => {
          const DirectionIcon =
            entry.trend_direction === 'rising' ? TrendingUp
            : entry.trend_direction === 'falling' ? TrendingDown
            : Minus;
          return (
            <div key={entry.entity}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-medium text-slate-700 break-words min-w-0">{entry.entity}</p>
                <p className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                  <DirectionIcon
                    size={12}
                    className={cn(
                      entry.trend_direction === 'rising' && 'text-rose-500',
                      entry.trend_direction === 'falling' && 'text-emerald-600',
                      entry.trend_direction === 'stable' && 'text-slate-400',
                    )}
                  />
                  ±{Math.round(entry.predicted_total)} laporan
                </p>
              </div>
              <div className="h-1.5 bg-slate-100 mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-indigo-400"
                  style={{ width: `${Math.max(4, (entry.predicted_total / maxTotal) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
