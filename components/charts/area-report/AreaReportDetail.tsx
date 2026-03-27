'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  fetchAreaSummary,
  fetchMonthlyTrendByArea,
  fetchCategoryByArea,
  fetchRootCauseByArea,
  fetchBranchByArea,
  fetchAirlineByArea,
  fetchAllAreaReports,
  fetchCellIntelligence,
  fetchBranchAreaPareto,
  fetchAggregatedAreaReport, // Add this
  AreaSummary,
  TrendDataPoint,
  AreaCategoryData,
  RootCauseByAreaData,
  BranchByAreaData,
  AirlineByAreaData,
  AreaReportRecord,
  CellIntelligence,
  BranchAreaPareto,
  SeverityDistribution,
} from './data';
import {
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
  Bar as RechartsBar
} from 'recharts';
import { fetchSeverityDistributionsAi, fetchRiskSummaryAi, AiRiskSummary } from '@/lib/services/gapura-ai';
import { useSearchParams } from 'next/navigation';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { ArrowUp, ArrowDown, Minus, Download, Filter, Zap } from 'lucide-react';
import { saveAs } from 'file-saver';
import { InvestigativeTable } from '@/components/chart-detail/InvestigativeTable';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';
import { AiRootCauseInvestigation } from '../ai-root-cause/AiRootCauseInvestigation';
import { motion } from 'framer-motion';
import type { QueryResult } from '@/types/builder';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FilterParams {
  hub?: string;
  branch?: string;
  airlines?: string;
  area?: string;
  sourceSheet?: string;
  dateFrom?: string;
  dateTo?: string;
  pageIndex?: number;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'orange';
  // Optional short explanation for readers (aimed at non-technical audiences)
  explanation?: string;
}

function KPICard({ title, value, subtitle, trend, color = 'blue', explanation }: KPICardProps) {
  const colorClasses = {
    green: 'bg-[var(--brand-emerald-50)] border-[oklch(0.9_0.02_160)] text-[var(--brand-emerald-700)] shadow-[0_4px_12px_oklch(0.65_0.18_160/0.05)]',
    red: 'bg-[oklch(0.98_0.02_25)] border-[oklch(0.9_0.05_25)] text-[oklch(0.45_0.2_25)] shadow-[0_4px_12px_oklch(0.6_0.22_25/0.05)]',
    yellow: 'bg-[oklch(0.98_0.03_75)] border-[oklch(0.9_0.06_75)] text-[oklch(0.5_0.16_75)] shadow-[0_4px_12px_oklch(0.75_0.16_75/0.05)]',
    blue: 'bg-[oklch(0.98_0.01_250)] border-[oklch(0.9_0.04_250)] text-[oklch(0.45_0.15_250)] shadow-[0_4px_12px_oklch(0.6_0.15_250/0.05)]',
    orange: 'bg-[oklch(0.98_0.04_45)] border-[oklch(0.9_0.08_45)] text-[oklch(0.55_0.2_45)] shadow-[0_4px_12px_oklch(0.65_0.25_45/0.05)]',
  };

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`relative overflow-hidden p-5 rounded-prism border ${colorClasses[color]} transition-all duration-300 isolate group`}
    >
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      <div className="absolute -inset-24 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1.5">{title}</div>
        <div className="text-3xl font-display font-black tracking-tighter leading-none mb-1">{value}</div>
        {subtitle && <div className="text-xs font-semibold opacity-75 mt-2">{subtitle}</div>}
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold mt-3 opacity-90 bg-white/40 w-fit px-2 py-1 rounded-md backdrop-blur-sm border border-white/20">
            {trend > 0 ? <ArrowUp size={12} /> : trend < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
            <span>{Math.abs(trend).toFixed(1)}% MoM</span>
          </div>
        )}
        {explanation && (
          <div className="text-xs font-medium opacity-70 mt-3 pt-3 border-t border-black/5 leading-relaxed">
            {explanation}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AutoInsight({ data }: { data: AreaSummary[] }) {
  if (data.length === 0) return null;

  const topArea = data[0];
  const highRiskAreas = data.filter(a => a.riskIndex >= 50);
  const totalReports = data.reduce((s, a) => s + a.total, 0);
  const totalIrreg = data.reduce((s, a) => s + a.irregularity, 0);
  const overallIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;

  const insightParts: string[] = [];
  if (highRiskAreas.length > 0) {
    insightParts.push(`${highRiskAreas.length} area${highRiskAreas.length > 1 ? 's' : ''} flagged as high risk (${highRiskAreas.slice(0, 3).map(a => a.area).join(', ')}${highRiskAreas.length > 3 ? '...' : ''})`);
  }
  insightParts.push(`${topArea.area} leads with ${topArea.total} reports (${topArea.contribution.toFixed(1)}% share)`);
  insightParts.push(`Overall irregularity rate is ${overallIrregRate.toFixed(1)}% across ${data.length} areas`);

  const mainInsight = highRiskAreas.length > 0
    ? `Action required: ${highRiskAreas.length} areas identified with high operational risk.`
    : `Operational stability: All areas currently below high-risk thresholds.`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative overflow-hidden bg-gradient-to-r from-[oklch(0.98_0.03_75)] to-[oklch(0.96_0.04_45)] border border-[oklch(0.9_0.06_75)] rounded-prism p-6 shadow-spatial-sm isolate group mb-8"
    >
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      <div className="absolute right-0 top-0 w-64 h-64 bg-white/40 blur-3xl -translate-y-1/2 translate-x-1/3 rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex-shrink-0 bg-white/60 p-3 rounded-2xl border border-white shadow-inner-rim">
          <Zap size={24} className="text-[var(--accent-amber)]" />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[oklch(0.5_0.16_75)] mb-2">Auto-Insight</h3>
          <p className="text-base font-display font-semibold text-[var(--text-primary)] mb-4 leading-snug text-balance">{mainInsight}</p>
          <ul className="grid sm:grid-cols-2 gap-3">
            {insightParts.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm font-medium text-[var(--text-secondary)] bg-white/40 rounded-lg px-3 py-2 border border-white/50 shadow-sm">
                <span className="text-[var(--accent-amber)] mt-0.5 animate-pulse">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

function AreaRankTable({ data }: { data: AreaSummary[] }) {
  const getRiskLevel = (riskIndex: number) => {
    if (riskIndex >= 50) return { label: 'High', color: 'bg-red-500' };
    if (riskIndex >= 20) return { label: 'Medium', color: 'bg-orange-500' };
    return { label: 'Low', color: 'bg-green-500' };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Rank</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Area</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Irreg.</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Complaint</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Compliment</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Irreg. Rate</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Net Sentiment</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">Risk</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 15).map((area) => {
            const risk = getRiskLevel(area.riskIndex);
            return (
              <tr key={area.area} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-bold text-gray-700">#{area.rank}</td>
                <td className="px-3 py-2 font-semibold text-gray-900">{area.area}</td>
                <td className="px-3 py-2 text-right font-medium">{area.total.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 text-right text-red-600">{area.irregularity}</td>
                <td className="px-3 py-2 text-right text-orange-600">{area.complaint}</td>
                <td className="px-3 py-2 text-right text-green-600">{area.compliment}</td>
                <td className="px-3 py-2 text-right">{area.irregularityRate.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">{area.netSentiment > 0 ? '+' : ''}{area.netSentiment.toFixed(1)}%</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${risk.color}`}>{risk.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyTrendChart({ data }: { data: TrendDataPoint[] }) {
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Total',
        data: data.map(d => d.total),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Irregularity',
        data: data.map(d => d.Irregularity),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Complaint',
        data: data.map(d => d.Complaint),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { usePointStyle: true, padding: 20, font: { size: 11 } },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[250px]"><Line data={chartData} options={options} /></div>;
}

function CategoryStackedBar({ data }: { data: AreaCategoryData[] }) {
  const chartData = {
    labels: data.slice(0, 10).map(d => d.area.split(' ')),
    datasets: [
      { label: 'Irregularity', data: data.slice(0, 10).map(d => d.Irregularity), backgroundColor: '#ef4444', borderRadius: 4 },
      { label: 'Complaint', data: data.slice(0, 10).map(d => d.Complaint), backgroundColor: '#f97316', borderRadius: 4 },
      { label: 'Compliment', data: data.slice(0, 10).map(d => d.Compliment), backgroundColor: '#22c55e', borderRadius: 4 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x' as const,
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 15, font: { size: 10 } } },
    },
    scales: {
      x: { stacked: false, grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 } },
      y: { stacked: false, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} /></div>;
}


function BranchBreakdownChart({ data }: { data: BranchByAreaData[] }) {
  const topBranches = Array.from(
    data.reduce((acc, curr) => {
      const existing = acc.get(curr.branch) || 0;
      acc.set(curr.branch, existing + curr.count);
      return acc;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const chartData = {
    labels: topBranches.map(([branch]) => branch.split(' ')),
    datasets: [
      {
        label: 'Reports',
        data: topBranches.map(([, count]) => count),
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} /></div>;
}

function AirlineBreakdownChart({ data }: { data: AirlineByAreaData[] }) {
  const topAirlines = Array.from(
    data.reduce((acc, curr) => {
      const existing = acc.get(curr.airline) || 0;
      acc.set(curr.airline, existing + curr.count);
      return acc;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const chartData = {
    labels: topAirlines.map(([airline]) => airline.split(' ')),
    datasets: [
      {
        label: 'Reports',
        data: topAirlines.map(([, count]) => count),
        backgroundColor: ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#6366f1', '#f43f5e', '#14b8a6', '#a855f7', '#eab308'],
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[200px]"><Bar data={chartData} options={options} /></div>;
}

function DataTable({ data }: { data: AreaReportRecord[] }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('Date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-gray-500">No data available</div>;
  }

  const columns = Object.keys(data[0]);

  const filteredData = data
    .filter(row => {
      const matchesSearch = search === '' ||
        columns.some(col => String(row[col]).toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' ||
        String(row.Category)?.toLowerCase() === categoryFilter.toLowerCase();
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aVal = a[sortField] as string | number;
      const bVal = b[sortField] as string | number;
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    const headers = columns.join(',');
    const rows = filteredData.map(row =>
      columns.map(col => {
        const cell = row[col];
        return typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell;
      }).join(',')
    ).join('\n');
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'area-report.csv');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e3d]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="all">All Categories</option>
          <option value="Irregularity">Irregularity</option>
          <option value="Complaint">Complaint</option>
          <option value="Compliment">Compliment</option>
        </select>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[#6b8e3d] text-white rounded-lg text-sm font-medium"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th key={col} onClick={() => handleSort(col)} className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">
                    {col}
                    {sortField === col && <span className="text-[#6b8e3d]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                {columns.map(col => (
                  col === 'Evidence' ? (
                    <td key={col} className="px-4 py-2.5 text-gray-700" dangerouslySetInnerHTML={{ __html: row[col] as string || '-' }} />
                  ) : (
                    <td key={col} className="px-4 py-2.5 text-gray-700">{row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}</td>
                  )
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="p-3 flex items-center justify-between bg-gray-50 border-t">
            <div className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} rows
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ManagementSummary({ data }: { data: AreaSummary[] }) {
  if (data.length === 0) return null;

  const topArea = data[0];
  const highRiskCount = data.filter(a => a.riskIndex >= 50).length;
  const areasWithIrreg = data.filter(a => a.irregularity > 0).length;
  const totalIrreg = data.reduce((sum, a) => sum + a.irregularity, 0);
  const totalReports = data.reduce((sum, a) => sum + a.total, 0);
  const avgIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;

  const insights = [
    `${topArea.area} leads with ${topArea.total} reports (${topArea.contribution.toFixed(1)}% of total).`,
    `${areasWithIrreg} of ${data.length} areas have irregularity reports.`,
    `${highRiskCount} area${highRiskCount !== 1 ? 's' : ''} identified as high risk.`,
    `Average irregularity rate across areas: ${avgIrregRate.toFixed(1)}%.`,
    `Total volume: ${totalReports.toLocaleString('id-ID')} reports across ${data.length} areas.`,
  ];

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="relative overflow-hidden bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-1)] border border-[oklch(0.92_0.01_250/0.8)] rounded-prism p-6 shadow-spatial-sm isolate group"
    >
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--brand-emerald-600)] mb-4 flex items-center gap-2">
        <span>📍</span> Management Summary
      </h3>
      <ul className="grid sm:grid-cols-2 gap-4">
        {insights.map((insight, idx) => (
          <li key={idx} className="flex items-start gap-3 bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-white shadow-[var(--inner-rim)] transition-colors hover:bg-white/80">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--brand-emerald-50)] text-[var(--brand-emerald-600)] flex items-center justify-center text-[10px] font-bold">
              0{idx + 1}
            </span>
            <span className="text-sm font-medium text-[var(--text-secondary)] leading-snug">
              {insight}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function SeverityDistributionChart({ data, aiData }: { data: SeverityDistribution[]; aiData?: SeverityDistribution[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#6b7280' }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#6b7280' }}
          />
          <RechartsTooltip 
            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <RechartsLegend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: '20px' }} />
          <RechartsBar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" />
          <RechartsBar dataKey="high" stackId="a" fill="#f97316" name="High" />
          <RechartsBar dataKey="medium" stackId="a" fill="#eab308" name="Medium" />
          <RechartsBar dataKey="low" stackId="a" fill="#22c55e" name="Low" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AreaReportDetail({ filters = {} }: { filters?: FilterParams }) {
  const searchParams = useSearchParams();
  const focusedBranch = searchParams.get('branch');
  const focusedArea = searchParams.get('area');
  const isFocused = !!focusedBranch && !!focusedArea;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaData, setAreaData] = useState<AreaSummary[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<AreaCategoryData[]>([]);
  const [rootCauseData, setRootCauseData] = useState<RootCauseByAreaData[]>([]);
  const [branchData, setBranchData] = useState<BranchByAreaData[]>([]);
  const [airlineData, setAirlineData] = useState<AirlineByAreaData[]>([]);
  const [tableData, setTableData] = useState<AreaReportRecord[]>([]);
  
  // Focused Mode state
  const [cellIntel, setCellIntel] = useState<CellIntelligence | null>(null);
  const [paretoData, setParetoData] = useState<BranchAreaPareto[]>([]);
  const [riskSummary, setRiskSummary] = useState<AiRiskSummary | null>(null);
  const [riskSummaryLoading, setRiskSummaryLoading] = useState(false);
  const [riskSummaryError, setRiskSummaryError] = useState<string | null>(null);
  const [aiSeverityArea, setAiSeverityArea] = useState<SeverityDistribution[]>([]);
  const [aiSeverityCategory, setAiSeverityCategory] = useState<SeverityDistribution[]>([]);
  const [aiSeverityBranch, setAiSeverityBranch] = useState<SeverityDistribution[]>([]);
  const [aiSeverityAirline, setAiSeverityAirline] = useState<SeverityDistribution[]>([]);
  // Root Cause logic moved to AiRootCauseInvestigation component

  const investigativeData: QueryResult = useMemo(() => {
    const rows = tableData as unknown as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [tableData]);
  const fullTableData: QueryResult = useMemo(() => {
    const rows = areaData.map(item => ({ ...item })) as unknown as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [areaData]);

  const [tableLoading, setTableLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function loadAggregatedData() {
      setLoading(true);
      setError(null);

      const activeFilters: any = { 
        ...filters, 
        branch: focusedBranch || (filters as any).branch,
        area: (focusedArea === 'all' || !focusedArea) ? undefined : focusedArea,
      };

      try {
        const aggregated = await fetchAggregatedAreaReport(activeFilters as any, signal);
        
        if (aggregated && aggregated.areaData) {
          setAreaData(aggregated.areaData);
          setTrendData(aggregated.trendData || []);
          setCategoryData(aggregated.categoryData || []);
        } else {
          throw new Error('Invalid aggregated area data');
        }

        // Load AI data separately
        fetchSeverityDistributionsAi(signal).then(aiSeverity => {
          if (aiSeverity) {
            if (aiSeverity.area) setAiSeverityArea(aiSeverity.area.map((r: any) => ({ name: r.name, critical: r.critical, high: r.high, medium: r.medium, low: r.low })) as SeverityDistribution[]);
            if (aiSeverity.category) setAiSeverityCategory(aiSeverity.category.map((r: any) => ({ name: r.name, critical: r.critical, high: r.high, medium: r.medium, low: r.low })) as SeverityDistribution[]);
            if (aiSeverity.branch) setAiSeverityBranch(aiSeverity.branch.map((r: any) => ({ name: r.name, critical: r.critical, high: r.high, medium: r.medium, low: r.low })) as SeverityDistribution[]);
            if (aiSeverity.airline) setAiSeverityAirline(aiSeverity.airline.map((r: any) => ({ name: r.name, critical: r.critical, high: r.high, medium: r.medium, low: r.low })) as SeverityDistribution[]);
          }
        }).catch(err => {
          if (err.name === 'AbortError') return;
          console.warn('AI Severity failed:', err);
        });

        fetchRiskSummaryAi(signal).then(res => {
          if (res) setRiskSummary(res);
        }).catch(err => {
          if (err.name === 'AbortError') return;
          console.warn('AI Risk failed:', err);
        });
        
        if (isFocused) {
          fetchCellIntelligence(focusedBranch!, focusedArea!, activeFilters as any, signal).then(setCellIntel);
          fetchBranchAreaPareto(activeFilters as any, signal).then(setParetoData);
        }
      } catch (err) {
        if ((err as any).name === 'AbortError') return;
        console.error('Failed to load aggregated area data:', err);
        setError('Failed to load primary chart data.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAggregatedData();

    return () => {
      controller.abort();
    };
  }, [filters.hub, filters.branch, filters.airlines, filters.area, filters.dateFrom, filters.dateTo, focusedBranch, focusedArea, isFocused]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function loadDeferredData() {
      setTableLoading(true);
      const activeFilters: any = { 
        ...filters, 
        branch: focusedBranch || (filters as any).branch,
        area: (focusedArea === 'all' || !focusedArea) ? undefined : focusedArea,
      };

      try {
        const [rootCause, branch, airline, table] = await Promise.all([
          fetchRootCauseByArea(activeFilters as any),
          fetchBranchByArea(activeFilters as any),
          fetchAirlineByArea(activeFilters as any),
          fetchAllAreaReports(activeFilters as any),
        ]);
        setRootCauseData(rootCause);
        setBranchData(branch);
        setAirlineData(airline);
        setTableData(table);
      } catch (err) {
        console.error('Failed to load deferred area data:', err);
      } finally {
        setTableLoading(false);
      }
    }

    loadDeferredData();
  }, [filters.hub, filters.branch, filters.airlines, filters.area, filters.dateFrom, filters.dateTo, focusedBranch, focusedArea]);


  // AI Root Cause Summary logic removed - handled by AiRootCauseInvestigation component

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6b8e3d]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️ {error}</div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#6b8e3d] text-white rounded-lg text-sm font-medium">Retry</button>
        </div>
      </div>
    );
  }

  const totalReports = areaData.reduce((sum: number, a: any) => sum + a.total, 0);
  const totalIrreg = areaData.reduce((sum: number, a: any) => sum + a.irregularity, 0);
  const totalComplaint = areaData.reduce((sum: number, a: any) => sum + a.complaint, 0);
  const totalCompliment = areaData.reduce((sum: number, a: any) => sum + a.compliment, 0);

  const overallIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;
  const overallNetSentiment = (totalCompliment + totalComplaint) > 0 
    ? ((totalCompliment - totalComplaint) / (totalCompliment + totalComplaint)) * 100 
    : 0;

  const areasWithIrreg = areaData.filter(a => a.irregularity > 0).length;
  const topArea = areaData.length > 0 ? areaData[0].area : '-';

  return (
    <div className="space-y-8">
      {isFocused && (
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-black rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-white/10 mb-10 transition-all">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Zap size={240} strokeWidth={0.5} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <button 
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.delete('branch');
                    params.delete('area');
                    window.location.href = `/dashboard/charts/area-report/detail?${params.toString()}`;
                  }}
                  className="text-xs font-bold uppercase tracking-widest text-indigo-300 hover:text-white transition-colors flex items-center gap-2 mb-2"
                >
                  <ArrowUp className="-rotate-90" size={14} /> Back to Hub Overview
                </button>
                <h1 className="text-4xl font-black tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                  {focusedArea === 'all' ? `All Areas in ${focusedBranch}` : `${focusedArea} • ${focusedBranch}`}
                </h1>
                <p className="text-gray-400 font-medium text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Intelligence Node Active • Perfect Version v3.0
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10 text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Global Risk Index</div>
                <div className="text-3xl font-black text-white leading-none">
                  {cellIntel?.riskScore.toFixed(0) || '0'}
                  <span className="text-sm font-bold text-white/40 ml-1">/100</span>
                </div>
              </div>
            </div>

            {/* Core Intelligence Hero Panel (9 Sections integrated into layout) */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: 'Total Volume', val: cellIntel?.count || 0, color: 'text-white' },
                { label: 'Area Rank', val: `#${cellIntel?.rank || '?'}`, color: 'text-indigo-300 font-bold' },
                { label: 'Growth MoM', val: `${cellIntel?.momGrowth.toFixed(1)}%`, color: cellIntel?.momGrowth! > 0 ? 'text-red-400' : 'text-emerald-400' },
                { label: 'Risk Intensity', val: cellIntel?.riskLevel || 'Low', color: (cellIntel?.riskLevel?.toUpperCase() === 'CRITICAL' || cellIntel?.riskLevel?.toUpperCase() === 'HIGH') ? 'text-red-500' : 'text-white' },
                { label: 'Contribution', val: `${cellIntel?.contribution.toFixed(1)}%`, color: 'text-white' },
                { label: 'Avg Severity', val: (cellIntel?.severityScore || 0).toFixed(1), color: 'text-white' }
              ].map((m, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/10">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">{m.label}</div>
                  <div className={`text-xl font-black ${m.color}`}>{m.val}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ranking Analysis (Pareto) */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                 <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                   <Zap size={14} className="text-amber-400" /> Area Concentration (80/20 Rule)
                 </h3>
                 <div className="h-[200px]">
                    <Bar 
                      data={{
                        labels: paretoData.map(d => d.branch),
                        datasets: [
                          {
                            label: 'Cumulative %',
                            data: paretoData.map(d => d.cumulativePercent),
                            type: 'line' as any,
                            borderColor: '#818cf8',
                            borderWidth: 2,
                            fill: false,
                            yAxisID: 'y1'
                          } as any,
                          {
                            label: 'Reports',
                            data: paretoData.map(d => d.count),
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 4,
                            yAxisID: 'y'
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9 } } } as any,
                          y1: { position: 'right', min: 0, max: 100, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9 } } } as any,
                          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 9 } } } as any
                        }
                      }}
                    />
                 </div>
              </div>

              {/* Monthly Velocity Trend */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                 <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                   <ArrowUp size={14} className="text-indigo-400" /> Velocity & Acceleration
                 </h3>
                 <div className="h-[200px]">
                    <Line 
                      data={{
                        labels: trendData.map(d => d.month),
                        datasets: [{
                          label: 'Reports',
                          data: trendData.map(d => d.total),
                          borderColor: '#22d3ee',
                          backgroundColor: 'rgba(34, 211, 238, 0.1)',
                          fill: true,
                          tension: 0.4
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9 } } },
                          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 9 } } }
                        }
                      }}
                    />
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isFocused && <AutoInsight data={areaData} />}

      {/* KPI Cards (General Mode or Focused Subset) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title={isFocused ? "Focused Volume" : "Total Reports"}
          value={totalReports.toLocaleString('id-ID')}
          color="blue"
          explanation="Total laporan area yang dianalisis dalam chart ini."
        />
        <KPICard
          title={isFocused ? "Area Risk Index" : "Overall Irreg. Rate"}
          value={isFocused ? (cellIntel?.riskScore.toFixed(0) || '0') : `${overallIrregRate.toFixed(1)}%`}
          color={isFocused ? (cellIntel?.riskLevel?.toUpperCase() === 'CRITICAL' || cellIntel?.riskLevel?.toUpperCase() === 'HIGH' ? 'red' : 'blue') : (overallIrregRate >= 5 ? 'red' : 'green')}
          explanation={isFocused ? 'Nilai risiko area pada fokus ini (skor 0-100).' : 'Rasio laporan irregularitas terhadap total laporan.'}
        />
        <KPICard
          title="Net Sentiment"
          value={`${overallNetSentiment >= 0 ? '+' : ''}${overallNetSentiment.toFixed(1)}%`}
          color={overallNetSentiment > 0 ? 'green' : 'red'}
          explanation="Selisih antara jumlah ulasan positif (compliment) dan negatif (complaint) secara keseluruhan."
        />
        <KPICard
          title={isFocused ? "Area Rank" : "Top Area"}
          value={isFocused ? `#${cellIntel?.rank || '?'}` : topArea}
          subtitle={!isFocused && areaData.length > 0 ? `${areaData[0].total} reports` : undefined}
          color="orange"
          explanation={isFocused ? 'Rank area saat ini berdasarkan ukuran risiko/kontribusi.' : 'Area dengan kontribusi laporan tertinggi.'}
        />
      </div>

      {/* Area Ranking Table */}
      {!isFocused && (
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Area Performance Ranking</h2>
          <AreaRankTable data={areaData} />
        </section>
      )}

      {/* AI Risk Summary (overview) */}
      {riskSummaryLoading && (
        <div className="text-sm text-gray-600">Loading AI risk summary...</div>
      )}
      {riskSummary && (
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-2">AI Risk Summary</h2>
          {riskSummary.last_updated && (
            <div className="text-xs text-gray-500 mb-3">Last updated: {riskSummary.last_updated}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-2 border rounded">Top Airlines: {riskSummary.top_risky_airlines?.slice(0,5).join(', ') || 'N/A'}</div>
            <div className="p-2 border rounded">Top Branches: {riskSummary.top_risky_branches?.slice(0,5).join(', ') || 'N/A'}</div>
            <div className="p-2 border rounded">Totals: Airlines {riskSummary.total_airlines} • Branches {riskSummary.total_branches} • Hubs {riskSummary.total_hubs}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SeverityDistributionChart data={[{
              name: 'Airlines',
              critical: riskSummary.airline_risks?.Critical ?? 0,
              high: riskSummary.airline_risks?.High ?? 0,
              medium: riskSummary.airline_risks?.Medium ?? 0,
              low: riskSummary.airline_risks?.Low ?? 0,
            }]} />
            <SeverityDistributionChart data={[{
              name: 'Branches',
              critical: riskSummary.branch_risks?.Critical ?? 0,
              high: riskSummary.branch_risks?.High ?? 0,
              medium: riskSummary.branch_risks?.Medium ?? 0,
              low: riskSummary.branch_risks?.Low ?? 0,
            }]} />
            <SeverityDistributionChart data={[{
              name: 'Hubs',
              critical: riskSummary.hub_risks?.Critical ?? 0,
              high: riskSummary.hub_risks?.High ?? 0,
              medium: riskSummary.hub_risks?.Medium ?? 0,
              low: riskSummary.hub_risks?.Low ?? 0,
            }]} />
          </div>
        </section>
      )}
      {riskSummaryError && <div className="text-sm text-red-600">{riskSummaryError}</div>}

      {/* AI-driven Severity Distributions by Dimension */}
      {aiSeverityArea.length > 0 && (
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">AI Severity Distribution by Area</h2>
          <SeverityDistributionChart data={aiSeverityArea} />
        </section>
      )}
      {aiSeverityCategory.length > 0 && (
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">AI Severity Distribution by Category</h2>
          <SeverityDistributionChart data={aiSeverityCategory} />
        </section>
      )}
      {aiSeverityBranch.length > 0 && (
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">AI Severity Distribution by Branch</h2>
          <SeverityDistributionChart data={aiSeverityBranch} />
        </section>
      )}
      {aiSeverityAirline.length > 0 && (
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">AI Severity Distribution by Airline</h2>
          <SeverityDistributionChart data={aiSeverityAirline} />
        </section>
      )}



      {/* Monthly Trend */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{isFocused ? "Detailed Volume Trend" : "Monthly Trend Analysis"}</h2>
        <MonthlyTrendChart data={trendData} />
      </section>

      {/* Category Composition */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{isFocused ? "Focused Category Split" : "Category Composition by Area"}</h2>
        <CategoryStackedBar data={categoryData} />
      </section>

      {/* AI Root Cause Investigation - Full Width */}
      {!(isFocused && (focusedArea?.toLowerCase().includes('terminal') || focusedArea?.toLowerCase().includes('apron') || focusedArea === 'General')) && (
        <section className="relative overflow-hidden bg-[var(--surface-1)]/50 backdrop-blur-xl rounded-3xl border border-[var(--surface-2)] p-8 shadow-spatial-md transition-all">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Root Cause Analysis</h2>
              <p className="text-slate-500 text-sm font-medium">Neural investigation into operational friction points.</p>
            </div>
          </div>
          <AiRootCauseInvestigation source={filters.sourceSheet || "NON CARGO"} />
        </section>
      )}

      {/* Split View: Branch & Airline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{isFocused ? "Branch Comparisons" : "Branch Distribution by Area"}</h2>
          <BranchBreakdownChart data={branchData} />
        </section>
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{isFocused ? "Airline Impact" : "Airline Distribution by Area"}</h2>
          <AirlineBreakdownChart data={airlineData} />
        </section>
      </div>

      {/* Management Summary */}
      {!isFocused && <ManagementSummary data={areaData} />}

      {/* Investigative Table */}
      <InvestigativeTable
        data={investigativeData}
        title={isFocused ? `Intelligence Node: ${focusedArea}` : "Investigative Table - Area Reports"}
        rowsPerPage={5}
        maxRows={40}
      />

      {/* Data Table */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">{isFocused ? "Cell Records" : "Full Data Table"}</h2>
        </div>
        <div className="p-6">
          <DataTableWithPagination 
            data={fullTableData} 
            title={isFocused ? `Source Data: ${focusedBranch}::${focusedArea}` : "Area Performance (Main Chart Source)"}
            rowsPerPage={3}
          />
        </div>
      </section>
    </div>
  );
}
