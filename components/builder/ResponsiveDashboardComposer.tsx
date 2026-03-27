'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, LayoutGrid, Sparkles, GripHorizontal, X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardTile, QueryDefinition, ChartVisualization, QueryResult } from '@/types/builder';
import { TileCard } from './TileCard';

interface ResponsiveDashboardComposerProps {
  tiles: DashboardTile[];
  tileResults: Map<string, QueryResult>;
  tileErrors?: Map<string, string>;
  onAddTile: (query: QueryDefinition, viz: ChartVisualization) => void;
  onEditTile: (id: string) => void;
  onRemoveTile: (id: string) => void;
  onResizeTile: (id: string, w: number, h: number) => void;
  onReorderTiles?: (tiles: DashboardTile[]) => void;
  dashboardName?: string;
  className?: string;
}

const GAPURA_GREEN = '#6b8e3d';

export function ResponsiveDashboardComposer({
  tiles,
  tileResults,
  tileErrors,
  onAddTile,
  onEditTile,
  onRemoveTile,
  onResizeTile,
  onReorderTiles,
  dashboardName,
  className,
}: ResponsiveDashboardComposerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [draggedTileId, setDraggedTileId] = useState<string | null>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle tile selection for mobile
  const handleTileTap = useCallback((tileId: string) => {
    if (isMobile) {
      setSelectedTileId(selectedTileId === tileId ? null : tileId);
    }
  }, [isMobile, selectedTileId]);

  // Simplified add tile for mobile
  const handleMobileAddTile = useCallback(() => {
    onAddTile(
      { source: '', joins: [], dimensions: [], measures: [], filters: [], sorts: [] },
      { chartType: 'bar', yAxis: [], showLegend: false, showLabels: false }
    );
  }, [onAddTile]);

  // Reorder tiles (mobile-friendly)
  const handleMoveTile = useCallback((tileId: string, direction: 'up' | 'down') => {
    if (!onReorderTiles) return;

    const index = tiles.findIndex(t => t.id === tileId);
    if (index === -1) return;

    const newTiles = [...tiles];
    if (direction === 'up' && index > 0) {
      [newTiles[index], newTiles[index - 1]] = [newTiles[index - 1], newTiles[index]];
    } else if (direction === 'down' && index < newTiles.length - 1) {
      [newTiles[index], newTiles[index + 1]] = [newTiles[index + 1], newTiles[index]];
    }
    onReorderTiles(newTiles);
  }, [tiles, onReorderTiles]);

  // Mobile layout
  if (isMobile) {
    return (
      <div className={cn("flex flex-col h-full bg-[#f5f5f5]", className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#e0e0e0]">
          <div className="flex items-center gap-2">
            <LayoutGrid size={18} className="text-[#666]" />
            <span className="text-sm font-bold text-[#333]">
              {dashboardName || 'Dashboard'}
            </span>
          </div>
          <span className="text-xs text-[#999]">{tiles.length} tiles</span>
        </div>

        {/* Mobile Tile List */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {tiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative p-6 border-2 border-dashed border-[#e0e0e0] rounded-2xl">
                <LayoutGrid size={40} className="text-[#999] opacity-30" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[#666] mb-1">No tiles yet</p>
                <p className="text-xs text-[#999]">Add your first tile to get started</p>
              </div>
            </div>
          ) : (
            tiles.map((tile, index) => {
              const isSelected = selectedTileId === tile.id;
              const result = tileResults.get(tile.id);
              const error = tileErrors?.get(tile.id);

              return (
                <div
                  key={tile.id}
                  className={cn(
                    "bg-white rounded-xl overflow-hidden transition-all duration-200",
                    "border-2",
                    isSelected ? "border-[#6b8e3d] shadow-lg" : "border-transparent shadow-sm"
                  )}
                >
                  {/* Tile Header - Always visible */}
                  <div
                    onClick={() => handleTileTap(tile.id)}
                    className="flex items-center justify-between px-4 py-3 active:bg-[#f5f5f5]"
                    style={{ minHeight: '48px' }}
                  >
                    <div className="flex items-center gap-3">
                      <GripHorizontal size={18} className="text-[#999]" />
                      <span className="text-sm font-medium text-[#333] truncate max-w-[200px]">
                        {tile.visualization.title || `Tile ${index + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isSelected ? (
                        <ChevronUp size={18} className="text-[#666]" />
                      ) : (
                        <ChevronDown size={18} className="text-[#666]" />
                      )}
                    </div>
                  </div>

                  {/* Tile Content - Expanded when selected */}
                  {isSelected && (
                  <div className="border-t border-[#e0e0e0]">
                      {/* Preview */}
                      <div className="p-4 bg-[#fafafa]">
                        <TileCard
                          tile={tile}
                          result={result}
                          error={error}
                          onEdit={onEditTile}
                          onRemove={onRemoveTile}
                          onResize={onResizeTile}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 px-4 py-3 border-t border-[#e0e0e0] bg-white">
                        <button
                          onClick={() => onEditTile(tile.id)}
                          className="flex-1 px-3 py-2.5 text-xs font-medium text-[#333] bg-[#f5f5f5] rounded-lg active:bg-[#e0e0e0] transition-colors"
                          style={{ minHeight: '44px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onRemoveTile(tile.id)}
                          className="flex-1 px-3 py-2.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg active:bg-red-100 transition-colors"
                          style={{ minHeight: '44px' }}
                        >
                          Remove
                        </button>
                      </div>

                      {/* Reorder Controls */}
                      {onReorderTiles && tiles.length > 1 && (
                        <div className="flex items-center gap-2 px-4 pb-3">
                          <button
                            onClick={() => handleMoveTile(tile.id, 'up')}
                            disabled={index === 0}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-[#666] bg-[#f5f5f5] rounded-lg disabled:opacity-30 active:bg-[#e0e0e0] transition-colors"
                            style={{ minHeight: '44px' }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Move Up
                          </button>
                          <button
                            onClick={() => handleMoveTile(tile.id, 'down')}
                            disabled={index === tiles.length - 1}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-[#666] bg-[#f5f5f5] rounded-lg disabled:opacity-30 active:bg-[#e0e0e0] transition-colors"
                            style={{ minHeight: '44px' }}
                          >
                            Move Down
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add Tile Button - Fixed at bottom */}
        <div className="p-4 bg-white border-t border-[#e0e0e0]">
          <div className="flex gap-2">
            <button
              onClick={handleMobileAddTile}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white rounded-xl active:opacity-90 transition-opacity shadow-lg"
              style={{ backgroundColor: GAPURA_GREEN, minHeight: '48px' }}
            >
              <Plus size={18} />
              Add Tile
            </button>
            <button
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded-xl active:bg-purple-100 transition-colors"
              style={{ minHeight: '48px' }}
            >
              <Sparkles size={18} />
              AI
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout - Standard grid with dnd-kit support
  const kpiTiles = tiles.filter(t => t.visualization.chartType === 'kpi');
  const contentTiles = tiles.filter(t => t.visualization.chartType !== 'kpi');

  return (
    <div className={cn("h-full overflow-auto bg-[#f5f5f5]", className)}>
      {/* KPI Row */}
      {kpiTiles.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
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
                className="group relative bg-white rounded-lg px-4 py-3 border border-[#e0e0e0] transition-shadow hover:shadow-md"
                style={{ borderLeft: `3px solid ${GAPURA_GREEN}` }}
              >
                <div className="text-xs font-semibold uppercase" style={{ color: GAPURA_GREEN }}>
                  {tile.visualization.title || 'KPI'}
                </div>
                <div className="text-2xl font-bold mt-1" style={{ color: GAPURA_GREEN }}>
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

      {/* Content Grid */}
      <div className="p-4">
        {contentTiles.length > 0 ? (
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: 'repeat(12, 1fr)',
              gridAutoRows: '220px',
            }}
          >
            {contentTiles.map(tile => (
              <div
                key={tile.id}
                style={{
                  gridColumn: `span ${Math.min(tile.layout.w, 12)}`,
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
              <p className="text-sm font-medium text-[#666] mb-1">No tiles yet</p>
              <p className="text-xs text-[#999]">Create your first tile to start building</p>
            </div>
            <button
              onClick={handleMobileAddTile}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90"
              style={{ backgroundColor: GAPURA_GREEN }}
            >
              <Plus size={14} />
              Add Tile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
