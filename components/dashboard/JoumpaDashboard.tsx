'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, RefreshCw, Loader2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface JoumpaRecord {
  timestamp: string;
  email: string;
  date: string;
  airlines: string;
  flightNumber: string;
  branch: string;
  serviceType: string;
  category: string;
  evidence: string;
  report: string;
  reportBy: string;
  satisfactionRating: string;
  averageRating: string;
}

interface FilterState {
  serviceType: string;
  airlines: string;
  category: string;
  branch: string;
}

// ─── Color Tokens ──────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Compliment: '#4caf50',
  Complaint: '#f44336',
  Irregularity: '#ff9800',
};

const BAR_FILLS = ['#4caf50', '#f44336', '#ff9800'];

const HEADER_BG = '#4caf50';
const HEADER_TEXT = '#ffffff';

// ─── Date Parser (DD/MM/YYYY) ──────────────────────────────────────────────
// Complexity: Time O(1) | Space O(1)
function parseDateDMY(raw: string): Date | null {
  if (!raw) return null;
  const parts = raw.split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type YTickProps = { x: number; y: number; payload: { value: string | number } };
const WrappedYAxisTick = (props: YTickProps) => {
  const { x, y, payload } = props;
  const label = String(payload.value);
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  const maxLineLength = 20;

  words.forEach((word: string) => {
    if ((currentLine + word).length > maxLineLength) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  if (currentLine) lines.push(currentLine.trim());

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={-12}
          y={i * 11}
          dy={-((lines.length - 1) * 5.5)}
          textAnchor="end"
          fill="#475569"
          fontSize={10}
          fontWeight={700}
          className="tracking-tighter"
        >
          {line}
        </text>
      ))}
    </g>
  );
};

// ─── Component ─────────────────────────────────────────────────────────────
export function JoumpaDashboard(props?: { initialCategory?: string; readOnlyCategory?: boolean; backPath?: string }) {
  const { initialCategory, readOnlyCategory = false, backPath = '/dashboard/os' } = props || {};
  const router = useRouter();
  const [records, setRecords] = useState<JoumpaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    serviceType: '',
    airlines: '',
    category: initialCategory || '',
    branch: '',
  });

  const [detailPage, setDetailPage] = useState(0);
  const [serviceTypePage, setServiceTypePage] = useState(0);
  const DETAIL_PAGE_SIZE = 3;
  const SERVICE_TYPE_PAGE_SIZE = 5;

  // ─── Fetch ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filters.serviceType) params.set('service_type', filters.serviceType);
      if (filters.airlines) params.set('airlines', filters.airlines);
      if (filters.category) params.set('category', filters.category);
      if (filters.branch) params.set('branch', filters.branch);

      const res = await fetch(`/api/joumpa?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records ?? []);
      }
    } catch (err) {
      console.error('[JoumpaDashboard] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Derived: Filter Options ────────────────────────────────────────────
  // Complexity: Time O(n) | Space O(k) — k = unique values
  const filterOptions = useMemo(() => {
    const serviceTypes = new Set<string>();
    const airlines = new Set<string>();
    const categories = new Set<string>();
    const branches = new Set<string>();

    records.forEach(r => {
      if (r.serviceType) serviceTypes.add(r.serviceType);
      if (r.airlines) airlines.add(r.airlines);
      if (r.category) categories.add(r.category);
      if (r.branch) branches.add(r.branch);
    });

    return {
      serviceTypes: Array.from(serviceTypes).sort(),
      airlines: Array.from(airlines).sort(),
      categories: Array.from(categories).sort(),
      branches: Array.from(branches).sort(),
    };
  }, [records]);

  // ─── KPI Stats ──────────────────────────────────────────────────────────
  // Complexity: Time O(n) | Space O(k)
  const kpiStats = useMemo(() => {
    const uniqueBranches = new Set(records.map(r => r.branch).filter(Boolean));
    const uniqueAirlines = new Set(records.map(r => r.airlines).filter(Boolean));
    const complimentCount = records.filter(r => r.category === 'Compliment').length;

    return {
      totalReports: records.length,
      branchCount: uniqueBranches.size,
      airlinesCount: uniqueAirlines.size,
      complimentCount,
    };
  }, [records]);

  // ─── Case Category Data (Pie) ──────────────────────────────────────────
  // Complexity: Time O(n) | Space O(k)
  const caseCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      const cat = r.category || 'Unknown';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: CATEGORY_COLORS[name] || '#999',
    }));
  }, [records]);

  // ─── Monthly Report Data (Bar) ─────────────────────────────────────────
  // Complexity: Time O(n) | Space O(m) — m = unique months
  const monthlyReportData = useMemo(() => {
    const monthMap = new Map<string, Record<string, number>>();

    records.forEach(r => {
      const d = parseDateDMY(r.date);
      if (!d) return;
      const key = MONTHS[d.getMonth()];
      if (!monthMap.has(key)) monthMap.set(key, {});
      const entry = monthMap.get(key)!;
      const cat = r.category || 'Unknown';
      entry[cat] = (entry[cat] || 0) + 1;
    });

    return Array.from(monthMap.entries()).map(([month, cats]) => ({
      month,
      ...cats,
    }));
  }, [records]);

  // ─── JOUMPA Service Type Data ──────────────────────────────────────────
  // Complexity: Time O(n) | Space O(k)
  const serviceTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      const st = r.serviceType || 'Unknown';
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [records]);

  // ─── Branch Report Data ────────────────────────────────────────────────
  // Complexity: Time O(n) | Space O(b*c)
  const branchReportData = useMemo(() => {
    const branchMap: Record<string, Record<string, number>> = {};
    records.forEach(r => {
      const branch = r.branch || 'Unknown';
      const cat = r.category || 'Unknown';
      if (!branchMap[branch]) branchMap[branch] = {};
      branchMap[branch][cat] = (branchMap[branch][cat] || 0) + 1;
    });
    return Object.entries(branchMap)
      .map(([branch, catCounts]) => ({ branch, ...catCounts }))
      .sort((a, b) => {
        const totalA = Object.entries(a).reduce((s, [k, v]) => k !== 'branch' && typeof v === 'number' ? s + v : s, 0);
        const totalB = Object.entries(b).reduce((s, [k, v]) => k !== 'branch' && typeof v === 'number' ? s + v : s, 0);
        return totalB - totalA;
      });
  }, [records]);

  // ─── Category by Airlines Data ─────────────────────────────────────────
  // Complexity: Time O(n) | Space O(a*c)
  const categoryByAirlinesData = useMemo(() => {
    const airlineMap: Record<string, Record<string, number>> = {};
    records.forEach(r => {
      const airline = r.airlines || 'Unknown';
      const cat = r.category || 'Unknown';
      if (!airlineMap[airline]) airlineMap[airline] = {};
      airlineMap[airline][cat] = (airlineMap[airline][cat] || 0) + 1;
    });
    return Object.entries(airlineMap)
      .map(([airline, catCounts]) => ({ airline, ...catCounts }))
      .sort((a, b) => {
        const totalA = Object.entries(a).reduce((s, [k, v]) => k !== 'airline' && typeof v === 'number' ? s + v : s, 0);
        const totalB = Object.entries(b).reduce((s, [k, v]) => k !== 'airline' && typeof v === 'number' ? s + v : s, 0);
        return totalB - totalA;
      });
  }, [records]);

  // ─── All unique categories for bar chart keys ──────────────────────────
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    records.forEach(r => { if (r.category) cats.add(r.category); });
    return Array.from(cats);
  }, [records]);

  // ─── Detail Table Pagination ───────────────────────────────────────────
  const detailTotalPages = Math.max(1, Math.ceil(records.length / DETAIL_PAGE_SIZE));
  const detailSlice = records.slice(detailPage * DETAIL_PAGE_SIZE, (detailPage + 1) * DETAIL_PAGE_SIZE);

  const serviceTypeTotalPages = Math.max(1, Math.ceil(serviceTypeData.length / SERVICE_TYPE_PAGE_SIZE));
  const serviceTypeSlice = serviceTypeData.slice(
    serviceTypePage * SERVICE_TYPE_PAGE_SIZE,
    (serviceTypePage + 1) * SERVICE_TYPE_PAGE_SIZE
  );

  const maxServiceTypeTotal = useMemo(() => Math.max(...serviceTypeData.map(s => s.total), 1), [serviceTypeData]);

  // ─── Format date for display ───────────────────────────────────────────
  const formatDate = (raw: string) => {
    const d = parseDateDMY(raw);
    if (!d) return raw;
    return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  };

  // ─── Loading State ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div
          className="w-12 h-12 rounded-full border-4 animate-spin"
          style={{ borderColor: '#e0e0e0', borderTopColor: HEADER_BG }}
        />
        <p className="text-sm text-gray-500 mt-4 uppercase tracking-widest font-bold">
          Loading JOUMPA Dashboard...
        </p>
      </div>
    );
  }

  const headerTitle = (readOnlyCategory && initialCategory) ? `${initialCategory} Report` : 'Irregularity, Complain & Compliment Report';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push(backPath)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-3 flex-1">
            <img src="/gapura-logo.png" alt="Gapura" className="h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div
              className="px-6 py-2 rounded-lg text-white font-bold text-sm md:text-base"
              style={{ backgroundColor: HEADER_BG }}
            >
              {headerTitle}
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* ─── Filter Row ────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <FilterDropdown
            label="Joumpa Service Type"
            value={filters.serviceType}
            options={filterOptions.serviceTypes}
            onChange={v => { setFilters(f => ({ ...f, serviceType: v })); setDetailPage(0); }}
          />
          <FilterDropdown
            label="Airlines"
            value={filters.airlines}
            options={filterOptions.airlines}
            onChange={v => { setFilters(f => ({ ...f, airlines: v })); setDetailPage(0); }}
          />
          {!readOnlyCategory && (
            <FilterDropdown
              label="Category Report"
              value={filters.category}
              options={filterOptions.categories}
              onChange={v => { setFilters(f => ({ ...f, category: v })); setDetailPage(0); }}
            />
          )}
          <FilterDropdown
            label="Branch"
            value={filters.branch}
            options={filterOptions.branches}
            onChange={v => { setFilters(f => ({ ...f, branch: v })); setDetailPage(0); }}
          />
        </div>
      </div>

      <div className="px-4 md:px-6 py-6 space-y-6">
        {/* ─── KPI Row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Report" value={kpiStats.totalReports} color="#4caf50" />
          <KPICard label="Branch" value={kpiStats.branchCount} color="#2196f3" />
          <KPICard label="Airlines" value={kpiStats.airlinesCount} color="#ff9800" />
          <KPICard label="Compliment Report" value={kpiStats.complimentCount} color="#4caf50" />
        </div>

        {/* ─── Main Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Case Category Report (Pie) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-base font-bold text-gray-800 mb-4">Case Category Report</h3>
            <div className="flex items-center justify-center" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={caseCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    dataKey="value"
                    label={({ value }: { value: number }) => `${value}`}
                    labelLine={false}
                  >
                    {caseCategoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detail Report (Table) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:col-span-1">
            <h3 className="text-base font-bold text-gray-800 mb-4">Detail Report</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: HEADER_BG }}>
                    {['', 'Date', 'Category', 'Branch', 'Airlines', 'Flight Number', 'Report', 'Supporting Evidence'].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-semibold" style={{ color: HEADER_TEXT }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detailSlice.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-2 text-gray-500">{detailPage * DETAIL_PAGE_SIZE + i + 1}.</td>
                      <td className="px-2 py-2 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="px-2 py-2">{r.category}</td>
                      <td className="px-2 py-2">{r.branch}</td>
                      <td className="px-2 py-2">{r.airlines}</td>
                      <td className="px-2 py-2">{r.flightNumber}</td>
                      <td className="px-2 py-2 max-w-[200px] truncate" title={r.report}>{r.report || 'null'}</td>
                      <td className="px-2 py-2">
                        {r.evidence ? (
                          <a href={r.evidence.split(',')[0].trim()} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            <ExternalLink size={12} />
                            Link
                          </a>
                        ) : 'null'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>{detailPage * DETAIL_PAGE_SIZE + 1} - {Math.min((detailPage + 1) * DETAIL_PAGE_SIZE, records.length)} / {records.length}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setDetailPage(p => Math.max(0, p - 1))} disabled={detailPage === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setDetailPage(p => Math.min(detailTotalPages - 1, p + 1))} disabled={detailPage >= detailTotalPages - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Monthly Report (Bar) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col">
            <h3 className="text-base font-bold text-gray-800 mb-4">Monthly Report</h3>
            <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(220, monthlyReportData.length * 60) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={monthlyReportData}
                    layout="vertical"
                    margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                    barCategoryGap="40%"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis 
                      type="category"
                      dataKey="month" 
                      tick={(p: unknown) => <WrappedYAxisTick {...(p as YTickProps)} />}
                      width={110} 
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <Tooltip />
                    <Legend />
                    {allCategories.map((cat, i) => (
                      <Bar key={cat} dataKey={cat} fill={CATEGORY_COLORS[cat] || BAR_FILLS[i % BAR_FILLS.length]} radius={[0, 4, 4, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom Grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* JOUMPA Service Type (Table) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-base font-bold text-gray-800 mb-4">JOUMPA Service Type</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-left font-semibold text-gray-600 w-8"></th>
                  <th className="py-2 text-left font-semibold text-gray-600">Service Type</th>
                  <th className="py-2 text-left font-semibold text-gray-600">Total ▼</th>
                </tr>
              </thead>
              <tbody>
                {serviceTypeSlice.map((st, i) => (
                  <tr key={st.name} className="border-b border-gray-50">
                    <td className="py-2 text-gray-400">{serviceTypePage * SERVICE_TYPE_PAGE_SIZE + i + 1}.</td>
                    <td className="py-2">{st.name}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-medium w-6">{st.total}</span>
                        <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${(st.total / maxServiceTypeTotal) * 100}%`,
                              backgroundColor: HEADER_BG,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>{serviceTypePage * SERVICE_TYPE_PAGE_SIZE + 1} - {Math.min((serviceTypePage + 1) * SERVICE_TYPE_PAGE_SIZE, serviceTypeData.length)} / {serviceTypeData.length}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setServiceTypePage(p => Math.max(0, p - 1))} disabled={serviceTypePage === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setServiceTypePage(p => Math.min(serviceTypeTotalPages - 1, p + 1))} disabled={serviceTypePage >= serviceTypeTotalPages - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Branch Report (Bar) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col">
            <h3 className="text-base font-bold text-gray-800 mb-4">Branch Report</h3>
            <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(220, branchReportData.length * 60) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={branchReportData}
                    layout="vertical"
                    margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                    barCategoryGap="40%"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis 
                      type="category"
                      dataKey="branch" 
                      tick={(p: unknown) => <WrappedYAxisTick {...(p as YTickProps)} />}
                      width={110}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <Tooltip />
                    <Legend />
                    {allCategories.map((cat, i) => (
                      <Bar key={cat} dataKey={cat} fill={CATEGORY_COLORS[cat] || BAR_FILLS[i % BAR_FILLS.length]} radius={[0, 4, 4, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Category by Airlines (Bar) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col">
            <h3 className="text-base font-bold text-gray-800 mb-4">Category by Airlines</h3>
            <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(220, categoryByAirlinesData.length * 60) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={categoryByAirlinesData}
                    layout="vertical"
                    margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                    barCategoryGap="40%"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis 
                      type="category"
                      dataKey="airline" 
                      tick={(p: unknown) => <WrappedYAxisTick {...(p as YTickProps)} />}
                      width={110}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <Tooltip />
                    <Legend />
                    {allCategories.map((cat, i) => (
                      <Bar key={cat} dataKey={cat} fill={CATEGORY_COLORS[cat] || BAR_FILLS[i % BAR_FILLS.length]} radius={[0, 4, 4, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: number;
  color: string;
}

function KPICard({ label, value, color }: KPICardProps) {
  return (
    <div className="text-center py-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ color }}>{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
    </div>
  );
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent appearance-none cursor-pointer"
      style={{ minWidth: 140 }}
    >
      <option value="">{label} ▼</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}
