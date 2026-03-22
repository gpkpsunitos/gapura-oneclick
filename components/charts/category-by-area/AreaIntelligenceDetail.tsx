'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  fetchAreaOverview,
  fetchCategoryBreakdownByArea,
  fetchBranchWithinArea,
  fetchAirlineWithinArea,
  fetchMonthlyTrendForArea,
  fetchRootCauseForArea,
  fetchBranchCategoryHeatmap,
  fetchAllAreaIntelReports,
  AreaSummary,
  AreaCategoryBreakdown,
  BranchWithinAreaData,
  AirlineWithinAreaData,
  TrendDataPoint,
  RootCauseParetoData,
  HeatmapMatrix,
  AreaReportRecord,
} from './data';
import { 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Zap, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  LayoutList,
  AlertCircle,
  Clock,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { barLabelsPlugin } from '../chartConfig';
import { saveAs } from 'file-saver';
import { InvestigativeTable } from '@/components/chart-detail/InvestigativeTable';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';
import { AiRootCauseInvestigation } from '../ai-root-cause/AiRootCauseInvestigation';
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
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="p-6 rounded-2xl bg-[var(--surface-glass)] backdrop-blur-md border border-[var(--surface-border)] shadow-xl relative overflow-hidden group/kpi"
    >
      {/* Glow highlight */}
      <div 
        className="absolute -top-12 -right-12 w-24 h-24 blur-3xl opacity-20 group-hover/total:opacity-40 transition-opacity" 
        style={{ backgroundColor: `var(--brand-${color}-500)` }} 
      />
      
      <div className="relative z-10">
        <div className="text-[10px] font-black text-[var(--surface-400)] uppercase tracking-[0.2em] mb-3">
          {title}
        </div>
        <div className="text-3xl font-black text-[var(--surface-900)] tracking-tighter mb-1">
          {value}
        </div>
        {subtitle && (
          <div className="text-[10px] font-bold text-[var(--surface-500)] uppercase tracking-wide">
            {subtitle}
          </div>
        )}
        
        {trend !== undefined && (
          <div className={`flex items-center gap-1.5 text-[10px] font-black mt-4 px-2 py-1 rounded-full w-fit ${trend > 0 ? 'bg-emerald-500/10 text-emerald-600' : trend < 0 ? 'bg-red-500/10 text-red-600' : 'bg-gray-500/10 text-gray-500'}`}>
            {trend > 0 ? <ArrowUp size={10} /> : trend < 0 ? <ArrowDown size={10} /> : <Minus size={10} />}
            <span>{Math.abs(trend).toFixed(1)}% MoM</span>
          </div>
        )}
        
        {explanation && (
          <div className="mt-4 p-3 bg-[var(--surface-50)]/50 rounded-xl border border-[var(--surface-border)] text-[10px] font-medium text-[var(--surface-600)] leading-relaxed">
            {explanation}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Auto-Insight Block ───
function AutoInsight({ data }: { data: AreaSummary[] }) {
  if (data.length === 0) return null;

  const topArea = data[0];
  const highRiskAreas = data.filter(a => a.riskIndex >= 50);
  const totalReports = data.reduce((s, a) => s + a.total, 0);
  const irregTotal = data.reduce((s, a) => s + a.irregularity, 0);
  const overallIrregRate = totalReports > 0 ? (irregTotal / totalReports) * 100 : 0;

  const topAreaContribution = topArea.contribution.toFixed(0);

  const insightParts: string[] = [];
  insightParts.push(
    `${topArea.area} area accounts for ${topAreaContribution}% of irregularities, dominating the report landscape.`
  );
  if (highRiskAreas.length > 0) {
    insightParts.push(
      `${highRiskAreas.length} area${highRiskAreas.length > 1 ? 's' : ''} flagged as high risk (${highRiskAreas.map(a => a.area).join(', ')}).`
    );
  }
  insightParts.push(
    `Overall irregularity rate: ${overallIrregRate.toFixed(1)}% across ${data.length} areas.`
  );

  const mainInsight = `Area-specific risk analysis across ${data.length} operational zones. ${topArea.area} identifies as the primary risk vector.`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--surface-glass)] backdrop-blur-md rounded-2xl border border-[var(--surface-border)] p-8 shadow-xl relative overflow-hidden group/insight"
    >
       {/* Aurora Mesh Gradient Backdrop */}
       <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[50%] -left-[20%] w-[100%] h-[100%] bg-[var(--brand-primary)] blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[50%] -right-[20%] w-[100%] h-[100%] bg-indigo-500 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 shadow-lg shadow-[var(--brand-primary)]/10">
            <Zap size={20} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--surface-900)] tracking-tight uppercase">Spatial Auto-Insight</h3>
            <p className="text-[10px] font-bold text-[var(--surface-500)] uppercase tracking-widest">Neural Regional Intelligence</p>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-lg font-black text-[var(--surface-900)] leading-tight tracking-tight max-w-2xl bg-gradient-to-br from-[var(--surface-900)] to-[var(--surface-600)] bg-clip-text text-transparent">
            {mainInsight}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-[var(--surface-border)] pt-6">
            {insightParts.map((insight, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-[var(--surface-50)]/50 border border-[var(--surface-border)] shadow-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] mt-1.5 shrink-0 shadow-[0_0_8px_var(--brand-primary)]" />
                <span className="text-xs font-bold text-[var(--surface-700)] leading-relaxed">
                  {insight}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Category Grouped Vertical Bar ───
function CategoryBreakdownChart({ data }: { data: AreaCategoryBreakdown[] }) {
  const chartData = {
    labels: data.slice(0, 12).map(d => d.area.split(' ')),
    datasets: [
      { label: 'Irregularity', data: data.slice(0, 12).map(d => d.Irregularity), backgroundColor: '#ef4444', borderRadius: 4 },
      { label: 'Complaint', data: data.slice(0, 12).map(d => d.Complaint), backgroundColor: '#f97316', borderRadius: 4 },
      { label: 'Compliment', data: data.slice(0, 12).map(d => d.Compliment), backgroundColor: '#22c55e', borderRadius: 4 },
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

  return <div className="h-[400px]"><Bar data={chartData} options={options} /></div>;
}

// ─── Branch Distribution Vertical Bar ───
function BranchDistributionChart({ data }: { data: BranchWithinAreaData[] }) {
  const chartData = {
    labels: data.slice(0, 12).map(d => d.branch.split(' ')),
    datasets: [{
      label: 'Reports',
      data: data.slice(0, 12).map(d => d.count),
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }],
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

// ─── Airline Distribution Vertical Bar ───
function AirlineDistributionChart({ data }: { data: AirlineWithinAreaData[] }) {
  const chartData = {
    labels: data.slice(0, 12).map(d => d.airline.split(' ')),
    datasets: [{
      label: 'Reports',
      data: data.slice(0, 12).map(d => d.count),
      backgroundColor: '#8b5cf6',
      borderRadius: 4,
    }],
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

// ─── Monthly Trend Line Chart ───
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


// ─── Heatmap: Branch x Category ───
function HeatmapTable({ matrix }: { matrix: HeatmapMatrix }) {
  const maxValue = Math.max(...(Array.from(matrix.cells.values()) as number[]), 1);

  function getCellStyles(value: number) {
    if (value === 0) return { className: 'bg-[var(--surface-50)]/30 text-[var(--surface-300)]', style: {} };
    const intensity = value / maxValue;
    // Perceptually uniform intensity using OKLCH logic (simulated with opacity)
    return {
      className: 'text-white font-black',
      style: { 
        backgroundColor: `oklch(0.6 0.2 150 / ${0.3 + intensity * 0.7})`,
        boxShadow: intensity > 0.8 ? 'inset 0 0 12px oklch(0.6 0.2 150 / 0.4)' : 'none'
      }
    };
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[var(--surface-glass)] backdrop-blur-md rounded-2xl border border-[var(--surface-border)] shadow-xl overflow-hidden"
    >
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="bg-[var(--surface-0)]/50 backdrop-blur-md">
              <th className="px-4 py-4 text-left text-[10px] font-black text-[var(--surface-500)] uppercase tracking-widest border-b border-[var(--surface-border)] sticky left-0 z-20 bg-[var(--surface-0)]/90 backdrop-blur-md">BRANCH / SECTOR</th>
              {matrix.cols.map(col => (
                <th key={col} className="px-4 py-4 text-center text-[10px] font-black text-[var(--surface-500)] uppercase tracking-widest border-b border-[var(--surface-border)] whitespace-nowrap min-w-[100px]">
                  {col}
                </th>
              ))}
              <th className="px-4 py-4 text-center text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest border-b border-[var(--surface-border)] bg-[var(--surface-50)] text-center">AGGREGATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-100)]">
            {matrix.rows.map((row, rIdx) => (
              <tr key={row} className="group/row">
                <td className="px-4 py-4 text-[10px] font-black text-[var(--surface-900)] tracking-tight uppercase border-r border-[var(--surface-border)] sticky left-0 z-10 bg-[var(--surface-0)]/90 backdrop-blur-md group-hover/row:bg-[var(--brand-primary)]/[0.02] transition-colors">
                  {row}
                </td>
                {matrix.cols.map(col => {
                  const value = matrix.cells.get(`${row}|||${col}`) || 0;
                  const { className, style } = getCellStyles(value);
                  return (
                    <td 
                      key={col} 
                      className={`px-4 py-4 text-center text-xs transition-all duration-300 border-r border-[var(--surface-border)]/50 ${className}`}
                      style={style}
                    >
                      {value || '-'}
                    </td>
                  );
                })}
                <td className="px-4 py-4 text-center text-xs font-black text-[var(--surface-900)] bg-[var(--surface-50)]/50 border-l border-[var(--surface-border)]">
                  {matrix.rowTotals.get(row) || 0}
                </td>
              </tr>
            ))}
            {/* Grand Total Row */}
            <tr className="bg-[var(--surface-50)]/50">
              <td className="px-4 py-4 text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest border-t border-[var(--surface-border)] sticky left-0 z-10 bg-[var(--surface-50)]/90 backdrop-blur-md">
                TOTALS
              </td>
              {matrix.cols.map(col => (
                <td key={col} className="px-4 py-4 text-center text-[10px] font-black text-[var(--surface-900)] border-t border-[var(--surface-border)]">
                  {matrix.colTotals.get(col) || 0}
                </td>
              ))}
              <td className="px-4 py-4 text-center text-xs font-black text-white bg-[var(--surface-900)] border-t border-[var(--surface-border)]">
                {matrix.grandTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ─── Management Summary ───
function ManagementSummary({ data }: { data: AreaSummary[] }) {
  if (data.length === 0) return null;

  const topArea = data[0];
  const highRiskCount = data.filter(a => a.riskIndex >= 50).length;
  const avgIrregRate = data.reduce((sum, a) => sum + a.irregularityRate, 0) / data.length;
  const totalReports = data.reduce((sum, a) => sum + a.total, 0);

  const insights = [
    `${topArea.area} leads with ${topArea.total} reports (${topArea.contribution.toFixed(1)}% of total).`,
    `${highRiskCount} area${highRiskCount !== 1 ? 's' : ''} identified as high risk (risk index >= 50).`,
    `Average irregularity rate across areas: ${avgIrregRate.toFixed(1)}%.`,
    `Total volume: ${totalReports.toLocaleString('id-ID')} reports across ${data.length} areas.`,
    topArea.momGrowth !== 0 ? `${topArea.area} trending ${topArea.momGrowth > 0 ? 'upward' : 'downward'} (${topArea.momGrowth > 0 ? '+' : ''}${topArea.momGrowth.toFixed(1)}% MoM).` : null,
  ].filter(Boolean) as string[];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--surface-glass)] backdrop-blur-md rounded-2xl border border-[var(--surface-border)] p-8 shadow-xl relative overflow-hidden group/summary"
    >
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 shadow-lg shadow-[var(--brand-primary)]/10">
            <LayoutList size={20} />
          </div>
          <h3 className="text-sm font-black text-[var(--surface-900)] tracking-tight uppercase">Strategic Summary</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * idx }}
              className="p-4 rounded-xl bg-[var(--surface-50)]/50 border border-[var(--surface-border)] hover:bg-[var(--surface-0)] transition-colors"
            >
              <p className="text-xs font-bold text-[var(--surface-700)] leading-relaxed">
                {insight}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Data Table ───
function DataTable({ data }: { data: AreaReportRecord[] }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('Date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  if (!data || data.length === 0) {
    return (
      <div className="p-12 text-center bg-[var(--surface-glass)] backdrop-blur-md rounded-2xl border border-[var(--surface-border)]">
        <h3 className="text-sm font-black text-[var(--surface-400)] uppercase tracking-widest">No Intelligence Vectors Found</h3>
      </div>
    );
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
    saveAs(blob, 'area-intelligence-report.csv');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="relative flex-1 max-w-md group/search">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--surface-400)] group-focus-within/search:text-[var(--brand-primary)]" size={16} />
            <input
              type="text"
              placeholder="Filter intelligence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--surface-50)]/50 border border-[var(--surface-border)] rounded-full text-xs font-bold focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/10 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--surface-400)]"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-[var(--surface-50)]/50 border border-[var(--surface-border)] rounded-full text-xs font-black uppercase tracking-tight focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/10 transition-all appearance-none pr-8 relative"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          >
            <option value="all text-[var(--surface-900)]">CATEGORIES: ALL</option>
            <option value="Irregularity">IRREGULARITY</option>
            <option value="Complaint">COMPLAINT</option>
            <option value="Compliment">COMPLIMENT</option>
          </select>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-6 py-2 bg-[var(--surface-900)] text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:brightness-125 transition-all shadow-lg active:scale-95"
        >
          <Download size={14} />
          EXPORT INTELLIGENCE
        </button>
      </div>

      <div className="bg-[var(--surface-glass)] backdrop-blur-md rounded-2xl border border-[var(--surface-border)] shadow-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-[var(--surface-0)]/50">
                {columns.map(col => (
                  <th key={col} onClick={() => handleSort(col)} className="px-6 py-4 text-left text-[10px] font-black text-[var(--surface-500)] uppercase tracking-widest border-b border-[var(--surface-border)] cursor-pointer hover:text-[var(--brand-primary)] transition-colors select-none">
                    <div className="flex items-center gap-2">
                      {col.replace(/_/g, ' ')}
                      {sortField === col && <span className="text-[var(--brand-primary)]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-100)]">
              {paginatedData.map((row, idx) => (
                <motion.tr 
                  key={idx} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  className="hover:bg-[var(--brand-primary)]/[0.02] transition-colors group"
                >
                  {columns.map(col => (
                    col === 'Evidence' ? (
                      <td key={col} className="px-6 py-4 text-xs font-medium text-blue-600" dangerouslySetInnerHTML={{ __html: row[col] as string || '-' }} />
                    ) : (
                      <td key={col} className={`px-6 py-4 text-xs font-semibold ${col === 'Date' ? 'text-[var(--surface-500)]' : 'text-[var(--surface-700)]'}`}>
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                      </td>
                    )
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 bg-[var(--surface-0)]/80 backdrop-blur-md border-t border-[var(--surface-border)] flex items-center justify-between">
            <div className="text-[10px] font-black text-[var(--surface-400)] uppercase tracking-widest">
              {(currentPage - 1) * itemsPerPage + 1} — {Math.min(currentPage * itemsPerPage, filteredData.length)} / {filteredData.length} VECTORS
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-50)] transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1 px-3 py-1 bg-[var(--surface-50)] rounded-full border border-[var(--surface-border)]">
                <span className="text-[10px] font-black text-[var(--brand-primary)]">{currentPage}</span>
                <span className="text-[10px] font-black text-[var(--surface-300)]">/</span>
                <span className="text-[10px] font-black text-[var(--surface-400)]">{totalPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-50)] transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───
export default function AreaIntelligenceDetail({ filters = {} }: { filters?: FilterParams }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaData, setAreaData] = useState<AreaSummary[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<AreaCategoryBreakdown[]>([]);
  const [branchData, setBranchData] = useState<BranchWithinAreaData[]>([]);
  const [airlineData, setAirlineData] = useState<AirlineWithinAreaData[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [paretoData, setParetoData] = useState<RootCauseParetoData[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapMatrix>({ rows: [], cols: [], cells: new Map(), rowTotals: new Map(), colTotals: new Map(), grandTotal: 0 });
  const [tableData, setTableData] = useState<AreaReportRecord[]>([]);
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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [areas, catBreakdown, branches, airlines, trend, pareto, heatmap, table] = await Promise.all([
          fetchAreaOverview(filters),
          fetchCategoryBreakdownByArea(filters),
          fetchBranchWithinArea(filters),
          fetchAirlineWithinArea(filters),
          fetchMonthlyTrendForArea(filters),
          fetchRootCauseForArea(filters),
          fetchBranchCategoryHeatmap(filters),
          fetchAllAreaIntelReports(filters),
        ]);

        setAreaData(areas);
        setCategoryBreakdown(catBreakdown);
        setBranchData(branches);
        setAirlineData(airlines);
        setTrendData(trend);
        setParetoData(pareto);
        setHeatmapData(heatmap);
        setTableData(table);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [filters.hub, filters.branch, filters.airlines, filters.area, filters.dateFrom, filters.dateTo]);

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
          <div className="text-red-500 mb-2">{error}</div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#6b8e3d] text-white rounded-lg text-sm font-medium">Retry</button>
        </div>
      </div>
    );
  }

  // Compute aggregate KPIs
  const totalReports = areaData.reduce((sum: number, a: any) => sum + a.total, 0);
  const totalIrreg = areaData.reduce((sum: number, a: any) => sum + a.irregularity, 0);
  const totalComplaint = areaData.reduce((sum: number, a: any) => sum + a.complaint, 0);
  const totalCompliment = areaData.reduce((sum: number, a: any) => sum + a.compliment, 0);

  const topArea = areaData[0];
  
  const overallIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;
  const overallComplaintRate = totalReports > 0 ? (totalComplaint / totalReports) * 100 : 0;
  const overallComplimentRate = totalReports > 0 ? (totalCompliment / totalReports) * 100 : 0;
  const overallNetSentiment = (totalCompliment + totalComplaint) > 0 
    ? ((totalCompliment - totalComplaint) / (totalCompliment + totalComplaint)) * 100 
    : 0;

  const avgRiskIndex = areaData.length > 0 ? areaData.reduce((sum: number, a: any) => sum + a.riskIndex, 0) / areaData.length : 0;

  return (
    <div className="space-y-8">
      {/* 1. Auto-Insight Block */}
      <AutoInsight data={areaData} />

      {/* 2. Hero KPI Cards (2 rows of 4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Reports"
          value={totalReports.toLocaleString('id-ID')}
          subtitle={`Across ${areaData.length} areas`}
          color="blue"
          explanation="Total laporan untuk wilayah ini pada dataset ini."
        />
        <KPICard
          title="% of System"
          value={topArea ? `${topArea.percentOfSystem.toFixed(1)}%` : '-'}
          subtitle={topArea ? `Top: ${topArea.area}` : ''}
          color="blue"
          explanation="Persentase sistem yang termasuk dalam analisis untuk area ini."
        />
        <KPICard
          title="Rank"
          value={topArea ? `#${topArea.rank}` : '-'}
          subtitle={topArea ? topArea.area : ''}
          color="yellow"
          explanation="Urutan peringkat berdasarkan skor area pada dataset ini."
        />
        <KPICard
          title="Overall Irreg. %"
          value={`${overallIrregRate.toFixed(1)}%`}
          subtitle="Weighted total"
          color={overallIrregRate > 50 ? 'red' : 'orange'}
          explanation="Persentase ketidaknormalan secara keseluruhan untuk area-area ini."
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Overall Complaint %"
          value={`${overallComplaintRate.toFixed(1)}%`}
          subtitle="Weighted total"
          color="orange"
          explanation="Persentase keluhan terhadap total laporan secara keseluruhan."
        />
        <KPICard
          title="Overall Compliment %"
          value={`${overallComplimentRate.toFixed(1)}%`}
          subtitle="Weighted total"
          color="green"
          explanation="Persentase compliment terhadap total laporan secara keseluruhan."
        />
        <KPICard
          title="Overall Net Sentiment"
          value={`${overallNetSentiment >= 0 ? '+' : ''}${overallNetSentiment.toFixed(1)}%`}
          subtitle="Weighted total"
          color={overallNetSentiment > 0 ? 'green' : 'red'}
          explanation="Nilai gabungan sentimen positif vs negatif untuk seluruh data area ini."
        />
        <KPICard
          title="Risk Score Index"
          value={avgRiskIndex.toFixed(1)}
          subtitle="Avg (Irreg*2 + Complaint)"
          trend={topArea?.momGrowth}
          color={avgRiskIndex >= 50 ? 'red' : avgRiskIndex >= 20 ? 'orange' : 'green'}
          explanation="Indeks risiko rata-rata gabungan berdasarkan faktor ketidaknormalan dan keluhan."
        />
      </div>

      {/* 3. Category Breakdown within Area */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--surface-glass)] backdrop-blur-md rounded-[2.5rem] border border-[var(--surface-border)] p-10 shadow-2xl relative overflow-hidden group/breakdown"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Zap size={120} fill="currentColor" />
        </div>
        <div className="mb-10">
          <h2 className="text-2xl font-black text-[var(--surface-900)] tracking-tighter">Category Dispersion</h2>
          <p className="text-[10px] font-bold text-[var(--surface-500)] uppercase tracking-[0.2em] mt-2">Relative distribution of operational events</p>
        </div>
        <div className="h-[450px]">
          <CategoryBreakdownChart data={categoryBreakdown} />
        </div>
      </motion.section>

      {/* 4 & 5. Branch and Airline Distribution (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.section 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[var(--surface-glass)] backdrop-blur-md rounded-[2rem] border border-[var(--surface-border)] p-8 shadow-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-[var(--surface-900)] tracking-tight">Branch Vectors</h2>
              <p className="text-[10px] font-bold text-[var(--surface-500)] uppercase tracking-widest mt-1">Regional output volume</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <Filter size={18} />
            </div>
          </div>
          <BranchDistributionChart data={branchData} />
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[var(--surface-glass)] backdrop-blur-md rounded-[2rem] border border-[var(--surface-border)] p-8 shadow-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-[var(--surface-900)] tracking-tight">Airline Affinity</h2>
              <p className="text-[10px] font-bold text-[var(--surface-500)] uppercase tracking-widest mt-1">Provider contribution scale</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
              <Zap size={18} />
            </div>
          </div>
          <AirlineDistributionChart data={airlineData} />
        </motion.section>
      </div>

      {/* 6. Monthly Trend for Area */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--surface-glass)] backdrop-blur-md rounded-[2.5rem] border border-[var(--surface-border)] p-10 shadow-2xl relative group/trend"
      >
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-black text-[var(--surface-900)] tracking-tighter">Temporal Dynamics</h2>
            <p className="text-[10px] font-bold text-[var(--surface-500)] uppercase tracking-[0.2em] mt-2">14-month rolling operational trend</p>
          </div>
          <div className="flex gap-2">
            <div className="px-4 py-2 bg-[var(--surface-50)] border border-[var(--surface-border)] rounded-full text-[10px] font-black text-[var(--surface-600)] uppercase tracking-widest">
              HISTORICAL BASELINE
            </div>
          </div>
        </div>
        <div className="h-[350px]">
          <MonthlyTrendChart data={trendData} />
        </div>
      </motion.section>

      {/* 7. AI Root Cause Investigation */}
      <section className="relative overflow-hidden bg-[var(--surface-1)]/50 backdrop-blur-xl rounded-3xl border border-[var(--surface-2)] p-8 shadow-spatial-md transition-all">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Root Cause Analysis</h2>
            <p className="text-slate-500 text-sm font-medium">Neural investigation into area-specific operational friction.</p>
          </div>
        </div>
        <AiRootCauseInvestigation source={filters.sourceSheet === 'CGO' ? 'CGO' : 'NON CARGO'} />
      </section>

      {/* 8. Heatmap: Branch x Category */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-xl font-black text-[var(--surface-900)] tracking-tight">Spatial Density Grid</h2>
            <p className="text-[10px] font-bold text-[var(--surface-500)] uppercase tracking-widest mt-1">Branch performance across categories</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 text-[10px] font-black uppercase tracking-widest">
            <CheckCircle2 size={14} /> DENSITY MAP
          </div>
        </div>
        <HeatmapTable matrix={heatmapData} />
      </section>

      {/* Management Summary */}
      <ManagementSummary data={areaData} />

      {/* Investigative Table */}
      <section className="bg-[var(--surface-glass)] backdrop-blur-md rounded-[2rem] border border-[var(--surface-border)] overflow-hidden shadow-2xl">
        <InvestigativeTable
          data={investigativeData}
          title="Investigative Table - Area Intelligence"
          rowsPerPage={5}
          maxRows={40}
        />
      </section>

      {/* 10. Full Data Table */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--surface-glass)] backdrop-blur-md rounded-[2.5rem] border border-[var(--surface-border)] overflow-hidden shadow-2xl relative group/matrix"
      >
        <div className="p-8 border-b border-[var(--surface-border)] bg-[var(--surface-0)]/40 backdrop-blur-md flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[var(--surface-900)] tracking-tight">Enterprise Data Matrix</h2>
            <p className="text-[10px] font-bold text-[var(--surface-500)] uppercase tracking-widest mt-1">Full intelligence vector source</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-[10px] font-black uppercase tracking-tighter shadow-sm">
             <LayoutList size={12} fill="currentColor" /> RAW SCALE
          </div>
        </div>
        <div className="p-8">
          <DataTableWithPagination 
            data={fullTableData} 
            title="Area Intelligence (Main Chart Source)"
            rowsPerPage={3}
          />
        </div>
      </motion.section>
    </div>
  );
}
