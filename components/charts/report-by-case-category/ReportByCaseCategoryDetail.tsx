'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  fetchCategoryBreakdown,
  fetchMonthlyTrend,
  fetchCategoryByBranch,
  fetchCategoryByAirline,
  fetchRootCauses,
  fetchAllReports,
  fetchCategoryKPIs,
  fetchAggregatedCaseCategory,
  CategoryData,
  TrendDataPoint,
  BranchCategoryData,
  AirlineCategoryData,
  RootCauseData,
  ReportRecord,
  CategoryKPIs,
  SeverityDistribution,
} from './data';
import { barLabelsPlugin } from '../chartConfig';
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
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, Bar as RechartsBar } from 'recharts';
import { ArrowUp, ArrowDown, Minus, Download, FileText, Filter, X, Zap, Brain } from 'lucide-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { InvestigativeTable } from '@/components/chart-detail/InvestigativeTable';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';
import { AiRootCauseInvestigation } from '../ai-root-cause/AiRootCauseInvestigation';
import { fetchRiskSummaryAi, AiRiskSummary, fetchSeverityDistributionsAi } from '@/lib/services/gapura-ai';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
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
  color?: 'green' | 'red' | 'yellow' | 'blue';
  explanation?: string;
}

function KPICard({ title, value, subtitle, trend, color = 'blue', explanation }: KPICardProps) {
  const colorClasses = {
    green: 'bg-[var(--surface-1)] border-emerald-500/20 text-emerald-400',
    red: 'bg-[var(--surface-1)] border-red-500/20 text-red-400',
    yellow: 'bg-[var(--surface-1)] border-amber-500/20 text-amber-400',
    blue: 'bg-[var(--surface-1)] border-blue-500/20 text-blue-400',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`group relative overflow-hidden p-5 rounded-3xl border shadow-spatial-md backdrop-blur-xl ${colorClasses[color]} transition-all duration-300`}
    >
      <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      
      <div className="relative z-10">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{title}</div>
        <div className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{value}</div>
        {subtitle && <div className="text-xs font-medium opacity-70 mt-1">{subtitle}</div>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold mt-2 ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {trend > 0 ? <ArrowUp size={12} /> : trend < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
            <span>{Math.abs(trend).toFixed(1)}% MoM</span>
          </div>
        )}
        {explanation && (
          <div className="text-xs text-[var(--text-secondary)] mt-3 pt-3 border-t border-[var(--surface-2)] leading-relaxed">
            {explanation}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AutoInsight({ categoryData, total }: { categoryData: CategoryData[], total: number }) {
  if (categoryData.length === 0) return null;

  const irregularity = categoryData.find(d => d.name === 'Irregularity');
  const complaint = categoryData.find(d => d.name === 'Complaint');
  const compliment = categoryData.find(d => d.name === 'Compliment');

  const insightParts: string[] = [];
  if (irregularity && irregularity.count > 0) {
    insightParts.push(`Irregularity represents ${(irregularity.percentage).toFixed(1)}% of total volume`);
  }
  if (complaint && complaint.count > 0) {
    insightParts.push(`Complaint rate stands at ${(complaint.percentage).toFixed(1)}%`);
  }
  if (compliment && compliment.count > 0) {
    insightParts.push(`Positive feedback (Compliment) at ${(compliment.percentage).toFixed(1)}%`);
  }

  const mainInsight = (irregularity?.percentage || 0) > 50
    ? "High Irregularity: Operational focus recommended."
    : "Balanced Categories: General feedback distribution is within normal ranges.";

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden bg-[var(--surface-1)] border border-[var(--brand-aurora-2)]/30 rounded-3xl p-6 shadow-spatial-md group mb-8"
    >
      <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
      <div className="absolute -inset-1 bg-gradient-to-r from-[var(--brand-aurora-1)] via-[var(--brand-aurora-2)] to-[var(--brand-aurora-3)] opacity-5 blur-xl group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-[var(--brand-aurora-2)]/10 rounded-xl">
            <Zap size={20} className="text-[var(--brand-aurora-2)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Auto-Insight</h3>
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">{mainInsight}</p>
        <ul className="space-y-3">
          {insightParts.map((insight, idx) => (
            <motion.li 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx} 
              className="flex items-start gap-3 text-sm text-[var(--text-secondary)] leading-relaxed"
            >
              <span className="text-[var(--brand-aurora-2)] mt-1 shrink-0">•</span>
              <span>{insight}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function CategoryBarChart({ data }: { data: CategoryData[] }) {
  const colors = {
    Irregularity: { bg: '#ef4444', border: '#dc2626' },
    Complaint: { bg: '#f97316', border: '#ea580c' },
    Compliment: { bg: '#22c55e', border: '#16a34a' },
  };

  const chartData = {
    labels: data.map(d => d.name),
    datasets: [
      {
        label: 'Count',
        data: data.map(d => d.count),
        backgroundColor: data.map(d => colors[d.name as keyof typeof colors]?.bg || '#6b7280'),
        borderColor: data.map(d => colors[d.name as keyof typeof colors]?.border || '#4b5563'),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    indexAxis: 'x' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { dataIndex: number; raw: unknown }) => {
            const item = data[ctx.dataIndex];
            return `${item.count} (${item.percentage.toFixed(1)}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, maxRotation: 0, minRotation: 0, padding: 12 },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 12 } },
        suggestedMax: data.length > 0 ? Math.max(...data.map(d => d.count)) * 1.15 : undefined,
      },
    },
  };

  return (
    <div className="h-[300px]">
      <Bar data={chartData} options={options} plugins={[barLabelsPlugin]} />
    </div>
  );
}

function MonthlyTrendChart({ data }: { data: TrendDataPoint[] }) {
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Irregularity',
        data: data.map(d => d.Irregularity),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Complaint',
        data: data.map(d => d.Complaint),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Compliment',
        data: data.map(d => d.Compliment),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
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
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 } },
        suggestedMax: data.length > 0 ? Math.max(...data.map(d => Math.max(d.Irregularity, d.Complaint, d.Compliment))) * 1.2 : undefined,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className="h-[250px]">
      <Line data={chartData} options={options} plugins={[barLabelsPlugin]} />
    </div>
  );
}

function BranchStackedBar({ data }: { data: BranchCategoryData[] }) {
  const chartData = {
    labels: data.slice(0, 8).map(d => d.branch.split(' ')),
    datasets: [
      {
        label: 'Irregularity',
        data: data.slice(0, 8).map(d => d.Irregularity),
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
      {
        label: 'Complaint',
        data: data.slice(0, 8).map(d => d.Complaint),
        backgroundColor: '#f97316',
        borderRadius: 4,
      },
      {
        label: 'Compliment',
        data: data.slice(0, 8).map(d => d.Compliment),
        backgroundColor: '#22c55e',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { usePointStyle: true, padding: 15, font: { size: 10 } },
      },
    },
    scales: {
      x: {
        stacked: false,
        grid: { display: false },
        ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 },
      },
      y: {
        stacked: false,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 } },
        suggestedMax: data.length > 0 ? Math.max(...data.slice(0, 8).map(d => Math.max(d.Irregularity, d.Complaint, d.Compliment))) * 1.15 : undefined,
      },
    },
  };

  return (
    <div className="h-[300px]">
      <Bar data={chartData} options={options} plugins={[barLabelsPlugin]} />
    </div>
  );
}

function AirlineTop10Chart({ data }: { data: AirlineCategoryData[] }) {
  const chartData = {
    labels: data.map(d => d.airline.split(' ')),
    datasets: [
      {
        label: 'Irregularity',
        data: data.map(d => d.Irregularity),
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
      {
        label: 'Complaint',
        data: data.map(d => d.Complaint),
        backgroundColor: '#f97316',
        borderRadius: 4,
      },
      {
        label: 'Compliment',
        data: data.map(d => d.Compliment),
        backgroundColor: '#22c55e',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x' as const,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { usePointStyle: true, padding: 15, font: { size: 10 } },
      },
    },
    scales: {
      x: {
        stacked: false,
        grid: { display: false },
        ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 },
      },
      y: {
        stacked: false,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 } },
        suggestedMax: data.length > 0 ? Math.max(...data.map(d => Math.max(d.Irregularity, d.Complaint, d.Compliment))) * 1.15 : undefined,
      },
    },
  };

  return (
    <div className="h-[350px]">
      <Bar data={chartData} options={options} plugins={[barLabelsPlugin]} />
    </div>
  );
}


function DataTable({ data }: { data: ReportRecord[] }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('Date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
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
    saveAs(blob, 'report-by-case-category.csv');
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
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e3d] focus:border-transparent"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e3d]"
        >
          <option value="all">All Categories</option>
          <option value="Irregularity">Irregularity</option>
          <option value="Complaint">Complaint</option>
          <option value="Compliment">Compliment</option>
        </select>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[#6b8e3d] text-white rounded-lg text-sm font-medium hover:bg-[#5a7a3a] transition-colors"
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
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {col}
                    {sortField === col && (
                      <span className="text-[#6b8e3d]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, 100).map((row, idx) => (
              <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col} className="px-4 py-2.5 text-gray-700">
                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length > 100 && (
          <div className="p-3 text-center text-sm text-gray-500 bg-gray-50 border-t">
            Showing 100 of {filteredData.length} rows
          </div>
        )}
      </div>
    </div>
  );
}

function ManagementSummary({ 
  categoryData, 
  branchData 
}: { 
  categoryData: CategoryData[]; 
  branchData: BranchCategoryData[];
}) {
  const total = categoryData.reduce((sum, d) => sum + d.count, 0);
  const irregularity = categoryData.find(d => d.name === 'Irregularity');
  const complaint = categoryData.find(d => d.name === 'Complaint');
  const compliment = categoryData.find(d => d.name === 'Compliment');

  const topBranch = branchData[0];
  const topBranchPct = topBranch ? (topBranch.Irregularity / (topBranch.Irregularity + topBranch.Complaint + topBranch.Compliment)) * 100 : 0;

  const insights = [
    irregularity && `${irregularity.name} dominates ${irregularity.percentage.toFixed(1)}% of total reports.`,
    topBranch && `${topBranch.branch} contributes ${topBranchPct.toFixed(0)}% of total irregularity.`,
    compliment && compliment.percentage < 5 && `Compliment rate remains at ${compliment.percentage.toFixed(1)}% — improvement opportunity.`,
  ].filter(Boolean);

  if (insights.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-[var(--surface-1)] border border-[var(--accent-1)]/30 rounded-3xl p-6 shadow-spatial-md group"
    >
      <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-1)]/5 to-transparent pointer-events-none"></div>
      
      <div className="relative z-10">
        <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2 text-lg">
          <span className="text-xl">🏆</span> Management Summary
        </h3>
        <ul className="space-y-3">
          {insights.map((insight, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              <span className="text-[var(--accent-1)] mt-1 shrink-0">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export default function ReportByCaseCategoryDetail({ 
  filters = {},
  dateRange
}: { 
  filters?: FilterParams;
  dateRange?: { from: string; to: string };
}) {
  // Merge dateRange into filters for data fetching
  const effectiveFilters = useMemo(() => ({
    ...filters,
    ...(dateRange?.from ? { dateFrom: dateRange.from } : {}),
    ...(dateRange?.to ? { dateTo: dateRange.to } : {}),
  }), [filters, dateRange]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [branchData, setBranchData] = useState<BranchCategoryData[]>([]);
  const [airlineData, setAirlineData] = useState<AirlineCategoryData[]>([]);
  const [rootCauseData, setRootCauseData] = useState<RootCauseData[]>([]);
  const [tableData, setTableData] = useState<ReportRecord[]>([]);
  const [kpis, setKpis] = useState<CategoryKPIs | null>(null);
  const [aiRiskSummary, setAiRiskSummary] = useState<AiRiskSummary | null>(null);
  const [aiRiskHeatmap, setAiRiskHeatmap] = useState<any[]>([]);
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
    const rows = categoryData.map(item => ({ ...item })) as unknown as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [categoryData]);

  const [tableLoading, setTableLoading] = useState(false);

  useEffect(() => {
    async function loadAggregatedData() {
      setLoading(true);
      setError(null);

      try {
        const aggregated = await fetchAggregatedCaseCategory(effectiveFilters);

        setCategoryData(aggregated.categoryData);
        setTrendData(aggregated.trendData);
        setBranchData(aggregated.branchData);
        setAirlineData(aggregated.airlineData);
        setKpis(aggregated.kpis);
        
        // Load AI data separately to prevent blocking the main charts if it fails/times out
        fetchSeverityDistributionsAi().then(aiSeverityRes => {
          if (aiSeverityRes && aiSeverityRes.category) {
            const heatmapData = aiSeverityRes.category.flatMap(c => [
              { category: c.name, severity: 'Critical', count: c.critical },
              { category: c.name, severity: 'High', count: c.high },
              { category: c.name, severity: 'Medium', count: c.medium },
              { category: c.name, severity: 'Low', count: c.low },
            ]);
            setAiRiskHeatmap(heatmapData);
          }
        }).catch(err => {
          console.warn('AI Risk Heatmap failed to load (timeout or error):', err);
        });
      } catch (err) {
        console.error('Failed to load aggregated data:', err);
        setError('Failed to load primary chart data.');
      } finally {
        setLoading(false);
      }
    }

    loadAggregatedData();
  }, [effectiveFilters]);

  useEffect(() => {
    async function loadTableData() {
      setTableLoading(true);
      try {
        const table = await fetchAllReports(effectiveFilters);
        setTableData(table);
      } catch (err) {
        console.error('Failed to load table data:', err);
      } finally {
        setTableLoading(false);
      }
    }

    loadTableData();
  }, [effectiveFilters]);

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
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#6b8e3d] text-white rounded-lg text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const total = categoryData.reduce((sum, d) => sum + d.count, 0);
  const irregularity = categoryData.find(d => d.name === 'Irregularity');
  const complaint = categoryData.find(d => d.name === 'Complaint');
  const compliment = categoryData.find(d => d.name === 'Compliment');

  const netSentimentDenominator = (compliment?.count || 0) + (complaint?.count || 0);
  const netSentiment = netSentimentDenominator > 0
    ? (((compliment?.count || 0) - (complaint?.count || 0)) / netSentimentDenominator * 100).toFixed(1)
    : '0.0';
  
  const irregularityRate = irregularity && total > 0
    ? ((irregularity.count / total) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8">
      {/* Auto-Insight Block */}
      <AutoInsight categoryData={categoryData} total={total} />

      {/* Enhanced KPI Cards - Row 1 */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Reports"
            value={kpis.totalReports.toLocaleString('id-ID')}
            color="blue"
            explanation="Total laporan untuk kategori ini pada periode ini."
          />
          <KPICard
            title="Most Affected Branch"
            value={kpis.mostAffectedBranch.name}
            subtitle={`${kpis.mostAffectedBranch.count} reports`}
            color="red"
            explanation="Cabang dengan jumlah laporan terbanyak pada periode ini."
          />
          <KPICard
            title="Top Airline"
            value={kpis.topAirline.name}
            subtitle={`${kpis.topAirline.count} reports`}
            color="yellow"
            explanation="Maskapai dengan volume laporan tertinggi pada periode ini."
          />
          <KPICard
            title="Avg Resolution Time"
            value={kpis.avgResolutionTime > 0 ? `${kpis.avgResolutionTime}h` : 'N/A'}
            color="green"
            explanation="Rata-rata waktu penyelesaian resolusi untuk kasus-kasus yang dianalisis."
          />
        </div>
      )}

      {/* Primary Chart - Category Breakdown */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Category Breakdown</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CategoryBarChart data={categoryData} />
          </div>
          <div className="space-y-3">
            {categoryData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    item.name === 'Irregularity' ? 'bg-red-500' : 
                    item.name === 'Complaint' ? 'bg-orange-500' : 'bg-green-500'
                  }`} />
                  <span className="font-semibold text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-black text-gray-900">{item.count.toLocaleString('id-ID')}</div>
                  <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Monthly Trend */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Monthly Trend Analysis</h2>
        <MonthlyTrendChart data={trendData} />
      </section>

      {/* Split View: Branch & Airline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Category by Branch</h2>
          <BranchStackedBar data={branchData} />
        </section>
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Category by Airline (Top 10)</h2>
          <AirlineTop10Chart data={airlineData} />
        </section>
      </div>

      {/* AI Root Cause Investigation */}
      <section className="relative overflow-hidden bg-[var(--surface-1)]/50 backdrop-blur-xl rounded-3xl border border-[var(--surface-2)] p-8 shadow-spatial-md transition-all">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Root Cause Analysis</h2>
            <p className="text-slate-500 text-sm font-medium">Neural investigation into operational friction points.</p>
          </div>
        </div>
        <AiRootCauseInvestigation source={filters.sourceSheet === 'CGO' ? 'CGO' : 'NON CARGO'} />
      </section>

      {/* AI Risk Heatmap */}
      {aiRiskHeatmap.length > 0 && (
        <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm mt-6">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-800">AI Risk Heatmap</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">Proactive risk analysis by severity across categories (AI Service Data)</p>
          <div className="h-[400px]">
            <HeatmapChart 
              data={aiRiskHeatmap}
              xAxis="severity"
              yAxis="category"
              metric="count"
              showTitle={false}
            />
          </div>
        </section>
      )}

      {/* Management Summary */}
      <ManagementSummary categoryData={categoryData} branchData={branchData} />

      {/* Investigative Table */}
      <InvestigativeTable
        data={investigativeData}
        title="Investigative Table - Case Category Reports"
        rowsPerPage={5}
        maxRows={40}
      />

      {/* Data Table */}
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Full Data Table</h2>
        </div>
        <div className="p-6">
          <DataTableWithPagination 
          data={fullTableData} 
          title="Case Category Breakdown (Main Chart Source)"
          rowsPerPage={3}
        />
        </div>
      </section>
    </div>
  );
}
