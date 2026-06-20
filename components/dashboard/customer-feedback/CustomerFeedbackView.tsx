'use client';

import React, { useMemo } from 'react';
import { FeedbackDonutChart } from './FeedbackDonutChart';
import { FeedbackBarChart } from './FeedbackBarChart';
import { FeedbackPivotTable } from './FeedbackPivotTable';
import { InvestigativeTable } from '../../chart-detail/InvestigativeTable';
import { Share2 } from 'lucide-react';
import type { QueryResult } from '@/types/builder';

interface CustomerFeedbackTile {
  id: string;
  title?: string;
  chart_type?: string;
  visualization_config?: {
    chartType?: string;
  };
  layout?: {
    x?: number;
    y?: number;
    w?: number;
  };
  position?: number;
}

interface CustomerFeedbackChartResult {
  type: string;
  queryResult?: QueryResult;
  stats?: unknown;
}

interface CustomerFeedbackViewProps {
  chartsData: Map<string, CustomerFeedbackChartResult>;
  tiles: CustomerFeedbackTile[];
  extraKpis?: CustomerFeedbackTile[];
  onViewDetail?: (chart: CustomerFeedbackTile, result?: QueryResult) => void;
  onCopyLink?: (chart: CustomerFeedbackTile) => void;
  forcePivot?: boolean;
  investigativeResult?: QueryResult;
}

export function CustomerFeedbackView({
  chartsData,
  tiles,
  extraKpis = [],
  onViewDetail,
  onCopyLink,
  investigativeResult
}: CustomerFeedbackViewProps) {
  const orderedContentTiles = useMemo(() => {
    return tiles
      .filter((t) => !(t.visualization_config?.chartType === 'kpi' || t.chart_type === 'kpi'))
      .slice()
      .sort((a, b) => {
        const ay = a.layout?.y ?? 0;
        const by = b.layout?.y ?? 0;
        if (ay !== by) return ay - by;
        const ax = a.layout?.x ?? 0;
        const bx = b.layout?.x ?? 0;
        if (ax !== bx) return ax - bx;
        return (a.position ?? 0) - (b.position ?? 0);
      });
  }, [tiles]);

  const rows = useMemo(() => {
    const grouped = new Map<number, CustomerFeedbackTile[]>();
    for (const tile of orderedContentTiles) {
      const y = tile.layout?.y ?? 0;
      if (!grouped.has(y)) {
        grouped.set(y, []);
      }
      grouped.get(y)!.push(tile);
    }
    return Array.from(grouped.keys())
      .sort((a, b) => a - b)
      .map((y) => grouped.get(y)!);
  }, [orderedContentTiles]);

  const getGridClass = (rowItems: CustomerFeedbackTile[]) => {
    const len = rowItems.length;
    const widthSignature = rowItems.map((t) => t.layout?.w).join('-');
    if (widthSignature === '3-3-3-3') return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
    if (widthSignature === '4-4-4') return 'grid-cols-1 lg:grid-cols-3';
    if (widthSignature === '6-6') return 'grid-cols-1 lg:grid-cols-2';
    if (widthSignature === '8-4') return 'grid-cols-1 xl:grid-cols-[2fr_1fr]';
    if (len === 1) return 'grid-cols-1';
    if (len === 2) return 'grid-cols-1 md:grid-cols-2';
    if (len === 3) return 'grid-cols-1 md:grid-cols-3';
    if (len === 4) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
    return 'grid-cols-1 md:grid-cols-3 xl:grid-cols-4';
  };

  const getResult = (id: string) => chartsData.get(id)?.queryResult;

  const toChartData = (id: string) => {
    const rows = getResult(id)?.rows || [];
    return rows.map((r: Record<string, unknown>) => {
      const entries = Object.entries(r || {});
      const numericEntry = entries.find(([, v]) => typeof v === 'number');
      const textEntry =
        entries.find(([, v]) => typeof v === 'string' && Number.isNaN(Number(v))) ||
        entries.find(([, v]) => typeof v === 'string') ||
        entries[0];

      return {
        name: String(textEntry?.[1] || 'Unknown'),
        value: Number(numericEntry?.[1] || 0),
      };
    });
  };

  const renderChart = (chart: CustomerFeedbackTile, isFullWidth: boolean) => {
    const title = String(chart.title || '').toLowerCase();
    const type = String(chart.visualization_config?.chartType || chart.chart_type || '').toLowerCase();

    const isExplicitDonut = type === 'donut' || type === 'pie';
    const isExplicitBar = type === 'bar' || type === 'horizontal_bar' || type === 'column';
    const isTable = type === 'table';

    const isDonut = isExplicitDonut ||
      ((title.includes('report by case category') || title.includes('category by area')) && !isExplicitBar);

    const isPivot = type === 'pivot' || type === 'heatmap' ||
      title.includes('category by branch') ||
      title.includes('category by airlines') ||
      title.includes('category by airline') ||
      title.includes('identification of root') ||
      title.includes('total area report') ||
      title.includes('detail report landside & airside') ||
      title.includes('detail root cause summary') ||
      title.includes('detail report cgo cargo') ||
      title.includes('primary indicators') ||
      title.includes('root cause result');

    if (isTable) {
      return (
        <div className="w-full h-full min-h-[200px] overflow-hidden">
          <InvestigativeTable
            data={getResult(chart.id) || { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 }}
            title={chart.title}
            rowsPerPage={isFullWidth ? 8 : 5}
            maxRows={isFullWidth ? 500 : 120}
          />
        </div>
      );
    } else if (isDonut) {
      return <FeedbackDonutChart title="" data={toChartData(chart.id)} height={170} />;
    } else if (isPivot) {
      return (
        <div className={`w-full h-full ${isFullWidth ? 'min-h-[260px]' : 'min-h-[180px]'} overflow-auto custom-scrollbar`}>
          <FeedbackPivotTable title="" result={getResult(chart.id) || { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 }} compact />
        </div>
      );
    } else {
      return (
        <div className="w-full h-full max-h-[280px] overflow-hidden">
          <FeedbackBarChart
            title=""
            data={toChartData(chart.id)}
            limit={title.includes('monthly') || title.includes('bulan') ? 0 : 8}
            sortByValue={!(title.includes('monthly') || title.includes('bulan'))}
            compact
          />
        </div>
      );
    }
  };

  return (
    <div className="space-y-2.5">
      {extraKpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {extraKpis.map((kpi) => (
            <div
              key={kpi.id}
              className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md active:scale-[0.98] cursor-pointer"
            >
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5 opacity-80 truncate w-full">
                {kpi.title}
              </span>
              <span className="text-lg font-extrabold text-gray-800 tabular-nums truncate w-full">
                {Number(getResult(kpi.id)?.rows[0]?.total || 0).toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      )}

      {rows.map((rowTiles, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className={`grid ${getGridClass(rowTiles)} gap-2.5 xl:gap-3`}
        >
          {rowTiles.map((chart) => (
            <div
              key={chart.id}
              className="group relative flex flex-col h-full bg-white rounded-xl border border-gray-100/80 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="px-3 py-2 flex items-center justify-between border-b border-gray-50 shrink-0 gap-1.5">
                <h3 className="text-[9px] font-black text-gray-700 uppercase tracking-tight m-0 truncate opacity-85 group-hover:opacity-100 transition-opacity flex-1 min-w-0">
                  {chart.title}
                </h3>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onCopyLink?.(chart)}
                    className="p-1 text-gray-300 hover:text-brand-primary hover:bg-brand-primary/5 rounded-md transition-all active:scale-90"
                    title="Copy Link"
                  >
                    <Share2 size={12} />
                  </button>
                  <button
                    onClick={() => onViewDetail?.(chart, getResult(chart.id)!)}
                    className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-[8px] font-black text-white bg-brand-primary hover:bg-brand-primary/90 rounded-lg shadow-sm transition-all active:scale-95 uppercase tracking-widest"
                  >
                    DETAIL
                  </button>
                </div>
              </div>
               <div className="p-2.5 flex-1 flex flex-col items-center justify-center overflow-hidden min-h-[170px]">
                {renderChart(chart, rowTiles.length === 1)}
              </div>
            </div>
          ))}
        </div>
      ))}

      {investigativeResult && (
        <div>
          <InvestigativeTable
            data={investigativeResult}
            title="Investigative Report Details"
            rowsPerPage={10}
            maxRows={500}
          />
        </div>
      )}
    </div>
  );
}
