'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';
import type { QueryResult } from '@/types/builder';

type Report = {
  id: string;
  created_at?: string;
  status?: string;
  category?: string;
  target_division?: string;
  [key: string]: unknown;
};

function normalizeStatus(s?: string): 'OPEN' | 'PROGRESS' | 'CLOSED' {
  const v = (s || '').toString().toLowerCase();
  if (v.includes('selesai') || v.includes('closed') || v === 'closed' || v === 'close' || v.includes('done')) {
    return 'CLOSED';
  }
  if (
    v.includes('menunggu') ||
    v.includes('progress') ||
    v.includes('verifikasi') ||
    v.includes('pending')
  ) {
    return 'PROGRESS';
  }
  return 'OPEN';
}

export default function OTCaseStatus() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<'all' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'PROGRESS' | 'CLOSED'>('ALL');

  const fetchData = async (hard = false) => {
    try {
      if (hard) setRefreshing(true);
      else setLoading(true);
      if (hard) await fetch('/api/reports/refresh', { method: 'POST' });
      const res = await fetch('/api/reports?unfiltered=1&esklasi_regex=OT');
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const data = await res.json();
        const onlyOT = Array.isArray(data) ? data.filter((r: any) => String(r?.target_division || '').trim() === 'OT') : [];
        setReports(onlyOT);
      } else {
        const res2 = await fetch(`/api/reports/analytics?refresh=${hard ? 'true' : 'false'}&esklasi_regex=OT`);
        if (res2.ok && (res2.headers.get('content-type') || '').includes('application/json')) {
          const data2 = await res2.json();
          const onlyOT = Array.isArray(data2?.reports) ? data2.reports.filter((r: any) => String(r?.target_division || '').trim() === 'OT') : [];
          setReports(onlyOT);
        } else {
          setReports([]);
        }
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
    let list = reports;
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

  const statusAgg = useMemo(() => {
    const base = statusFilter === 'ALL'
      ? filtered
      : filtered.filter(r => normalizeStatus(r.status) === statusFilter);
    let open = 0;
    let progress = 0;
    let closed = 0;
    for (const r of base) {
      const n = normalizeStatus(r.status);
      if (n === 'OPEN') open++;
      else if (n === 'PROGRESS') progress++;
      else closed++;
    }
    const total = open + progress + closed;
    const closedRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    return { open, progress, closed, total, closedRate };
  }, [filtered, statusFilter]);

  const tableRows = useMemo(() => {
    let list = filtered;
    if (statusFilter !== 'ALL') {
      list = list.filter(r => normalizeStatus(r.status) === statusFilter);
    }
    return list
      .slice()
      .sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
  }, [filtered, statusFilter]);

  const tableData: QueryResult = useMemo(() => {
    const union = new Set<string>();
    for (const r of reports) {
      const obj = r as Record<string, unknown>;
      for (const k of Object.keys(obj || {})) {
        const v = obj[k];
        const t = typeof v;
        if (v === null || t === 'string' || t === 'number' || t === 'boolean') {
          union.add(k);
        }
      }
    }
    const pick = (...keys: string[]) => keys.find(k => union.has(k));
    const selected = [
      pick('created_at', 'form_completed_at', 'form_submitted_at', 'date_of_event'),
      pick('status'),
      pick('severity'),
      pick('report', 'title'),
      pick('airlines', 'airline', 'jenis_maskapai'),
      pick('station_code', 'branch'),
      pick('hub'),
      pick('category', 'irregularity_complain_category'),
      pick('reporter_name'),
      pick('flight_number'),
      pick('evidence_urls') || (!union.has('evidence_urls') && pick('evidence_url')) || null,
    ].filter(Boolean) as string[];
    const columns = selected.filter(k => !['sheet_id', 'user_id', 'original_id', 'id'].includes(k));
    return {
      columns,
      rows: tableRows.map(r => {
        const obj = r as Record<string, unknown>;
        const row: Record<string, unknown> = { id: r.id };
        for (const col of columns) {
          if (col === 'status') row[col] = normalizeStatus(r.status);
          else row[col] = obj[col] ?? '';
        }
        return row;
      }),
      rowCount: tableRows.length,
      executionTimeMs: 0,
    };
  }, [tableRows, reports]);

  return (
    <div className="min-h-screen px-4 md:px-6 py-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-gray-800">Status Case</h1>
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
            <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200">
              {(['ALL', 'OPEN', 'PROGRESS', 'CLOSED'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg ${
                    statusFilter === s
                      ? 'bg-white shadow border border-gray-200 text-gray-800'
                      : 'text-gray-500'
                  }`}
                >
                  {s === 'ALL' ? 'Semua' : s}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total</p>
                <p className="text-2xl font-extrabold text-gray-900">{statusAgg.total}</p>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Open</p>
                <p className="text-2xl font-extrabold text-gray-900">{statusAgg.open}</p>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Progress</p>
                <p className="text-2xl font-extrabold text-gray-900">{statusAgg.progress}</p>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Closed Rate</p>
                <p className="text-2xl font-extrabold text-gray-900">{statusAgg.closedRate}%</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase">Distribusi Status</h2>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'OPEN', value: statusAgg.open, color: 'from-amber-500 to-orange-600' },
                  { name: 'PROGRESS', value: statusAgg.progress, color: 'from-cyan-500 to-sky-600' },
                  { name: 'CLOSED', value: statusAgg.closed, color: 'from-emerald-500 to-teal-600' },
                ].map((row) => {
                  const max = Math.max(statusAgg.open, statusAgg.progress, statusAgg.closed, 1);
                  const pct = Math.round((row.value / max) * 100);
                  return (
                    <div key={row.name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-800">{row.name}</span>
                        <span className="text-gray-600 font-semibold">{row.value}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${row.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase">Daftar Kasus</h2>
        </div>
        <DataTableWithPagination
          data={tableData}
          title="Case Status Table"
          isLoading={loading}
          rowsPerPage={10}
          columnClasses={{ 
            created_at: 'whitespace-nowrap w-48',
            report: 'min-w-[36rem] w-[44rem] leading-relaxed',
            title: 'min-w-[36rem] w-[44rem] leading-relaxed'
          }}
          onRowClick={(row) => {
            const id = typeof row.id === 'string' ? row.id : undefined;
            if (id) {
              window.open(`/dashboard/ot/reports/${id}`, '_blank');
            }
          }}
        />
      </section>
    </div>
  );
}
