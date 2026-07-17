'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { buildCacheKey, readClientCache, writeClientCache } from '@/lib/ai/client-cache';
import {
  fmtSignedPct, isNotable, signedChange, trendGlyph, trendWord,
  type MLOverview,
} from '@/components/ai/ml-overview-sections';
import type { DimensionForecastResult } from '@/lib/ml-client';
import { CAPTION, EmptyNote, Section, SegmentedControl } from './primitives';

const DIM_TABS = [
  { key: 'airline', label: 'Maskapai' },
  { key: 'branch', label: 'Stasiun' },
  { key: 'area', label: 'Area' },
  { key: 'category', label: 'Kategori' },
  { key: 'subcategory', label: 'Kategori Area' },
] as const;
type DimKey = (typeof DIM_TABS)[number]['key'];

const FORECAST_CACHE_TTL_MS = 15 * 60 * 1000;

export function DimensionExplorerCard({ data }: { data: MLOverview }) {
  const availableTabs = useMemo(
    () => DIM_TABS.filter((t) => {
      const dim = data.trends[t.key];
      return ((dim?.rising ?? []).filter(isNotable).length + (dim?.falling ?? []).filter(isNotable).length) > 0;
    }),
    [data.trends],
  );

  const [tab, setTab] = useState<DimKey>('branch');
  const active: DimKey = availableTabs.some((t) => t.key === tab) ? tab : (availableTabs[0]?.key ?? 'branch');

  const trend = data.trends[active];
  const rising = (trend?.rising ?? []).filter(isNotable).slice(0, 5);
  const falling = (trend?.falling ?? []).filter(isNotable).slice(0, 5);

  // Forecast-by-dimension: subcategory/category come pre-fetched in the overview
  // payload; other dimensions are fetched on demand when the user switches to them.
  const eagerForecasts: Partial<Record<DimKey, DimensionForecastResult | null>> = {
    subcategory: data.subcategoryForecast,
    category: data.categoryForecast,
  };
  const [lazyForecasts, setLazyForecasts] = useState<Partial<Record<DimKey, DimensionForecastResult | null>>>({});
  const [loadingDim, setLoadingDim] = useState<DimKey | null>(null);

  useEffect(() => {
    if (eagerForecasts[active] !== undefined) return;
    if (lazyForecasts[active] !== undefined) return;

    const cacheKey = buildCacheKey('forecast-by-dimension', active);
    const cached = readClientCache<DimensionForecastResult>(cacheKey, FORECAST_CACHE_TTL_MS);
    if (cached) {
      setLazyForecasts((prev) => ({ ...prev, [active]: cached }));
      return;
    }

    let cancelled = false;
    setLoadingDim(active);
    fetch(`/api/ai/forecast/by-dimension?dimension=${active}&weeks=4`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: DimensionForecastResult | null) => {
        if (cancelled) return;
        setLazyForecasts((prev) => ({ ...prev, [active]: json }));
        if (json) writeClientCache(cacheKey, json);
      })
      .catch(() => {
        if (!cancelled) setLazyForecasts((prev) => ({ ...prev, [active]: null }));
      })
      .finally(() => {
        if (!cancelled) setLoadingDim((cur) => (cur === active ? null : cur));
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const forecast = eagerForecasts[active] ?? lazyForecasts[active] ?? null;
  const forecastEntries = (forecast?.forecasts ?? []).filter((e) => e.entity.toLowerCase() !== 'other').slice(0, 5);
  const maxTotal = Math.max(...forecastEntries.map((e) => e.predicted_total), 1);

  if (availableTabs.length === 0 && !forecast) return null;

  return (
    <Section
      title="Tren & Prakiraan per Dimensi"
      right={<SegmentedControl<DimKey> options={DIM_TABS} active={active} onChange={setTab} />}
    >
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-600">Bergerak naik/turun</p>
          {rising.length + falling.length === 0 ? (
            <EmptyNote>Tidak ada perubahan berarti — kondisi stabil.</EmptyNote>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {[...rising, ...falling].map((e) => {
                const change = signedChange(e);
                const up = change > 0;
                return (
                  <li key={e.entity} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-[12.5px] font-semibold text-slate-900">{e.entity}</span>
                    <span className={cn('shrink-0 text-[12.5px] font-bold tabular-nums', up ? 'text-rose-600' : 'text-emerald-600')}>
                      {up ? '▲' : '▼'} {fmtSignedPct(change)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-600">
            Prakiraan {forecast?.n_weeks ?? 4} minggu
          </p>
          {loadingDim === active ? (
            <div className="mt-2 h-24 animate-pulse rounded-lg bg-slate-100" />
          ) : forecastEntries.length === 0 ? (
            <EmptyNote>Belum ada sinyal yang cukup jelas.</EmptyNote>
          ) : (
            <ol className="mt-2 space-y-2">
              {forecastEntries.map((entry) => (
                <li key={entry.entity}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-[12.5px] font-semibold text-slate-900">{entry.entity}</span>
                    <span className="shrink-0 text-[13px] font-bold tabular-nums text-slate-900">{Math.round(entry.predicted_total)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(4, (entry.predicted_total / maxTotal) * 100)}%` }} />
                  </div>
                  <p className={cn(CAPTION, 'mt-1 flex items-center gap-1')}>
                    {trendGlyph(entry.trend_direction)} {trendWord(entry.trend_direction)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Section>
  );
}
