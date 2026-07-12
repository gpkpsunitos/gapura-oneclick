'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { Download, FileText, Link as LinkIcon, Check, Share2 } from 'lucide-react';
import type { DashboardTile, QueryResult } from '@/types/builder';
import { EnlargedChart } from './EnlargedChart';
import { InvestigativeTable } from './InvestigativeTable';
import { SupportingCharts } from './SupportingCharts';
import { ViewMode, Normalization } from './GlobalControlBar';
import { generateAnalyticalCharts, fetchAnalyticalChartData } from '@/lib/chart-detail-generator';
import type { AnalyticalChart } from '@/lib/chart-detail-generator';
import { MapPin, Plane, Layers, Crosshair, Target } from 'lucide-react';

interface ChartDetailData {
  tile: DashboardTile;
  result: QueryResult;
  dashboardId?: string;
}

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
  const [fullData, setFullData] = useState<QueryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingTile, setLoadingTile] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const [viewMode] = useState<ViewMode>('values');
  const [normalization] = useState<Normalization>('none');

  const [analyticalCharts, setAnalyticalCharts] = useState<AnalyticalChart[]>([]);
  const [analyticalDataMap, setAnalyticalDataMap] = useState<Record<number, QueryResult>>({});
  const [analyticalLoading, setAnalyticalLoading] = useState(false);


  const chartDefs = useMemo(() => {
    if (!data) return null;
    const displayResult = fullData || data.result;
    return generateAnalyticalCharts(data.tile, displayResult);
  }, [data, fullData]);

  const fetchFullData = useCallback(async (tile: DashboardTile): Promise<QueryResult> => {
    try {

      const normalizedQuery = {
        ...tile.query,
        dimensions: tile.query.dimensions || [],
        measures: tile.query.measures || [],
        filters: tile.query.filters || [],
        joins: tile.query.joins || [],
        sorts: tile.query.sorts || [],
        limit: 100000
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

    return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 };
  }, []);

  const handleDownloadImage = async () => {
    if (chartRef.current) {
      try {
        const { toPng } = await import('html-to-image');
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

    const searchParams = new URLSearchParams(window.location.search);
    const tileId = searchParams.get('tileId');

    if (!tileId) {
      if (!isPublic) router.push('/dashboard');
      return;
    }

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
  }, [router, isPublic, fetchFullData, loadingTile, data?.tile.id, fetchError]); 

  useEffect(() => {
    if (data && !fullData) {
      fetchFullData(data.tile).then(setFullData);
    }
  }, [data, fullData, fetchFullData]);

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
  }, [chartDefs, analyticalCharts.length]);

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
          Back to Dashboard
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

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {}
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
          {}
          <ContextRibbon query={tile.query} />

          {}
          <EnlargedChart 
            tile={tile} 
            result={displayData}
            viewMode={viewMode}
            normalization={normalization}
          />

        {analyticalLoading && (
          <div className="flex justify-center p-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}


        {}
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

        {}
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
