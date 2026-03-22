'use client';

import React, { useMemo } from 'react';
import { SPACING, TYPOGRAPHY } from '@/lib/constants/breakpoints';
import { useViewport } from '@/hooks/useViewport';
import { FeedbackDonutChart } from './FeedbackDonutChart';
import { FeedbackBarChart } from './FeedbackBarChart';
import { FeedbackPivotTable } from './FeedbackPivotTable';
import { InvestigativeTable } from '../../chart-detail/InvestigativeTable';
import { Share2 } from 'lucide-react';
import type { QueryResult } from '@/types/builder';

interface CustomerFeedbackViewProps {
  chartsData: Map<string, { type: string, queryResult?: QueryResult, stats?: any }>;
  tiles: any[];
  extraKpis?: any[];
  onViewDetail?: (chart: any, result?: QueryResult) => void;
  onCopyLink?: (chart: any) => void;
  forcePivot?: boolean;
  investigativeResult?: QueryResult;
}

/**
 * Main overview layout orchestrator for Customer Feedback embed pages.
 * Reproduces the Page 1 visual structure and can be reused for CGO overview.
 */
export function CustomerFeedbackView({ 
  chartsData, 
  tiles, 
  extraKpis = [], 
  onViewDetail, 
  onCopyLink,
  forcePivot = false,
  investigativeResult
}: CustomerFeedbackViewProps) {
  const viewport = useViewport();
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

  const { fullWidthTiles, standardTiles } = useMemo(() => {
    const full: any[] = [];
    const standard: any[] = [];
    for (const tile of orderedContentTiles) {
      const title = String(tile.title || '').toLowerCase();
      const isPivot = String(tile.visualization_config?.chartType || tile.chart_type || '').toLowerCase() === 'pivot' || 
                      String(tile.visualization_config?.chartType || tile.chart_type || '').toLowerCase() === 'heatmap' ||
                      tile.title?.toLowerCase().includes('case report by area');
      
      // Specifically make "Case Report by Area" full width as requested
      if (title.includes('case report by area') && isPivot) {
        full.push(tile);
      } else {
        standard.push(tile);
      }
    }
    return { fullWidthTiles: full, standardTiles: standard };
  }, [orderedContentTiles]);

  const findTileInStandard = useMemo(() => {
    return (patterns: string[]) => {
      return standardTiles.find((tile) => {
        const title = String(tile.title || '').toLowerCase();
        return patterns.some((pattern) => title.includes(pattern));
      });
    };
  }, [standardTiles]);

  // Strict page-1 reference layout.
  const row1 = useMemo(() => {
    const reportByCaseCategory = findTileInStandard(['report by case category']);
    const branchReport = findTileInStandard(['branch report']);
    const airlinesReport = findTileInStandard(['airlines report', 'airline report']);
    const monthlyReport = findTileInStandard(['monthly report', 'monthly', 'bulanan', 'bulan']);

    const explicit = [reportByCaseCategory, branchReport, airlinesReport, monthlyReport].filter(Boolean);
    if (explicit.length === 4) return explicit as any[];

    const used = new Set(explicit.map((t: any) => t.id));
    const fallback = standardTiles.filter((t) => !used.has(t.id)).slice(0, 4 - explicit.length);
    return [...explicit, ...fallback];
  }, [standardTiles, findTileInStandard]);

  const row2 = useMemo(() => {
    const categoryByArea = findTileInStandard(['category by area', 'kategori by area']);
    const caseCategoryByBranch = findTileInStandard(['case category by branch', 'category by branch']);
    const caseCategoryByAirline = findTileInStandard([
      'case category by airlines',
      'case category by airline',
      'category by airlines',
      'category by airline',
    ]);

    const explicit = [categoryByArea, caseCategoryByBranch, caseCategoryByAirline].filter(Boolean);
    if (explicit.length === 3) return explicit as any[];

    const used = new Set(explicit.map((t: any) => t.id));
    const getChartType = (tile: any) => String(tile.visualization_config?.chartType || tile.chart_type || '').toLowerCase();
    const matrixOrAreaTiles = standardTiles.filter((t) => {
      const type = getChartType(t);
      const title = String(t.title || '').toLowerCase();
      return type === 'pivot' || type === 'heatmap' || type === 'branch_area_grid' || title.includes('category by area');
    });

    const fallback = matrixOrAreaTiles.filter((t) => !used.has(t.id)).slice(0, 3 - explicit.length);
    return [...explicit, ...fallback].slice(0, 3);
  }, [standardTiles, findTileInStandard]);

  const getResult = (id: string) => chartsData.get(id)?.queryResult;

  const toChartData = (id: string) => {
    const rows = getResult(id)?.rows || [];
    return rows.map((r: any) => {
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

  // Complexity: Time O(tiles) | Space O(1)
  return (
    <div className="space-y-4">
      {/* ── KPI Row (Migrated Page 2 KPIs) ── */}
      {extraKpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-prism-reveal">
          {extraKpis.map((kpi) => (
            <div 
              key={kpi.id} 
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md active:scale-[0.98] cursor-pointer"
            >
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 opacity-80 truncate w-full">
                {kpi.title}
              </span>
              <span className="text-xl font-extrabold text-gray-800 tabular-nums truncate w-full">
                {Number(getResult(kpi.id)?.rows[0]?.total || 0).toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Row 1 & 2: Standard Layout or Pivot Grid ── */}
      {forcePivot ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-6 animate-prism-reveal [animation-delay:100ms]">
          {standardTiles.map((chart) => (
            <div key={chart.id} className="group relative flex flex-col h-full glass-morphism rounded-prism overflow-hidden hover:translate-y-[-4px] transition-all duration-500 ease-out">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/10 relative z-10 shrink-0 gap-2">
                <h3 className="text-[10px] font-black text-text-primary uppercase tracking-tight m-0 truncate opacity-90 group-hover:opacity-100 transition-opacity flex-1 min-w-0">
                  {chart.title}
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onCopyLink?.(chart)}
                    className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all active:scale-90"
                    title="Copy Link"
                  >
                    <Share2 size={14} />
                  </button>
                  <button
                    onClick={() => onViewDetail?.(chart, getResult(chart.id)!)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-black text-white bg-brand-primary hover:bg-brand-aurora-2 rounded-prism shadow-sm transition-all active:scale-90 uppercase tracking-widest"
                  >
                    DETAIL
                  </button>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col items-center justify-center relative z-10 overflow-hidden">
                <div className="w-full h-full min-h-[250px] overflow-auto custom-scrollbar">
                  <FeedbackPivotTable
                    title=""
                    result={getResult(chart.id) || { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── Row 1: Symmetric Top Report Modules (Bento 2.0) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6 animate-prism-reveal [animation-delay:100ms]">
            {row1.map((chart) => {
              const isDonut = chart.title?.toLowerCase().includes('report by case category');
              return (
                <div key={chart.id} className="group relative flex flex-col h-full glass-morphism rounded-prism overflow-hidden hover:translate-y-[-4px] transition-all duration-500 ease-out">
                  {/* Kinetic Inner Glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  
                  <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/10 relative z-10 shrink-0 gap-2">
                    <h3 className="text-[10px] font-black text-text-primary uppercase tracking-tight m-0 truncate opacity-90 group-hover:opacity-100 transition-opacity flex-1 min-w-0">
                      {chart.title}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onCopyLink?.(chart)}
                        className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all active:scale-90"
                        title="Copy Link"
                      >
                        <Share2 size={14} />
                      </button>
                      <button
                        onClick={() => onViewDetail?.(chart, getResult(chart.id)!)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-black text-white bg-brand-primary hover:bg-brand-aurora-2 rounded-prism shadow-sm transition-all active:scale-90 uppercase tracking-widest"
                      >
                        DETAIL
                      </button>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col items-center justify-center relative z-10 overflow-hidden">
                      {isDonut ? (
                        <FeedbackDonutChart 
                          title="" 
                          data={toChartData(chart.id)} 
                          height={viewport.isMobile ? 250 : 250} 
                        />
                      ) : (
                      <div className="w-full h-full max-h-[400px] overflow-hidden">
                        <FeedbackBarChart
                          title=""
                          data={toChartData(chart.id)}
                          limit={chart.title?.toLowerCase().includes('monthly') || chart.title?.toLowerCase().includes('bulan') ? 0 : 8}
                          sortByValue={!(chart.title?.toLowerCase().includes('monthly') || chart.title?.toLowerCase().includes('bulan'))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Row 2: Matrix & Complex Visualizations (Asymmetric Bento) ── */}
          {row2.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.6fr_1.6fr] gap-4 xl:gap-6 animate-prism-reveal [animation-delay:200ms]">
              {row2.map((chart) => {
                const title = String(chart.title || '').toLowerCase();
                // Match reference image: Category by Area is a Donut, Branch/Airlines are Pivot Tables
                const useDonut = title.includes('category by area'); 
                
                return (
                  <div 
                    key={chart.id}
                    className="group relative flex flex-col h-full glass-morphism rounded-prism overflow-hidden hover:translate-y-[-4px] transition-all duration-500 ease-out"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    
                    <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/10 relative z-10 shrink-0 gap-2">
                      <h3 className="text-[10px] font-black text-text-primary uppercase tracking-tight m-0 truncate opacity-90 group-hover:opacity-100 transition-opacity flex-1 min-w-0">
                        {chart.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onCopyLink?.(chart)}
                          className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all active:scale-90"
                          title="Copy Link"
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          onClick={() => onViewDetail?.(chart, getResult(chart.id)!)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-black text-white bg-brand-primary hover:bg-brand-aurora-2 rounded-prism shadow-sm transition-all active:scale-95 uppercase tracking-widest"
                        >
                          DETAIL
                        </button>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col items-center justify-center relative z-10 overflow-hidden">
                      {useDonut ? (
                        <FeedbackDonutChart
                          title=""
                          data={toChartData(chart.id)}
                          height={viewport.isMobile ? 250 : 250}
                        />
                      ) : (
                        <div className="w-full h-full min-h-[250px] overflow-auto custom-scrollbar">
                          <FeedbackPivotTable
                            title=""
                            result={getResult(chart.id) || { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Row 3: Full-width Detail Visualizations ── */}
      {fullWidthTiles.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:gap-6 animate-prism-reveal [animation-delay:300ms]">
          {fullWidthTiles.map((chart) => (
            <div 
              key={chart.id}
              className="group relative flex flex-col h-full glass-morphism rounded-prism overflow-hidden hover:translate-y-[-4px] transition-all duration-500 ease-out"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              
              <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/10 relative z-10 shrink-0 gap-2">
                <h3 className="text-[10px] font-black text-text-primary uppercase tracking-tight m-0 truncate opacity-90 group-hover:opacity-100 transition-opacity flex-1 min-w-0">
                  {chart.title}
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onCopyLink?.(chart)}
                    className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all active:scale-90"
                    title="Copy Link"
                  >
                    <Share2 size={14} />
                  </button>
                  <button
                    onClick={() => onViewDetail?.(chart, getResult(chart.id)!)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-black text-white bg-brand-primary hover:bg-brand-aurora-2 rounded-prism shadow-sm transition-all active:scale-95 uppercase tracking-widest"
                  >
                    DETAIL
                  </button>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col items-center justify-center relative z-10 overflow-hidden">
                <div className="w-full h-full min-h-[400px] overflow-auto custom-scrollbar">
                  <FeedbackPivotTable
                    title=""
                    result={getResult(chart.id) || { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Row 4: Investigative Table ── */}
      {investigativeResult && (
        <div className="animate-prism-reveal [animation-delay:400ms]">
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
