'use client';

/**
 * DivisionAIReportsDashboard — AI insights dashboard powered by the Gapura
 * ML Service (via GET /api/ai/overview).
 *
 * Presentation blocks are shared with the "AI Summary & Insight" sheet —
 * see components/ai/ml-overview-sections.tsx.
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, TrendingUp, ShieldAlert, CalendarRange, ArrowUpRight, Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMLOverview, StatTile, ForecastChart, TrendsPanel, RiskLeaderboard,
  SubcategoryOutlook, ReportCountForecast, riskEntityName, longDate,
} from '@/components/ai/ml-overview-sections';

interface DivisionAIReportsDashboardProps {
  division?: string;
  /** Accepted for page compatibility; insights are currently network-wide. */
  branchFilter?: string | null;
}

const DIVISION_NAMES: Record<string, string> = {
  OS: 'Operation Support',
  OP: 'Operation',
  HC: 'Hub Control',
  HT: 'Hub Terminal',
  OCS: 'Operation Control & Services',
  EMPLOYEE: 'Employee',
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="bg-white border border-slate-100 p-5 h-[92px] animate-pulse" />
        ))}
      </div>
      <div className="bg-white border border-slate-100 h-80 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 h-72 animate-pulse" />
        <div className="bg-white border border-slate-100 h-72 animate-pulse" />
      </div>
    </div>
  );
}

export function DivisionAIReportsDashboard({ division = 'OS' }: DivisionAIReportsDashboardProps) {
  const { loading, error, data, refresh } = useMLOverview();

  const heroStats = useMemo(() => {
    if (!data) return null;

    const points = data.forecast?.forecast ?? [];
    const total14 = points.reduce((sum, point) => sum + (point.predicted_count || 0), 0);
    const avgPerDay = points.length ? total14 / points.length : null;

    const risingCount =
      (data.trends.branch?.rising?.length ?? 0) + (data.trends.subcategory?.rising?.length ?? 0);

    const topRisk = data.risk?.rankings?.airline?.[0];

    return {
      total14: points.length ? `±${Math.round(total14)}` : '—',
      avgPerDay: avgPerDay !== null ? avgPerDay.toFixed(1) : '—',
      risingCount: String(risingCount),
      topRisk: topRisk ? riskEntityName(topRisk) : '—',
      topRiskCount: topRisk ? `${topRisk.incident_count} laporan tercatat` : undefined,
    };
  }, [data]);

  const learnedFrom = data?.health?.row_count
    ? `Belajar dari ${data.health.row_count.toLocaleString('id-ID')} laporan historis`
    : null;
  const retrainedAt = longDate(data?.health?.last_retrain);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[19px] font-bold text-slate-800 leading-tight">Wawasan AI</h1>
          <p className="text-[12px] text-slate-400 break-words">
            {DIVISION_NAMES[division] || division}
            {learnedFrom ? ` · ${learnedFrom}` : ''}
          </p>
        </div>
        <button
          onClick={() => refresh(true)}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-600 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
          Perbarui
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DashboardSkeleton />
          </motion.div>
        )}

        {!loading && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white border border-slate-200 p-10 text-center"
          >
            <p className="text-[14px] text-slate-500">{error}</p>
            <button
              onClick={() => refresh()}
              className="mt-3 text-[13px] font-semibold text-violet-600 hover:text-violet-700"
            >
              Coba lagi
            </button>
          </motion.div>
        )}

        {!loading && !error && data && heroStats && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            {/* Hero stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile
                icon={CalendarRange}
                label="Perkiraan 14 Hari"
                value={heroStats.total14}
                hint="total laporan diperkirakan"
              />
              <StatTile
                icon={TrendingUp}
                label="Rata-rata Harian"
                value={heroStats.avgPerDay}
                hint="laporan per hari ke depan"
                tone="slate"
              />
              <StatTile
                icon={ShieldAlert}
                label="Perlu Perhatian"
                value={heroStats.topRisk}
                hint={heroStats.topRiskCount ?? 'prioritas risiko teratas'}
                tone="rose"
              />
              <StatTile
                icon={ArrowUpRight}
                label="Tren Naik"
                value={heroStats.risingCount}
                hint="stasiun / kategori sedang meningkat"
                tone="emerald"
              />
            </div>

            {/* Forecast chart */}
            {data.forecast?.forecast?.length ? <ForecastChart forecast={data.forecast} /> : null}

            {/* Trends + Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrendsPanel trends={data.trends} />
              {data.risk ? <RiskLeaderboard risk={data.risk} /> : null}
            </div>

            {/* Report-count forecast (station / category / case classification) */}
            {data.reportCounts
              ? <ReportCountForecast reportCounts={data.reportCounts} />
              : data.subcategoryForecast
                ? <SubcategoryOutlook outlook={data.subcategoryForecast} />
                : null}

            {/* Honest footer */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-slate-400 border-t border-slate-100 pt-4">
              <span className="flex items-center gap-1.5">
                <Database size={12} />
                {retrainedAt ? `Model diperbarui ${retrainedAt}` : 'Model diperbarui otomatis secara berkala'}
              </span>
              <span>All figures are estimates based on historical data patterns — not exact numbers.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DivisionAIReportsDashboard;
