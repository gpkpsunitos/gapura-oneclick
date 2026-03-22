'use client';

import { useEffect, useMemo, useState } from 'react';
import { Target, ActivitySquare, DatabaseZap, TrendingUp, AlertTriangle } from 'lucide-react';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import type { QueryResult } from '@/types/builder';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';

type TopCategoryEntry = [string, { count: number; percentage?: number }];

interface RootCauseStats {
  total_records: number;
  classified: number;
  unknown: number;
  classification_rate: number;
  by_category: Record<string, {
    count: number;
    percentage?: number;
    top_issue_categories?: Record<string, number>;
    top_areas?: Record<string, number>;
    top_airlines?: Record<string, number>;
  }>;
  top_categories?: TopCategoryEntry[];
}

export default function OPRootCauseDominant() {
  const [stats, setStats] = useState<RootCauseStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError(null);
        const esklasiRegex = 'OP';
        const res = await fetch(`https://gapura-dev-gapura-ai.hf.space/api/ai/root-cause/stats?esklasi_regex=${encodeURIComponent(esklasiRegex)}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (active) setStats(json as unknown as RootCauseStats);
      } catch (e: any) {
        if (active) setStatsError('Gagal memuat root cause stats');
      } finally {
        if (active) setStatsLoading(false);
      }
    };
    fetchStats();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchReports = async () => {
      try {
        setReportsLoading(true);
        setReportsError(null);
        const res = await fetch('/api/reports?unfiltered=1&esklasi_regex=OP', { cache: 'no-store' });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(t || `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (mounted) {
          const onlyOP = Array.isArray(json) ? json.filter((r: any) => String(r?.target_division || '').trim() === 'OP') : [];
          setReports(onlyOP);
        }
      } catch (e: any) {
        if (mounted) setReportsError('Gagal memuat daftar laporan');
      } finally {
        if (mounted) setReportsLoading(false);
      }
    };
    fetchReports();
    return () => {
      mounted = false;
    };
  }, []);

  const donutData = useMemo(() => {
    if (!stats) return [];
    const entries: TopCategoryEntry[] = stats.top_categories
      ? stats.top_categories
      : Object.entries(stats.by_category).map(([k, v]) => [k, { count: v.count, percentage: v.percentage }]);
    const sorted = [...entries].sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0)).slice(0, 8);
    return sorted.map(([name, info]) => ({ name, value: info.count }));
  }, [stats]);

  const kpis = useMemo(() => {
    if (!stats) return [];
    return [
      { icon: DatabaseZap, label: 'Total Records', value: stats.total_records?.toLocaleString('id-ID') ?? '0' },
      { icon: ActivitySquare, label: 'Classified', value: stats.classified?.toLocaleString('id-ID') ?? '0' },
      { icon: AlertTriangle, label: 'Unknown', value: stats.unknown?.toLocaleString('id-ID') ?? '0' },
      { icon: TrendingUp, label: 'Classification Rate', value: `${(stats.classification_rate ?? 0).toFixed(1)}%` },
    ];
  }, [stats]);

  const reportsTable: QueryResult = useMemo(() => {
    const columns = [
      'date_of_event',
      'airlines',
      'area',
      'category',
      'irregularity_complain_category',
      'root_cause',
      'action_taken',
      'preventive_action',
      'description',
    ];
    const rows = (reports || []).map(r => ({
      date_of_event: r.date_of_event || r.event_date || r.created_at || '',
      airlines: r.airlines || r.airline || r.jenis_maskapai || '',
      area: r.area || '',
      category: r.category || r.main_category || r.case_classification || '',
      irregularity_complain_category: r.irregularity_complain_category || r.sub_category_note || '',
      root_cause: r.root_cause || r.root_caused || '',
      action_taken: r.action_taken || '',
      preventive_action: r.preventive_action || '',
      description: r.description || r.report || '',
    }));
    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [reports]);

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 space-y-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-5 h-5 text-emerald-600" />
          <h1 className="text-lg font-bold text-gray-800">Report Root Cause Dominan</h1>
        </div>
        <p className="text-sm text-gray-500">Ringkasan akar masalah dominan berdasarkan klasifikasi AI.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-[var(--surface-2)] rounded w-24" />
                <div className="h-6 bg-[var(--surface-2)] rounded w-32" />
              </div>
            </div>
          ))
        ) : (
          kpis.map((k, idx) => (
            <div key={idx} className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
              <div className="flex items-center gap-3">
                <k.icon className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="text-xs text-gray-500">{k.label}</div>
                  <div className="text-lg font-bold text-gray-800">{k.value}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="bg-[var(--surface-1)] rounded-3xl p-4 md:p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        {statsError ? (
          <div className="text-sm text-red-600">{statsError}</div>
        ) : (
          <ResponsivePieChart
            data={donutData}
            title="Top Root Causes"
            donut
            showLegend
            height="h-[45vh] min-h-[220px] lg:h-[360px]"
          />
        )}
      </section>

      <section className="bg-[var(--surface-1)] rounded-3xl p-4 md:p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <DataTableWithPagination
          data={reportsTable}
          title="Semua Laporan"
          isLoading={reportsLoading}
          rowsPerPage={50}
          columnClasses={{
            root_cause: 'min-w-[20rem] max-w-[40rem] break-words whitespace-pre-wrap',
            action_taken: 'min-w-[20rem] max-w-[40rem] break-words whitespace-pre-wrap',
            preventive_action: 'min-w-[20rem] max-w-[40rem] break-words whitespace-pre-wrap',
            description: 'min-w-[28rem] max-w-[60rem] break-words whitespace-pre-wrap',
          }}
        />
        {reportsError && <div className="mt-2 text-xs text-red-600">{reportsError}</div>}
      </section>
    </div>
  );
}
