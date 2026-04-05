'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AnalyticsMetricCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'real',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  caption?: string;
  tone?: 'real' | 'ai' | 'neutral';
}) {
  const toneStyles = {
    real: 'border-emerald-200 bg-white/90',
    ai: 'border-amber-200 bg-white/90',
    neutral: 'border-slate-200 bg-white/90',
  }[tone];

  const iconStyles = {
    real: 'bg-emerald-100 text-emerald-700',
    ai: 'bg-amber-100 text-amber-700',
    neutral: 'bg-slate-100 text-slate-700',
  }[tone];

  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', toneStyles)}>
      <div className="mb-3 flex items-center gap-3">
        <div className={cn('rounded-xl p-2.5', iconStyles)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
          {caption ? <div className="text-xs text-slate-500">{caption}</div> : null}
        </div>
      </div>
      <div className="text-3xl font-black tracking-tight text-slate-900">{value}</div>
    </div>
  );
}
