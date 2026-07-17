'use client';

import { cn } from '@/lib/utils';
import { fmtNumber, riskEntityName, type MLOverview } from '@/components/ai/ml-overview-sections';
import { CARD, KICKER, StatTile } from './primitives';

function dotTone(sentence: string): string {
  if (sentence.startsWith('Waspada')) return 'bg-rose-500';
  if (sentence.startsWith('Membaik')) return 'bg-emerald-500';
  return 'bg-amber-500';
}

export function KeyFigures({ data, sentences }: { data: MLOverview; sentences: string[] }) {
  const rcBranch = data.reportCounts?.forecasts?.branch;
  const rcTotal = rcBranch?.total_forecast;
  const dailyPoints = data.forecast?.forecast ?? [];
  const dailyTotal = dailyPoints.reduce((s, p) => s + (p.predicted_count || 0), 0);
  const volumeValue = rcTotal
    ? fmtNumber(Math.round(rcTotal.predicted_total))
    : fmtNumber(Math.round(dailyTotal));

  const topAirline = data.risk?.rankings?.airline?.[0];
  const topBranch = data.risk?.rankings?.branch?.[0];

  return (
    <div className="space-y-3">
      {sentences.length > 0 && (
        <section className={cn(CARD, 'p-4 md:p-5')}>
          <p className={KICKER}>Angka Kunci</p>
          <ul className="mt-3 space-y-2.5">
            {sentences.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-700">
                <span className={cn('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', dotTone(s))} />
                <span className="min-w-0 break-words">{s}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile value={volumeValue} label="Volume Diperkirakan" />
        <StatTile value={topAirline ? riskEntityName(topAirline) : '—'} label="Maskapai Prioritas" />
        <StatTile value={topBranch ? riskEntityName(topBranch) : '—'} label="Stasiun Prioritas" />
      </div>
    </div>
  );
}
