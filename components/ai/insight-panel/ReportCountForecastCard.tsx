'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  entityRange, isForecastConfident, trendGlyph, trendWord,
} from '@/components/ai/ml-overview-sections';
import type { ReportCountDimension, ReportCountsResult } from '@/lib/ml-client';
import { CAPTION, EmptyNote, InlineNote, Section, SegmentedControl, StatTile } from './primitives';

const COUNT_TABS = [
  { key: 'branch', label: 'Per Stasiun' },
  { key: 'category', label: 'Per Kategori' },
  { key: 'case_classification', label: 'Per Klasifikasi' },
] as const;
type CountTabKey = (typeof COUNT_TABS)[number]['key'];

export function ReportCountForecastCard({ reportCounts }: { reportCounts: ReportCountsResult }) {
  const available = COUNT_TABS.filter((t) => (reportCounts.forecasts?.[t.key]?.forecasts?.length ?? 0) > 0);
  const [tab, setTab] = useState<CountTabKey>('branch');
  const activeKey = available.some((t) => t.key === tab) ? tab : (available[0]?.key ?? 'branch');
  const dim: ReportCountDimension | undefined = reportCounts.forecasts?.[activeKey];
  if (available.length === 0 || !dim) return null;

  const perLabel = dim.granularity === 'monthly' ? 'bulan' : 'minggu';
  const allEntries = (dim.forecasts ?? []).filter((e) => e.entity.toLowerCase() !== 'other');
  const entries = allEntries.filter(isForecastConfident).slice(0, 8);
  const maxTotal = Math.max(...entries.map((e) => e.predicted_total), 1);
  const total = dim.total_forecast;

  return (
    <Section
      title={`Prakiraan Jumlah Laporan · ${dim.n_periods} ${perLabel}`}
      right={<SegmentedControl<CountTabKey> options={available} active={activeKey} onChange={setTab} />}
    >
      {total && (
        <div className="mb-4">
          <StatTile value={String(Math.round(total.predicted_total))} label={`Total diperkirakan · ${dim.n_periods} ${perLabel}`} />
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyNote>Belum ada entitas dengan sinyal yang cukup jelas.</EmptyNote>
      ) : (
        <ol className="space-y-2.5">
          {entries.map((entry, idx) => {
            const [lo, hi] = entityRange(entry);
            return (
              <li key={entry.entity} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700 tabular-nums">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-slate-900">{entry.entity}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(4, (entry.predicted_total / maxTotal) * 100)}%` }} />
                  </div>
                  <p className={cn(CAPTION, 'mt-1 flex items-center gap-1')}>
                    {trendGlyph(entry.trend_direction)} {trendWord(entry.trend_direction)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[15px] font-bold tabular-nums text-slate-900">{Math.round(entry.predicted_total)}</p>
                  <p className="text-[10.5px] tabular-nums text-slate-600">{Math.round(lo)}–{Math.round(hi)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <InlineNote>Angka besar = perkiraan utama; kisaran di bawahnya adalah kemungkinan minimum–maksimum.</InlineNote>
    </Section>
  );
}
