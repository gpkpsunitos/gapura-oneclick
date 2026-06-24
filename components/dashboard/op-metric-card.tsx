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

  previousValue?: number;

  currentValue?: number;

  tone?: 'real' | 'ai' | 'neutral';

  size?: 'sm' | 'md' | 'lg';

  badge?: string;

  badgeTone?: 'emerald' | 'amber' | 'rose' | 'slate';
}

const TONE_MAP: Record<string, {
  container: string;
  iconBg: string;
  badgeBg: string;
}> = {
  real: {
    container: 'border-emerald-200/30 bg-white/60 ring-1 ring-white/60 backdrop-blur-xl',
    iconBg: 'bg-emerald-100/50 text-emerald-700 ring-1 ring-emerald-200/50',
    badgeBg: 'bg-emerald-100/80 text-emerald-800',
  },
  ai: {
    container: 'border-amber-200/30 bg-white/60 ring-1 ring-white/60 backdrop-blur-xl',
    iconBg: 'bg-amber-100/50 text-amber-700 ring-1 ring-amber-200/50',
    badgeBg: 'bg-amber-100/80 text-amber-800',
  },
  neutral: {
    container: 'border-slate-200/30 bg-white/60 ring-1 ring-white/60 backdrop-blur-xl',
    iconBg: 'bg-slate-100/50 text-slate-700 ring-1 ring-slate-200/50',
    badgeBg: 'bg-slate-100/80 text-slate-800',
  },
};

const SIZE_CLASS: Record<string, string> = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-5 py-3',
};

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
      ? value.toLocaleString('en-US')
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
        'group relative overflow-hidden rounded-[24px] border px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:bg-white/80',
        styles.container,
        SIZE_CLASS[size],
      )}
    >
      {}
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
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <p
                className={cn(
                  'font-black uppercase tracking-[0.06em] leading-tight text-slate-500',
                  size === 'sm' ? 'text-[9px]' : 'text-[11px]',
                )}
              >
                {label}
              </p>
              {badge && (
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold mt-0.5',
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
                  'mt-1 text-xs text-slate-500 leading-relaxed max-w-full break-words',
                  size === 'sm' ? 'text-[9px]' : '',
                )}
              >
                {caption}
              </p>
            )}
          </div>
        </div>
      </div>

      {}
      <div className="mt-3 flex items-end gap-2.5">
        <p
          className={cn(
            'font-bold tracking-[-0.04em] text-slate-950',
            size === 'sm' ? 'text-[24px]' : size === 'md' ? 'text-[32px]' : 'text-[40px]',
          )}
        >
          {formattedValue}
        </p>
        {trend && deltaLabel && (
          <div className="mb-1.5">
            <TrendBadge direction={trend} delta={deltaLabel} />
          </div>
        )}
      </div>
    </div>
  );
}

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
