'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  fetchBranchOverview,
  fetchCategoryCompositionByBranch,
  fetchMonthlyTrendByBranch,
  fetchAreaBreakdownByBranch,
  fetchAirlineContributionByBranch,
  fetchRootCauseByBranch,
  fetchAllBranchIntelReports,
  BranchOverview,
  CategoryCompositionData,
  TrendDataPoint,
  AreaBreakdownData,
  AirlineContributionData,
  RootCauseData,
  BranchIntelRecord,
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
}

function KPICard({ title, value, subtitle, trend, color = 'blue', explanation }: KPICardProps & { explanation?: string }) {
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
            <span>{Math.abs(trend).toFixed(1)}% RANGE_AVG</span>
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

// ─── 1. Auto-Insight Block ───
function AutoInsight({ data }: {
  data: BranchOverview[];
}) {
  if (data.length === 0) return null;

  const topBranch = data[0];
  const highRiskBranches = data.filter(b => b.riskIndex >= 50);
  const growingBranches = data.filter(b => b.momGrowth > 10);

  const insightParts: string[] = [];

  insightParts.push(
    `${topBranch.branch} leads risk ranking with ${topBranch.total} reports (${topBranch.contribution.toFixed(1)}% share), primarily driven by ${topBranch.dominantCategory.toLowerCase()} issues.`
  );

  if (highRiskBranches.length > 0) {
    insightParts.push(
      `${highRiskBranches.length} branch${highRiskBranches.length > 1 ? 'es' : ''} flagged as high risk (${highRiskBranches.map(b => b.branch).join(', ')}).`
    );
  }

  if (growingBranches.length > 0) {
    insightParts.push(
      `${growingBranches.length} branch${growingBranches.length > 1 ? 'es' : ''} showing >10% MoM growth (${growingBranches.map(b => `${b.branch}: +${b.momGrowth.toFixed(0)}%`).join(', ')}).`
    );
  }

  const mainInsight = `Operational risk analysis across ${data.length} branches. ${topBranch.branch} currently shows the highest risk index.`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--surface-glass)] backdrop-blur-md rounded-2xl border border-[var(--surface-border)] p-8 shadow-xl relative overflow-hidden group/insight"
    >
       {/* Aurora Mesh Gradient Backdrop */}
       <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[50%] -left-[20%] w-[100%] h-[100%] bg-[var(--brand-primary)] blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[50%] -right-[20%] w-[100%] h-[100%] bg-emerald-500 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 shadow-lg shadow-[var(--brand-primary)]/10">
            <Zap size={20} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--surface-900)] tracking-tight uppercase">Strategic Auto-Insight</h3>
            <p className="text-[10px] font-bold text-[var(--surface-500)] uppercase tracking-widest">Neural Operational Intelligence</p>
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

// ─── 2. Branch Ranking Table ───
function BranchRankTable({ data }: { data: BranchOverview[] }) {
  const getRiskLevel = (riskIndex: number) => {
    if (riskIndex >= 50) return { label: 'CRITICAL', color: 'bg-red-500', shadow: 'shadow-red-500/40 text-red-500' };
    if (riskIndex >= 20) return { label: 'ELEVATED', color: 'bg-orange-500', shadow: 'shadow-orange-500/40 text-orange-500' };
    return { label: 'STABLE', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/40 text-emerald-500' };
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--surface-glass)] backdrop-blur-md rounded-2xl border border-[var(--surface-border)] shadow-xl overflow-hidden group/rank"
    >
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="bg-[var(--surface-0)]/50">
              <th className="px-4 py-4 text-left text-[10px] font-black text-[var(--surface-500)] uppercase tracking-widest border-b border-[var(--surface-border)]">Rank</th>
              <th className="px-4 py-4 text-left text-[10px] font-black text-[var(--surface-500)] uppercase tracking-widest border-b border-[var(--surface-border)]">Branch</th>
              <th className="px-4 py-4 text-right text-[10px] font-black text-[var(--surface-500)] uppercase tracking-widest border-b border-[var(--surface-border)]">Volume</th>
              <th className="px-4 py-4 text-center text-[10px] font-black text-[var(--surface-500)] uppercase tracking-widest border-b border-[var(--surface-border)]">Performance</th>
              <th className="px-4 py-4 text-right text-[10px] font-black text-[var(--surface-500)] uppercase tracking-widest border-b border-[var(--surface-border)]">Sentiment</th>
              <th className="px-4 py-4 text-center text-[10px] font-black text-[var(--surface-500)] uppercase tracking-widest border-b border-[var(--surface-border)]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-100)]">
            <AnimatePresence mode="popLayout">
              {data.slice(0, 15).map((branch, idx) => {
                const risk = getRiskLevel(branch.riskIndex);
                return (
                  <motion.tr 
                    key={branch.branch}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-[var(--brand-primary)]/[0.02] transition-colors group/row"
                  >
                    <td className="px-4 py-4">
                      <span className="text-[10px] font-black text-[var(--surface-400)]">#{branch.rank}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-[var(--surface-900)] tracking-tight">{branch.branch}</span>
                        <span className="text-[9px] font-bold text-[var(--surface-500)] uppercase">PRIMARY SECTOR</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-[var(--surface-900)]">{branch.total.toLocaleString('id-ID')}</span>
                        <span className="text-[9px] font-bold text-red-500">+{branch.momGrowth.toFixed(1)}% MoM</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[9px] font-black">
                          <span className="text-[var(--surface-400)]">IRREG. RATE</span>
                          <span className={branch.irregularityRate > 5 ? 'text-red-500' : 'text-emerald-500'}>{branch.irregularityRate.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--surface-100)] rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, branch.irregularityRate * 10)}%` }}
                            className={`h-full rounded-full ${branch.irregularityRate > 5 ? 'bg-red-500' : 'bg-emerald-500'}`}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                       <span className={`text-[11px] font-black ${branch.netSentiment >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                         {branch.netSentiment >= 0 ? '+' : ''}{branch.netSentiment.toFixed(1)}%
                       </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest shadow-lg ${risk.shadow} border border-current bg-white/50 backdrop-blur-sm`}>
                          {risk.label}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ─── 3. Category Composition Vertical Grouped Bar ───
function CategoryCompositionChart({ data }: { data: CategoryCompositionData[] }) {
  const topData = data.slice(0, 15);

  const labels = topData.map(d => d.branch.split(' '));
  const irregData = topData.map(d => d.Irregularity);
  const complaintData = topData.map(d => d.Complaint);
  const complimentData = topData.map(d => d.Compliment);

  const chartData = {
    labels,
    datasets: [
      { label: 'Irregularity', data: irregData, backgroundColor: '#ef4444', borderRadius: 4 },
      { label: 'Complaint', data: complaintData, backgroundColor: '#f97316', borderRadius: 4 },
      { label: 'Compliment', data: complimentData, backgroundColor: '#22c55e', borderRadius: 4 },
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

  return <div className="h-[400px]"><Bar data={chartData} options={options as any} plugins={[barLabelsPlugin]} /></div>;
}

// ─── 4. Monthly Trend Chart ───
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

// ─── 5. Area Breakdown Vertical Grouped Bar ───
function AreaBreakdownChart({ data }: { data: AreaBreakdownData[] }) {
  // Group by branch, stack by area
  const branchMap = new Map<string, Map<string, number>>();
  const allAreas = new Set<string>();

  data.forEach(d => {
    allAreas.add(d.area);
    if (!branchMap.has(d.branch)) branchMap.set(d.branch, new Map());
    branchMap.get(d.branch)!.set(d.area, d.count);
  });

  const branches = Array.from(branchMap.keys());
  const areas = Array.from(allAreas);
  const areaColors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#6366f1', '#84cc16', '#f43f5e'];

  // Compute percentages per branch
  const datasets = areas.map((area, idx) => ({
    label: area,
    data: branches.map(branch => {
      const areaMap = branchMap.get(branch)!;
      return areaMap.get(area) || 0;
    }),
    backgroundColor: areaColors[idx % areaColors.length],
    borderRadius: 4,
  }));

  const chartData = { labels: branches.map(b => b.split(' ')), datasets };

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

  return <div className="h-[400px]"><Bar data={chartData} options={options as any} plugins={[barLabelsPlugin]} /></div>;
}

// ─── 6. Airline Contribution Vertical Bar ───
function AirlineContributionChart({ data }: { data: AirlineContributionData[] }) {
  const chartData = {
    labels: data.map(d => d.airline.split(' ')),
    datasets: [{
      label: 'Reports',
      data: data.map(d => d.count),
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



// ─── 9. Management Summary ───
function ManagementSummary({ data }: { data: BranchOverview[] }) {
  if (data.length === 0) return null;

  const topBranch = data[0];
  const highRiskCount = data.filter(b => b.riskIndex >= 50).length;
  const avgIrregRate = data.reduce((sum, b) => sum + b.irregularityRate, 0) / data.length;
  const totalReports = data.reduce((sum, b) => sum + b.total, 0);

  const insights = [
    `${topBranch.branch} ranks #1 in risk with ${topBranch.total} reports (${topBranch.contribution.toFixed(1)}% of total), dominated by ${topBranch.dominantCategory}.`,
    `${highRiskCount} branch${highRiskCount !== 1 ? 'es' : ''} identified as high risk (risk index >= 50).`,
    `Average irregularity rate across branches: ${avgIrregRate.toFixed(1)}%.`,
    `Total volume: ${totalReports.toLocaleString('id-ID')} reports across ${data.length} branches.`,
  ];

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
          <h3 className="text-sm font-black text-[var(--surface-900)] tracking-tight uppercase">Executive Brief</h3>
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

// ─── 10. Data Table ───
function DataTable({ data }: { data: BranchIntelRecord[] }) {
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
    saveAs(blob, 'branch-intelligence-report.csv');
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
export default function BranchIntelligenceDetail({ filters = {} }: { filters?: FilterParams }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchData, setBranchData] = useState<BranchOverview[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryCompositionData[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [areaData, setAreaData] = useState<AreaBreakdownData[]>([]);
  const [airlineData, setAirlineData] = useState<AirlineContributionData[]>([]);
  const [rootCauseData, setRootCauseData] = useState<RootCauseData[]>([]);
  const [tableData, setTableData] = useState<BranchIntelRecord[]>([]);
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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [overview, category, trend, area, airline, rootCause, table] = await Promise.all([
          fetchBranchOverview(filters),
          fetchCategoryCompositionByBranch(filters),
          fetchMonthlyTrendByBranch(filters),
          fetchAreaBreakdownByBranch(filters),
          fetchAirlineContributionByBranch(filters),
          fetchRootCauseByBranch(filters),
          fetchAllBranchIntelReports(filters),
        ]);

        setBranchData(overview);
        setCategoryData(category);
        setTrendData(trend);
        setAreaData(area);
        setAirlineData(airline);
        setRootCauseData(rootCause);
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

  const totalReports = branchData.reduce((sum: number, b: any) => sum + b.total, 0);
  const totalIrreg = branchData.reduce((sum: number, b: any) => sum + b.irregularity, 0);
  const totalComplaint = branchData.reduce((sum: number, b: any) => sum + b.complaint, 0);
  const totalCompliment = branchData.reduce((sum: number, b: any) => sum + b.compliment, 0);

  const topBranch = branchData[0];
  
  const overallIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;
  const overallComplaintRate = totalReports > 0 ? (totalComplaint / totalReports) * 100 : 0;
  const overallNetSentiment = (totalCompliment + totalComplaint) > 0 
    ? ((totalCompliment - totalComplaint) / (totalCompliment + totalComplaint)) * 100 
    : 0;

  const avgRiskIndex = branchData.length > 0 ? branchData.reduce((sum: number, b: any) => sum + b.riskIndex, 0) / branchData.length : 0;

  const benchmarkBranch = (filters.branch && filters.branch !== 'all') ? filters.branch : (topBranch?.branch || '');

  return (
    <div className="space-y-8">
      {/* 1. Auto-Insight Block */}
      <AutoInsight data={branchData} />

      {/* 2. Branch Summary KPI Cards — Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Reports"
          value={totalReports.toLocaleString('id-ID')}
          subtitle={`Across ${branchData.length} branches`}
          color="blue"
        />
        <KPICard
          title="% of System"
          value={topBranch ? `${topBranch.contribution.toFixed(1)}%` : '-'}
          subtitle={topBranch ? `${topBranch.branch} (top)` : ''}
          color="blue"
        />
        <KPICard
          title="Rank #1 Branch"
          value={topBranch?.branch || '-'}
          subtitle={`Risk Index: ${topBranch?.riskIndex || 0}`}
          color={topBranch && topBranch.riskIndex >= 50 ? 'red' : 'orange'}
        />
        <KPICard
          title="Dominant Category"
          value={topBranch?.dominantCategory || '-'}
          subtitle={topBranch ? `at ${topBranch.branch}` : ''}
          color={topBranch?.dominantCategory === 'Irregularity' ? 'red' : topBranch?.dominantCategory === 'Complaint' ? 'orange' : 'green'}
        />
      </div>

      {/* KPI Cards — Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPICard
          title="Overall Irreg. Rate"
          value={`${overallIrregRate.toFixed(1)}%`}
          color={overallIrregRate >= 5 ? 'red' : 'green'}
        />
        <KPICard
          title="Overall Net Sentiment"
          value={`${overallNetSentiment >= 0 ? '+' : ''}${overallNetSentiment.toFixed(1)}%`}
          color={overallNetSentiment > 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Risk Index (Avg)"
          value={avgRiskIndex.toFixed(1)}
          subtitle="Weighted: Irreg*2 + Complaint"
          color={avgRiskIndex >= 50 ? 'red' : avgRiskIndex >= 20 ? 'orange' : 'green'}
        />
      </div>

      {/* Branch Ranking Table */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Branch Risk Ranking</h2>
        <BranchRankTable data={branchData} />
      </section>

      {/* Split View: Category Composition & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Category Composition</h2>
          <p className="text-xs text-gray-500 mb-4">Irregularity / Complaint / Compliment per branch</p>
          <CategoryCompositionChart data={categoryData} />
        </section>
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Monthly Trend</h2>
          <MonthlyTrendChart data={trendData} />
        </section>
      </div>

      {/* 5 & 6: Split View — Area Breakdown & Airline Contribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Area Breakdown (Branch x Area)</h2>
          <p className="text-xs text-gray-500 mb-4">Volume breakdown reveals where inside the branch the problem lies</p>
          <AreaBreakdownChart data={areaData} />
        </section>
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Airline Contribution inside Branch</h2>
          <p className="text-xs text-gray-500 mb-4">Top airlines contributing to reports in this branch</p>
          <AirlineContributionChart data={airlineData} />
        </section>
      </div>

      {/* 7. AI Root Cause Investigation */}
      <section className="relative overflow-hidden bg-[var(--surface-1)]/50 backdrop-blur-xl rounded-3xl border border-[var(--surface-2)] p-8 shadow-spatial-md transition-all">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Root Cause Analysis</h2>
            <p className="text-slate-500 text-sm font-medium">Neural investigation into operational friction points.</p>
          </div>
        </div>
        <AiRootCauseInvestigation source={filters.sourceSheet === 'CGO' ? 'CGO' : 'NON CARGO'} />
      </section>


      {/* Management Summary */}
      <ManagementSummary data={branchData} />

      {/* Investigative Table */}
      <section className="bg-[var(--surface-glass)] backdrop-blur-md rounded-[2rem] border border-[var(--surface-border)] overflow-hidden shadow-2xl">
        <InvestigativeTable
          data={investigativeData}
          title="Investigative Table - Branch Intelligence"
          rowsPerPage={5}
          maxRows={40}
        />
      </section>

      {/* 10. Full Data Table */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--surface-glass)] backdrop-blur-md rounded-[2.5rem] border border-[var(--surface-border)] overflow-hidden shadow-2xl relative group/full"
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
            title="Branch Intelligence (Main Chart Source)"
            rowsPerPage={3}
          />
        </div>
      </motion.section>
    </div>
  );
}
