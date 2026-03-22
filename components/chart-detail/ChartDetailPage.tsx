'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { Download, FileText, Link as LinkIcon, Check, Share2 } from 'lucide-react';
import type { DashboardTile, QueryResult, QueryFilter } from '@/types/builder';
import { EnlargedChart } from './EnlargedChart';
import { InvestigativeTable } from './InvestigativeTable';
import { AIInsightsPanel } from './AIInsightsPanel';
import { SummaryCards } from './SummaryCards';
import { SupportingCharts } from './SupportingCharts';
import { GlobalControlBar, ViewMode, Normalization } from './GlobalControlBar';
import { InsightPanel } from '@/components/chart-detail/InsightPanel';
import { generateAnalyticalCharts, fetchAnalyticalChartData } from '@/lib/chart-detail-generator';
import type { AnalyticalChart } from '@/lib/chart-detail-generator';
import { MapPin, Plane, Layers, Crosshair, Target, Bug, Sparkles } from 'lucide-react';
import { AirlineAIVisualization } from './ai/AirlineAIVisualization';
import { BranchAIVisualization } from './ai/BranchAIVisualization';

interface ChartDetailData {
  tile: DashboardTile;
  result: QueryResult;
  dashboardId?: string;
}

interface StructuredFinding {
  diagnosa: string;
  data: Record<string, any>;
  impactScore: number;
}

interface AIInsight {
  ringkasan: string;
  temuanUtama: (string | StructuredFinding)[];
  tren: Array<{
    label: string;
    arah: string;
    persentase: number;
    deskripsi: string;
  }>;
  rekomendasi: string[];
  anomali: Array<{
    label: string;
    nilai: number | string;
    deskripsi: string;
  }>;
  kesimpulan: string;
  saranEksplorasi?: string[];
  supportingCharts?: Array<{
    visualization: DashboardTile['visualization'];
    query: DashboardTile['query'];
    explanation: string;
  }>;
}

// Helper to format chart type for AI context
const formatChartType = (type: string) => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// ─── CONTEXT RIBBON COMPONENT ───────────────────────────────────────────────

function ContextRibbon({ query }: { query: DashboardTile['query'] }) {
  const filters = query.filters || [];
  
  const getFilterValue = (fields: string[]) => {
    const filter = filters.find(f => fields.includes(f.field));
    return filter?.value || null;
  };

  const branch = getFilterValue(['branch', 'reporting_branch', 'station_code']);
  const airline = getFilterValue(['airline', 'airlines']);
  const category = getFilterValue(['main_category', 'category', 'irregularity_complain_category']);
  const area = getFilterValue(['area']);
  const subArea = getFilterValue(['apron_area_category', 'terminal_area_category', 'general_category']);

  const items = [
    { label: 'Cabang', value: branch, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Maskapai', value: airline, icon: Plane, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Kategori', value: category, icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Area', value: area, icon: Crosshair, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Sub-Area', value: subArea, icon: Target, color: 'text-rose-600', bg: 'bg-rose-50' },
  ].filter(item => item.value);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 scrollbar-hide">
      {items.map((item, idx) => (
        <div 
          key={idx} 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200/60 shadow-sm ${item.bg} backdrop-blur-md transition-all hover:shadow-md cursor-default group flex-shrink-0 whitespace-nowrap`}
        >
          <item.icon size={14} className={`${item.color} group-hover:scale-110 transition-transform`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</span>
          <span className="text-xs font-black text-gray-800 tracking-tight">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChartDetailPage({ isPublic = false }: { isPublic?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<ChartDetailData | null>(null);
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [fullData, setFullData] = useState<QueryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingTile, setLoadingTile] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Global Analytical State
  const [viewMode, setViewMode] = useState<ViewMode>('values');
  const [normalization, setNormalization] = useState<Normalization>('none');

  // Analytical supporting charts — cross-dimensional breakdown from real data
  const [analyticalCharts, setAnalyticalCharts] = useState<AnalyticalChart[]>([]);
  const [analyticalDataMap, setAnalyticalDataMap] = useState<Record<number, QueryResult>>({});
  const [analyticalLoading, setAnalyticalLoading] = useState(false);

  // Debug panel state
  const [showDebug, setShowDebug] = useState(false);

  // AI Context detection
  const [aiContext, setAiContext] = useState<'airline' | 'branch' | null>(null);

  // Helper to detect main context from filters
  const detectContext = useCallback((filters: QueryFilter[]): 'airline' | 'branch' | null => {
    const hasAirlineFilter = filters.some(f => 
      ['airline', 'airlines'].includes(f.field.toLowerCase())
    );
    if (hasAirlineFilter) return 'airline';

    const hasBranchFilter = filters.some(f => 
      ['branch', 'reporting_branch', 'station_code'].includes(f.field.toLowerCase())
    );
    if (hasBranchFilter) return 'branch';

    // Check query dimensions
    return null;
  }, []);

  // Compute chart definitions from tile + result (synchronous, no fetch)
  // Complexity: Time O(1) | Space O(charts)
  const chartDefs = useMemo(() => {
    if (!data) return null;
    const displayResult = fullData || data.result;
    return generateAnalyticalCharts(data.tile, displayResult);
  }, [data, fullData]);

  const fetchFullData = useCallback(async (tile: DashboardTile): Promise<QueryResult> => {
    try {
      // Normalize query before sending
      const normalizedQuery = {
        ...tile.query,
        dimensions: tile.query.dimensions || [],
        measures: tile.query.measures || [],
        filters: tile.query.filters || [],
        joins: tile.query.joins || [],
        sorts: tile.query.sorts || [],
        limit: 100000 // Unlimited
      };

      const response = await fetch('/api/dashboards/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: normalizedQuery
        })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch full data:', error);
    }
    
    // Pure fetcher: return empty result on failure to avoid loops
    return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 };
  }, []); // No dependencies for stability

  const generateInsights = useCallback(async (detailData: ChartDetailData): Promise<AIInsight | null> => {
    setInsightsLoading(true);
    try {
      // Calculate statistics
      const result = detailData.result;
      
      // Determine metric column safely
      const viz = detailData.tile.visualization;
      // 1. explicit metric
      let metricCol = viz.colorField;
      
      // 2. or find first numeric column that isn't an axis
      if (!metricCol && result.rows.length > 0) {
        const x = viz.xAxis;
        const y = Array.isArray(viz.yAxis) ? viz.yAxis : [viz.yAxis];
        metricCol = result.columns.find(c => 
          c !== x && 
          !y.includes(c) && 
          (typeof result.rows[0][c] === 'number' || (!isNaN(Number(result.rows[0][c])) && result.rows[0][c] !== ''))
        );
      }
      
      // 3. fallback to last column
      if (!metricCol) {
        metricCol = result.columns[result.columns.length - 1];
      }

      const values = result.rows.map((row: Record<string, unknown>) => {
        const val = Number(row[metricCol!]);
        return isNaN(val) ? 0 : val;
      });
      
      const total = values.reduce((a, b) => a + b, 0);
      const avg = total / values.length || 0;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      // Clear previous insights and set loading
      setInsights(null);
      setInsightsLoading(true);

      const response = await fetch('/api/dashboards/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartTitle: detailData.tile.visualization.title,
          chartType: detailData.tile.visualization.chartType,
          dashboardId: detailData.dashboardId,
          tileId: detailData.tile.id,
          totalRows: result.rows.length,
          dataSample: result.rows.slice(0, 100),
          supportingCharts: analyticalCharts.map(ac => ({
            title: ac.visualization.title,
            chartType: ac.visualization.chartType,
            dimensions: ac.query.dimensions,
            measures: ac.query.measures
          })),
          statistics: {
            total,
            average: avg,
            maximum: max,
            minimum: min,
            variance: max - min,
            rowCount: result.rows.length
          },
          context: `Berikan analisis SANGAT MENDALAM untuk ${formatChartType(detailData.tile.visualization.chartType)} berjudul "${detailData.tile.visualization.title}". 
          Gunakan pendekatan data storytelling. Hubungkan total volume (${total.toLocaleString('id-ID')}) dengan rata-rata (${avg.toLocaleString('id-ID')}). 
          Identifikasi siapa atau apa yang menjadi penyumbang terbesar (Pareto) dan berikan rekomendasi strategis tanpa batasan panjang analisis.`
        })
      });

      const responseData = await response.json();
      
      if (response.ok && responseData.insights) {
        return responseData.insights as AIInsight;
      } else if (responseData.fallback) {
        console.warn('Using fallback insights due to API error:', responseData.error);
        return responseData.fallback;
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
      // Fallback insights structure
      return {
        ringkasan: "Tidak dapat memuat analisis AI saat ini. Silakan coba beberapa saat lagi.",
        temuanUtama: [
          "Data visualisasi telah berhasil dimuat.",
          "Analisis mendalam membutuhkan koneksi ke layanan AI.", 
          "Periksa koneksi internet Anda."
        ],
        tren: [],
        rekomendasi: ["Lakukan analisis manual berdasarkan data tabel."],
        anomali: [],
        kesimpulan: "Data tabel tersedia untuk direview secara manual."
      };
    } finally {
      setInsightsLoading(false);
    }
    
    return null;
  }, [analyticalCharts]);

  const handleDownloadImage = async () => {
    if (chartRef.current) {
      try {
        const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
        saveAs(dataUrl, `${data?.tile.visualization.title || 'chart'}.png`);
      } catch (err) {
        console.error('Failed to download image', err);
      }
    }
  };

  const handleExportCSV = () => {
    const displayData = fullData || data?.result;
    if (!displayData) return;
    
    const headers = displayData.columns.join(',');
    const rows = displayData.rows.map(row => 
      displayData.columns.map(col => {
        const cell = row[col];
        return typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell;
      }).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${data?.tile.visualization.title || 'data'}.csv`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    // 1. Try sessionStorage first (fastest for dashboard navigation)
    const storedData = sessionStorage.getItem('chartDetailData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData) as ChartDetailData;
        const urlTileId = new URLSearchParams(window.location.search).get('tileId');
        if (!urlTileId || parsed.tile.id === urlTileId) {
          setData(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse stored chart data:', e);
      }
    }

    // 2. Fallback: Fetch from API using tileId from URL (for direct/public links)
    const searchParams = new URLSearchParams(window.location.search);
    const tileId = searchParams.get('tileId');

    if (!tileId) {
      if (!isPublic) router.push('/dashboard');
      return;
    }

    // Guard: Don't fetch if already have data, currently loading, or already failed for this ID
    if (data?.tile.id === tileId || loadingTile || fetchError === tileId) return;

    const loadTileData = async () => {
      setLoadingTile(true);
      try {
        const res = await fetch(`/api/dashboards?tileId=${tileId}`);
        const tile = await res.json();
        
        if (tile.error) throw new Error(tile.error);

        const dashboardTile: DashboardTile = {
          id: tile.id,
          visualization: {
            title: tile.title,
            chartType: tile.chart_type,
            ...(tile.visualization_config || {})
          },
          query: tile.query_config || {
            dimensions: [tile.data_field],
            measures: ['count'],
            filters: []
          },
          layout: tile.layout || { w: 6, h: 4 }
        };

        const result = await fetchFullData(dashboardTile);
        
        setData({
          tile: dashboardTile,
          result: result,
          dashboardId: tile.custom_dashboards?.id
        });
      } catch (err) {
        console.error('Failed to load public chart:', err);
        setFetchError(tileId);
        if (!isPublic) router.push('/dashboard');
      } finally {
        setLoadingTile(false);
      }
    };

    loadTileData();
  }, [router, isPublic, fetchFullData, loadingTile, data?.tile.id]); 

  // Fetch full data once on mount or when tile ID changes
  useEffect(() => {
    if (data && !fullData) {
      fetchFullData(data.tile).then(setFullData);
    }
  }, [data?.tile.id, fullData, fetchFullData]);

  // Generate insights once data is available
  useEffect(() => {
    if (data && !insights && !insightsLoading && analyticalCharts.length > 0) {
      generateInsights(data).then(setInsights);
    }
  }, [data?.tile.id, insights, insightsLoading, analyticalCharts.length, generateInsights]);

  // Detect AI context (airline vs branch) from filters
  useEffect(() => {
    if (data) {
      const filters = data.tile.query.filters || [];
      const context = detectContext(filters);
      setAiContext(context);
    }
  }, [data?.tile.id, detectContext]);

  // Fetch cross-dimensional analytical chart data once definitions are ready
  // Complexity: Time O(k * API_latency) parallelized | Space O(k * n)
  useEffect(() => {
    if (!chartDefs || chartDefs.charts.length === 0 || analyticalCharts.length > 0) return;
    
    setAnalyticalCharts(chartDefs.charts);
    setAnalyticalDataMap(chartDefs.dataMap);
    setAnalyticalLoading(true);

    fetchAnalyticalChartData(chartDefs.charts, chartDefs.dataMap)
      .then(fullMap => {
        setAnalyticalDataMap(fullMap);
      })
      .finally(() => setAnalyticalLoading(false));
  }, [chartDefs?.charts]); // Depend on charts count/length to avoid frequent re-runs

  const handleSharePublic = () => {
    if (!data?.tile.id) return;
    const shareUrl = `${window.location.origin}/embed/chart?tileId=${data.tile.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-500">
          <X size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Link Tidak Valid</h2>
        <p className="text-gray-500 max-w-md mb-8">
          Tile ID <code className="bg-gray-200 px-1 rounded">{fetchError}</code> tidak ditemukan atau Anda tidak memiliki akses. 
          Pastikan dashboard telah diatur menjadi publik.
        </p>
        <button 
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2.5 bg-[#6b8e3d] text-white font-bold rounded-lg shadow-md hover:bg-[#5a7a3a] transition-all"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6b8e3d]" />
      </div>
    );
  }

  const displayData = fullData || data.result;
  const tile = data.tile;

  // Prepare insights for the panel
  const insightStrings = insights 
    ? [insights.ringkasan, ...insights.temuanUtama]
    : [];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-white border-b border-[#e0e0e0] sticky top-0 z-50 w-full px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {!isPublic && (
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-50 rounded-full transition-all hover:shadow-sm group text-gray-500 hover:text-indigo-600 shrink-0"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight truncate">
                {tile.visualization.title}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 sm:gap-2">
              <button
                onClick={handleCopyLink}
                className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#666] tooltip"
                title="Copy Link"
              >
                {copied ? <Check size={20} className="text-green-600" /> : <LinkIcon size={20} />}
              </button>
              <button
                onClick={handleExportCSV}
                className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#666]"
                title="Export CSV"
              >
                <FileText size={20} />
              </button>
              <button
                onClick={handleDownloadImage}
                className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#666]"
                title="Download PNG"
              >
                <Download size={20} />
              </button>
            </div>

            {!isPublic && (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={handleSharePublic}
                  className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#666]"
                  title="Share Public Link"
                >
                  {copied ? (
                    <Check size={20} className="text-green-600" />
                  ) : (
                    <Share2 size={20} />
                  )}
                </button>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className={`hidden md:block p-2 hover:bg-[#f5f5f5] rounded-full transition-colors ${showDebug ? 'text-blue-600' : 'text-[#666]'}`}
                  title="Toggle Debug Panel"
                >
                  <Bug size={20} />
                </button>
              </div>
            )}
            {!isPublic && (
              <>
                <div className="h-6 w-px bg-[#e0e0e0] mx-1 sm:mx-2" />
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors"
                >
                  <X size={20} className="text-[#666]" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 py-4 sm:py-6 font-sans">
        <div className="max-w-[1700px] mx-auto space-y-6 sm:space-y-8">
          {/* CONTEXT RIBBON */}
          <ContextRibbon query={tile.query} />

          {/* MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* HERO CHART (Left - 8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <EnlargedChart 
                tile={tile} 
                result={displayData}
                viewMode={viewMode}
                normalization={normalization}
              />
            </div>

            {/* INSIGHT PANEL (Right - 4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="lg:sticky lg:top-24">
                <InsightPanel 
                  insights={insightStrings} 
                  isLoading={insightsLoading} 
                />
              </div>
            </div>
          </div>

          {/* AI CONTEXT VISUALIZATION */}
          {aiContext && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#6b8e3d]" />
                <h3 className="text-lg font-bold text-gray-800">
                  AI Context Analysis
                </h3>
              </div>
              {aiContext === 'airline' && (
                <AirlineAIVisualization 
                  filters={tile.query.filters?.map(f => ({ field: f.field, value: String(f.value) }))}
                />
              )}
              {aiContext === 'branch' && (
                <BranchAIVisualization 
                  filters={tile.query.filters?.map(f => ({ field: f.field, value: String(f.value) }))}
                />
              )}
            </div>
          )}

        {(insightsLoading || analyticalLoading) && (
          <div className="flex justify-center p-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* DEBUG PANEL */}
        {showDebug && (
          <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs overflow-auto max-h-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">🔍 Debug Panel</h3>
              <button 
                onClick={() => console.log('Analytical Charts:', analyticalCharts, 'DataMap:', analyticalDataMap)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Log to Console
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-bold mb-2">Analytical Charts ({analyticalCharts.length})</h4>
                {analyticalCharts.map((chart, idx) => {
                  const data = analyticalDataMap[idx];
                  return (
                    <div key={idx} className="mb-3 p-2 bg-gray-800 rounded">
                      <div className="text-yellow-400 font-bold">[{idx}] {chart.visualization.title}</div>
                      <div className="text-gray-400">Type: {chart.customChartType || chart.visualization.chartType}</div>
                      <div className="text-gray-400">Dimensions: {chart.query.dimensions?.map(d => d.field).join(', ')}</div>
                      {data ? (
                        <>
                          <div className="text-green-400">✓ Data: {data.rows?.length || 0} rows</div>
                          <div className="text-gray-500">Columns: {data.columns?.join(', ')}</div>
                          <div className="text-gray-500 mt-1">Sample: {JSON.stringify(data.rows?.slice(0, 2), null, 2)}</div>
                        </>
                      ) : (
                        <div className="text-red-400">✗ No data</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUPPORTING CHARTS */}
        <div className="space-y-6 pt-4 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
            Detailed Breakdown
          </h3>
          <SupportingCharts 
            charts={analyticalCharts} 
            dataMap={analyticalDataMap}
            loading={analyticalLoading} 
            source="system"
            viewMode={viewMode}
            normalization={normalization}
          />
        </div>

        {/* Data Table */}
        <section className="bg-white rounded-xl shadow-sm border border-[#e0e0e0] overflow-hidden">
          <InvestigativeTable 
            data={displayData}
            title={tile.visualization.title || 'Chart Data'}
          />
        </section>
        </div>
      </main>
    </div>
  );
}
