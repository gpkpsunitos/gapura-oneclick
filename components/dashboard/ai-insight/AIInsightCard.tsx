'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, TrendingUp, TrendingDown, Sparkles, RefreshCw,
  CheckCircle2, AlertCircle, Activity, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Report } from '@/types';
import {
  CaseInsightResponse,
  Severity,
  type Severity as SeverityT,
  type ForecastSeries,
  type AnomalyPoint,
  type RCADriver,
} from '@/lib/schemas/insight';

const SEVERITY_STYLE: Record<SeverityT, { bg: string; text: string; ring: string }> = {
  'TOP RISK':  { bg: 'bg-red-700',    text: 'text-white',      ring: 'ring-red-900' },
  'HIGH RISK': { bg: 'bg-red-500',    text: 'text-white',      ring: 'ring-red-600' },
  MEDIUM:      { bg: 'bg-amber-400',  text: 'text-amber-950',  ring: 'ring-amber-500' },
  LOW:         { bg: 'bg-emerald-500',text: 'text-white',      ring: 'ring-emerald-600' },
};

const SIGNAL_STYLE: Record<string, { bg: string; text: string; icon: typeof CheckCircle2; label: string }> = {
  ok:          { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'Aman' },
  watch:       { bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   icon: Activity,     label: 'Pantau' },
  risk:        { bg: 'bg-red-50 border-red-200',         text: 'text-red-700',     icon: AlertCircle,  label: 'Risiko' },
  opportunity: { bg: 'bg-blue-50 border-blue-200',       text: 'text-blue-700',    icon: TrendingUp,   label: 'Peluang' },
};

function Unavailable({ reason }: { reason: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-xs">
      <Info className="w-3.5 h-3.5" /> Data tidak cukup
      {reason && <span className="text-slate-400">· {reason}</span>}
    </div>
  );
}

function HeadlineBlock({ data }: { data: CaseInsightResponse }) {
  const sig = SIGNAL_STYLE[data.headline.signal] ?? SIGNAL_STYLE.ok;
  const Icon = sig.icon;
  return (
    <div className={cn('rounded-2xl border p-4 md:p-5', sig.bg)}>
      <div className="flex items-start gap-3">
        <div className={cn('shrink-0 w-9 h-9 rounded-full bg-white/70 flex items-center justify-center', sig.text)}>
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', sig.text)}>
              {sig.label}
            </span>
            <span className="text-[11px] text-slate-500">
              Kepercayaan {Math.round(data.headline.confidence * 100)}%
            </span>
          </div>
          <p className="mt-1 text-[15px] md:text-base font-semibold text-slate-900 leading-snug">
            {data.headline.sentence}
          </p>
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ sev, conf }: { sev: SeverityT; conf: number | null | undefined }) {
  const s = SEVERITY_STYLE[sev];
  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ring-1', s.bg, s.text, s.ring)}>
      <AlertTriangle className="w-4 h-4" />
      <span className="text-sm font-bold tracking-wide">{sev}</span>
      {typeof conf === 'number' && (
        <span className="text-xs opacity-80">{Math.round(conf * 100)}%</span>
      )}
    </div>
  );
}

function ForecastCard({ series }: { series: ForecastSeries }) {
  const last = series.points[series.points.length - 1];
  const first = series.points[0];
  if (!first || !last) return <Unavailable reason="series kosong" />;
  const trend = last.yhat - first.yhat;
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Proyeksi</span>
        <span className="text-xs text-slate-400">
          n={series.history_points} · cakupan {Math.round(series.coverage * 100)}%
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 tabular-nums">
          {last.yhat.toFixed(1)}
        </span>
        <TrendIcon className={cn('w-4 h-4', trend >= 0 ? 'text-blue-600' : 'text-emerald-600')} />
        <span className="text-xs text-slate-500">
          interval {last.yhat_lower.toFixed(1)} – {last.yhat_upper.toFixed(1)}
        </span>
      </div>
      <div className="mt-2 text-[11px] text-slate-400">
        Periode {first.period} → {last.period}
      </div>
    </div>
  );
}

function AnomalyCard({ point }: { point: AnomalyPoint }) {
  const flagged = point.is_anomaly;
  return (
    <div className={cn(
      'rounded-xl border p-4',
      flagged ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Anomali · {point.period}
        </span>
        {flagged && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
            FLAGGED
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-[10px] uppercase text-slate-400">Aktual</p>
          <p className="font-bold tabular-nums">{point.actual.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-400">Ekspektasi</p>
          <p className="font-bold tabular-nums">{point.expected.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-400">Z-score</p>
          <p className={cn('font-bold tabular-nums', flagged && 'text-red-700')}>
            {point.z_score.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

function RCAList({ drivers }: { drivers: RCADriver[] }) {
  if (drivers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Penyebab Utama
        </p>
        <Unavailable reason="model RCA belum tersedia" />
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
        Penyebab Utama (SHAP)
      </p>
      <div className="space-y-2">
        {drivers.slice(0, 5).map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-slate-700 truncate">{d.feature}</span>
            <span className={cn(
              'text-xs font-semibold tabular-nums',
              d.direction === 'increases' ? 'text-red-700' : 'text-emerald-700'
            )}>
              {d.direction === 'increases' ? '↑' : '↓'} {d.contribution_pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  report: Report;
  className?: string;
}

export function AIInsightCard({ report, className }: Props) {
  const [data, setData] = useState<CaseInsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(() => ({
    report_text: report.report || report.description || report.title || '',
    issue_type: report.main_category || report.irregularity_complain_category || report.category || null,
    area: report.area || null,
    airline: report.airlines || report.airline || null,
    hub: report.hub || null,
    severity_observed: report.severity_level || report.severity || null,
  }), [report]);

  async function fetchInsight() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const r = await fetch('/api/ai/insight/case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(28_000),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error || `HTTP ${r.status}`);
        return;
      }
      const parsed = CaseInsightResponse.safeParse(j);
      if (!parsed.success) {
        setError('Format tanggapan tidak valid');
        return;
      }
      setData(parsed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load insight');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInsight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id]);

  return (
    <div className={cn('space-y-4', className)}>
      {}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800">Gapura AI · Insight Eksekutif</h3>
        </div>
        <button
          onClick={fetchInsight}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
            'border border-slate-200 hover:border-slate-300 text-slate-700',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          {loading ? 'Loading…' : 'Muat ulang'}
        </button>
      </div>

      {loading && !data && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 animate-pulse">
          <div className="h-3 w-32 bg-slate-200 rounded mb-2"></div>
          <div className="h-5 w-3/4 bg-slate-200 rounded"></div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {data && (
        <>
          <HeadlineBlock data={data} />

          <div className="flex items-center gap-3">
            {data.severity_predicted ? (
              <SeverityBadge
                sev={data.severity_predicted as SeverityT}
                conf={data.severity_confidence}
              />
            ) : (
              <Unavailable reason="severity belum dapat diprediksi" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.forecast
              ? <ForecastCard series={data.forecast} />
              : (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Proyeksi</p>
                  <Unavailable reason="seri tidak memenuhi minimum data" />
                </div>
              )}
            {data.anomaly
              ? <AnomalyCard point={data.anomaly} />
              : (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Anomali</p>
                  <Unavailable reason="" />
                </div>
              )}
          </div>

          <RCAList drivers={data.rca_top_drivers} />

          {}
          <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
            <span>Berdasarkan {data.records_basis} data terprofil</span>
            <span>·</span>
            <span>per {new Date(data.as_of).toLocaleString('id-ID')}</span>
            {data.model_versions.rca && (
              <>
                <span>·</span>
                <span>model RCA n_train={data.model_versions.rca}</span>
              </>
            )}
            {data.warnings.length > 0 && (
              <span className="text-amber-600">· {data.warnings.length} peringatan</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
