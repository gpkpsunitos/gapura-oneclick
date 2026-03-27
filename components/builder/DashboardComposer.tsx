'use client';

import { useState } from 'react';
import { Plus, RotateCcw, MoreVertical, User, LayoutGrid, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { TileCard } from './TileCard';
import type { DashboardTile, QueryResult, DashboardPage, QueryDefinition, ChartVisualization } from '@/types/builder';
import type { LayoutPreset } from '@/lib/hooks/useDashboardState';
import { cn } from '@/lib/utils';
import { DynamicFilterHeader } from './DynamicFilterHeader';
import type { FilterData } from './DynamicFilterHeader';

interface DashboardComposerProps {
  tiles: DashboardTile[];
  onEditTile: (id: string) => void;
  onRemoveTile: (id: string) => void;
  onResizeTile: (id: string, w: number, h: number) => void;
  onApplyPreset: (preset: LayoutPreset) => void;
  tileResults: Map<string, QueryResult>;
  tileErrors?: Map<string, string>;
  onAddTile: (query: QueryDefinition, viz: ChartVisualization) => void;
  dashboardName?: string;
  dashboardDescription?: string;
  pages?: DashboardPage[];
  yearRange?: string;
  onReset?: () => void;
  onFilterChange?: (filters: FilterData) => void;
  currentFilters?: FilterData;
}

const GAPURA_GREEN = '#6b8e3d';
const GAPURA_BANNER = '#5a7a3a';

export function DashboardComposer({
  tiles,
  tileResults,
  tileErrors,
  onAddTile,
  onEditTile,
  onRemoveTile,
  onResizeTile,
  dashboardName,
  dashboardDescription,
  pages = [],
  yearRange = '',
  onReset,
  onFilterChange,
  currentFilters,
  gridCols = 12,
}: DashboardComposerProps & { gridCols?: number }) {
  const [activePageIdx, setActivePageIdx] = useState(0);

  // Determine which tiles to show based on active page
  const hasPages = pages.length > 1;
  const activePage = hasPages ? pages[activePageIdx] : null;
  const filteredTileIds = activePage ? new Set(activePage.tiles.map(t => t.id)) : null;

  const visibleTiles = filteredTileIds
    ? tiles.filter(t => filteredTileIds.has(t.id))
    : tiles;

  // Separate KPI tiles from content tiles
  const kpiTiles = visibleTiles.filter(t => t.visualization.chartType === 'kpi');
  const contentTiles = visibleTiles.filter(t => t.visualization.chartType !== 'kpi');

  const isCGO = activePage?.name?.toLowerCase().includes('cgo');
  const yearSuffix = yearRange ? ` ${yearRange}` : '';
  
  const displayTitle = dashboardName && !dashboardName.toLowerCase().includes('untitled')
    ? (dashboardName.includes(yearRange) ? dashboardName : `${dashboardName}${yearSuffix}`)
    : isCGO 
      ? `CGO Cargo Customer Feedback${yearSuffix}`
      : `Landside & Airside Customer Feedback${yearSuffix}`;

  return (
    <div className="flex h-full bg-[#f5f5f5]">
      {/* Main Content */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Top Bar with Page Tabs + Actions */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-white border-b border-[#e0e0e0]">
          {/* Page tabs for multi-page editing */}
          {hasPages ? (
            <div className="flex items-center gap-1 overflow-x-auto">
              {pages.map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePageIdx(idx)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all",
                    activePageIdx === idx
                      ? "text-white shadow-sm"
                      : "text-[#666] hover:bg-[#f5f5f5]"
                  )}
                  style={activePageIdx === idx ? { backgroundColor: GAPURA_GREEN } : undefined}
                >
                  {page.name}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button 
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#666] hover:bg-[#f5f5f5] rounded-lg transition-colors"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button className="p-1.5 text-[#666] hover:bg-[#f5f5f5] rounded-lg transition-colors">
              <MoreVertical size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#e0e0e0] flex items-center justify-center">
              <User size={16} className="text-[#666]" />
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">
          <div>
            {/* Gapura Header */}
            <div className="bg-white px-6 py-4">
              {/* Logo + Title Row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Gapura" width={120} height={40} style={{ objectFit: 'contain' }} />
                  <h1 className="text-lg font-bold text-[#333]">
                    {displayTitle}
                  </h1>
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded transition-colors"
                  style={{ backgroundColor: GAPURA_GREEN }}
                >
                  Select date range
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2.5 3.5L5 6L7.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Banner */}
              <div 
                className="flex items-center justify-between px-4 py-2 rounded"
                style={{ backgroundColor: GAPURA_BANNER }}
              >
                <span className="text-sm font-bold text-white">
                  {dashboardDescription || 'Irregularity, Complain & Compliment Report'}
                </span>
                <div className="flex items-center gap-2">
                  <DynamicFilterHeader 
                    onFilterChange={onFilterChange || (() => {})} 
                    initialFilters={currentFilters}
                  />
                </div>
              </div>

              {/* KPI Stats Row */}
              {kpiTiles.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {kpiTiles.slice(0, 4).map(tile => {
                    const result = tileResults.get(tile.id);
                    let value: string | number = '-';
                    if (result && result.rows.length > 0) {
                      const row = result.rows[0] as Record<string, unknown>;
                      const yKey = tile.visualization.yAxis?.[0] || result.columns[result.columns.length - 1];
                      value = Number(row[yKey]) || 0;
                    }
                    return (
                      <div 
                        key={tile.id} 
                        className="group relative bg-white rounded-lg px-5 py-4 border border-[#e0e0e0] transition-shadow hover:shadow-md"
                        style={{ borderLeft: `3px solid ${GAPURA_GREEN}` }}
                      >
                        <div className="text-xs font-semibold uppercase" style={{ color: GAPURA_GREEN }}>
                          {tile.visualization.title || 'KPI'}
                        </div>
                        <div className="text-[28px] font-bold mt-1" style={{ color: GAPURA_GREEN }}>
                          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditTile(tile.id)}
                            className="text-[10px] text-[#666] bg-white border border-[#e0e0e0] rounded px-1.5 py-0.5 hover:text-[#6b8e3d] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onRemoveTile(tile.id)}
                            className="text-[10px] text-red-400 bg-white border border-[#e0e0e0] rounded px-1.5 py-0.5 hover:text-red-600 transition-colors"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Content Tiles Grid */}
            <div className="px-6 py-5">
              {contentTiles.length > 0 ? (
                <div
                  className="grid gap-5"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                    gridAutoRows: '220px',
                  }}
                >
                  {contentTiles.map(tile => (
                    <div
                      key={tile.id}
                      className="relative group rounded-xl border border-[#e0e0e0] bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                      style={{
                        gridColumn: `span ${Math.min(tile.layout.w, gridCols)}`,
                        gridRow: `span ${tile.layout.h}`,
                      }}
                    >
                      <TileCard
                        tile={tile}
                        result={tileResults.get(tile.id)}
                        error={tileErrors?.get(tile.id)}
                        onEdit={onEditTile}
                        onRemove={onRemoveTile}
                        onResize={onResizeTile}
                        dashboardId={activePage?.name || 'untitled'}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative p-6 border-2 border-dashed border-[#e0e0e0] rounded-2xl">
                    <LayoutGrid size={40} className="text-[#999] opacity-30" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#666] mb-1">Belum ada tile</p>
                    <p className="text-xs text-[#999]">Mulai dengan menambah tile atau gunakan AI</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAddTile(
                      { source: '', joins: [], dimensions: [], measures: [], filters: [], sorts: [] },
                      { chartType: 'bar', yAxis: [], showLegend: false, showLabels: false }
                    )}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90"
                      style={{ backgroundColor: GAPURA_GREEN }}
                    >
                      <Plus size={14} />
                      Tambah Tile
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <Sparkles size={14} />
                      Buat dengan AI
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Timestamp */}
            <div className="px-5 py-3 border-t border-[#e0e0e0] bg-white">
              <p className="text-xs text-[#999]">
                Data Last Updated: 2/13/2026 1:18:37 PM | <button className="text-[#6b8e3d] hover:underline">Privacy Policy</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
