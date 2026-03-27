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
  area: string | null;
  created_at: string;
}

interface ReportsResponse {
  summary: { total: number; byStatus: Record<string, number>; bySeverity: Record<string, number> };
  reports: Report[];
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  'low': { label: 'Low', color: '#22c55e' },
  'medium': { label: 'Medium', color: '#fbbf24' },
  'high': { label: 'High', color: '#ef4444' }
};
const FIXED_DONUT_RANK_COLORS = ['#81c784', '#13b5cb', '#cddc39'];
const DONUT_FALLBACK_COLORS = ['#66bb6a', '#9ccc65', '#aed581', '#4db6ac', '#80cbc4'];

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  'OPEN': { label: 'Open', class: 'pending' },
  'ON PROGRESS': { label: 'Dalam Proses', class: 'verified' },
  'CLOSED': { label: 'Selesai', class: 'completed' }
};

export function SeverityDetailContent() {
  const searchParams = useSearchParams();
  const range = searchParams.get('range') || '7d';
  const levelFilter = searchParams.get('level');
  
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = levelFilter 
        ? `/api/embed/reports?range=${range}&severity=${encodeURIComponent(levelFilter)}`
        : `/api/embed/reports?range=${range}`;
      const res = await fetch(url);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [range, levelFilter]);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  if (loading && !data) {
    return <div className="embed-loading"><div className="embed-spinner" /></div>;
  }
  
  const severityPieData = Object.entries(data?.summary.bySeverity || {})
    .map(([name, value]) => ({
      name: SEVERITY_CONFIG[name]?.label || name,
      value,
      color: SEVERITY_CONFIG[name]?.color || '#64748b'
    }))
    .sort((a, b) => b.value - a.value);
  
  // Aggregate by category for this severity level
  const catMap = new Map<string, number>();
  const areaMap = new Map<string, number>();
  for (const r of data?.reports || []) {
    catMap.set(r.main_category || 'Unknown', (catMap.get(r.main_category || 'Unknown') || 0) + 1);
    areaMap.set(r.area || 'Unknown', (areaMap.get(r.area || 'Unknown') || 0) + 1);
  }
  
  const catBarData = Array.from(catMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  const highCount = data?.summary.bySeverity?.high || 0;
  const mediumCount = data?.summary.bySeverity?.medium || 0;
  const lowCount = data?.summary.bySeverity?.low || 0;
  
  const title = levelFilter ? `Severity: ${SEVERITY_CONFIG[levelFilter]?.label || levelFilter}` : 'Analisis Severity';
  
  return (
    <>
      <Link href={`/embed/overview?range=${range}`} className="back-link">← Kembali ke Overview</Link>
      
      <header className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">Breakdown laporan berdasarkan tingkat keparahan</p>
      </header>
      
      <DateRangeFilter />
      
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: '#ef4444' }}>{highCount}</div>
          <div className="kpi-label">High</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: '#fbbf24' }}>{mediumCount}</div>
          <div className="kpi-label">Medium</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: '#22c55e' }}>{lowCount}</div>
          <div className="kpi-label">Low</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{data?.summary.total || 0}</div>
          <div className="kpi-label">Total</div>
        </div>
      </div>
      
      <div className="embed-grid embed-grid-2">
        <EmbedCard title="Distribusi Severity">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {severityPieData.map((_, index) => {
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
        
        <EmbedCard title="Per Kategori">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="count" fill="#a78bfa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </EmbedCard>
      </div>
      
      <EmbedCard title="Daftar Laporan" className="mt-6">
        <div className="embed-table-container">
          <table className="embed-table">
            <thead>
              <tr><th>Tanggal</th><th>Judul</th><th>Kategori</th><th>Area</th><th>Severity</th><th>Status</th></tr>
            </thead>
            <tbody>
              {(data?.reports || []).slice(0, 50).map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                  <td>{r.title}</td>
                  <td>{r.main_category || '-'}</td>
                  <td>{r.area || '-'}</td>
                  <td><span className={`severity-badge ${r.severity}`}>{r.severity}</span></td>
                  <td><span className={`status-badge ${STATUS_MAP[r.status]?.class || ''}`}>{STATUS_MAP[r.status]?.label || r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EmbedCard>
    </>
  );
}
