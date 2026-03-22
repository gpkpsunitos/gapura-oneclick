'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  fetchBranchSummary,
  fetchMonthlyTrendByBranch,
  fetchCategoryByBranch,
  fetchRootCauseByBranch,
  fetchAirlineByBranch,
  fetchAreaByBranch,
  fetchAllBranchReports,
  fetchBranchKPIs,
  fetchBranchCategoryDistribution,
  fetchAggregatedBranchReport,
  BranchSummary,
  TrendDataPoint,
  BranchCategoryData,
  RootCauseByBranchData,
  AirlineByBranchData,
  AreaByBranchData,
  BranchReportRecord,
  BranchKPIs,
  BranchCategoryDistribution,
} from './data';
import { fetchRiskSummaryAi, AiRiskSummary, fetchBranchRiskAnalysisAi, BranchRiskAnalysis } from '@/lib/services/gapura-ai';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { barLabelsPlugin } from '../chartConfig';
import { Bar, Line } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
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
import { 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Download, 
  FileText, 
  Filter, 
  AlertTriangle, 
  Zap,
  Brain,
  BarChart3,
  Search
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { InvestigativeTable } from '@/components/chart-detail/InvestigativeTable';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';
import { AiRootCauseInvestigation } from '../ai-root-cause/AiRootCauseInvestigation';
import { BranchAIVisualization } from '@/components/chart-detail/ai/BranchAIVisualization';
import { BranchRiskAnalysisVisualization } from '@/components/chart-detail/ai/BranchRiskVisualization';
import type { QueryResult } from '@/types/builder';
import { BarChart as RechartsBarChart, Bar as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, LabelList } from 'recharts';

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
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'orange';
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

function AutoInsight({ data, hideAnalyzeButton }: { data: BranchSummary[]; hideAnalyzeButton?: boolean }) {
  if (data.length === 0) return null;

  const topBranch = data[0];
  const highRiskBranches = data.filter(b => b.riskIndex >= 50);
  const totalReports = data.reduce((s, b) => s + b.total, 0);
  const totalIrreg = data.reduce((s, b) => s + b.irregularity, 0);
  const overallIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;

  const insightParts: string[] = [];
  if (highRiskBranches.length > 0) {
    insightParts.push(`${highRiskBranches.length} branch${highRiskBranches.length > 1 ? 'es' : ''} flagged as high risk (${highRiskBranches.slice(0, 3).map(b => b.branch).join(', ')}${highRiskBranches.length > 3 ? '...' : ''})`);
  }
  insightParts.push(`${topBranch.branch} leads with ${topBranch.total} reports (${topBranch.contribution.toFixed(1)}% share)`);
  insightParts.push(`Overall irregularity rate is ${overallIrregRate.toFixed(1)}% across ${data.length} branches`);

  const mainInsight = highRiskBranches.length > 0
    ? `Action required: ${highRiskBranches.length} branches identified with high operational risk.`
    : `Operational stability: All branches currently below high-risk thresholds.`;

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
        <div className="flex-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[oklch(0.5_0.16_75)] mb-2">Auto-Insight</h3>
          <p className="text-base font-display font-semibold text-[var(--text-primary)] mb-4 leading-snug text-balance">{mainInsight}</p>
          <ul className="grid sm:grid-cols-2 gap-3 mb-4">
            {insightParts.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm font-medium text-[var(--text-secondary)] bg-white/40 rounded-lg px-3 py-2 border border-white/50 shadow-sm">
                <span className="text-[var(--accent-amber)] mt-0.5 animate-pulse">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
        {!hideAnalyzeButton && (
          <div className="flex-shrink-0 self-center">
            <button className="px-5 py-2.5 bg-[var(--brand-primary)] text-[var(--text-on-brand)] rounded-prism font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-[var(--brand-primary)]/20">
              Analyze Risk
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BranchRankTable({ data }: { data: BranchSummary[] }) {
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
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Branch</th>
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
          {data.slice(0, 15).map((branch) => {
            const risk = getRiskLevel(branch.riskIndex);
            return (
              <tr key={branch.branch} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-bold text-gray-700">#{branch.rank}</td>
                <td className="px-3 py-2 font-semibold text-gray-900">{branch.branch}</td>
                <td className="px-3 py-2 text-right font-medium">{branch.total.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 text-right text-red-600">{branch.irregularity}</td>
                <td className="px-3 py-2 text-right text-orange-600">{branch.complaint}</td>
                <td className="px-3 py-2 text-right text-green-600">{branch.compliment}</td>
                <td className="px-3 py-2 text-right">{branch.irregularityRate.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">{branch.netSentiment > 0 ? '+' : ''}{branch.netSentiment.toFixed(1)}%</td>
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
      y: { 
        grid: { color: 'rgba(0,0,0,0.05)' }, 
        ticks: { font: { size: 10 } },
        suggestedMax: data.length > 0 ? Math.max(...data.map(d => Math.max(d.Irregularity, d.Complaint))) * 1.2 : undefined
      },
    },
  };

  return <div className="h-[250px]"><Line data={chartData} options={options} plugins={[barLabelsPlugin]} /></div>;
}

function CategoryStackedBar({ data }: { data: BranchCategoryData[] }) {
  const chartData = {
    labels: data.slice(0, 10).map(d => d.branch.split(' ')),
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
      y: { 
        stacked: false, 
        grid: { color: 'rgba(0,0,0,0.05)' }, 
        ticks: { font: { size: 10 } },
        suggestedMax: data.length > 0 ? Math.max(...data.slice(0, 10).map(d => Math.max(d.Irregularity, d.Complaint, d.Compliment))) * 1.15 : undefined 
      },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} plugins={[barLabelsPlugin]} /></div>;
}


function AirlineBreakdownChart({ data }: { data: AirlineByBranchData[] }) {
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
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } },
           suggestedMax: topAirlines.length > 0 ? Math.max(...topAirlines.map(d => d[1])) * 1.15 : undefined },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} plugins={[barLabelsPlugin]} /></div>;
}

function AreaBreakdownChart({ data }: { data: AreaByBranchData[] }) {
  const areaTotals = Array.from(
    data.reduce((acc, curr) => {
      const existing = acc.get(curr.area) || 0;
      acc.set(curr.area, existing + curr.count);
      return acc;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);

  const chartData = {
    labels: areaTotals.map(([area]) => area.split(' ')),
    datasets: [
      {
        label: 'Reports',
        data: areaTotals.map(([, count]) => count),
        backgroundColor: ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899'].slice(0, areaTotals.length),
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'x' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} /></div>;
}

function DataTable({ data }: { data: BranchReportRecord[] }) {
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
    saveAs(blob, 'branch-report.csv');
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
        
        {/* Pagination */}
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

function ManagementSummary({ data }: { data: BranchSummary[] }) {
  if (data.length === 0) return null;

  const topBranch = data[0];
  const highRiskCount = data.filter(b => b.riskIndex >= 50).length;
  const totalIrreg = data.reduce((sum, b) => sum + b.irregularity, 0);
  const totalReports = data.reduce((sum, b) => sum + b.total, 0);
  const avgIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;

  const insights = [
    `${topBranch.branch} leads with ${topBranch.total} reports (${topBranch.contribution.toFixed(1)}% of total).`,
    `${highRiskCount} branch${highRiskCount !== 1 ? 'es' : ''} identified as high risk.`,
    `Average irregularity rate across branches: ${avgIrregRate.toFixed(1)}%.`,
    `Total volume: ${totalReports.toLocaleString('id-ID')} reports.`,
  ];

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="relative overflow-hidden bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-1)] border border-[oklch(0.92_0.01_250/0.8)] rounded-prism p-6 shadow-spatial-sm isolate group"
    >
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--brand-emerald-600)] mb-4 flex items-center gap-2">
        <span>🏆</span> Management Summary
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

export default function BranchReportDetail({ filters = {}, hideAnalyzeButton = false }: { filters?: FilterParams; hideAnalyzeButton?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchData, setBranchData] = useState<BranchSummary[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<BranchCategoryData[]>([]);
  const [rootCauseData, setRootCauseData] = useState<RootCauseByBranchData[]>([]);
  const [airlineData, setAirlineData] = useState<AirlineByBranchData[]>([]);
  const [areaData, setAreaData] = useState<AreaByBranchData[]>([]);
  const [tableData, setTableData] = useState<BranchReportRecord[]>([]);
  const [kpis, setKpis] = useState<BranchKPIs | null>(null);
  const [categoryDistribution, setCategoryDistribution] = useState<BranchCategoryDistribution[]>([]);
  const [aiRiskSummary, setAiRiskSummary] = useState<AiRiskSummary | null>(null);
  const [aiRiskHeatmap, setAiRiskHeatmap] = useState<any[]>([]);
  const [branchRiskAnalysis, setBranchRiskAnalysis] = useState<Record<string, BranchRiskAnalysis> | null>(null);

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
    const rows = branchData.map(item => ({ ...item })) as unknown as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [branchData]);

  // Deferred loading for heavy data
  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialData() {
      setLoading(true);
      setError(null);
      try {
        const aggregated = await fetchAggregatedBranchReport(filters);
        if (aggregated && aggregated.branchData) {
          setBranchData(aggregated.branchData);
          setTrendData(aggregated.trendData || []);
          setCategoryData((aggregated.branchData || []).map(b => ({
            branch: b.branch,
            Irregularity: b.irregularity,
            Complaint: b.complaint,
            Compliment: b.compliment
          })));
          setKpis(aggregated.kpis);
          setCategoryDistribution(aggregated.categoryDistribution || []);
        } else {
          throw new Error('Invalid aggregated data received');
        }
      } catch (err) {
        if ((err as any).name === 'AbortError') return;
        console.error('Failed to load initial branch data:', err);
        setError('Failed to load initial dashboard data.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    async function loadDeferredData() {
      setTableLoading(true);
      try {
        // Parallel fetch of non-critical data
        const [
          rootCause, 
          airline, 
          area, 
          table, 
          riskSummaryRes,
          branchRiskRes
        ] = await Promise.all([
          fetchRootCauseByBranch(filters),
          fetchAirlineByBranch(filters),
          fetchAreaByBranch(filters),
          fetchAllBranchReports(filters),
          fetchRiskSummaryAi(controller.signal).catch(() => null), // Resilient AI fetch
          fetchBranchRiskAnalysisAi(controller.signal).catch(() => null),
        ]);
 
        setRootCauseData(rootCause);
        setAirlineData(airline);
        setAreaData(area);
        setTableData(table);
        
        if (branchRiskRes) {
          setBranchRiskAnalysis(branchRiskRes);
        }

        if (riskSummaryRes) {
          setAiRiskSummary(riskSummaryRes);
          if (riskSummaryRes.branch_details) {
            const heatmapData = riskSummaryRes.branch_details.flatMap(b => 
              Object.entries(b.severity_distribution).map(([sev, count]) => ({
                branch: b.name,
                severity: sev,
                count: count as number
              }))
            );
            setAiRiskHeatmap(heatmapData);
          }
        }
      } catch (err) {
        if ((err as any).name === 'AbortError') return;
        console.warn('Deferred data failed to load:', err);
      } finally {
        if (!controller.signal.aborted) {
          setTableLoading(false);
        }
      }
    }

    loadInitialData();
    loadDeferredData();

    return () => {
      controller.abort();
    };
  }, [filters.hub, filters.branch, filters.airlines, filters.area, filters.dateFrom, filters.dateTo, filters.sourceSheet]);

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

  const totalReports = branchData.reduce((sum: number, b: any) => sum + b.total, 0);
  const totalIrreg = branchData.reduce((sum: number, b: any) => sum + b.irregularity, 0);
  const totalComplaint = branchData.reduce((sum: number, b: any) => sum + b.complaint, 0);
  const totalCompliment = branchData.reduce((sum: number, b: any) => sum + b.compliment, 0);

  const avgRiskIndex = branchData.length > 0 ? branchData.reduce((sum: number, b: any) => sum + b.riskIndex, 0) / branchData.length : 0;
  const overallIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;
  const overallNetSentiment = (totalCompliment + totalComplaint) > 0 
    ? ((totalCompliment - totalComplaint) / (totalCompliment + totalComplaint)) * 100 
    : 0;
  const avgGrowth = branchData.length > 0 ? branchData.reduce((sum: number, b: any) => sum + b.growth, 0) / branchData.length : 0;

  return (
    <div className="space-y-8">
      {/* Auto-Insight Block */}
      <AutoInsight data={branchData} hideAnalyzeButton={hideAnalyzeButton} />

      {/* Enhanced KPI Cards - 5 custom KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard title="Total Branches" value={kpis.totalBranches} color="blue" explanation="Jumlah cabang yang dipantau dalam laporan ini." />
          <KPICard
            title="Top Performer"
            value={kpis.topPerformer.name}
            subtitle={`${kpis.topPerformer.count} reports`}
            color="green"
            explanation="Cabang dengan jumlah laporan tertinggi pada periode ini." 
          />
          <KPICard
            title="Worst Performer"
            value={kpis.worstPerformer.name}
            subtitle={`${kpis.worstPerformer.count} reports`}
            color="red"
            explanation="Cabang dengan performa terendah dalam periode ini." 
          />
          <KPICard
            title="Avg Reports/Branch"
            value={kpis.avgReportsPerBranch}
            color="yellow"
            explanation="Rata-rata laporan per cabang pada periode ini." 
          />
          <KPICard
            title="MoM Change"
            value={kpis.momChange > 0 ? `+${kpis.momChange}%` : `${kpis.momChange}%`}
            trend={kpis.momChange}
            color="blue"
            explanation="Perubahan bulan-ke-bulan pada jumlah laporan cabang." 
          />
        </div>
      )}

      {/* Branch Ranking Table */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Branch Performance Ranking</h2>
        <BranchRankTable data={branchData} />
      </section>

      {/* Category Distribution Stacked Bar Chart */}
      {categoryDistribution.length > 0 && (
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Category Distribution per Branch (Top 10)</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart data={categoryDistribution.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="branch" type="category" width={100} />
              <RechartsTooltip />
              <RechartsLegend />
              <RechartsBar dataKey="irregularity" fill="#ef4444" name="Irregularity">
                <LabelList dataKey="irregularity" position="right" style={{ fill: '#ef4444', fontSize: '10px', fontWeight: 'bold' }} />
              </RechartsBar>
              <RechartsBar dataKey="complaint" fill="#f97316" name="Complaint">
                <LabelList dataKey="complaint" position="right" style={{ fill: '#f97316', fontSize: '10px', fontWeight: 'bold' }} />
              </RechartsBar>
              <RechartsBar dataKey="compliment" fill="#22c55e" name="Compliment">
                <LabelList dataKey="compliment" position="right" style={{ fill: '#22c55e', fontSize: '10px', fontWeight: 'bold' }} />
              </RechartsBar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* AI Risk Heatmap */}
      {aiRiskHeatmap.length > 0 && (
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-800">AI Risk Heatmap</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">Proactive risk analysis by severity across branches (AI Service Data)</p>
          <div className="h-[400px]">
            <HeatmapChart 
              data={aiRiskHeatmap}
              xAxis="severity"
              yAxis="branch"
              metric="count"
              showTitle={false}
            />
          </div>
        </section>
      )}

      {/* Monthly Trend */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Monthly Trend Analysis</h2>
        <MonthlyTrendChart data={trendData} />
      </section>

      {/* Category Composition */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Category Composition by Branch</h2>
        <CategoryStackedBar data={categoryData} />
      </section>

      {/* AI Root Cause Investigation - Full Width */}
      <section className="relative overflow-hidden bg-[var(--surface-1)]/50 backdrop-blur-xl rounded-3xl border border-[var(--surface-2)] p-8 shadow-spatial-md transition-all">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Root Cause Analysis</h2>
            <p className="text-slate-500 text-sm font-medium">Neural investigation into operational friction points.</p>
          </div>
        </div>
        <AiRootCauseInvestigation source={filters.sourceSheet || "NON CARGO"} />
      </section>

      {/* AI Detailed Risk Analysis */}
      {branchRiskAnalysis && (
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <BranchRiskAnalysisVisualization 
            data={branchRiskAnalysis} 
            selectedBranch={filters.branch || 'all'} 
          />
        </section>
      )}

      {/* AI Branch Risk Visualization - removed for embed stability */}

      {/* Reports Detail Table */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800">Branch Intelligence Reports</h2>
        </div>
        <DataTableWithPagination 
          data={investigativeData} 
          isLoading={tableLoading}
          title="Branch Intelligence Reports"
          rowsPerPage={3}
        />
      </section>

      {/* Split View: Airline & Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Airline Distribution</h2>
          <AirlineBreakdownChart data={airlineData} />
        </section>
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Area Breakdown</h2>
          <AreaBreakdownChart data={areaData} />
        </section>
      </div>

      {/* Management Summary */}
      <ManagementSummary data={branchData} />

      {/* Investigative Table */}
      <InvestigativeTable
        data={investigativeData}
        title="Investigative Table - Branch Reports"
        rowsPerPage={5}
        maxRows={40}
        isLoading={tableLoading}
      />
    </div>
  );
}
