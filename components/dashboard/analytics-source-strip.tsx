'use client';

import { Database, Sparkles, Clock3, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AnalyticsRuntimeStatus,
  AnalyticsSourceDescriptor,
} from '@/lib/op-shortcut-source-matrix';

interface AnalyticsSourceStripProps {
  title: string;
  description?: string;
  realSource: AnalyticsSourceDescriptor;
  realStatus?: AnalyticsRuntimeStatus;
  aiSource?: AnalyticsSourceDescriptor;
  aiStatus?: AnalyticsRuntimeStatus;
}

function formatDateLabel(value?: string | number | null) {
  if (!value) return null;
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'emerald' | 'amber' | 'slate';
}) {
  const className = {
    neutral: 'border-white/60 bg-white/70 text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-100 text-slate-700',
  }[tone];

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]', className)}>
      {children}
    </span>
  );
}

function SourceCard({
  kind,
  source,
  status,
}: {
  kind: 'real' | 'ai';
  source: AnalyticsSourceDescriptor;
  status?: AnalyticsRuntimeStatus;
}) {
  const isReal = kind === 'real';
  const Icon = isReal ? Database : Sparkles;
  const cardTone = isReal
    ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-cyan-50 to-white'
    : 'border-amber-200/80 bg-gradient-to-br from-amber-50 via-orange-50 to-white';
  const iconTone = isReal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';

  const lastSyncLabel = formatDateLabel(status?.lastSyncAt);
  const generatedLabel = formatDateLabel(status?.generatedAt);
  const sourceSyncLabel = formatDateLabel(status?.sourceSyncAt);

  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', cardTone)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn('rounded-xl p-2.5', iconTone)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">{source.label}</h3>
              <StatusBadge tone={isReal ? 'emerald' : 'amber'}>{isReal ? 'Google Sheets' : 'AI'}</StatusBadge>
            </div>
            <p className="mt-1 text-xs text-slate-600">{source.route}</p>
          </div>
        </div>
        {typeof status?.count === 'number' && (
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Records</div>
            <div className="text-xl font-black text-slate-900">{status.count.toLocaleString('id-ID')}</div>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {source.envKeys?.map((envKey) => (
          <StatusBadge key={envKey} tone="slate">{envKey}</StatusBadge>
        ))}
        {source.sheetNames?.map((sheet) => (
          <StatusBadge key={sheet}>{sheet}</StatusBadge>
        ))}
        {source.divisionFilter ? <StatusBadge tone="emerald">Division {source.divisionFilter}</StatusBadge> : null}
        {status?.cached ? <StatusBadge tone="slate">Cached</StatusBadge> : null}
        {status?.stale ? <StatusBadge tone="amber">Stale</StatusBadge> : null}
      </div>

      <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
        {source.upstreamPath ? (
          <div>
            <span className="font-bold text-slate-800">Upstream</span>
            <p className="mt-1">{source.upstreamPath}</p>
          </div>
        ) : null}
        {source.queryContract?.length ? (
          <div>
            <span className="font-bold text-slate-800">Query Contract</span>
            <p className="mt-1">{source.queryContract.join(' • ')}</p>
          </div>
        ) : null}
        {lastSyncLabel ? (
          <div className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
            <span><span className="font-bold text-slate-800">Last Sync</span> {lastSyncLabel}</span>
          </div>
        ) : null}
        {generatedLabel ? (
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span><span className="font-bold text-slate-800">Generated</span> {generatedLabel}</span>
          </div>
        ) : null}
        {sourceSyncLabel ? (
          <div className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
            <span><span className="font-bold text-slate-800">Source Sync</span> {sourceSyncLabel}</span>
          </div>
        ) : null}
      </div>

      {source.notes?.length ? (
        <div className="mt-3 rounded-xl border border-white/60 bg-white/70 p-3">
          {source.notes.map((note) => (
            <p key={note} className="text-xs leading-relaxed text-slate-600">
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AnalyticsSourceStrip({
  title: _title,
  description: _description,
  realSource: _realSource,
  realStatus: _realStatus,
  aiSource: _aiSource,
  aiStatus: _aiStatus,
}: AnalyticsSourceStripProps) {
  return null;
}

export function AnalyticsSection({
  title,
  description,
  variant,
  children,
}: {
  title: string;
  description?: string;
  variant: 'real' | 'ai';
  children: React.ReactNode;
}) {
  const tone = variant === 'real'
    ? 'border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/60 to-cyan-50/70'
    : 'border-amber-200/70 bg-gradient-to-br from-white via-amber-50/60 to-orange-50/70';
  const badgeTone = variant === 'real' ? 'emerald' : 'amber';

  return (
    <section className={cn('rounded-3xl border p-5 shadow-spatial-sm md:p-6', tone)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2">
            <StatusBadge tone={badgeTone}>{variant === 'real' ? 'Data Real Google Sheets' : 'Analitik AI'}</StatusBadge>
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">{title}</h2>
          {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function AnalyticsSectionLoading({
  variant = 'ai',
  title,
  description,
  cards = 4,
  panels = 4,
}: {
  variant?: 'real' | 'ai';
  title: string;
  description: string;
  cards?: number;
  panels?: number;
}) {
  const tone = variant === 'real'
    ? {
        border: 'border-emerald-200',
        surface: 'bg-white/90',
        icon: 'bg-emerald-100 text-emerald-700',
        pulse: 'from-emerald-100 via-emerald-50 to-cyan-50',
      }
    : {
        border: 'border-amber-200',
        surface: 'bg-white/90',
        icon: 'bg-amber-100 text-amber-700',
        pulse: 'from-amber-100 via-amber-50 to-orange-50',
      };

  return (
    <div className="space-y-5">
      <div className={cn('rounded-2xl border p-4 shadow-sm', tone.border, tone.surface)}>
        <div className="flex items-start gap-3">
          <div className={cn('rounded-xl p-2.5', tone.icon)}>
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={`analytics-card-skeleton-${index}`} className={cn('rounded-2xl border p-4 shadow-sm', tone.border, tone.surface)}>
            <div className="animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-xl bg-gradient-to-r', tone.pulse)} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded-full bg-slate-200" />
                  <div className="h-2.5 w-32 rounded-full bg-slate-100" />
                </div>
              </div>
              <div className="h-8 w-20 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: panels }).map((_, index) => (
          <div key={`analytics-panel-skeleton-${index}`} className={cn('rounded-2xl border p-4 shadow-sm', tone.border, tone.surface)}>
            <div className="animate-pulse space-y-4">
              <div className="space-y-2">
                <div className="h-3 w-36 rounded-full bg-slate-200" />
                <div className="h-2.5 w-52 rounded-full bg-slate-100" />
              </div>
              <div className="h-[220px] rounded-2xl bg-gradient-to-br from-slate-100 via-white to-slate-50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsUnavailable({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
        <AlertTriangle className="h-5 w-5 text-slate-500" />
      </div>
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
