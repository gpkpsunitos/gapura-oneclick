'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { ActionSummaryCard } from '@/components/dashboard/ai-summary/ActionSummaryCard';
import type { ActionSummaryResponse } from '@/components/dashboard/ai-summary/types';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { ResponsiveBarChart } from '@/components/charts/ResponsiveBarChart';
import type { AnalyticsRuntimeStatus } from '@/lib/op-shortcut-source-matrix';

type ActionSummaryPayload = ActionSummaryResponse & AnalyticsRuntimeStatus;

export function ActionSummaryInsightPanel({
  esklasiRegex,
  onStatus,
}: {
  esklasiRegex?: string;
  onStatus?: (status: AnalyticsRuntimeStatus) => void;
}) {
  const [data, setData] = useState<ActionSummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const query = new URLSearchParams();
        if (esklasiRegex) {
          query.set('esklasi_regex', esklasiRegex);
        }
        const endpoint = query.toString() ? `/api/ai/action-summary?${query.toString()}` : '/api/ai/action-summary';
        const response = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = (await response.json()) as ActionSummaryPayload;
        if (!active) return;
        setData(payload);
        onStatus?.({
          cached: payload.cached,
          stale: payload.stale,
          generatedAt: payload.generatedAt,
          sourceSyncAt: payload.sourceSyncAt,
          count: payload.totalRecords,
        });
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load AI analytics');
        onStatus?.({
          cached: false,
          stale: false,
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [esklasiRegex, onStatus]);

  const severityData = useMemo(() => {
    if (!data?.overallSummary?.severityDistribution) return [];
    return Object.entries(data.overallSummary.severityDistribution)
      .map(([name, value]) => ({ name, value: Number(value || 0) }))
      .filter((entry) => entry.value > 0);
  }, [data]);

  const topCategoriesByRisk = useMemo(() => {
    return (data?.topCategoriesByRisk || []).map((entry) => ({
      name: entry.category,
      riskScore: Math.round(entry.riskScore * 10) / 10,
      count: entry.count,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center rounded-2xl border border-amber-200 bg-white/80">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
          Loading AI analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <div className="mb-2 flex items-center gap-2 font-bold">
          <AlertTriangle className="h-4 w-4" />
          Analitik AI tidak tersedia
        </div>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      <ActionSummaryCard data={data} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
          <ResponsivePieChart
            data={severityData}
            title="Distribusi Severity AI"
            donut
            showLegend
            percentageLabels
            height="h-[280px]"
          />
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900">Kategori Prioritas AI</h3>
            <p className="text-xs text-slate-600">Kategori dengan skor risiko tertinggi dari hasil AI action summary.</p>
          </div>
          <ResponsiveBarChart
            data={topCategoriesByRisk}
            xAxisKey="name"
            dataKeys={['riskScore', 'count']}
            showLegend
            height="h-[280px]"
          />
        </div>
      </div>

      {(data.globalRecommendations || []).length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Rekomendasi AI</h3>
              <p className="text-xs text-slate-600">Rekomendasi prioritas yang dihasilkan dari pipeline AI internal.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.globalRecommendations.slice(0, 6).map((recommendation) => (
              <div key={`${recommendation.category}-${recommendation.action}`} className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                    {recommendation.priority}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {(recommendation.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900">{recommendation.action}</p>
                <p className="mt-2 text-xs text-slate-600">{recommendation.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
