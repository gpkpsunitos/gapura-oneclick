/**
 * @file
 * 
 * File ini berisi React hook untuk mengelola state dashboard builder,
 * termasuk manajemen tiles, layout, dan definisi dashboard
 */

'use client';

import { useState, useCallback } from 'react';
import type { DashboardTile, DashboardDefinition, DashboardPage, GlobalFilter, QueryDefinition, ChartVisualization, TileLayout } from '@/types/builder';

/** Visualisasi default untuk chart */
const defaultVisualization: ChartVisualization = {
  chartType: 'bar',
  yAxis: [],
  showLegend: true,
  showLabels: false,
};

/** Preset layout yang tersedia */
const LAYOUT_PRESETS = {
  '1-col': [{ x: 0, y: 0, w: 12, h: 2 }],
  '2-col': [
    { x: 0, y: 0, w: 6, h: 2 },
    { x: 6, y: 0, w: 6, h: 2 },
  ],
  '3-col': [
    { x: 0, y: 0, w: 4, h: 2 },
    { x: 4, y: 0, w: 4, h: 2 },
    { x: 8, y: 0, w: 4, h: 2 },
  ],
  '2+1': [
    { x: 0, y: 0, w: 6, h: 2 },
    { x: 6, y: 0, w: 6, h: 2 },
    { x: 0, y: 2, w: 12, h: 2 },
  ],
  '1+2': [
    { x: 0, y: 0, w: 12, h: 2 },
    { x: 0, y: 2, w: 6, h: 2 },
    { x: 6, y: 2, w: 6, h: 2 },
  ],
};

/** Tipe preset layout yang tersedia */
export type LayoutPreset = keyof typeof LAYOUT_PRESETS;

/** Counter untuk generate ID tile yang unik */
let tileIdCounter = 0;

/**
 * Generate ID tile yang unik
 * 
 * @returns String ID tile unik
 */
function nextTileId() {
  tileIdCounter++;
  return `tile-${Date.now()}-${tileIdCounter}`;
}

/**
 * Hook untuk mengelola state dashboard builder
 * 
 * @returns Object berisi fungsi dan state untuk manajemen dashboard
 */
export function useDashboardState() {
  const [tiles, setTiles] = useState<DashboardTile[]>([]);
  const [pages, setPages] = useState<DashboardPage[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folder, setFolder] = useState('');
  const [globalFilters, setGlobalFilters] = useState<GlobalFilter[]>([]);

  /**
   * Menambahkan tile baru ke dashboard
   * 
   * @param query - Definisi query untuk tile
   * @param visualization - Konfigurasi visualisasi
   * @returns ID tile yang baru dibuat
   */
  const addTile = useCallback((query: QueryDefinition, visualization: ChartVisualization) => {
    const maxY = tiles.length > 0
      ? Math.max(...tiles.map(t => t.layout.y + t.layout.h))
      : 0;

    const newTile: DashboardTile = {
      id: nextTileId(),
      query,
      visualization,
      layout: { x: 0, y: maxY, w: 6, h: 2 },
    };
    setTiles(prev => [...prev, newTile]);
    return newTile.id;
  }, [tiles]);

  /**
   * Menghapus tile berdasarkan ID
   * 
   * @param id - ID tile yang akan dihapus
   */
  const removeTile = useCallback((id: string) => {
    setTiles(prev => {
      return prev.filter(t => t.id !== id);
    });
  }, []);

  /**
   * Reset semua tile
   */
  const resetTiles = useCallback(() => {
    // History logic removed to resolve unused variable lint error
  }, []);

  /**
   * Update tile berdasarkan ID
   * 
   * @param id - ID tile yang akan diupdate
   * @param updates - Partial update untuk tile
   */
  const updateTile = useCallback((id: string, updates: Partial<Omit<DashboardTile, 'id'>>) => {
    setTiles(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  /**
   * Update layout tile berdasarkan ID
   * 
   * @param id - ID tile yang akan diupdate layoutnya
   * @param layout - Partial update untuk layout
   */
  const updateTileLayout = useCallback((id: string, layout: Partial<TileLayout>) => {
    setTiles(prev => prev.map(t =>
      t.id === id ? { ...t, layout: { ...t.layout, ...layout } } : t
    ));
  }, []);

  /**
   * Terapkan preset layout ke semua tile
   * 
   * @param preset - Tipe preset layout yang akan diterapkan
   */
  const applyLayoutPreset = useCallback((preset: LayoutPreset) => {
    const layouts = LAYOUT_PRESETS[preset];
    setTiles(prev => prev.map((tile, idx) => {
      const layout = layouts[idx % layouts.length];
      const rowOffset = Math.floor(idx / layouts.length) * 2;
      return { ...tile, layout: { ...layout, y: layout.y + rowOffset } };
    }));
  }, []);

  /**
   * Menambahkan tile kosong dengan query dan visualisasi default
   * 
   * @returns ID tile yang baru dibuat
   */
  const addEmptyTile = useCallback(() => {
    const defaultQuery: QueryDefinition = {
      source: 'reports',
      joins: [],
      dimensions: [],
      measures: [],
      filters: [],
      sorts: [],
      limit: 1000,
    };
    return addTile(defaultQuery, { ...defaultVisualization });
  }, [addTile]);

  /**
   * Mendapatkan definisi dashboard lengkap dari state saat ini
   * 
   * @returns Definisi dashboard lengkap
   */
  const getDashboardDefinition = useCallback((): DashboardDefinition => {
    return {
      name,
      description: description || undefined,
      folder: folder || undefined,
      tiles,
      pages: pages.length > 0 ? pages : undefined,
      globalFilters: globalFilters.length > 0 ? globalFilters : undefined,
    };
  }, [name, description, folder, tiles, pages, globalFilters]);

  /**
   * Memuat definisi dashboard ke state
   * 
   * @param def - Definisi dashboard yang akan dimuat
   */
  const loadDashboard = useCallback((def: DashboardDefinition) => {
    setName(def.name);
    setDescription(def.description || '');
    setFolder(def.folder || '');
    
    // Robustly handle tiles from pages if top-level tiles are missing
    let allTiles = def.tiles || [];
    if (allTiles.length === 0 && def.pages && def.pages.length > 0) {
       allTiles = def.pages.flatMap(p => p.tiles || []);
    }
    
    setTiles(allTiles);
    setPages(def.pages || []);
    setGlobalFilters(def.globalFilters || []);
  }, []);

  return {
    tiles,
    pages,
    name,
    description,
    folder,
    globalFilters,
    setName,
    setDescription,
    setFolder,
    setGlobalFilters,
    addTile,
    addEmptyTile,
    removeTile,
    resetTiles,
    updateTile,
    updateTileLayout,
    applyLayoutPreset,
    getDashboardDefinition,
    loadDashboard,
  };
}

/** Ekspor preset layout untuk penggunaan eksternal */
export { LAYOUT_PRESETS };
