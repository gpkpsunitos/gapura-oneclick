'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeTrend, computeDeltaLabel, type TrendDirection } from '@/lib/chart-palette';

export type { TrendDirection };

export interface OpMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  caption?: string;
  /** Previous period value for trend comparison */
  previousValue?: number;
  /** Current period value */
  currentValue?: number;
  /** Tone variant */
  tone?: 'real' | 'ai' | 'neutral';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional badge content shown in top-right */
  badge?: string;
  /** Badge tone - determines background color */
  badgeTone?: 'emerald' | 'amber' | 'rose' | 'slate';
}

/* ─── Tone-based style maps ─── */

const TONE_MAP: Record<string, {
  container: string;
  iconBg: string;
  badgeBg: string;
}> = {
  real: {
    container: 'border-emerald-200/60 bg-white',
    iconBg: 'bg-emerald-100 text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800',
  },
  ai: {
    container: 'border-amber-200/60 bg-white',
    iconBg: 'bg-amber-100 text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800',
  },
  neutral: {
    container: 'border-slate-200/60 bg-white',
    iconBg: 'bg-slate-100 text-slate-700',
    badgeBg: 'bg-slate-100 text-slate-800',
  },
};

const SIZE_CLASS: Record<string, string> = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-5 py-3',
};

/* ─── Component ─── */

export function OpMetricCard({
  icon: Icon,
  label,
  value,
  caption,
  previousValue,
  currentValue,
  tone = 'real',
  size = 'md',
  badge,
  badgeTone,
}: OpMetricCardProps) {
  const styles = TONE_MAP[tone] ?? TONE_MAP.real;

  const formattedValue =
    typeof value === 'number'
      ? value.toLocaleString('id-ID')
      : value;

  const trend: TrendDirection | null =
    currentValue !== undefined && previousValue !== undefined
      ? computeTrend(currentValue, previousValue)
      : null;

  const deltaLabel: string | null =
    currentValue !== undefined && previousValue !== undefined
      ? computeDeltaLabel(currentValue, previousValue)
      : null;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all',
        'hover:shadow-md',
        styles.container,
        size === 'sm' ? 'hover:-translate-y-0.5' : '',
        SIZE_CLASS[size],
      )}
    >
      {/* Header row: icon + label + optional badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn('rounded-xl p-2', styles.iconBg)}>
            <Icon
              className={cn(
                size === 'sm'
                  ? 'h-3.5 w-3.5'
                  : size === 'md'
                    ? 'h-4 w-4'
                    : 'h-5 w-5',
              )}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  'text-[10px] font-black uppercase tracking-[0.18em]',
                  size === 'sm' ? 'text-[9px]' : 'text-[11px]',
                )}
              >
                {label}
              </p>
              {badge && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[9px] font-bold',
                    badgeTone === 'emerald' && 'bg-emerald-100 text-emerald-700',
                    badgeTone === 'amber' && 'bg-amber-100 text-amber-700',
                    badgeTone === 'rose' && 'bg-rose-100 text-rose-700',
                    badgeTone === 'slate' && 'bg-slate-100 text-slate-700',
                    !badgeTone && styles.badgeBg,
                  )}
                >
                  {badge}
                </span>
              )}
            </div>
            {caption && (
              <p
                className={cn(
                  'mt-0.5 truncate text-xs text-slate-500',
                  size === 'sm' ? 'text-[9px] leading-tight' : '',
                )}
              >
                {caption}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Value + Trend indicator */}
      <div className="mt-2 flex items-end gap-2">
        <p
          className={cn(
            'font-black tracking-tight text-slate-900',
            size === 'sm' ? 'text-xl' : size === 'md' ? 'text-2xl' : 'text-3xl',
          )}
        >
          {formattedValue}
        </p>
        {trend && deltaLabel && (
          <TrendBadge direction={trend} delta={deltaLabel} />
        )}
      </div>
    </div>
  );
}

/* ─── Trend badge sub-component ─── */

function TrendBadge({
  direction,
  delta,
}: {
  direction: TrendDirection;
  delta: string;
}) {
  if (direction === 'flat' || direction === 'none') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
        —
      </span>
    );
  }

  const isUp = direction === 'up';
  const arrow = isUp ? '↑' : '↓';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
        isUp
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-rose-100 text-rose-700',
      )}
    >
      <span className="text-[9px]">{arrow}</span>
      <span>{delta}</span>
    </span>
  );
}
