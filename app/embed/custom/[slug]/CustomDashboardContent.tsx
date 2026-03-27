'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChartPreview } from '@/components/builder/ChartPreview';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronDown as ChevronDownIcon, X, Download, FileSpreadsheet, Presentation, LayoutGrid, Box, Menu, Calendar, ArrowLeft } from 'lucide-react';
import { DynamicFilterHeader, type FilterData } from '@/components/builder/DynamicFilterHeader';
import { processQuery } from '@/lib/engine/query-processor';
import { useReportsData } from '@/hooks/use-reports-cache';
import type { QueryResult, QueryDefinition, ChartType, ChartVisualization, QueryFilter, DashboardTile, TileLayout } from '@/types/builder';
import { cn } from '@/lib/utils';
import { CustomerFeedbackView } from '@/components/dashboard/customer-feedback/CustomerFeedbackView';

// ─── Branding Palette ───────────────────────────────────────────────────────
const GREEN_PALETTE = ['#7cb342', '#558b2f', '#aed581', '#33691e', '#9ccc65', '#689f38', '#c5e1a5', '#43a047', '#81c784', '#4caf50'];

const FILTER_FIELDS = [
  { key: 'hub', label: 'HUB', table: 'reports', field: 'hub' },
  { key: 'branch', label: 'Branch', table: 'reports', field: 'branch' },
  { key: 'maskapai', label: 'Maskapai', table: 'reports', field: 'jenis_maskapai' },
  { key: 'airline', label: 'Airlines', table: 'reports', field: 'airlines' },
  { key: 'main_category', label: 'Kategori', table: 'reports', field: 'category' },
  { key: 'area', label: 'Area', table: 'reports', field: 'area' },
  { key: 'target_division', label: 'Divisi', table: 'reports', field: 'target_division' },
  { key: 'severity', label: 'Severity', table: 'reports', field: 'severity' },
  { key: 'status', label: 'Status', table: 'reports', field: 'status' },
];

interface ChartData {
  id: string;
  title: string;
  chart_type: string;
  data_field: string;
  width: string;
  position: number;
  query_config?: QueryDefinition;
  visualization_config?: ChartVisualization;
  layout?: { x: number; y: number; w: number; h: number };
  page_name?: string;
}

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  config: {
    dateRange?: string;
    autoRefresh?: boolean;
    dateFrom?: string;
    dateTo?: string;
    subtitle?: string;
    filters?: string[];
    pages?: string[];
    hideControls?: boolean;
  };
  dashboard_charts: ChartData[];
}

interface ChartResult {
  type: 'legacy' | 'query';
  stats?: {
    distribution: { name: string; count: number; percentage: number }[];
    totalCount: number;
    trendData: { date: string; count: number }[];
  };
  queryResult?: QueryResult;
}

function greenify(viz: ChartVisualization): ChartVisualization {
  return { ...viz, colors: GREEN_PALETTE };
}

export function CustomDashboardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const range = searchParams.get('range') || '7d';

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [chartsData, setChartsData] = useState<Map<string, ChartResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const dashboardRef = useRef<Dashboard | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterData>({});
  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pptx' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const { reports: allReports } = useReportsData('/api/admin/reports');

  // ─── Lifecycle: Sync state with URL params ──────────────────────────────────
  useEffect(() => {
    const pageIndex = searchParams.get('pageIndex');
    if (pageIndex !== null) {
      setActivePage(parseInt(pageIndex, 10) || 0);
    }

    const filters: FilterData = {};
    FILTER_FIELDS.forEach(ff => {
      const val = searchParams.get(ff.key);
      if (val) filters[ff.key] = val;
    });
    if (Object.keys(filters).length > 0) {
      setActiveFilters(prev => ({ ...prev, ...filters }));
    }

    const from = searchParams.get('dateFrom');
    const to = searchParams.get('dateTo');
    if (from) setDateFrom(from);
    if (to) setDateTo(to);
  }, [searchParams]);

  // ─── Lifecycle / Fetching ─────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboards?slug=${slug}&t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
      if (!res.ok) {
        if (res.status === 403) {
          setError('Akses ditolak');
          return null;
        }
        throw new Error('Dashboard not found');
      }
      const data = await res.json();
      setDashboard(data);
      if (data.config?.dateFrom && !searchParams.get('dateFrom')) setDateFrom(data.config.dateFrom);
      if (data.config?.dateTo && !searchParams.get('dateTo')) setDateTo(data.config.dateTo);
      setFiltersInitialized(true);
      return data as Dashboard;
    } finally {
      setLoading(false);
    }
  }, [slug, searchParams]);

  // Sync state to URL params
  useEffect(() => {
    if (!filtersInitialized) return;
    
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    Object.entries(activeFilters).forEach(([key, val]) => {
      if (val && val !== 'all' && params.get(key) !== val) {
        params.set(key, val);
        changed = true;
      } else if ((!val || val === 'all') && params.has(key)) {
        params.delete(key);
        changed = true;
      }
    });

    if (dateFrom && params.get('dateFrom') !== dateFrom) {
      params.set('dateFrom', dateFrom);
      changed = true;
    }
    if (dateTo && params.get('dateTo') !== dateTo) {
      params.set('dateTo', dateTo);
      changed = true;
    }
    if (activePage > 0 && params.get('pageIndex') !== activePage.toString()) {
      params.set('pageIndex', activePage.toString());
      changed = true;
    } else if (activePage === 0 && params.has('pageIndex')) {
      params.delete('pageIndex');
      changed = true;
    }

    if (changed) {
      const query = params.toString();
      router.replace(`${window.location.pathname}${query ? `?${query}` : ''}`, { scroll: false });
    }
  }, [activeFilters, dateFrom, dateTo, activePage, filtersInitialized, router, searchParams]);

  const applyFiltersToQuery = useCallback((queryConfig: QueryDefinition): QueryDefinition => {
    const extraFilters = Object.entries(activeFilters)
      .filter(([, val]) => val && val !== 'all')
      .map(([key, val]) => {
        const ff = FILTER_FIELDS.find(f => f.key === key);
        return ff ? {
          table: ff.table,
          field: ff.field,
          operator: 'eq' as const,
          value: val,
          conjunction: 'AND' as const,
        } : null;
      })
      .filter(Boolean);

    const dateFilters: QueryFilter[] = [];
    if (dateFrom) {
      dateFilters.push({
        table: 'reports',
        field: 'created_at',
        operator: 'gte' as const,
        value: dateFrom,
        conjunction: 'AND' as const,
      });
    }
    if (dateTo) {
      dateFilters.push({
        table: 'reports',
        field: 'created_at',
        operator: 'lte' as const,
        value: dateTo,
        conjunction: 'AND' as const,
      });
    }

    return {
      ...queryConfig,
      joins: queryConfig.joins || [],
      dimensions: queryConfig.dimensions || [],
      measures: queryConfig.measures || [],
      sorts: queryConfig.sorts || [],
      filters: [
        ...(queryConfig.filters || []),
        ...extraFilters.filter((f): f is NonNullable<typeof f> => f !== null),
        ...dateFilters,
        // Enforce CGO source for pages 4 (index 3) and 5 (index 4)
        ...([3, 4].includes(activePage) ? [{
          table: 'reports',
          field: 'source_sheet',
          operator: 'eq' as const,
          value: 'CGO',
          conjunction: 'AND' as const,
        }] : [])
      ],
    };
  }, [activeFilters, dateFrom, dateTo, activePage]);

  const fetchChartData = useCallback(async (charts: ChartData[]): Promise<Map<string, ChartResult>> => {
    const dataMap = new Map<string, ChartResult>();
    const queryCharts = charts.filter(c => c.query_config);
    const legacyCharts = charts.filter(c => !c.query_config);
    const serverQueryCharts: typeof queryCharts = [];

    if (allReports.length > 0) {
      for (const chart of queryCharts) {
        const query = applyFiltersToQuery(chart.query_config!);
        const source = (query.source || 'reports').toLowerCase();
        
        if (source === 'reports') {
          try {
            const result = processQuery(query, allReports);
            dataMap.set(chart.id, { type: 'query', queryResult: result });
          } catch (err) {
            console.error(`Client query failed:`, err);
            serverQueryCharts.push(chart);
          }
        } else {
          serverQueryCharts.push(chart);
        }
      }
    } else {
      serverQueryCharts.push(...queryCharts);
    }

    const batchPromise = serverQueryCharts.length > 0
      ? (async () => {
          try {
            const batchQueries = serverQueryCharts.map(chart => ({
              id: chart.id,
              query: applyFiltersToQuery(chart.query_config!),
            }));
            const res = await fetch('/api/dashboards/query/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ queries: batchQueries }),
            });
            if (res.ok) {
              const { results } = await res.json();
              for (const r of results) {
                if (!r.error) {
                  dataMap.set(r.id, { type: 'query', queryResult: { columns: r.columns, rows: r.rows, rowCount: r.rowCount, executionTimeMs: 0 } });
                }
              }
            }
          } catch (err) { console.error('Batch fetch error:', err); }
        })()
      : Promise.resolve();

    const legacyPromise = Promise.all(
      legacyCharts.map(async (chart) => {
        try {
          const res = await fetch(`/api/embed/stats?type=${chart.data_field}&range=${range}`);
          if (res.ok) {
            const data = await res.json();
            dataMap.set(chart.id, { type: 'legacy', stats: data });
          }
        } catch (err) { console.error('Legacy fetch error:', err); }
      })
    );

    await Promise.all([batchPromise, legacyPromise]);
    setChartsData(prev => {
        const next = new Map(prev);
        dataMap.forEach((v, k) => next.set(k, v));
        return next;
    });
    return dataMap;
  }, [range, applyFiltersToQuery, allReports]);

  const dashboardChartsRef = useRef(dashboard?.dashboard_charts);
  useEffect(() => {
    dashboardChartsRef.current = dashboard?.dashboard_charts;
  }, [dashboard?.dashboard_charts]);

  const fetchChartDataRef = useRef(fetchChartData);
  useEffect(() => {
    fetchChartDataRef.current = fetchChartData;
  }, [fetchChartData]);

  // ─── Computed: pages & metadata ──────────────────────────────────────────
  const pages = useMemo(() => {
    if (!dashboard) return [];
    const charts = dashboard.dashboard_charts;
    const hasPages = charts.some(c => c.page_name && c.page_name !== 'Ringkasan Umum');
    const configPages = dashboard.config?.pages;

    if (hasPages || (configPages && configPages.length > 1)) {
      const pageMap = new Map<string, ChartData[]>();
      const pageOrder = configPages || [];
      for (const pn of pageOrder) pageMap.set(pn, []);
      for (const chart of charts) {
        const pageName = chart.page_name || 'Ringkasan Umum';
        if (!pageMap.has(pageName)) pageMap.set(pageName, []);
        pageMap.get(pageName)!.push(chart);
      }
      return Array.from(pageMap.entries())
        .filter(([, tiles]) => tiles.length > 0)
        .map(([name, tiles]) => ({
          name,
          tiles: tiles.sort((a, b) => a.position - b.position),
        }));
    }
    return [{ name: 'Ringkasan Umum', tiles: [...charts].sort((a, b) => a.position - b.position) }];
  }, [dashboard]);

  const isCustomerFeedbackDashboard = useMemo(() => {
    return dashboard?.name?.toLowerCase().includes('customer feedback') || slug?.includes('customer-feedback');
  }, [dashboard?.name, slug]);

  const isFiltered = useMemo(() => {
    // Only check for domain filters, ignore date range or other technical params
    return Object.values(activeFilters).some(v => v && v !== 'all');
  }, [activeFilters]);

  const useCustomerFeedbackOverviewLayout = isCustomerFeedbackDashboard && [0, 1, 2, 3, 4].includes(activePage);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (dashboard?.dashboard_charts && filtersInitialized) {
      const currentPage = pages[activePage];
      let chartsToFetch = currentPage ? [...currentPage.tiles] : [...dashboard.dashboard_charts];
      
      if (isCustomerFeedbackDashboard && [0, 1, 2, 3, 4].includes(activePage)) {
        // Map KPI sources: Page 1 gets from Page 2, Page 4 gets from Page 5, others check themselves or neighboring detail pages
        const kpiSourcePageIndex = activePage === 0 ? 1 : 
                                  activePage === 3 ? 4 : 
                                  activePage;
        const kpiSourcePage = pages[kpiSourcePageIndex];
        if (kpiSourcePage) {
          const extraKpis = kpiSourcePage.tiles.filter(t => t.visualization_config?.chartType === 'kpi' || t.chart_type === 'kpi');
          chartsToFetch = [...chartsToFetch, ...extraKpis];
        }
      }
      fetchChartDataRef.current(chartsToFetch);
    }
  }, [dashboard, activePage, activeFilters, dateFrom, dateTo, filtersInitialized, isCustomerFeedbackDashboard, pages]);

  const investigativeResult = useMemo(() => {
    if (!useCustomerFeedbackOverviewLayout || ![1, 4].includes(activePage)) return undefined;
    if (allReports.length === 0) return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 };

    const query: QueryDefinition = {
      source: 'reports',
      dimensions: [
        { table: 'reports', field: 'date_of_event', alias: 'Date' },
        { table: 'reports', field: 'main_category', alias: 'Category' },
        { table: 'reports', field: 'branch', alias: 'Branch' },
        { table: 'reports', field: 'airlines', alias: 'Airlines' },
        { table: 'reports', field: 'flight_number', alias: 'Flight' },
        { table: 'reports', field: 'report', alias: 'Report' },
        { table: 'reports', field: 'root_caused', alias: 'Root Caused' },
        { table: 'reports', field: 'action_taken', alias: 'Action Taken' },
        { table: 'reports', field: 'preventive_action', alias: 'Preventive Action' },
        { table: 'reports', field: 'status', alias: 'Status' },
        { table: 'reports', field: 'evidence_url', alias: 'Evidence Link' }
      ],
      measures: [],
      filters: [],
      joins: [],
      sorts: [{ field: 'created_at', direction: 'desc' }],
      limit: 1000
    };
    
    try {
      return processQuery(applyFiltersToQuery(query), allReports);
    } catch (err) {
      console.error('Investigative query failed:', err);
      return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 };
    }
  }, [allReports, activePage, useCustomerFeedbackOverviewLayout, applyFiltersToQuery]);

  // ─── Computed tiles ───────────────────────────────────────────────────────
  const currentPage = pages[activePage] || pages[0];
  const kpiTiles = useMemo(() => currentPage?.tiles.filter(c => (c.visualization_config?.chartType === 'kpi' || c.chart_type === 'kpi')) || [], [currentPage]);
  const contentTiles = useMemo(() => currentPage?.tiles.filter(c => (c.visualization_config?.chartType !== 'kpi' && c.chart_type !== 'kpi')) || [], [currentPage]);

  const handleExport = useCallback(async (format: 'xlsx' | 'pptx') => {
    if (!dashboard) return;
    setExportingFormat(format);
    setShowExportMenu(false);
    try {
      const allCharts = pages.flatMap(p => p.tiles);
      const missingCharts = allCharts.filter(t => !chartsData.has(t.id));
      let completeChartsData = chartsData;
      if (missingCharts.length > 0) {
        const freshData = await fetchChartData(missingCharts);
        completeChartsData = new Map(chartsData);
        freshData.forEach((v, k) => completeChartsData.set(k, v));
      }
      const payload = {
        dashboardName: dashboard.name,
        subtitle: dashboard.description || dashboard.config?.subtitle,
        dashboardId: dashboard.id,
        baseUrl: window.location.origin,
        dateFrom: dateFrom || '1900-01-01',
        dateTo: dateTo || '2099-12-31',
        sourcePage: slug,
        pages: pages.map(p => ({
          name: p.name,
          tiles: p.tiles.map(t => ({ id: t.id, title: t.title, chartType: t.visualization_config?.chartType || t.chart_type || 'bar', yAxis: t.visualization_config?.yAxis })),
        })),
        chartsData: completeChartsData,
      };
      if (format === 'xlsx') {
        const { exportToXlsx } = await import('@/lib/dashboard-export');
        await exportToXlsx(payload);
      } else {
        const { exportToPptx } = await import('@/lib/dashboard-export');
        await exportToPptx(payload);
      }
    } catch (err) { console.error('Export error:', err); }
    finally { setExportingFormat(null); }
  }, [dashboard, pages, chartsData, fetchChartData, dateFrom, dateTo, slug]);

  const getChartSlug = (chartTitle: string) => {
    const title = chartTitle.toLowerCase();
    if (title.includes('report by case category')) return 'report-by-case-category';
    if (title.includes('branch report')) return 'branch-report';
    if (title.includes('airlines report') || title.includes('airline report')) return 'airline-report';
    if (title.includes('monthly report') || title.includes('monthly') || title.includes('bulanan')) return 'monthly-report';
    if (title.includes('category by area')) return 'category-by-area';
    if (title.includes('case category by branch')) return 'case-category-by-branch';
    if (title.includes('case category by airline') || title.includes('case category by airlines')) return 'case-category-by-airline';
    if (title.includes('case report by area') || title.includes('report by area')) return 'area-report';
    if (title.includes('terminal area category')) return 'terminal-area-category';
    if (title.includes('apron area category')) return 'apron-area-category';
    if (title.includes('general category')) return 'general-category';
    if (title.includes('hub report')) return 'hub-report';
    if (title.includes('terminal area by branch')) return 'terminal-area-category';
    if (title.includes('apron area by branch')) return 'apron-area-category';
    if (title.includes('general category by branch')) return 'general-category';
    if (title.includes('terminal area by airline') || title.includes('terminal area by airlines')) return 'terminal-area-category';
    if (title.includes('apron area by airline') || title.includes('apron area by airlines')) return 'apron-area-category';
    if (title.includes('general category by airline') || title.includes('general category by airlines')) return 'general-category';
    return 'pivot-report';
  };

  const getDetailParams = useCallback(() => {
    const params = new URLSearchParams();
    Object.entries(activeFilters).forEach(([key, val]) => {
      if (val && val !== 'all') params.set(key, val);
    });
    
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    
    if (activePage > 0) {
      params.set('pageIndex', activePage.toString());
    }
    
    if ([3, 4].includes(activePage)) {
      params.set('sourceSheet', 'CGO');
    }

    params.set('sourcePage', slug);
    return params;
  }, [activeFilters, activePage, slug, dateFrom, dateTo]);

  const openCustomerFeedbackDetail = useCallback((chart: ChartData) => {
    const slug = getChartSlug(chart.title);
    const params = getDetailParams();
    const queryString = params.toString();
    router.push(`/embed/${slug}/detail${queryString ? `?${queryString}` : ''}`);
  }, [router, getDetailParams]);

  const onCopyLink = useCallback((chart: ChartData) => {
    const slug = getChartSlug(chart.title);
    const params = getDetailParams();
    params.set('viewMode', 'static');
    const queryString = params.toString();
    const url = `${window.location.origin}/embed/${slug}/detail?${queryString}`;
    
    navigator.clipboard.writeText(url).then(() => {
      // Small visual feedback with native alert if toast is missing
      alert('Chart link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  }, [getDetailParams]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" /></div>;
  if (error || !dashboard) return <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'Dashboard not found'}</div>;

  const hasMultiplePages = pages.length > 1;

  return (
    <div className="flex min-h-screen bg-surface-0 overflow-hidden selection:bg-brand-primary/10">
      {hasMultiplePages && (
        <aside className={cn("fixed inset-y-0 left-0 z-50 glass-morphism border-none flex flex-col transform transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-spatial-lg h-screen md:top-0", mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0", sidebarCollapsed ? "md:w-[80px]" : "md:w-72", "w-72")}>
          <div className="p-6 flex items-center justify-between border-b border-gray-100/50">
            {!sidebarCollapsed && <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center"><Box className="w-4 h-4 text-brand-primary" /></div><span className="text-sm font-black text-gray-800 tracking-tight uppercase">Dashboard</span></div>}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 rounded-xl text-gray-400 hover:text-brand-primary hover:bg-brand-primary/5 transition-all"><LayoutGrid size={18} /></button>
          </div>
          <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
            {pages.map((p, i) => (
              <button key={i} onClick={() => { setActivePage(i); setMobileMenuOpen(false); }} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-500 group relative", activePage === i ? "bg-brand-primary text-white shadow-spatial-sm" : "text-gray-500 hover:bg-brand-primary/5 hover:text-brand-primary")}>
                <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", activePage === i ? "bg-white scale-100" : "bg-brand-primary scale-0 group-hover:scale-100")} />
                {!sidebarCollapsed && <span className="text-[13px] font-bold tracking-wide whitespace-nowrap overflow-hidden">{p.name}</span>}
              </button>
            ))}
            
                {isCustomerFeedbackDashboard && !isFiltered && (
                  <div className="pt-4 mt-4 border-t border-gray-100/50">
                    <button 
                      onClick={() => router.back()} 
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-500 text-gray-400 hover:bg-red-50 hover:text-red-500 group"
                    >
                      <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                      {!sidebarCollapsed && <span className="text-[13px] font-bold tracking-wide uppercase">Back to Portal</span>}
                    </button>
                  </div>
                )}
          </nav>
        </aside>
      )}

      <main className={cn("flex-1 min-w-0 bg-surface-0 flex flex-col overflow-x-hidden relative transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]", hasMultiplePages ? (sidebarCollapsed ? "md:ml-[80px]" : "md:ml-72") : "")}>
        <header className="glass-morphism border-none sticky top-0 z-40 w-full !p-0 shadow-spatial-md rounded-none">
          <div className="px-8 py-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary/10 rounded-2xl shadow-inner"><Image src="/logo.png" alt="Logo" width={32} height={32} unoptimized style={{ height: 32, objectFit: 'contain' }} /></div>
                <div className="flex flex-col"><h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase leading-none mb-1">{dashboard.name}</h1><p className="text-[11px] font-bold text-gray-400 tracking-[0.2em] uppercase opacity-80">{dashboard.description || dashboard.config?.subtitle || 'Executive Intelligence Portal'}</p></div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative group">
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)} 
                    className="flex items-center gap-3 bg-white border border-gray-100 px-5 py-2.5 rounded-2xl text-[13px] font-bold text-gray-600 hover:border-brand-primary/30 hover:shadow-spatial-sm transition-all shadow-sm min-w-[200px]"
                  >
                    <Calendar size={16} className="text-brand-primary flex-shrink-0" />
                    <span className="whitespace-nowrap flex-1 text-left">
                      {(() => {
                        if (!dateFrom && !dateTo) return 'Select Period';
                        if (dateFrom === '1900-01-01' && dateTo === '2099-12-31') return 'All Dates';
                        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
                        const from = dateFrom ? new Date(dateFrom).toLocaleDateString('en-GB', options) : '...';
                        const to = dateTo ? new Date(dateTo).toLocaleDateString('en-GB', options) : '...';
                        return `${from} — ${to}`;
                      })()}
                    </span>
                    <ChevronDownIcon size={14} className="text-gray-300 flex-shrink-0" />
                  </button>
                  {showDatePicker && (
                    <div className="absolute right-0 mt-3 p-6 bg-white rounded-3xl shadow-spatial-xl border border-gray-100 z-50 min-w-[320px] animate-prism-reveal overflow-hidden">
                      <div className="grid gap-6">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-3 block">Quick Range</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'Today', range: 'today' },
                              { label: 'Last 7 Days', range: '7d' },
                              { label: 'Last 30 Days', range: '30d' },
                              { label: 'This Year', range: 'year' },
                              { label: 'All Time', range: 'all' },
                            ].map((preset) => (
                              <button
                                key={preset.range}
                                onClick={() => {
                                  const now = new Date();
                                  let from = '';
                                  let to = now.toISOString().split('T')[0];
                                  if (preset.range === 'today') from = to;
                                  else if (preset.range === '7d') { const d = new Date(); d.setDate(now.getDate() - 7); from = d.toISOString().split('T')[0]; }
                                  else if (preset.range === '30d') { const d = new Date(); d.setDate(now.getDate() - 30); from = d.toISOString().split('T')[0]; }
                                  else if (preset.range === 'year') from = `${now.getFullYear()}-01-01`;
                                  else if (preset.range === 'all') { from = '1900-01-01'; to = '2099-12-31'; }
                                  setDateFrom(from);
                                  setDateTo(to);
                                }}
                                className="px-3 py-2.5 bg-gray-50 text-[11px] font-bold text-gray-600 rounded-xl hover:bg-brand-primary/10 hover:text-brand-primary transition-all text-left"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-100 pt-5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-3 block">Custom Range</label>
                          <div className="grid gap-3">
                            <div className="grid gap-1.5">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Start Date</label>
                              <input 
                                type="date" 
                                value={dateFrom} 
                                onChange={e => setDateFrom(e.target.value)} 
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">End Date</label>
                              <input 
                                type="date" 
                                value={dateTo} 
                                onChange={e => setDateTo(e.target.value)} 
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => setShowDatePicker(false)} 
                            className="flex-1 py-3.5 bg-brand-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary/90 transition-all shadow-spatial-sm"
                          >
                            Apply Selection
                          </button>
                          <button 
                            onClick={() => { setDateFrom(''); setDateTo(''); setShowDatePicker(false); }} 
                            className="px-4 py-3.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                            title="Reset Filter"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button onClick={() => setShowExportMenu(!showExportMenu)} disabled={exportingFormat !== null} className="flex items-center gap-2.5 bg-brand-primary text-white px-6 py-2.5 rounded-2xl text-[13px] font-black tracking-widest uppercase hover:bg-brand-primary/90 shadow-spatial-sm disabled:opacity-50 transition-all">{exportingFormat ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}<span className="hidden sm:inline">Dispatch</span></button>
                  {showExportMenu && (
                    <div className="absolute right-0 mt-3 p-2 bg-white rounded-2xl shadow-spatial-xl border border-gray-100 z-50 min-w-[200px] animate-prism-reveal">
                      <button onClick={() => handleExport('xlsx')} className="w-full flex items-center gap-3 px-4 py-3 text-left text-[12px] font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all"><FileSpreadsheet size={16} /> Excel Spreadsheet</button>
                      <button onClick={() => handleExport('pptx')} className="w-full flex items-center gap-3 px-4 py-3 text-left text-[12px] font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all"><Presentation size={16} /> Presentation Deck</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!dashboard.config?.hideControls && <div className="mt-8 border-t border-gray-100/50 pt-5"><DynamicFilterHeader onFilterChange={setActiveFilters} initialFilters={activeFilters} variant="default" /></div>}
          </div>
        </header>

        <section className="px-8 pb-24 space-y-8">
          {useCustomerFeedbackOverviewLayout ? (
            <div className="mt-8">
              <CustomerFeedbackView 
                chartsData={chartsData} 
                tiles={currentPage?.tiles || []} 
                extraKpis={pages[activePage === 0 ? 1 : activePage === 3 ? 4 : activePage]?.tiles.filter(t => t.visualization_config?.chartType === 'kpi' || t.chart_type === 'kpi') || []} 
                onViewDetail={openCustomerFeedbackDetail}
                onCopyLink={onCopyLink}
                forcePivot={activePage === 2}
                investigativeResult={investigativeResult}
              />
            </div>
          ) : (
            <div className="mt-8">
              {kpiTiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
                  {kpiTiles.map(tile => {
                    const cr = chartsData.get(tile.id);
                    const value = cr?.type === 'query' && cr.queryResult?.rows[0] ? Number(Object.values(cr.queryResult.rows[0])[0]) || 0 : 0;
                    return (
                      <div key={tile.id} onClick={() => openCustomerFeedbackDetail(tile)} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md hover:-translate-y-1 active:scale-[0.98] cursor-pointer group">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2 opacity-70 group-hover:opacity-100 transition-opacity">{tile.title}</span>
                        <span className="text-3xl font-black text-gray-800 tabular-nums tracking-tighter">{value.toLocaleString('id-ID')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {contentTiles.map(chart => (
                  <div key={chart.id} className={chart.width === '3' ? 'md:col-span-1' : chart.width === '6' ? 'md:col-span-2' : chart.width === '12' ? 'md:col-span-4' : 'md:col-span-1'}>
                    <ChartPreview 
                      visualization={greenify(chart.visualization_config || { 
                        chartType: (chart.chart_type as ChartType) || 'bar', 
                        xAxis: chartsData.get(chart.id)?.queryResult?.columns[0],
                        yAxis: chartsData.get(chart.id)?.queryResult?.columns.slice(1) || [],
                        showLegend: true 
                      })} 
                      result={chartsData.get(chart.id)?.queryResult || { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 }}
                      tile={{
                        id: chart.id,
                        query: chart.query_config || { source: 'reports', joins: [], dimensions: [], measures: [], filters: [], sorts: [] },
                        visualization: greenify(chart.visualization_config || { chartType: (chart.chart_type as ChartType) || 'bar', yAxis: [], showLegend: true }),
                        layout: (chart.layout as TileLayout) || { x: 0, y: 0, w: 12, h: 4 }
                      } as DashboardTile}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="mt-auto bg-white border-t border-gray-100 px-8 py-6 flex flex-wrap items-center justify-between gap-4 text-[11px] font-bold tracking-widest uppercase">
          <div className="flex items-center gap-3"><Image src="/logo.png" alt="Gapura" width={24} height={24} unoptimized style={{ height: 24, objectFit: 'contain', opacity: 0.5 }} /><span className="text-gray-400">Integrated Intelligence</span></div>
          <div className="flex items-center gap-6"><span className="flex items-center gap-2 text-gray-400"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />Live Telemetry</span><span className="text-gray-300">|</span><span className="text-gray-400">© {new Date().getFullYear()} PT Gapura Angkasa</span></div>
        </footer>
      </main>

      <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand-primary text-white rounded-full shadow-spatial-xl flex items-center justify-center active:scale-90 transition-all"><Menu size={24} /></button>
    </div>
  );
}
