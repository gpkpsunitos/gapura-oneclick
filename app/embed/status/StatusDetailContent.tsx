'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DateRangeFilter } from '@/components/embed/DateRangeFilter';
import { EmbedCard } from '@/components/embed/EmbedCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Report {
  id: string;
  title: string;
  status: string;
  severity: string;
  airline: string | null;
  main_category: string | null;
  created_at: string;
  sla_deadline: string | null;
}

interface ReportsResponse {
  summary: { total: number; byStatus: Record<string, number>; bySeverity: Record<string, number> };
  reports: Report[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; class: string }> = {
  'OPEN': { label: 'Open', color: '#fbbf24', class: 'pending' },
  'ON PROGRESS': { label: 'Dalam Proses', color: '#60a5fa', class: 'verified' },
  'CLOSED': { label: 'Selesai', color: '#22c55e', class: 'completed' }
};
const FIXED_DONUT_RANK_COLORS = ['#81c784', '#13b5cb', '#cddc39'];
const DONUT_FALLBACK_COLORS = ['#66bb6a', '#9ccc65', '#aed581', '#4db6ac', '#80cbc4'];

export function StatusDetailContent() {
  const searchParams = useSearchParams();
  const range = searchParams.get('range') || '7d';
  const statusFilter = searchParams.get('status');
  
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter 
        ? `/api/embed/reports?range=${range}&status=${encodeURIComponent(statusFilter)}`
        : `/api/embed/reports?range=${range}`;
      const res = await fetch(url);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [range, statusFilter]);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  if (loading && !data) {
    return <div className="embed-loading"><div className="embed-spinner" /></div>;
  }
  
  const statusPieData = Object.entries(data?.summary.byStatus || {})
    .map(([name, value]) => ({
      name: STATUS_CONFIG[name]?.label || name,
      value,
      color: STATUS_CONFIG[name]?.color || '#64748b'
    }))
    .sort((a, b) => b.value - a.value);
  
  // SLA Analysis - count overdue reports
  const now = new Date();
  let overdueCount = 0;
  let atRiskCount = 0;
  for (const r of data?.reports || []) {
    if (r.sla_deadline && r.status !== 'CLOSED') {
      const deadline = new Date(r.sla_deadline);
      const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursLeft < 0) overdueCount++;
      else if (hoursLeft < 24) atRiskCount++;
    }
  }
  
  const completionRate = data?.summary.total 
    ? Math.round(((data.summary.byStatus['CLOSED'] || 0) / data.summary.total) * 100) 
    : 0;
  
  return (
    <>
      <Link href={`/embed/overview?range=${range}`} className="back-link">← Kembali ke Overview</Link>
      
      <header className="page-header">
        <h1 className="page-title">Status Laporan</h1>
        <p className="page-subtitle">Pipeline dan SLA compliance</p>
      </header>
      
      <DateRangeFilter />
      
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{data?.summary.total || 0}</div>
          <div className="kpi-label">Total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: '#22c55e' }}>{completionRate}%</div>
          <div className="kpi-label">Completion Rate</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: overdueCount > 0 ? '#ef4444' : '#22c55e' }}>{overdueCount}</div>
          <div className="kpi-label">Overdue SLA</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: atRiskCount > 0 ? '#fbbf24' : '#22c55e' }}>{atRiskCount}</div>
          <div className="kpi-label">At Risk (&lt;24h)</div>
        </div>
      </div>
      
      <div className="embed-grid embed-grid-2">
        <EmbedCard title="Distribusi Status" subtitle="Pipeline overview">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusPieData.map((_, index) => {
                    const fill = index < FIXED_DONUT_RANK_COLORS.length
                      ? FIXED_DONUT_RANK_COLORS[index]
                      : DONUT_FALLBACK_COLORS[(index - FIXED_DONUT_RANK_COLORS.length) % DONUT_FALLBACK_COLORS.length];
                    return <Cell key={index} fill={fill} />;
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </EmbedCard>
        
        <EmbedCard title="Per Severity" subtitle="Breakdown by severity">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.entries(data?.summary.bySeverity || {}).map(([name, count]) => ({ name, count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {Object.entries(data?.summary.bySeverity || {}).map(([name], i) => (
                    <Cell key={i} fill={name === 'high' ? '#ef4444' : name === 'medium' ? '#fbbf24' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </EmbedCard>
      </div>
      
      <EmbedCard title="Daftar Laporan" className="mt-6">
        <div className="embed-table-container">
          <table className="embed-table">
            <thead>
              <tr><th>Tanggal</th><th>Judul</th><th>Airline</th><th>Status</th><th>Severity</th></tr>
            </thead>
            <tbody>
              {(data?.reports || []).slice(0, 50).map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                  <td>{r.title}</td>
                  <td>{r.airline || '-'}</td>
                  <td><span className={`status-badge ${STATUS_CONFIG[r.status]?.class || ''}`}>{STATUS_CONFIG[r.status]?.label || r.status}</span></td>
                  <td><span className={`severity-badge ${r.severity}`}>{r.severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EmbedCard>
    </>
  );
}
