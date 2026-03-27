'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ActivitySquare, Gauge, ShieldAlert, Target, Thermometer } from 'lucide-react';
import { SeverityDistributionChart } from '@/components/chart-detail/custom-charts/SeverityDistributionChart';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';

type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';

interface EntityDetail {
  name: string;
  risk_score: number;
  risk_level: RiskLevel;
  severity_distribution: Partial<Record<RiskLevel, number>>;
  issue_categories: string[];
  total_issues?: number;
}

interface RiskSummary {
  last_updated: string;
  airline_risks: Record<RiskLevel, number>;
  branch_risks: Record<RiskLevel, number>;
  hub_risks: Record<RiskLevel, number>;
  top_risky_airlines: string[];
  top_risky_branches: string[];
  total_airlines: number;
  total_branches: number;
  total_hubs: number;
  airline_details: EntityDetail[];
  branch_details: EntityDetail[];
  hub_details: EntityDetail[];
}

function toSeverityData(map: Record<string, number>, selected?: RiskLevel[]) {
  const norm = {
    CRITICAL: map['Critical'] || map['CRITICAL'] || 0,
    HIGH: map['High'] || map['HIGH'] || 0,
    MEDIUM: map['Medium'] || map['MEDIUM'] || 0,
    LOW: map['Low'] || map['LOW'] || 0,
  };
  const apply = (sev: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW') => {
    if (!selected || selected.length === 0) return norm[sev];
    const allow = selected.includes(sev === 'CRITICAL' ? 'Critical' : sev === 'HIGH' ? 'High' : sev === 'MEDIUM' ? 'Medium' : 'Low');
    return allow ? norm[sev] : 0;
  };
  const filtered = {
    CRITICAL: apply('CRITICAL'),
    HIGH: apply('HIGH'),
    MEDIUM: apply('MEDIUM'),
    LOW: apply('LOW'),
  };
  const total = Object.values(filtered).reduce((a, b) => a + b, 0) || 1;
  return (Object.keys(filtered) as Array<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>).map(k => ({
    severity: k,
    count: filtered[k],
    percentage: (filtered[k] / total) * 100,
  }));
}

export default function OPRiskSeverity() {
  const [data, setData] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel[]>(['Critical', 'High', 'Medium', 'Low']);
  const [detailTab, setDetailTab] = useState<'branches' | 'hubs'>('branches');

  useEffect(() => {
    let mounted = true;
    const fetcher = async () => {
      try {
        setLoading(true);
        setError(null);
        const esklasiRegex = 'OP';
        const res = await fetch(`https://gapura-dev-gapura-ai.hf.space/api/ai/risk/summary?esklasi_regex=${encodeURIComponent(esklasiRegex)}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
        });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) throw new Error(`Non-JSON or HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) setData(json as unknown as RiskSummary);
      } catch (e: any) {
        if (mounted) setError('Gagal memuat risk summary');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetcher();
    return () => {
      mounted = false;
    };
  }, []);

  const airlineSeverity = useMemo(() => toSeverityData(data?.airline_risks || {}, riskFilter), [data, riskFilter]);
  const branchSeverity = useMemo(() => toSeverityData(data?.branch_risks || {}, riskFilter), [data, riskFilter]);
  const hubSeverity = useMemo(() => toSeverityData(data?.hub_risks || {}, riskFilter), [data, riskFilter]);

  const topAirlines = useMemo(() => {
    const arr = (data?.airline_details || []).slice().sort((a, b) => b.risk_score - a.risk_score);
    const filtered = arr.filter(a => riskFilter.includes(a.risk_level));
    return filtered.slice(0, 12);
  }, [data, riskFilter]);

  const topBranches = useMemo(() => {
    const arr = (data?.branch_details || []).slice().sort((a, b) => b.risk_score - a.risk_score);
    const filtered = arr.filter(a => riskFilter.includes(a.risk_level));
    return filtered.slice(0, 12);
  }, [data, riskFilter]);

  const topHubs = useMemo(() => {
    const arr = (data?.hub_details || []).slice().sort((a, b) => b.risk_score - a.risk_score);
    const filtered = arr.filter(a => riskFilter.includes(a.risk_level));
    return filtered.slice(0, 12);
  }, [data, riskFilter]);

  const donutTopAirlines = useMemo(() => {
    return topAirlines.map(a => ({ name: a.name || 'Unknown', value: Math.max(0, a.risk_score) }));
  }, [topAirlines]);

  const toggleFilter = (lvl: RiskLevel) => {
    setRiskFilter(prev => prev.includes(lvl) ? prev.filter(x => x !== lvl) : [...prev, lvl]);
  };

  const drillAirline = (name: string) => {
    const url = `/embed/airline?name=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
  };
  const drillBranch = (code: string) => {
    const url = `/embed/branch-report/detail?branch=${encodeURIComponent(code)}&viewMode=static`;
    window.open(url, '_blank');
  };
  const drillHub = (hubName: string) => {
    const url = `/embed/hub-report/detail?hub=${encodeURIComponent(hubName)}&viewMode=static`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 space-y-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-gray-800">Risk & Severity Intelligence</h1>
          </div>
          {data?.last_updated && (
            <div className="text-[10px] font-bold text-gray-500">Updated {new Date(data.last_updated).toLocaleString('id-ID')}</div>
          )}
        </div>
        <p className="text-sm text-gray-500">Profil risiko operasional berdasarkan severity dan eksposur entitas.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {(loading ? Array.from({ length: 4 }) : [
          { icon: Gauge, label: 'Airlines', value: data?.total_airlines?.toLocaleString('id-ID') || '0' },
          { icon: Thermometer, label: 'Branches', value: data?.total_branches?.toLocaleString('id-ID') || '0' },
          { icon: ShieldAlert, label: 'Hubs', value: data?.total_hubs?.toLocaleString('id-ID') || '0' },
          { icon: ActivitySquare, label: 'Top Airlines', value: String((data?.top_risky_airlines || []).length) },
        ]).map((k: any, idx: number) => (
          <div key={idx} className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-[var(--surface-2)] rounded w-24" />
                <div className="h-6 bg-[var(--surface-2)] rounded w-32" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <k.icon className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="text-xs text-gray-500">{k.label}</div>
                  <div className="text-lg font-bold text-gray-800">{k.value}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

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
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-gray-700">Risk Level Filter</div>
          <div className="flex flex-wrap gap-2">
            {(['Critical','High','Medium','Low'] as RiskLevel[]).map(lvl => {
              const active = riskFilter.includes(lvl);
              return (
                <button
                  key={lvl}
                  onClick={() => toggleFilter(lvl)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.12em] border transition-all ${
                    active 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : 'bg-[var(--surface-0)] text-gray-600 border-[var(--surface-border)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-[10px] text-gray-500">Filter mempengaruhi daftar Top Airlines/Branches/Hubs dan ringkasan donut.</div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm lg:col-span-1">
          <ResponsivePieChart
            data={donutTopAirlines}
            title="Top Risky Airlines"
            donut
            showLegend
            height="h-[45vh] min-h-[220px] lg:h-[360px]"
          />
        </div>
        <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm lg:col-span-2">
          <div className="text-xs font-bold text-gray-600 mb-3">Top Airlines Detail</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(loading ? [] : topAirlines).map((a) => (
              <div
                key={`${a.name}-${a.risk_score}`}
                className={`rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer ${
                  a.risk_level === 'Critical' ? 'bg-red-50/60 border-red-100' :
                  a.risk_level === 'High' ? 'bg-orange-50/60 border-orange-100' :
                  a.risk_level === 'Medium' ? 'bg-yellow-50/60 border-yellow-100' :
                  'bg-white border-gray-100'
                }`}
                onClick={() => drillAirline(a.name)}
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
                  {(['Critical','High','Medium','Low'] as RiskLevel[]).map(level => (
                    <div key={level} className="text-center">
                      <div className="text-[10px] font-bold text-gray-600">
                        {a.severity_distribution?.[level] || 0}
                      </div>
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
        </div>
      </section>

      <section className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setDetailTab('branches')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border ${detailTab === 'branches' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-[var(--surface-0)] text-gray-700 border-[var(--surface-border)]'}`}
          >
            Top Branches
          </button>
          <button
            onClick={() => setDetailTab('hubs')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border ${detailTab === 'hubs' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-[var(--surface-0)] text-gray-700 border-[var(--surface-border)]'}`}
          >
            Hub Details
          </button>
        </div>
        {detailTab === 'branches' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {(loading ? [] : topBranches).map((b) => (
              <div
                key={`${b.name}-${b.risk_score}`}
                className={`rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer ${
                  b.risk_level === 'Critical' ? 'bg-red-50/60 border-red-100' :
                  b.risk_level === 'High' ? 'bg-orange-50/60 border-orange-100' :
                  b.risk_level === 'Medium' ? 'bg-yellow-50/60 border-yellow-100' :
                  'bg-white border-gray-100'
                }`}
                onClick={() => drillBranch(b.name)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{b.name || 'Unknown'}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{b.risk_level}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-gray-900">{b.risk_score.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-400">Risk Score</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {(['Critical','High','Medium','Low'] as RiskLevel[]).map(level => (
                    <div key={level} className="text-center">
                      <div className="text-[10px] font-bold text-gray-600">
                        {b.severity_distribution?.[level] || 0}
                      </div>
                      <div className="text-[9px] text-gray-500">{level}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {(loading ? [] : topHubs).map((h) => (
              <div
                key={`${h.name}-${h.risk_score}`}
                className={`rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer ${
                  h.risk_level === 'Critical' ? 'bg-red-50/60 border-red-100' :
                  h.risk_level === 'High' ? 'bg-orange-50/60 border-orange-100' :
                  h.risk_level === 'Medium' ? 'bg-yellow-50/60 border-yellow-100' :
                  'bg-white border-gray-100'
                }`}
                onClick={() => drillHub(h.name)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{h.name || 'Unknown'}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{h.risk_level}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-gray-900">{h.risk_score.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-400">Risk Score</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {(['Critical','High','Medium','Low'] as RiskLevel[]).map(level => (
                    <div key={level} className="text-center">
                      <div className="text-[10px] font-bold text-gray-600">
                        {h.severity_distribution?.[level] || 0}
                      </div>
                      <div className="text-[9px] text-gray-500">{level}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
