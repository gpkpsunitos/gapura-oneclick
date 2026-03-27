'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';

type Report = {
  id: string;
  created_at?: string;
  category?: string;
  irregularity_complain_category?: string;
  main_category?: string;
  target_division?: string;
};

export default function OPTopIrregularityComplaintCases() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<'all' | 'week' | 'month'>('all');

  const fetchData = async (hard = false) => {
    try {
      if (hard) setRefreshing(true);
      else setLoading(true);
      if (hard) await fetch('/api/reports/refresh', { method: 'POST' });
      // Primary endpoint (filtered by OP division)
      let res = await fetch('/api/admin/reports?esklasi_regex=OP');
      if (!res.ok) {
        // Fallback to analytics endpoint (no division filter)
        const fields = [
          'id',
          'created_at',
          'category',
          'irregularity_complain_category',
          'main_category',
          'airlines',
          'airline',
          'station_code',
          'branch',
          'reporting_branch',
        ].join(',');
        res = await fetch(`/api/reports/analytics?fields=${encodeURIComponent(fields)}&refresh=${hard ? 'true' : 'false'}&esklasi_regex=OP`);
        if (res.ok) {
          const data = await res.json();
          const onlyOP = Array.isArray(data?.reports) ? data.reports.filter((r: any) => String(r?.target_division || '').trim() === 'OP') : [];
          setReports(onlyOP);
        } else {
          setReports([]);
        }
      } else {
        const data = await res.json();
        const onlyOP = Array.isArray(data) ? data.filter((r: any) => String(r?.target_division || '').trim() === 'OP') : [];
        setReports(onlyOP);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let list = reports.filter(
      (r) => r.category === 'Irregularity' || r.category === 'Complaint'
    );
    if (range !== 'all') {
      const now = new Date();
      const days = range === 'week' ? 7 : 30;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      list = list.filter((r) => {
        const d = r.created_at ? new Date(r.created_at) : null;
        return d && d >= cutoff;
      });
    }
    return list;
  }, [reports, range]);

  const topData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const key =
        r.irregularity_complain_category ||
        r.main_category ||
        'Uncategorized';
      map.set(key, (map.get(key) || 0) + 1);
    }
    const arr = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const max = arr[0]?.count || 1;
    return { arr, max };
  }, [filtered]);

  const topBranches = useMemo(() => {
    const branchMap = new Map<string, number>();
    for (const r of filtered) {
      // @ts-ignore
      const key = (r as any).stations?.code || (r as any).station_code || (r as any).branch || (r as any).reporting_branch || 'Unknown';
      branchMap.set(key, (branchMap.get(key) || 0) + 1);
    }
    const arr = Array.from(branchMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const max = arr[0]?.count || 1;
    return { arr, max };
  }, [filtered]);

  const topAirlines = useMemo(() => {
    const airlineMap = new Map<string, number>();
    for (const r of filtered) {
      // @ts-ignore
      const key = (r as any).airlines || (r as any).airline || 'Unknown';
      airlineMap.set(key, (airlineMap.get(key) || 0) + 1);
    }
    const arr = Array.from(airlineMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const max = arr[0]?.count || 1;
    return { arr, max };
  }, [filtered]);

  return (
    <div className="min-h-screen px-4 md:px-6 py-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-gray-800">
              Top Irregularity & Complaint
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              {(['all', 'week', 'month'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg ${
                    range === r
                      ? 'bg-white shadow border border-gray-200 text-gray-800'
                      : 'text-gray-500'
                  }`}
                >
                  {r === 'all' ? 'Semua' : r === 'week' ? '7 Hari' : '30 Hari'}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white border border-gray-200 hover:bg-gray-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-[30vh] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--surface-4)', borderTopColor: 'var(--brand-primary)' }} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Records</p>
                <p className="text-2xl font-extrabold text-gray-900">{filtered.length}</p>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Top Category</p>
                <p className="text-base font-bold text-gray-900">{topData.arr[0]?.name || '-'}</p>
                <p className="text-sm text-gray-600">{topData.arr[0]?.count || 0} kasus</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Top Branches */}
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase">Top 5 Cabang</h2>
                </div>
                <div className="space-y-2">
                  {topBranches.arr.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">Tidak ada data</div>
                  ) : (
                    topBranches.arr.map((row) => (
                      <div key={row.name} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-800">{row.name}</span>
                            <span className="text-gray-600 font-semibold">{row.count}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600"
                              style={{ width: `${Math.round((row.count / topBranches.max) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Airlines */}
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase">Top 5 Airlines</h2>
                </div>
                <div className="space-y-2">
                  {topAirlines.arr.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">Tidak ada data</div>
                  ) : (
                    topAirlines.arr.map((row) => (
                      <div key={row.name} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-800">{row.name}</span>
                            <span className="text-gray-600 font-semibold">{row.count}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-600"
                              style={{ width: `${Math.round((row.count / topAirlines.max) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Categories Overall */}
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase">Top 5 Category Case</h2>
                </div>
                <div className="space-y-2">
                  {topData.arr.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">Tidak ada data</div>
                  ) : (
                    topData.arr.map((row) => (
                      <div key={row.name} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-800">{row.name}</span>
                            <span className="text-gray-600 font-semibold">{row.count}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                              style={{ width: `${Math.round((row.count / topData.max) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
