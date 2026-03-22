'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DateRangeFilter } from '@/components/embed/DateRangeFilter';
import { EmbedCard } from '@/components/embed/EmbedCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

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

const CHART_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];
const STATUS_MAP: Record<string, { label: string; class: string }> = {
  'OPEN': { label: 'Open', class: 'pending' },
  'ON PROGRESS': { label: 'Dalam Proses', class: 'verified' },
  'CLOSED': { label: 'Selesai', class: 'completed' }
};

export function CategoryDetailContent() {
  const searchParams = useSearchParams();
  const range = searchParams.get('range') || '7d';
  const categoryName = searchParams.get('name');
  
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = categoryName 
        ? `/api/embed/reports?range=${range}&category=${encodeURIComponent(categoryName)}`
        : `/api/embed/reports?range=${range}`;
      const res = await fetch(url);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [range, categoryName]);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  if (loading && !data) {
    return <div className="embed-loading"><div className="embed-spinner" /></div>;
  }
  
  // Aggregate by category
  const catMap = new Map<string, number>();
  const areaMap = new Map<string, number>();
  for (const r of data?.reports || []) {
    const cat = r.main_category || 'Unknown';
    const area = r.area || 'Unknown';
    catMap.set(cat, (catMap.get(cat) || 0) + 1);
    areaMap.set(area, (areaMap.get(area) || 0) + 1);
  }
  
  const catBarData = Array.from(catMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  const areaPieData = Array.from(areaMap.entries())
    .map(([name, value]) => ({ name, value }));
  
  const title = categoryName ? `Detail: ${categoryName}` : 'Distribusi per Kategori';
  
  return (
    <>
      <Link href={`/embed/overview?range=${range}`} className="back-link">← Kembali ke Overview</Link>
      
      <header className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{data?.summary.total || 0} laporan</p>
      </header>
      
      <DateRangeFilter />
      
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{data?.summary.total || 0}</div>
          <div className="kpi-label">Total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{catMap.size}</div>
          <div className="kpi-label">Jenis Kategori</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{data?.summary.bySeverity?.high || 0}</div>
          <div className="kpi-label">High Severity</div>
        </div>
      </div>
      
      <div className="embed-grid embed-grid-2">
        <EmbedCard title="Per Kategori">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="count" fill="#a78bfa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </EmbedCard>
        
        <EmbedCard title="Per Area">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={areaPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {areaPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </EmbedCard>
      </div>
      
      <EmbedCard title="Daftar Laporan" className="mt-6">
        <div className="embed-table-container">
          <table className="embed-table">
            <thead>
              <tr><th>Tanggal</th><th>Judul</th><th>Kategori</th><th>Area</th><th>Status</th><th>Severity</th></tr>
            </thead>
            <tbody>
              {(data?.reports || []).slice(0, 50).map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                  <td>{r.title}</td>
                  <td>{r.main_category || '-'}</td>
                  <td>{r.area || '-'}</td>
                  <td><span className={`status-badge ${STATUS_MAP[r.status]?.class || ''}`}>{STATUS_MAP[r.status]?.label || r.status}</span></td>
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
