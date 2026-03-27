'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { DateRangeFilter } from '@/components/embed/DateRangeFilter';
import { EmbedCard } from '@/components/embed/EmbedCard';
import Link from 'next/link';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Area, AreaChart
} from 'recharts';

interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
}

interface StatsData {
  type: string;
  range: string;
  totalCount: number;
  distribution: DistributionItem[];
  trendData: { date: string; count: number }[];
}

const CHART_COLORS = [
  '#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171',
  '#2dd4bf', '#f472b6', '#818cf8', '#fb923c', '#4ade80'
];
const FIXED_DONUT_RANK_COLORS = ['#81c784', '#13b5cb', '#cddc39'];

const STATUS_MAP: Record<string, string> = {
  'OPEN': 'Open',
  'ON PROGRESS': 'Dalam Proses',
  'CLOSED': 'Selesai'
};

export function OverviewContent() {
  const searchParams = useSearchParams();
  const range = searchParams.get('range') || '7d';
  
  const [airlineData, setAirlineData] = useState<StatsData | null>(null);
  const [categoryData, setCategoryData] = useState<StatsData | null>(null);
  const [statusData, setStatusData] = useState<StatsData | null>(null);
  const [severityData, setSeverityData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [airline, category, status, severity] = await Promise.all([
        fetch(`/api/embed/stats?type=airline&range=${range}`).then(r => r.json()),
        fetch(`/api/embed/stats?type=category&range=${range}`).then(r => r.json()),
        fetch(`/api/embed/stats?type=status&range=${range}`).then(r => r.json()),
        fetch(`/api/embed/stats?type=severity&range=${range}`).then(r => r.json())
      ]);
      
      setAirlineData(airline);
      setCategoryData(category);
      setStatusData(status);
      setSeverityData(severity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [range]);
  
  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  if (loading && !airlineData) {
    return (
      <div className="embed-loading">
        <div className="embed-spinner" />
        <p style={{ marginTop: '1rem' }}>Memuat data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="embed-error">
        <p>Error: {error}</p>
        <button onClick={fetchData} className="date-filter-btn" style={{ marginTop: '1rem' }}>
          Coba Lagi
        </button>
      </div>
    );
  }
  
  const totalReports = airlineData?.totalCount || 0;
  const statusCounts = statusData?.distribution || [];
  const pendingCount = statusCounts.find(s => s.name === 'OPEN')?.count || 0;
  const completedCount = statusCounts.find(s => s.name === 'CLOSED')?.count || 0;
  const severityCounts = severityData?.distribution || [];
  const highSeverity = severityCounts.find(s => s.name === 'high')?.count || 0;
  const statusDonutData = [...(statusData?.distribution || [])]
    .map((s) => ({ ...s, name: STATUS_MAP[s.name] || s.name }))
    .sort((a, b) => b.count - a.count);
  
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">Ringkasan laporan {range === '7d' ? '7 hari' : '30 hari'} terakhir</p>
      </header>
      
      <DateRangeFilter />
      
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{totalReports}</div>
          <div className="kpi-label">Total Laporan</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{pendingCount}</div>
          <div className="kpi-label">Menunggu Feedback</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{completedCount}</div>
          <div className="kpi-label">Selesai</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: highSeverity > 0 ? '#ef4444' : undefined }}>{highSeverity}</div>
          <div className="kpi-label">High Severity</div>
        </div>
      </div>
      
      {/* Trend Chart */}
      <EmbedCard title="Trend Laporan" subtitle="Jumlah laporan per hari">
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={airlineData?.trendData || []}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Area type="monotone" dataKey="count" stroke="#60a5fa" fillOpacity={1} fill="url(#trendGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </EmbedCard>
      
      {/* Charts Grid */}
      <div className="embed-grid embed-grid-2" style={{ marginTop: '1.5rem' }}>
        {/* Airline Distribution */}
        <Link href={`/embed/airline?range=${range}`} style={{ textDecoration: 'none' }}>
          <EmbedCard title="Per Airline" subtitle="Klik untuk detail">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={airlineData?.distribution.slice(0, 6) || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name?.substring(0, 10) || 'N/A'}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="count"
                  >
                    {(airlineData?.distribution || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </EmbedCard>
        </Link>
        
        {/* Category Distribution */}
        <Link href={`/embed/category?range=${range}`} style={{ textDecoration: 'none' }}>
          <EmbedCard title="Per Kategori" subtitle="Klik untuk detail">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData?.distribution || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}
                  />
                  <Bar dataKey="count" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </EmbedCard>
        </Link>
        
        {/* Status Distribution */}
        <Link href={`/embed/status?range=${range}`} style={{ textDecoration: 'none' }}>
          <EmbedCard title="Per Status" subtitle="Klik untuk detail">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="count"
                    label={({ name, value }: { name?: string; value?: number }) => `${name}: ${Number(value || 0).toLocaleString('id-ID')}`}
                  >
                    {statusDonutData.map((_, index) => {
                      const fill = index < FIXED_DONUT_RANK_COLORS.length
                        ? FIXED_DONUT_RANK_COLORS[index]
                        : CHART_COLORS[(index - FIXED_DONUT_RANK_COLORS.length) % CHART_COLORS.length];
                      return <Cell key={`status-donut-${index}`} fill={fill} />;
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </EmbedCard>
        </Link>
        
        {/* Severity Distribution */}
        <Link href={`/embed/severity?range=${range}`} style={{ textDecoration: 'none' }}>
          <EmbedCard title="Per Severity" subtitle="Klik untuk detail">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData?.distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(severityData?.distribution || []).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.name === 'high' ? '#ef4444' : entry.name === 'medium' ? '#fbbf24' : '#22c55e'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </EmbedCard>
        </Link>
      </div>
    </>
  );
}
