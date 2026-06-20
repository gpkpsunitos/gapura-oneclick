'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Report } from '@/types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Loader2 } from 'lucide-react';
import { AiRootCauseInvestigation } from '../ai-root-cause/AiRootCauseInvestigation';
import { InvestigativeTable } from '@/components/chart-detail/InvestigativeTable';
import type { QueryResult } from '@/types/builder';
import { fetchRootCauseStatsAi, fetchRootCauseCategories } from '@/lib/services/gapura-ai';

type CategoryField = 'terminal_area_category' | 'apron_area_category' | 'general_category';

interface FilterParams {
  hub?: string;
  branch?: string;
  airlines?: string;
  area?: string;
  sourceSheet?: 'NON CARGO' | 'CGO';
  dateFrom?: string;
  dateTo?: string;
}

interface AreaSubCategoryDetailProps {
  filters: FilterParams;
  categoryField: CategoryField;
  title: string;
  subtitle: string;
}

const INVALID_VALUES = new Set(['', '-', 'nil', 'none', 'unknown', 'n/a', '#n/a', 'null']);
const CATEGORY_COLORS = ['#2e7d32', '#43a047', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'];
const CONTEXT_META: Record<
  CategoryField,
  {
    singular: string;
    plural: string;
    insightLabel: string;
    footerLabel: string;
  }
> = {
  terminal_area_category: {
    singular: 'terminal area category',
    plural: 'terminal area categories',
    insightLabel: 'Terminal Insight',
    footerLabel: 'Total filtered terminal-area records',
  },
  apron_area_category: {
    singular: 'apron area category',
    plural: 'apron area categories',
    insightLabel: 'Apron Insight',
    footerLabel: 'Total filtered apron-area records',
  },
  general_category: {
    singular: 'general category',
    plural: 'general categories',
    insightLabel: 'General Insight',
    footerLabel: 'Total filtered general-category records',
  },
};

function cleanLabel(value: unknown): string {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidLabel(value: unknown): boolean {
  const normalized = cleanLabel(value).toLowerCase();
  return normalized.length > 0 && !INVALID_VALUES.has(normalized);
}

function monthKey(value: unknown): string {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function displayMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function normalizeMainCategory(value: unknown): 'Irregularity' | 'Complaint' | 'Compliment' | 'Other' {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('irregular')) return 'Irregularity';
  if (normalized.includes('complain')) return 'Complaint';
  if (normalized.includes('compliment')) return 'Compliment';
  return 'Other';
}

function parseEventDate(report: Report): number {
  const d = new Date(String(report.date_of_event || report.incident_date || report.created_at || ''));
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function HeatCell({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? value / max : 0;
  const alpha = value === 0 ? 0.07 : Math.min(0.95, 0.2 + ratio * 0.75);
  const background = `rgba(67, 160, 71, ${alpha})`;
  const color = alpha > 0.55 ? '#ffffff' : '#1f2937';

  return (
    <div
      className="h-8 rounded-md flex items-center justify-center text-[11px] font-bold"
      style={{ background, color }}
      title={`${value}`}
    >
      {value || '-'}
    </div>
  );
}

function KPICard({ title, value, color = 'blue' }: { title: string; value: string | number; color?: 'green' | 'blue' | 'amber' | 'red' }) {
  const colorClasses = {
    green: 'bg-[var(--surface-1)] border-emerald-500/20 text-emerald-400',
    red: 'bg-[var(--surface-1)] border-red-500/20 text-red-400',
    amber: 'bg-[var(--surface-1)] border-amber-500/20 text-amber-400',
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
      <div className="absolute inset-0 bg-noise opacity-[0.02] mix-blend-overlay pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{title}</div>
        <div className="text-2xl font-black tracking-tight">{value}</div>
      </div>
    </motion.div>
  );
}


export default function AreaSubCategoryDetail({
  filters,
  categoryField,
  title,
  subtitle,
}: AreaSubCategoryDetailProps) {
  const contextMeta = CONTEXT_META[categoryField];
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'loading' | 'success' | 'error' | 'timeout'>('loading');
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [focusedCategory, setFocusedCategory] = useState<string>('');
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (filters.dateFrom) query.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) query.append('dateTo', filters.dateTo);
        if (filters.hub && filters.hub !== 'all') query.append('hub', filters.hub);
        if (filters.branch && filters.branch !== 'all') query.append('branch', filters.branch);
        if (filters.area && filters.area !== 'all') query.append('area', filters.area);
        if (filters.airlines && filters.airlines !== 'all') query.append('airlines', filters.airlines);
        if (filters.sourceSheet) query.append('sourceSheet', filters.sourceSheet);
        
        // Field projection to minimize payload
        const fields = [
          'id', 'date_of_event', 'incident_date', 'created_at', 'hub', 'branch', 
          'reporting_branch', 'station_code', 'airlines', 'airline', 'area',
          categoryField, 'main_category', 'category', 'irregularity_complain_category',
          'severity', 'status', 'root_caused', 'action_taken', 'source_sheet'
        ];
        query.append('fields', fields.join(','));

        const response = await fetch(`/api/reports/analytics?${query.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch reports');
        const data = await response.json();
        setReports(data.reports || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [filters.hub, filters.branch, filters.airlines, filters.area, filters.sourceSheet, filters.dateFrom, filters.dateTo, categoryField]);

  useEffect(() => {
    if (!reports.length) {
      setAiLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setAiLoading(true);
        setAiStatus('loading');

        // Set timeout for UI status only (the fetch has its own 60s/120s timeout)
        aiTimeoutRef.current = setTimeout(() => {
          setAiStatus('timeout');
        }, 48000);

        const [statsData, categoriesData] = await Promise.all([
          fetchRootCauseStatsAi(filters.sourceSheet, controller.signal),
          fetchRootCauseCategories(controller.signal)
        ]);

        if (aiTimeoutRef.current) {
          clearTimeout(aiTimeoutRef.current);
          aiTimeoutRef.current = null;
        }

        setAiData({ stats: statsData, categories: categoriesData });
        setAiStatus('success');
      } catch (err: any) {
        if (err.name === 'AbortError') return;

        if (aiTimeoutRef.current) {
          clearTimeout(aiTimeoutRef.current);
          aiTimeoutRef.current = null;
        }

        console.error('AI Root Cause Fetch Error:', err);
        setAiError(err.message || 'Failed to load AI intelligence data');
        setAiStatus('error');
      } finally {
        if (!controller.signal.aborted) {
          setAiLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [reports, filters.sourceSheet]);

  const handleRetryAi = () => {
    setAiLoading(true);
    setAiError(null);
    setAiStatus('loading');
    setAiData(null);
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const sourceSheet = filters.sourceSheet || 'NON CARGO';
      if (sourceSheet === 'CGO') {
        if (r.source_sheet !== 'CGO') return false;
      } else if (r.source_sheet === 'CGO') {
        return false;
      }

      if (filters.hub && filters.hub !== 'all' && cleanLabel(r.hub) !== filters.hub) return false;
      if (filters.branch && filters.branch !== 'all' && cleanLabel(r.branch) !== filters.branch) return false;

      const airline = cleanLabel(r.airlines || r.airline);
      if (filters.airlines && filters.airlines !== 'all' && airline !== filters.airlines) return false;

      if (filters.area && filters.area !== 'all' && cleanLabel(r.area) !== filters.area) return false;

      return isValidLabel(r[categoryField]);
    });
  }, [reports, filters, categoryField]);

  const categoryRanking = useMemo(() => {
    const map = new Map<string, number>();
    filteredReports.forEach((r) => {
      const key = cleanLabel(r[categoryField]);
      if (!isValidLabel(key)) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    const total = filteredReports.length || 1;
    return Array.from(map.entries())
      .map(([category, count]) => ({
        category,
        count,
        share: (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredReports, categoryField]);

  const topCategory = categoryRanking[0];
  const topCategoryShare = topCategory ? topCategory.share : 0;

  useEffect(() => {
    if (!focusedCategory && categoryRanking.length > 0 && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
      setFocusedCategory(categoryRanking[0].category);
      return;
    }
    if (focusedCategory && !categoryRanking.some((c) => c.category === focusedCategory)) {
      hasAutoSelected.current = false;
      setFocusedCategory(categoryRanking[0]?.category || '');
    }
  }, [categoryRanking, focusedCategory]);

  const topCategories = useMemo(() => categoryRanking.slice(0, 3).map((c) => c.category), [categoryRanking]);

  const monthlyTrend = useMemo(() => {
    const monthMap = new Map<string, Record<string, number>>();
    filteredReports.forEach((r) => {
      const cat = cleanLabel(r[categoryField]);
      if (!topCategories.includes(cat)) return;
      const key = monthKey(r.date_of_event || r.incident_date || r.created_at);
      if (!key) return;
      if (!monthMap.has(key)) monthMap.set(key, {});
      const obj = monthMap.get(key)!;
      obj[cat] = (obj[cat] || 0) + 1;
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, bucket]) => ({
        month,
        monthLabel: displayMonth(month),
        ...topCategories.reduce<Record<string, number>>((acc, c) => {
          acc[c] = bucket[c] || 0;
          return acc;
        }, {}),
      }));
  }, [filteredReports, categoryField, topCategories]);

  const branchHeatmap = useMemo(() => {
    const branchMap = new Map<string, number>();
    filteredReports.forEach((r) => {
      const branch = cleanLabel(r.branch || r.reporting_branch || r.station_code);
      if (!isValidLabel(branch)) return;
      branchMap.set(branch, (branchMap.get(branch) || 0) + 1);
    });

    const topBranches = Array.from(branchMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([branch]) => branch);

    const cols = categoryRanking.slice(0, 6).map((c) => c.category);
    const cells = new Map<string, number>();
    let max = 0;

    filteredReports.forEach((r) => {
      const branch = cleanLabel(r.branch || r.reporting_branch || r.station_code);
      const category = cleanLabel(r[categoryField]);
      if (!topBranches.includes(branch) || !cols.includes(category)) return;
      const key = `${branch}::${category}`;
      const next = (cells.get(key) || 0) + 1;
      cells.set(key, next);
      if (next > max) max = next;
    });

    return { branches: topBranches, categories: cols, cells, max };
  }, [filteredReports, categoryRanking, categoryField]);

  const airlineContribution = useMemo(() => {
    const airlineMap = new Map<string, number>();
    filteredReports.forEach((r) => {
      const airline = cleanLabel(r.airlines || r.airline);
      if (!isValidLabel(airline)) return;
      airlineMap.set(airline, (airlineMap.get(airline) || 0) + 1);
    });

    const topAirlines = Array.from(airlineMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([airline]) => airline);

    return topAirlines.map((airline) => {
      const row: Record<string, string | number> = { airline };
      topCategories.forEach((cat) => {
        row[cat] = filteredReports.filter((r) => cleanLabel(r[categoryField]) === cat && cleanLabel(r.airlines || r.airline) === airline).length;
      });
      row.total = topCategories.reduce((sum, cat) => sum + Number(row[cat] || 0), 0);
      return row;
    });
  }, [filteredReports, topCategories, categoryField]);

  const focusedReports = useMemo(() => {
    if (!focusedCategory) return filteredReports;
    return filteredReports.filter((r) => cleanLabel(r[categoryField]) === focusedCategory);
  }, [filteredReports, focusedCategory, categoryField]);

  const rootCausePareto = useMemo(() => {
    const map = new Map<string, number>();
    focusedReports.forEach((r) => {
      const cause = cleanLabel(r.root_caused);
      if (!isValidLabel(cause)) return;
      map.set(cause, (map.get(cause) || 0) + 1);
    });

    const total = focusedReports.length || 1;
    let running = 0;
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cause, count]) => {
        running += count;
        return {
          cause,
          count,
          cumulative: (running / total) * 100,
        };
      });
  }, [focusedReports]);

  const severityData = useMemo(() => {
    const map = new Map<string, number>();
    focusedReports.forEach((r) => {
      const key = cleanLabel(r.severity || 'Unknown').toUpperCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [focusedReports]);

  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    focusedReports.forEach((r) => {
      const key = cleanLabel(r.status || 'Unknown');
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [focusedReports]);

  const queryResult = useMemo<QueryResult>(() => {
    const columns = [
      'date_of_event',
      'branch',
      'airlines',
      categoryField,
      'category',
      'severity',
      'status',
      'root_caused',
      'action_taken',
    ];

    const rows = [...focusedReports]
      .sort((a, b) => parseEventDate(b) - parseEventDate(a))
      .map((r) => ({
        date_of_event: String(r.date_of_event || r.incident_date || r.created_at || ''),
        branch: cleanLabel(r.branch || r.reporting_branch || r.station_code),
        airlines: cleanLabel(r.airlines || r.airline),
        [categoryField]: cleanLabel(r[categoryField]),
        category: normalizeMainCategory(
          r.main_category || r.category || r.irregularity_complain_category,
        ),
        severity: cleanLabel(r.severity || ''),
        status: cleanLabel(r.status || ''),
        root_caused: cleanLabel(r.root_caused) || '-',
        action_taken: cleanLabel(r.action_taken) || '-',
      }));

    return { columns, rows, rowCount: rows.length, executionTimeMs: 0 };
  }, [focusedReports, categoryField]);

  const irregularityCount = useMemo(
    () => filteredReports.filter((r) => normalizeMainCategory(r.main_category || r.category || r.irregularity_complain_category) === 'Irregularity').length,
    [filteredReports]
  );
  const complaintCount = useMemo(
    () => filteredReports.filter((r) => normalizeMainCategory(r.main_category || r.category || r.irregularity_complain_category) === 'Complaint').length,
    [filteredReports]
  );


  if (loading) {
    return (
      <div className="min-h-[45vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading {title} detail...
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight">{title}</h2>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
      {/* AI Root Cause Investigation */}
      <section className="relative overflow-hidden bg-[var(--surface-1)]/50 backdrop-blur-xl rounded-3xl border border-[var(--surface-2)] p-8 shadow-spatial-md transition-all">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Root Cause Analysis</h2>
            <p className="text-slate-500 text-sm font-medium">Neural investigation into {contextMeta.singular} operational friction.</p>
          </div>
        </div>
        <AiRootCauseInvestigation source={filters.sourceSheet === 'CGO' ? 'CGO' : 'NON CARGO'} />
      </section>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">{contextMeta.insightLabel}</p>
        <p className="mt-1 text-sm font-semibold text-emerald-900">
          {topCategory
            ? `${topCategory.category} leads ${contextMeta.plural} with ${topCategory.count.toLocaleString('id-ID')} reports (${topCategoryShare.toFixed(1)}%).`
            : `No ${contextMeta.singular} data available for the current filter.`}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Reports" value={filteredReports.length.toLocaleString('id-ID')} color="green" />
        <KPICard title="Distinct Branches" value={new Set(filteredReports.map((r) => cleanLabel(r.branch || r.reporting_branch || r.station_code)).filter(isValidLabel)).size.toLocaleString('id-ID')} color="blue" />
        <KPICard title="Distinct Airlines" value={new Set(filteredReports.map((r) => cleanLabel(r.airlines || r.airline)).filter(isValidLabel)).size.toLocaleString('id-ID')} color="amber" />
        <KPICard
          title="Irregularity Rate"
          value={`${filteredReports.length ? ((irregularityCount / filteredReports.length) * 100).toFixed(1) : '0.0'}%`}
          color="red"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[var(--surface-1)] border border-[var(--surface-2)] rounded-3xl p-6 shadow-spatial-sm"
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">{contextMeta.singular} ranking (Top 10)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryRanking.slice(0, 10)} layout="vertical" margin={{ top: 8, right: 20, left: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="category" width={180} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2e7d32" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[var(--surface-1)] border border-[var(--surface-2)] rounded-3xl p-6 shadow-spatial-sm"
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Monthly trend (Top 3 {contextMeta.plural})</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {topCategories.map((cat, idx) => (
                <Line key={cat} type="monotone" dataKey={cat} stroke={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} strokeWidth={2.3} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[var(--surface-1)] border border-[var(--surface-2)] rounded-3xl p-6 shadow-spatial-sm"
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Branch x {contextMeta.singular} hotspot</h3>
        <div className="overflow-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="sticky left-0 bg-[var(--surface-1)] text-left text-[10px] uppercase tracking-wide text-[var(--text-secondary)] min-w-[140px]">Branch</th>
                {branchHeatmap.categories.map((cat) => (
                  <th key={cat} className="text-[10px] font-bold text-[var(--text-secondary)] min-w-[90px] max-w-[140px] whitespace-normal break-words">
                    {cat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branchHeatmap.branches.map((branch) => (
                <tr key={branch}>
                  <td className="sticky left-0 bg-[var(--surface-1)] text-[11px] font-semibold text-[var(--text-primary)]">{branch}</td>
                  {branchHeatmap.categories.map((cat) => {
                    const value = branchHeatmap.cells.get(`${branch}::${cat}`) || 0;
                    return (
                      <td key={cat}>
                        <HeatCell value={value} max={branchHeatmap.max} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[var(--surface-1)] border border-[var(--surface-2)] rounded-3xl p-6 shadow-spatial-sm"
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Airline Contribution (Top 8)</h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={airlineContribution} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="airline" width={170} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {topCategories.map((cat, idx) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} radius={idx === topCategories.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Focused root cause & risk section removed as per request for Terminal, Apron, and General categories */}

      {/* ── Sub-Category Picker ── */}
      {categoryRanking.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--surface-1)] border border-[var(--surface-2)] rounded-3xl p-6 shadow-spatial-sm"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4">
            Filter table by {contextMeta.singular}
          </p>
          <div className="flex flex-wrap gap-2">
            {/* "All" pill — only shown when there are 2+ categories */}
            {categoryRanking.length > 1 && (
              <button
                type="button"
                aria-pressed={focusedCategory === ''}
                onClick={() => setFocusedCategory('')}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                  focusedCategory === ''
                    ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-md shadow-[var(--brand-primary)]/20'
                    : 'bg-[var(--surface-0)] text-[var(--text-secondary)] border-[var(--surface-2)] hover:bg-[var(--surface-2)]'
                }`}
              >
                All · {filteredReports.length.toLocaleString('id-ID')}
              </button>
            )}

            {/* One pill per sub-category */}
            {categoryRanking.map(({ category, count }) => (
              <button
                key={category}
                type="button"
                aria-pressed={focusedCategory === category}
                onClick={() => setFocusedCategory(category)}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                  focusedCategory === category
                    ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-md shadow-[var(--brand-primary)]/20'
                    : 'bg-[var(--surface-0)] text-[var(--text-secondary)] border-[var(--surface-2)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {category} · {count.toLocaleString('id-ID')}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--surface-1)] border border-[var(--surface-2)] rounded-3xl p-6 shadow-spatial-sm overflow-hidden"
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">
          Full Data Table{focusedCategory ? ` — ${focusedCategory}` : ''}
        </h3>
        <InvestigativeTable
          title={focusedCategory || title}
          data={queryResult}
          className="shadow-none border-0 bg-transparent"
        />
      </motion.div>

      <div className="text-[11px] text-gray-400 font-medium">
        {contextMeta.footerLabel}: {filteredReports.length.toLocaleString('id-ID')} | Complaint: {complaintCount.toLocaleString('id-ID')}
      </div>
    </div>
  );
}
