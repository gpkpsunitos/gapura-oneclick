'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ActivitySquare, Gauge, ShieldAlert, Thermometer } from 'lucide-react';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { SeverityDistributionChart } from '@/components/chart-detail/custom-charts/SeverityDistributionChart';

interface RootCauseDetail {
  count: number;
  percentage: number;
  top_issue_categories: Record<string, number>;
  top_areas: Record<string, number>;
  top_airlines: Record<string, number>;
  description: string;
}

interface RootCauseStats {
  total_records: number;
  classified: number;
  unknown: number;
  classification_rate: number;
  by_category: Record<string, RootCauseDetail>;
  top_categories: [string, RootCauseDetail][];
}

type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
interface EntityDetail {
  name: string;
  risk_score: number;
  risk_level: RiskLevel;
  severity_distribution: Partial<Record<RiskLevel, number>>;
  issue_categories: string[];
}
interface RiskSummary {
  last_updated: string;
  airline_risks: Record<RiskLevel, number>;
  branch_risks: Record<RiskLevel, number>;
  hub_risks: Record<RiskLevel, number>;
  top_risky_airlines: string[];
  top_risky_branches: string[];
  airline_details: EntityDetail[];
  branch_details: EntityDetail[];
  hub_details: EntityDetail[];
  total_airlines: number;
  total_branches: number;
  total_hubs: number;
}
interface RiskCalculateResponse {
  status: string;
  records_processed: number;
  risk_summary: RiskSummary;
}

function toDonutDataFromMap(map: Record<string, number>, take: number = 8) {
  const entries = Object.entries(map || {}).filter(([k]) => k && k.trim().length > 0);
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, take);
  const others = sorted.slice(take);
  const sumOthers = others.reduce((a, [, v]) => a + v, 0);
  const data = top.map(([name, value]) => ({ name, value }));
  if (sumOthers > 0) data.push({ name: 'Others', value: sumOthers });
  return data;
}

function toSeverityData(map?: Record<string, number>) {
  const m = map || {};
  const total = ['Critical', 'High', 'Medium', 'Low'].reduce((a, k) => a + (m[k] || 0), 0) || 1;
  return (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
    const key = sev === 'CRITICAL' ? 'Critical' : sev === 'HIGH' ? 'High' : sev === 'MEDIUM' ? 'Medium' : 'Low';
    const count = m[key] || 0;
    return { severity: sev, count, percentage: (count / total) * 100 };
  });
}

export default function OTRiskSeverity() {
  const [data, setData] = useState<RootCauseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calc, setCalc] = useState<RiskCalculateResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetcher = async () => {
      try {
        setLoading(true);
        setError(null);
        const esklasiRegex = 'OT';
        const [rootCauseRes, calculateRes] = await Promise.allSettled([
          fetch(`https://gapura-dev-gapura-ai.hf.space/api/ai/root-cause/stats?esklasi_regex=${encodeURIComponent(esklasiRegex)}`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          }).then(async (r) => {
            const ct = r.headers.get('content-type') || '';
            if (!r.ok || !ct.includes('application/json')) throw new Error(String(r.status));
            return (await r.json()) as unknown;
          }),
          fetch(`https://gapura-dev-gapura-ai.hf.space/api/ai/risk/calculate?esklasi_regex=${encodeURIComponent(esklasiRegex)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({}),
            cache: 'no-store',
          }).then(async (r) => {
            const ct = r.headers.get('content-type') || '';
            if (!r.ok || !ct.includes('application/json')) throw new Error(String(r.status));
            return (await r.json()) as unknown;
          }),
        ]);
        if (mounted) {
          if (rootCauseRes.status === 'fulfilled') setData(rootCauseRes.value as RootCauseStats);
          if (calculateRes.status === 'fulfilled') setCalc(calculateRes.value as RiskCalculateResponse);
        }
      } catch {
        if (mounted) setError('Gagal memuat root-cause stats');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetcher();
    return () => {
      mounted = false;
    };
  }, []);

  const donutRootCauses = useMemo(() => {
    const entries = (data?.top_categories || []).map(([name, detail]) => ({ name, value: detail.count }));
    return entries.slice(0, 10);
  }, [data]);

  const airlineSeverity = useMemo(() => toSeverityData(calc?.risk_summary?.airline_risks), [calc]);
  const branchSeverity = useMemo(() => toSeverityData(calc?.risk_summary?.branch_risks), [calc]);
  const hubSeverity = useMemo(() => toSeverityData(calc?.risk_summary?.hub_risks), [calc]);

  const topAirlines = useMemo(() => {
    const arr = (calc?.risk_summary?.airline_details || []).slice().sort((a, b) => b.risk_score - a.risk_score);
    return arr.slice(0, 12);
  }, [calc]);

  const topList = useMemo(() => {
    return (data?.top_categories || []).slice(0, 12);
  }, [data]);

  const aggregateTopIssueCategories = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const [, detail] of data?.top_categories || []) {
      for (const [k, v] of Object.entries(detail.top_issue_categories || {})) {
        if (!k) continue;
        agg[k] = (agg[k] || 0) + v;
      }
    }
    return toDonutDataFromMap(agg, 8);
  }, [data]);

  const aggregateTopAreas = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const [, detail] of data?.top_categories || []) {
      for (const [k, v] of Object.entries(detail.top_areas || {})) {
        if (!k) continue;
        agg[k] = (agg[k] || 0) + v;
      }
    }
    return toDonutDataFromMap(agg, 8);
  }, [data]);

  // (Optional) Aggregate of top airlines available via root-cause stats if needed in future

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 space-y-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-gray-800">Root Cause · Divisi OT</h1>
          </div>
          {typeof data?.classification_rate === 'number' && (
            <div className="text-[10px] font-bold text-gray-500">
              Classification Rate {data.classification_rate.toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">Distribusi akar masalah, area terdampak, kategori isu, dan airlines terkait.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-[var(--surface-2)] rounded w-24" />
                <div className="h-6 bg-[var(--surface-2)] rounded w-32" />
              </div>
            </div>
          ))
        ) : (
          (() => {
            type StatCard = { icon: React.ElementType; label: string; value: string };
            const stats: StatCard[] = [
              { icon: Gauge, label: 'Total Records', value: (data?.total_records || 0).toLocaleString('id-ID') },
              { icon: Thermometer, label: 'Classified', value: (data?.classified || 0).toLocaleString('id-ID') },
              { icon: ShieldAlert, label: 'Unknown', value: (data?.unknown || 0).toLocaleString('id-ID') },
              { icon: ActivitySquare, label: 'Top Root Causes', value: String((data?.top_categories || []).length) },
            ];
            return stats.map((k, idx) => (
              <div key={idx} className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
                <div className="flex items-center gap-3">
                  <k.icon className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs text-gray-500">{k.label}</div>
                    <div className="text-lg font-bold text-gray-800">{k.value}</div>
                  </div>
                </div>
              </div>
            ));
          })()
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
          <ResponsivePieChart title="Top Root Causes" data={donutRootCauses} donut showLegend height="h-[45vh] min-h-[220px] lg:h-[360px]" />
        </div>
        <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
          <ResponsivePieChart title="Top Issue Categories (Agg.)" data={aggregateTopIssueCategories} donut showLegend height="h-[45vh] min-h-[220px] lg:h-[360px]" />
        </div>
        <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
          <ResponsivePieChart title="Top Areas (Agg.)" data={aggregateTopAreas} donut showLegend height="h-[45vh] min-h-[220px] lg:h-[360px]" />
        </div>
      </section>

      {calc?.risk_summary && (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
              <SeverityDistributionChart data={airlineSeverity} title="Severity: Airlines" />
            </div>
            <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
              <SeverityDistributionChart data={branchSeverity} title="Severity: Branches" />
            </div>
            <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
              <SeverityDistributionChart data={hubSeverity} title="Severity: Hubs" />
            </div>
          </section>

          <section className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
            <div className="text-xs font-bold text-gray-700 mb-3">Top Airlines Detail</div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {(loading ? [] : topAirlines).map((a) => (
                <div
                  key={`${a.name}-${a.risk_score}`}
                  className={`rounded-xl border p-4 transition-all hover:shadow-md ${
                    a.risk_level === 'Critical'
                      ? 'bg-red-50/60 border-red-100'
                      : a.risk_level === 'High'
                      ? 'bg-orange-50/60 border-orange-100'
                      : a.risk_level === 'Medium'
                      ? 'bg-yellow-50/60 border-yellow-100'
                      : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-gray-800">{a.name || 'Unknown'}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{a.risk_level}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-gray-900">{a.risk_score.toFixed(2)}</div>
                      <div className="text-[10px] text-gray-400">Risk Score</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {(['Critical', 'High', 'Medium', 'Low'] as RiskLevel[]).map((level) => (
                      <div key={level} className="text-center">
                        <div className="text-[10px] font-bold text-gray-600">{a.severity_distribution?.[level] || 0}</div>
                        <div className="text-[9px] text-gray-500">{level}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-[10px] text-gray-500 mb-1">Top Issues</div>
                    <div className="flex flex-wrap gap-1">
                      {(a.issue_categories || []).slice(0, 4).map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] text-gray-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="text-xs font-bold text-gray-700 mb-3">Root Cause Details</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(loading ? [] : topList).map(([name, detail]) => (
            <div
              key={name}
              className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-800">{name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{detail.description || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-gray-900">{detail.count}</div>
                  <div className="text-[10px] text-gray-400">{detail.percentage.toFixed(1)}%</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-[10px]">
                <div>
                  <div className="text-gray-500 font-semibold mb-1">Issue Categories</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detail.top_issue_categories || {})
                      .filter(([k]) => k)
                      .slice(0, 4)
                      .map(([k, v]) => (
                        <span key={k} className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                          {k} · {v}
                        </span>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 font-semibold mb-1">Areas</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detail.top_areas || {})
                      .filter(([k]) => k)
                      .slice(0, 4)
                      .map(([k, v]) => (
                        <span key={k} className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                          {k} · {v}
                        </span>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 font-semibold mb-1">Airlines</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detail.top_airlines || {})
                      .filter(([k]) => k)
                      .slice(0, 4)
                      .map(([k, v]) => (
                        <span
                          key={k}
                          className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={() => window.open(`/embed/airline?name=${encodeURIComponent(k)}`, '_blank')}
                        >
                          {k} · {v}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
