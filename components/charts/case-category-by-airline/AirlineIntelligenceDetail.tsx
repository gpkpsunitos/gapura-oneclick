'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Zap, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  LayoutList 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchAirlineOverview,
  fetchCategoryCompositionByAirline,
  fetchBranchDistributionByAirline,
  fetchAreaBreakdownByAirline,
  fetchMonthlyTrendByAirline,
  fetchRootCauseByAirline,
  fetchAllAirlineIntelReports,
  AirlineOverview,
  CategoryCompositionData,
  BranchDistributionData,
  AreaBreakdownData,
  TrendDataPoint,
  RootCauseData,
  AirlineIntelReportRecord,
} from './data';
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

// ─── Auto-Insight Block ───
function AutoInsight({ data }: {
  data: AirlineOverview[];
}) {
  if (data.length === 0) return null;

  const topAirline = data[0];
  const highRiskAirlines = data.filter(a => a.riskIndex >= 50);
  const negSentimentAirlines = data.filter(a => a.netSentiment < 0);

  const insightParts: string[] = [];

  insightParts.push(
    `${topAirline.airline} contributes ${topAirline.contribution.toFixed(1)}% of total reports with Net Sentiment ${topAirline.netSentiment >= 0 ? '+' : ''}${topAirline.netSentiment.toFixed(1)}%, dominated by ${topAirline.dominantCategory}.`
  );

  if (highRiskAirlines.length > 0) {
    insightParts.push(
      `${highRiskAirlines.length} airline${highRiskAirlines.length > 1 ? 's' : ''} flagged as high risk (Risk Index >= 50): ${highRiskAirlines.slice(0, 3).map(a => a.airline).join(', ')}${highRiskAirlines.length > 3 ? ` +${highRiskAirlines.length - 3} more` : ''}.`
    );
  }

  if (negSentimentAirlines.length > 0) {
    insightParts.push(
      `${negSentimentAirlines.length} airline${negSentimentAirlines.length > 1 ? 's' : ''} show negative net sentiment, indicating complaint dominance.`
    );
  }

  const mainInsight = `Operational intelligence overview across ${data.length} airlines. ${topAirline.airline} currently represents the highest risk profile.`;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative overflow-hidden group/insight bg-[var(--surface-glass)] backdrop-blur-md border border-[var(--surface-border)] rounded-2xl p-6 shadow-xl"
    >
      {/* Multi-layered Aurora backdrop */}
      <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[var(--brand-primary)]/20 via-transparent to-[var(--brand-emerald-500)]/10 animate-aurora" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center border border-[var(--brand-primary)]/20 shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.2)]">
          <Zap size={24} className="text-[var(--brand-primary)] animate-pulse" />
        </div>
        
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-xs font-black text-[var(--surface-900)] uppercase tracking-[0.3em] mb-2">
              Operational Insight
            </h3>
            <p className="text-sm font-bold text-[var(--surface-800)] leading-relaxed">
              {mainInsight}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insightParts.map((insight, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/40 border border-white/60 shadow-sm"
              >
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] shadow-[0_0_8px_var(--brand-primary)]" />
                <span className="text-[11px] font-semibold text-[var(--surface-600)] leading-tight">{insight}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Category Composition: Vertical grouped bar ───
function CategoryCompositionChart({ data }: { data: CategoryCompositionData[] }) {
  const chartData = {
    labels: data.slice(0, 10).map(d => d.airline.split(' ')),
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

  return <div className="h-[400px]"><Bar data={chartData} options={options} /></div>;
}

// ─── Branch Distribution: Vertical bar ───
function BranchDistributionChart({ data }: { data: BranchDistributionData[] }) {
  const branchTotals = Array.from(
    data.reduce((acc, curr) => {
      const existing = acc.get(curr.branch) || 0;
      acc.set(curr.branch, existing + curr.count);
      return acc;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]).slice(0, 12);

  const chartData = {
    labels: branchTotals.map(([branch]) => branch.split(' ')),
    datasets: [{
      label: 'Reports',
      data: branchTotals.map(([, count]) => count),
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

// ─── Area Breakdown: Vertical grouped bar ───
function AreaBreakdownChart({ data }: { data: AreaBreakdownData[] }) {
  // Group by airline, stack by area
  const airlineSet = new Set<string>();
  const areaSet = new Set<string>();
  data.forEach(d => { airlineSet.add(d.airline); areaSet.add(d.area); });

  const airlines = Array.from(airlineSet).slice(0, 10);
  const areas = Array.from(areaSet);

  const areaColors: Record<string, string> = {};
  const colorPalette = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#6366f1', '#f43f5e', '#84cc16'];
  areas.forEach((area, idx) => {
    areaColors[area] = colorPalette[idx % colorPalette.length];
  });

  const dataMap = new Map<string, Map<string, number>>();
  data.forEach(d => {
    if (!dataMap.has(d.airline)) dataMap.set(d.airline, new Map());
    dataMap.get(d.airline)!.set(d.area, d.count);
  });

  const chartData = {
    labels: airlines.map(a => a.split(' ')),
    datasets: areas.map(area => ({
      label: area,
      data: airlines.map(airline => dataMap.get(airline)?.get(area) || 0),
      backgroundColor: areaColors[area],
      borderRadius: 4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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

// ─── Monthly Trend: Line chart ───
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



// ─── Airline Ranking Table ───
function AirlineRankTable({ data }: { data: AirlineOverview[] }) {
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
        <table className="w-full text-[11px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-[var(--surface-0)]/80 backdrop-blur-md">
              <th className="px-6 py-4 text-left font-black text-[var(--surface-400)] uppercase tracking-widest border-b border-[var(--surface-border)]">Rank</th>
              <th className="px-6 py-4 text-left font-black text-[var(--surface-400)] uppercase tracking-widest border-b border-[var(--surface-border)]">Carrier Intelligence</th>
              <th className="px-6 py-4 text-right font-black text-[var(--surface-400)] uppercase tracking-widest border-b border-[var(--surface-border)]">Volume</th>
              <th className="px-6 py-4 text-right font-black text-[var(--surface-400)] uppercase tracking-widest border-b border-[var(--surface-border)]">Irreg %</th>
              <th className="px-6 py-4 text-right font-black text-[var(--surface-400)] uppercase tracking-widest border-b border-[var(--surface-border)]">Compl %</th>
              <th className="px-6 py-4 text-right font-black text-[var(--surface-400)] uppercase tracking-widest border-b border-[var(--surface-border)]">Net Sent.</th>
              <th className="px-6 py-4 text-center font-black text-[var(--surface-400)] uppercase tracking-widest border-b border-[var(--surface-border)]">Risk Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-100)]">
            {data.slice(0, 15).map((airline, idx) => {
              const risk = getRiskLevel(airline.riskIndex);
              return (
                <motion.tr 
                  key={airline.airline}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group/row hover:bg-[var(--brand-primary)]/[0.02] transition-colors duration-200"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-[var(--surface-900)] tabular-nums">#{airline.rank}</span>
                      {idx < 3 && <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] shadow-[0_0_8px_var(--brand-primary)] pulse" />}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-[var(--surface-900)] uppercase tracking-tight">{airline.airline}</span>
                      <span className="text-[9px] font-bold text-[var(--surface-400)] uppercase tracking-tighter">DOMINANT: {airline.dominantCategory}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-[var(--surface-900)] tabular-nums">
                    {airline.total.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-red-500 tabular-nums">{airline.irregularityRate.toFixed(1)}%</span>
                      <div className="w-12 h-1 rounded-full bg-red-100 overflow-hidden">
                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${airline.irregularityRate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-orange-500 tabular-nums">{airline.complaintRate.toFixed(1)}%</span>
                      <div className="w-12 h-1 rounded-full bg-orange-100 overflow-hidden">
                        <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${airline.complaintRate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${airline.netSentiment >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                      {airline.netSentiment >= 0 ? '+' : ''}{airline.netSentiment.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black border border-current bg-white/50 ${risk.shadow}`}>
                      {risk.label}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ─── Management Summary ───
function ManagementSummary({ data }: { data: AirlineOverview[] }) {
  if (data.length === 0) return null;

  const topAirline = data[0];
  const highRiskCount = data.filter(a => a.riskIndex >= 50).length;
  const avgIrregRate = data.reduce((sum, a) => sum + a.irregularityRate, 0) / data.length;
  const totalReports = data.reduce((sum, a) => sum + a.total, 0);
  const improvingAirlines = data.filter(a => a.momGrowth < 0).length;
  const worseningAirlines = data.filter(a => a.momGrowth > 0).length;

  const insights = [
    `${topAirline.airline} leads with ${topAirline.total} reports (${topAirline.contribution.toFixed(1)}% of total), dominated by ${topAirline.dominantCategory}.`,
    `${highRiskCount} airline${highRiskCount !== 1 ? 's' : ''} identified as high risk (Risk Index >= 50).`,
    `Average irregularity rate across airlines: ${avgIrregRate.toFixed(1)}%.`,
    `Total volume: ${totalReports.toLocaleString('id-ID')} reports across ${data.length} airlines.`,
    `Performance trend: ${improvingAirlines} improving, ${worseningAirlines} worsening (month-over-month).`,
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--surface-glass)] backdrop-blur-md rounded-2xl border border-[var(--surface-border)] p-6 group/summary shadow-xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-primary)]/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center border border-[var(--brand-primary)]/20 shadow-inner">
          <LayoutList size={20} className="text-[var(--brand-primary)]" />
        </div>
        <div>
          <h3 className="text-xs font-black text-[var(--surface-900)] uppercase tracking-[0.2em]">
            Executive Brief
          </h3>
          <div className="text-[9px] font-bold text-[var(--surface-400)] uppercase tracking-wider mt-0.5">
            Operational Summary Archive
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {insights.map((insight, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-4 p-4 rounded-xl bg-white/50 border border-[var(--surface-border)] hover:bg-white hover:shadow-lg hover:border-[var(--brand-primary)]/30 transition-all duration-300"
          >
            <div className="mt-1 w-2 h-2 rounded-full bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/40 group-hover:scale-125 transition-transform" />
            <span className="text-[11px] font-bold text-[var(--surface-700)] leading-relaxed uppercase tracking-tight">
              {insight}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Data Table ───
function DataTable({ data }: { data: AirlineIntelReportRecord[] }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('Date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  if (!data || data.length === 0) {
    return <div className="p-12 text-center text-[var(--surface-400)] font-black uppercase tracking-widest italic">Buffer empty. Null set.</div>;
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
    saveAs(blob, 'airline-intelligence-report.csv');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col bg-[var(--surface-glass)] backdrop-blur-md rounded-2xl border border-[var(--surface-border)] shadow-xl overflow-hidden group/fulltable pr-1"
    >
      {/* Table Header Controls */}
      <div className="relative z-10 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--surface-border)] bg-[var(--surface-0)]/40 backdrop-blur-md">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative group/search">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--surface-400)] group-focus-within/search:text-[var(--brand-primary)] transition-colors" />
            <input
              type="text"
              placeholder="QUERYS_SEARCH..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-widest bg-[var(--surface-50)] border border-[var(--surface-border)] rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] w-56 shadow-inner tracking-tighter"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pl-4 pr-10 py-2 border border-[var(--surface-border)] rounded-full text-[10px] font-black uppercase tracking-widest bg-[var(--surface-50)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 shadow-inner appearance-none cursor-pointer"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.8rem center', backgroundSize: '1rem' }}
          >
            <option value="all">ALL CLASSES</option>
            <option value="Irregularity">IRREGULARITY</option>
            <option value="Complaint">COMPLAINT</option>
            <option value="Compliment">COMPLIMENT</option>
          </select>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-6 py-2 bg-[var(--surface-900)] text-white rounded-full text-[10px] font-black uppercase tracking-[0.1em] hover:brightness-125 transition-all shadow-lg active:scale-95"
          >
            <Download size={14} />
            <span>Archive</span>
          </button>
        </div>
        
        <div className="text-[10px] font-black text-[var(--surface-400)] uppercase tracking-widest">
          {filteredData.length} HEAD_RECORDS
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar relative z-10">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[var(--surface-0)]/90 backdrop-blur-md">
              {columns.map(col => (
                <th 
                  key={col} 
                  onClick={() => handleSort(col)} 
                  className="px-6 py-4 text-left font-black text-[var(--surface-400)] uppercase tracking-widest border-b border-[var(--surface-border)] cursor-pointer hover:text-[var(--brand-primary)] transition-colors select-none group/th"
                >
                  <div className="flex items-center gap-2">
                    {col}
                    {sortField === col ? (
                      <span className="text-[var(--brand-primary)]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <span className="opacity-0 group-hover/th:opacity-100 text-[var(--surface-300)] transition-opacity">▼</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-100)]">
            <AnimatePresence mode="popLayout">
              {paginatedData.map((row, idx) => (
                <motion.tr 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.01 }}
                  className="group hover:bg-[var(--brand-primary)]/[0.02] transition-colors duration-200"
                >
                  {columns.map((col, cIdx) => (
                    <td 
                      key={col} 
                      className={`
                        px-6 py-4 text-[11px] 
                        ${cIdx === 0 ? 'font-black text-[var(--surface-900)]' : 'text-[var(--surface-600)] font-medium'}
                      `}
                    >
                      {col === 'Evidence' || col === 'Link' ? (
                        <div dangerouslySetInnerHTML={{ __html: row[col] as string || '-' }} className="max-w-[300px] line-clamp-2" />
                      ) : (
                        row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'
                      )}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="relative z-10 px-6 py-4 border-t border-[var(--surface-border)] bg-[var(--surface-0)]/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-[10px] font-black text-[var(--surface-400)] uppercase tracking-widest">
            SYNCHRONIZING {((currentPage - 1) * itemsPerPage + 1)} — {Math.min(currentPage * itemsPerPage, filteredData.length)} / {filteredData.length}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-[10px] font-black border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-50)] transition-all uppercase tracking-tighter"
            >
              Start
            </button>
            <div className="flex items-center gap-1 bg-[var(--surface-50)] px-3 py-1.5 rounded-full border border-[var(--surface-border)] shadow-inner">
              <span className="text-[10px] font-black text-[var(--brand-primary)]">{currentPage}</span>
              <span className="text-[10px] font-black text-[var(--surface-300)]">/</span>
              <span className="text-[10px] font-black text-[var(--surface-400)]">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-50)] transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-1.5 text-[10px] font-black bg-[var(--surface-900)] text-white rounded-full disabled:opacity-20 hover:brightness-125 transition-all uppercase tracking-tight"
              >
                Next Phase
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-50)] transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ───
export default function AirlineIntelligenceDetail({ filters = {} }: { filters?: FilterParams }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [airlineData, setAirlineData] = useState<AirlineOverview[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryCompositionData[]>([]);
  const [branchData, setBranchData] = useState<BranchDistributionData[]>([]);
  const [areaData, setAreaData] = useState<AreaBreakdownData[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [rootCauseData, setRootCauseData] = useState<RootCauseData[]>([]);
  const [tableData, setTableData] = useState<AirlineIntelReportRecord[]>([]);
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
    const rows = airlineData.map(item => ({ ...item })) as unknown as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [airlineData]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [airline, category, branch, area, trend, rootCause, table] = await Promise.all([
          fetchAirlineOverview(filters),
          fetchCategoryCompositionByAirline(filters),
          fetchBranchDistributionByAirline(filters),
          fetchAreaBreakdownByAirline(filters),
          fetchMonthlyTrendByAirline(filters),
          fetchRootCauseByAirline(filters),
          fetchAllAirlineIntelReports(filters),
        ]);

        setAirlineData(airline);
        setCategoryData(category);
        setBranchData(branch);
        setAreaData(area);
        setTrendData(trend);
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

  const totalReports = airlineData.reduce((sum: number, a: any) => sum + a.total, 0);
  const totalIrreg = airlineData.reduce((sum: number, a: any) => sum + a.irregularity, 0);
  const totalComplaint = airlineData.reduce((sum: number, a: any) => sum + a.complaint, 0);
  const totalCompliment = airlineData.reduce((sum: number, a: any) => sum + a.compliment, 0);

  const topAirline = airlineData[0];
  
  const overallIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;
  const overallComplaintRate = totalReports > 0 ? (totalComplaint / totalReports) * 100 : 0;
  const overallNetSentiment = (totalCompliment + totalComplaint) > 0 
    ? ((totalCompliment - totalComplaint) / (totalCompliment + totalComplaint)) * 100 
    : 0;

  const avgRiskIndex = airlineData.length > 0 ? airlineData.reduce((sum: number, b: any) => sum + b.riskIndex, 0) / airlineData.length : 0;


  return (
    <div className="space-y-8">
      {/* 1. Auto-Insight Block */}
      <AutoInsight data={airlineData} />

      {/* 2. Airline Summary KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Reports"
          value={totalReports.toLocaleString('id-ID')}
          subtitle={`Across ${airlineData.length} airlines`}
          color="blue"
          explanation="Total laporan untuk maskapai dalam dataset ini."
        />
        <KPICard
          title="% System Contribution"
          value={topAirline ? `${topAirline.contribution.toFixed(1)}%` : '-'}
          subtitle={topAirline ? `Top: ${topAirline.airline}` : '-'}
          color="blue"
          explanation="Kontribusi sistem berdasarkan airline teratas di periode ini."
        />
        <KPICard
          title="Rank #1"
          value={topAirline?.airline || '-'}
          subtitle={topAirline ? `${topAirline.total} reports` : '-'}
          color="yellow"
          explanation="Maskapai dengan jumlah laporan tertinggi pada periode ini."
        />
        <KPICard
          title="Dominant Category"
          value={topAirline?.dominantCategory || '-'}
          subtitle={topAirline ? `For ${topAirline.airline}` : '-'}
          color={topAirline?.dominantCategory === 'Irregularity' ? 'red' : topAirline?.dominantCategory === 'Complaint' ? 'orange' : 'green'}
          explanation="Kategori temuan utama pada maskapai ini." 
        />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Overall Irreg. %"
          value={`${overallIrregRate.toFixed(1)}%`}
          color="red"
          explanation="Persentase irregularitas terhadap total laporan untuk semua maskapai."
        />
        <KPICard
          title="Overall Complaint %"
          value={`${overallComplaintRate.toFixed(1)}%`}
          color="orange"
          explanation="Persentase keluhan terhadap total laporan secara keseluruhan."
        />
        <KPICard
          title="Overall Net Sentiment"
          value={`${overallNetSentiment >= 0 ? '+' : ''}${overallNetSentiment.toFixed(1)}%`}
          subtitle="(Compliment - Complaint)"
          color={overallNetSentiment > 0 ? 'green' : 'red'}
          explanation="Nilai gabungan sentimen positif vs negatif secara keseluruhan."
        />
        <KPICard
          title="Avg Risk Score"
          value={avgRiskIndex.toFixed(1)}
          subtitle="(Irreg x 2) + Complaint"
          color={avgRiskIndex >= 50 ? 'red' : avgRiskIndex >= 20 ? 'orange' : 'green'}
          explanation="Indeks risiko rata-rata gabungan berdasarkan faktor ketidaknormalan dan keluhan."
        />
      </div>

      {/* Airline Ranking Table */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Airline Intelligence Ranking</h2>
        <AirlineRankTable data={airlineData} />
      </section>

      {/* 3. Category Composition */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Category Composition by Airline</h2>
        <p className="text-xs text-gray-500 mb-4">Stacked Irregularity / Complaint / Compliment per airline (top 10)</p>
        <CategoryCompositionChart data={categoryData} />
      </section>

      {/* 4 & 5. Branch Distribution + Area Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Branch Distribution (Airline)</h2>
          <p className="text-xs text-gray-500 mb-4">Shows local issue vs national issue -- are reports concentrated in one branch?</p>
          <BranchDistributionChart data={branchData} />
        </section>
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Area Breakdown (Airline)</h2>
          <p className="text-xs text-gray-500 mb-4">Stacked Terminal / Apron / General per airline</p>
          <AreaBreakdownChart data={areaData} />
        </section>
      </div>

      {/* 6. Monthly Trend */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Monthly Trend (Stability Check)</h2>
        <p className="text-xs text-gray-500 mb-4">Airline volume over time -- is performance improving or declining?</p>
        <MonthlyTrendChart data={trendData} />
      </section>

      {/* 7. AI Root Cause Investigation */}
      <section className="relative overflow-hidden bg-[var(--surface-1)]/50 backdrop-blur-xl rounded-3xl border border-[var(--surface-2)] p-8 shadow-spatial-md transition-all">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Root Cause Analysis</h2>
            <p className="text-slate-500 text-sm font-medium">Neural investigation into airline-specific operational friction.</p>
          </div>
        </div>
        <AiRootCauseInvestigation source={filters.sourceSheet === 'CGO' ? 'CGO' : 'NON CARGO'} />
      </section>

      {/* 9. Management Summary */}
      <ManagementSummary data={airlineData} />

      {/* Investigative Table */}
      <InvestigativeTable
        data={investigativeData}
        title="Investigative Table - Airline Intelligence"
        rowsPerPage={5}
        maxRows={40}
      />

      {/* 10. Full Data Table */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Full Data Table</h2>
        </div>
        <div className="p-6">
          <DataTableWithPagination 
          data={fullTableData} 
          title="Airline Intelligence (Main Chart Source)"
          rowsPerPage={3}
        />
        </div>
      </section>
    </div>
  );
}
