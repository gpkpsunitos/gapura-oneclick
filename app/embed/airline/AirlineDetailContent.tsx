'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DateRangeFilter } from '@/components/embed/DateRangeFilter';
import { EmbedCard } from '@/components/embed/EmbedCard';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

interface Report {
  id: string;
  title: string;
  status: string;
  severity: string;
  airline: string | null;
  main_category: string | null;
  area: string | null;
  incident_date: string | null;
  created_at: string;
}

interface ReportsResponse {
  range: string;
  summary: {
    total: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  reports: Report[];
}

const CHART_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#2dd4bf'];

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  'OPEN': { label: 'Open', class: 'pending' },
  'ON PROGRESS': { label: 'Dalam Proses', class: 'verified' },
  'CLOSED': { label: 'Selesai', class: 'completed' }
};

const SEVERITY_MAP: Record<string, string> = {
  'low': 'low',
  'medium': 'medium', 
  'high': 'high'
};

export function AirlineDetailContent() {
  const searchParams = useSearchParams();
  const range = searchParams.get('range') || '7d';
  const airlineName = searchParams.get('name');
  
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = airlineName 
        ? `/api/embed/reports?range=${range}&airline=${encodeURIComponent(airlineName)}`
        : `/api/embed/reports?range=${range}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [range, airlineName]);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  if (loading && !data) {
    return (
      <div className="embed-loading">
        <div className="embed-spinner" />
      </div>
    );
  }
  
  // Aggregate by airline if no filter
  const airlineAggregation = new Map<string, number>();
  const categoryAggregation = new Map<string, number>();
  
  for (const r of data?.reports || []) {
    const airline = r.airline || 'Unknown';
    const category = r.main_category || 'Unknown';
    airlineAggregation.set(airline, (airlineAggregation.get(airline) || 0) + 1);
    categoryAggregation.set(category, (categoryAggregation.get(category) || 0) + 1);
  }
  
  const pieData = Array.from(airlineAggregation.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  
  const categoryBarData = Array.from(categoryAggregation.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  const title = airlineName ? `Detail: ${airlineName}` : 'Distribusi per Airline';
  
  return (
    <>
      <Link href={`/embed/overview?range=${range}`} className="back-link">
        ← Kembali ke Overview
      </Link>
      
      <header className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{data?.summary.total || 0} laporan dalam {range === '7d' ? '7 hari' : '30 hari'} terakhir</p>
      </header>
      
      <DateRangeFilter />
      
      {/* KPI */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{data?.summary.total || 0}</div>
          <div className="kpi-label">Total Laporan</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{pieData.length}</div>
          <div className="kpi-label">Jumlah Airline</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{data?.summary.bySeverity?.high || 0}</div>
          <div className="kpi-label">High Severity</div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="embed-grid embed-grid-2">
        <EmbedCard title="Distribusi Airline" subtitle="Berdasarkan jumlah laporan">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name?.substring(0, 8)}: ${value}`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </EmbedCard>
        
        <EmbedCard title="Per Kategori" subtitle="Breakdown kategori laporan">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} layout="vertical">
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
      
      {/* Table */}
      <EmbedCard title="Daftar Laporan" subtitle="Data detail per laporan" className="mt-6">
        <div className="embed-table-container">
          <table className="embed-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Airline</th>
                <th>Judul</th>
                <th>Kategori</th>
                <th>Status</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {(data?.reports || []).slice(0, 50).map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                  <td>{r.airline || '-'}</td>
                  <td>{r.title}</td>
                  <td>{r.main_category || '-'}</td>
                  <td>
                    <span className={`status-badge ${STATUS_MAP[r.status]?.class || ''}`}>
                      {STATUS_MAP[r.status]?.label || r.status}
                    </span>
                  </td>
                  <td>
                    <span className={`severity-badge ${SEVERITY_MAP[r.severity] || ''}`}>
                      {r.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EmbedCard>
    </>
  );
}
