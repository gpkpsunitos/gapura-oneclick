'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Compass, LayoutGrid, Save, RotateCcw, Sparkles, Plus, Loader2, MousePointerClick, Play, BarChart3, Check } from 'lucide-react';
import { useQueryBuilder } from '@/lib/hooks/useQueryBuilder';
import { useQueryExecution } from '@/lib/hooks/useQueryExecution';
import { useDashboardState } from '@/lib/hooks/useDashboardState';
import { FieldSidebar } from './FieldSidebar';
import { QueryPanel } from './QueryPanel';
import { ResultsPanel } from './ResultsPanel';
import { ChartPreview } from './ChartPreview';
import { ChartConfigPanel } from './ChartConfigPanel';
import { DashboardComposer } from './DashboardComposer';
import { SaveDashboardModal } from './SaveDashboardModal';
import type { ChartVisualization, QueryResult, FieldDef, AggregateFunction, ChartType, QueryDefinition, TileLayout, QueryFilter } from '@/types/builder';
import { useAIDashboard } from '@/lib/hooks/useAIDashboard';
import { cn } from '@/lib/utils';

type Mode = 'explore' | 'dashboard';

const PROMPT_SUGGESTIONS = [
  { label: 'Laporan Bulanan', prompt: 'Buatkan dashboard laporan bulanan yang menampilkan trend, distribusi kategori, dan perbandingan antar stasiun' },
  { label: 'Perbandingan Maskapai', prompt: 'Buat dashboard perbandingan jumlah laporan per maskapai dengan breakdown severity dan kategori' },
  { label: 'Trend Compliment', prompt: 'Buatkan dashboard analisis trend compliment per bulan dengan distribusi area dan maskapai' },
  { label: 'Severity Analysis', prompt: 'Buat dashboard analisis severity laporan dengan heatmap per stasiun dan trend waktu' },
];

const AI_STEPS = [
  { label: 'Menganalisis schema...', delay: 0 },
  { label: 'Merancang query...', delay: 3000 },
  { label: 'Menyusun visualisasi...', delay: 8000 },
  { label: 'Menyelesaikan dashboard...', delay: 15000 },
];

interface GlobalFilters {
  hub?: string;
  branch?: string;
  maskapai?: string;
  airlines?: string;
  category?: string;
  area?: string;
}

interface BuilderLayoutProps {
  onSaveDashboard: (name: string, description: string, tiles: SaveTile[], config?: SaveConfig, folder?: string | null) => Promise<{ embedUrl: string } | null>;
  existingFolders?: string[];
}

export interface SaveTile {
  title: string;
  chartType: ChartType;
  dataField: string;
  width: 'full' | 'half' | 'third';
  position: number;
  query_config: QueryDefinition;
  visualization_config: ChartVisualization;
  layout: TileLayout;
  page_name: string;
}

export interface SaveConfig {
  dateRange: string;
  autoRefresh: boolean;
  pages: string[];
  dateFrom?: string;
  dateTo?: string;
}

const defaultVisualization: ChartVisualization = {
  chartType: 'bar',
  yAxis: [],
  showLegend: true,
  showLabels: false,
};

export function BuilderLayout({ onSaveDashboard, existingFolders = [] }: BuilderLayoutProps) {
  const [mode, setMode] = useState<Mode>('explore');
  const [visualization, setVisualization] = useState<ChartVisualization>({ ...defaultVisualization });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingTileId, setEditingTileId] = useState<string | null>(null);
  const [tileResults, setTileResults] = useState<Map<string, QueryResult>>(new Map());
  const [showWelcome, setShowWelcome] = useState(true);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFolder, setAiFolder] = useState('');
  const [aiStep, setAiStep] = useState(0);

  // Customer Feedback template
  const [cfDateFrom, setCfDateFrom] = useState('');
  const [cfDateTo, setCfDateTo] = useState('');
  const [cfFolder, setCfFolder] = useState('');
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({
    hub: 'all',
    branch: 'all',
    maskapai: 'all',
    airlines: 'all',
    category: 'all',
    area: 'all'
  });

  const qb = useQueryBuilder();
  const qe = useQueryExecution();
  const dash = useDashboardState();
  const ai = useAIDashboard();

  const hasDimensions = qb.query.dimensions.length > 0;
  const hasMeasures = qb.query.measures.length > 0;
  const hasQuery = hasDimensions || hasMeasures;
  const hasResult = qe.data !== null && qe.data.rows.length > 0;

  // Hide welcome once they interact
  useEffect(() => {
    if (hasQuery) {
      // Use a microtask to avoid synchronous setState in effect
      Promise.resolve().then(() => setShowWelcome(false));
    }
  }, [hasQuery]);

  // AI loading progress stepper
  useEffect(() => {
    if (!ai.loading) {
      // Use a microtask to avoid synchronous setState in effect
      Promise.resolve().then(() => setAiStep(0));
      return;
    }
    const timers = AI_STEPS.map((step, idx) =>
      setTimeout(() => setAiStep(idx), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [ai.loading]);

  const handleFieldClick = useCallback((table: string, field: FieldDef) => {
    if (field.type === 'number' || field.type === 'uuid') {
      const fn: AggregateFunction = field.type === 'uuid' ? 'COUNT' : 'SUM';
      qb.addMeasure({
        table,
        field: field.name,
        function: fn,
        alias: `${fn.toLowerCase()}_${field.name}`,
      });
    } else {
      const isDate = field.type === 'date' || field.type === 'datetime';
      qb.addDimension({
        table,
        field: field.name,
        alias: `${table}_${field.name}`,
        dateGranularity: isDate ? 'month' : undefined,
      });
    }
  }, [qb]);

  const handleExecute = useCallback(async () => {
    const result = await qe.execute(qb.query);

    if (result && result.columns.length > 0) {
      const dims = qb.query.dimensions.map(d => d.alias || `${d.table}_${d.field}`);
      const measures = qb.query.measures.map(m => m.alias || `${m.function.toLowerCase()}_${m.table}_${m.field}`);

      setVisualization(prev => ({
        ...prev,
        xAxis: dims[0] || result.columns[0],
        yAxis: measures.length > 0 ? measures : [result.columns[1] || result.columns[0]],
        chartType: prev.chartType !== 'bar' ? prev.chartType :
          dims.length === 1 && measures.length === 1
            ? (dims[0] && (qb.query.dimensions[0]?.dateGranularity) ? 'line' : 'bar')
            : dims.length === 0 && measures.length === 1 ? 'kpi' : 'bar',
      }));
    }

    return result;
  }, [qb.query, qe]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleExecute]);

  const executeTileQueries = useCallback(async () => {
    const results = new Map<string, QueryResult>();
    
    // Construct global filters to inject
    const globalFilterDefs: QueryFilter[] = [];
    if (globalFilters.hub !== 'all' && globalFilters.hub !== undefined) globalFilterDefs.push({ table: 'reports', field: 'hub', operator: 'eq', value: globalFilters.hub, conjunction: 'AND' });
    if (globalFilters.branch !== 'all' && globalFilters.branch !== undefined) globalFilterDefs.push({ table: 'reports', field: 'branch', operator: 'eq', value: globalFilters.branch, conjunction: 'AND' });
    if (globalFilters.airlines !== 'all' && globalFilters.airlines !== undefined) globalFilterDefs.push({ table: 'reports', field: 'airline', operator: 'eq', value: globalFilters.airlines, conjunction: 'AND' });
    if (globalFilters.maskapai !== 'all' && globalFilters.maskapai !== undefined) globalFilterDefs.push({ table: 'reports', field: 'airline_type', operator: 'eq', value: globalFilters.maskapai, conjunction: 'AND' });
    if (globalFilters.category !== 'all' && globalFilters.category !== undefined) globalFilterDefs.push({ table: 'reports', field: 'main_category', operator: 'eq', value: globalFilters.category, conjunction: 'AND' });
    if (globalFilters.area !== 'all' && globalFilters.area !== undefined) globalFilterDefs.push({ table: 'reports', field: 'area', operator: 'eq', value: globalFilters.area, conjunction: 'AND' });

    await Promise.all(
      dash.tiles.map(async tile => {
        if (tile.query.dimensions.length > 0 || tile.query.measures.length > 0) {
          try {
            // Blend global filters into tile query
            // Override existing tile filters with global ones if they target the same field
            const globalFields = globalFilterDefs.map(gf => gf.field);
            const filteredTileFilters = tile.query.filters.filter(tf => !globalFields.includes(tf.field));
            
            const blendedQuery = {
              ...tile.query,
              filters: [...filteredTileFilters, ...globalFilterDefs]
            };

            const res = await fetch('/api/dashboards/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: blendedQuery }),
            });
            if (res.ok) {
              const data = await res.json();
              results.set(tile.id, data);
            }
          } catch { /* ignore */ }
        }
      })
    );
    setTileResults(results);
  }, [dash.tiles, globalFilters]);

  useEffect(() => {
    if (mode === 'dashboard') {
      // Use a microtask to avoid synchronous setState in effect
      Promise.resolve().then(() => executeTileQueries());
    }
  }, [mode, executeTileQueries]);

  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    const def = await ai.generate(aiPrompt.trim());
    if (def) {
      dash.loadDashboard({ ...def, folder: aiFolder.trim() || undefined });
      setMode('dashboard');
    }
  }, [aiPrompt, ai, aiFolder, dash]);

  const yearRange = useMemo(() => {
    if (!cfDateFrom || !cfDateTo) return '';
    const fy = new Date(cfDateFrom).getFullYear();
    const ty = new Date(cfDateTo).getFullYear();
    return fy === ty ? `${fy}` : `${fy} - ${ty}`;
  }, [cfDateFrom, cfDateTo]);

  const handleCustomerFeedbackGenerate = useCallback(async () => {
    if (!cfDateFrom || !cfDateTo) return;
    const def = await ai.generateCustomerFeedback(cfDateFrom, cfDateTo);
    if (def) {
      dash.loadDashboard({ ...def, folder: cfFolder.trim() || undefined });
      setMode('dashboard');
    }
  }, [cfDateFrom, cfDateTo, cfFolder, ai, dash]);

  const addCurrentAsTile = useCallback(() => {
    if (!hasQuery) return;
    dash.addTile(qb.query, visualization);
    setMode('dashboard');
  }, [qb.query, visualization, dash, hasQuery]);

  const handleEditTile = useCallback((tileId: string) => {
    const tile = dash.tiles.find(t => t.id === tileId);
    if (!tile) return;
    setEditingTileId(tileId);
    qb.loadQuery(tile.query);
    setVisualization(tile.visualization);
    setMode('explore');
  }, [dash.tiles, qb]);

  const handleSaveTileEdit = useCallback(async () => {
    if (!editingTileId) return;
    const result = await handleExecute();
    dash.updateTile(editingTileId, { query: qb.query, visualization });
    if (result) {
      setTileResults(prev => {
        const next = new Map(prev);
        next.set(editingTileId, result);
        return next;
      });
    }
    setEditingTileId(null);
    setMode('dashboard');
  }, [editingTileId, qb.query, visualization, dash, handleExecute]);

  const handleSave = useCallback(async (name: string, description: string, folder: string | null) => {
    // Build a tile -> page_name lookup from pages
    const tilePageMap = new Map<string, string>();
    if (dash.pages.length > 0) {
      for (const page of dash.pages) {
        for (const tile of page.tiles) {
          tilePageMap.set(tile.id, page.name);
        }
      }
    }

    const tiles = dash.tiles.map((t, idx) => ({
      title: t.visualization.title || 'Tanpa Judul',
      chartType: t.visualization.chartType,
      dataField: 'custom',
      width: (t.layout.w >= 12 ? 'full' : t.layout.w >= 6 ? 'half' : 'third') as 'full' | 'half' | 'third',
      position: idx,
      query_config: t.query,
      visualization_config: t.visualization,
      layout: t.layout,
      page_name: tilePageMap.get(t.id) || 'Ringkasan Umum',
    }));

    const config = {
      dateRange: '7d',
      autoRefresh: true,
      pages: dash.pages.map(p => p.name),
      dateFrom: cfDateFrom || undefined,
      dateTo: cfDateTo || undefined,
    };

    return onSaveDashboard(name, description, tiles, config, folder);
  }, [dash.tiles, dash.pages, onSaveDashboard, cfDateFrom, cfDateTo]);

  const updateVisualization = useCallback((updates: Partial<ChartVisualization>) => {
    setVisualization(prev => ({ ...prev, ...updates }));
  }, []);

  const chartPreviewNode = qe.data && qe.data.rows.length > 0
    ? <ChartPreview visualization={visualization} result={qe.data} />
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar with steps */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-1)] border-b border-[var(--surface-4)]">
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex bg-[var(--surface-2)] rounded-xl p-0.5 border border-[var(--surface-4)]">
            <button
              onClick={() => setMode('explore')}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-lg transition-all",
                mode === 'explore'
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Compass size={16} />
              Jelajahi Data
            </button>
            <button
              onClick={() => {
                if (editingTileId) handleSaveTileEdit();
                else setMode('dashboard');
              }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-lg transition-all",
                mode === 'dashboard'
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <LayoutGrid size={16} />
              Susun Dashboard {dash.tiles.length > 0 && `(${dash.tiles.length})`}
            </button>
          </div>

          {editingTileId && mode === 'explore' && (
            <span className="px-3 py-1 text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-full">
              Sedang mengedit tile
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {mode === 'explore' && !editingTileId && hasResult && (
            <button
              onClick={addCurrentAsTile}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Plus size={14} />
              Tambah ke Dashboard
            </button>
          )}
          {editingTileId && mode === 'explore' && (
            <button
              onClick={handleSaveTileEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Save size={14} />
              Simpan Perubahan
            </button>
          )}
          {mode === 'explore' && (
            <button
              onClick={() => { qb.reset(); qe.clear(); setVisualization({ ...defaultVisualization }); setEditingTileId(null); setShowWelcome(true); }}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              title="Mulai Ulang"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {mode === 'dashboard' && dash.tiles.length > 0 && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-[var(--brand-primary)] text-white rounded-lg hover:opacity-90 shadow-sm transition-all"
            >
              <Save size={14} />
              Simpan Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      {mode === 'explore' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Field Sidebar */}
          <div className="w-[300px] shrink-0 overflow-hidden">
            <FieldSidebar
              source={qb.query.source}
              activeJoins={qb.query.joins.map(j => j.joinKey)}
              onFieldClick={handleFieldClick}
              onToggleJoin={qb.toggleJoin}
              onSetSource={qb.setSource}
            />
          </div>

          {/* Center: Query + Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Query Config (top) */}
            <div className="border-b border-[var(--surface-4)] max-h-[45%] overflow-auto">
              <QueryPanel
                query={qb.query}
                availableFields={qb.availableFields}
                loading={qe.loading}
                onRemoveDimension={qb.removeDimension}
                onUpdateDimension={qb.updateDimension}
                onRemoveMeasure={qb.removeMeasure}
                onUpdateMeasure={qb.updateMeasure}
                onAddFilter={qb.addFilter}
                onRemoveFilter={qb.removeFilter}
                onUpdateFilter={qb.updateFilter}
                onAddSort={qb.addSort}
                onRemoveSort={qb.removeSort}
                onExecute={handleExecute}
              />
            </div>

            {/* Results (bottom) */}
            <div className="flex-1 overflow-hidden">
              {showWelcome && !hasQuery ? (
                /* Welcome / onboarding state with AI prompt */
                <div className="flex items-center justify-center h-full p-8 overflow-auto">
                  <div className="w-full max-w-4xl animate-fade-in-up">
                    {/* AI Prompt Card */}
                    <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-5 shadow-lg shadow-purple-500/10">
                      {/* Decorative sparkle */}
                      <Sparkles size={12} className="absolute -top-1 -right-1 text-purple-400 animate-sparkle-pulse" style={{ animationDelay: '0.5s' }} />
                      <div className="bg-[var(--surface-1)] rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={16} className="text-purple-500 animate-sparkle-pulse" />
                          <span className="text-sm font-bold text-[var(--text-primary)]">Buat Dashboard dengan AI</span>
                        </div>
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => { setAiPrompt(e.target.value); ai.clearError(); }}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              e.preventDefault();
                              handleAIGenerate();
                            }
                          }}
                          placeholder="Contoh: Buatkan dashboard laporan compliment bulan Januari 2026..."
                          className="w-full h-20 px-3 py-2.5 text-sm bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                          disabled={ai.loading}
                        />

                        <div className="mt-3">
                          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Simpan di Folder (Opsional)</label>
                          <input
                            type="text"
                            value={aiFolder}
                            onChange={(e) => setAiFolder(e.target.value)}
                            placeholder="Contoh: AI Dashboards"
                            className="w-full px-3 py-2 text-xs bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                            disabled={ai.loading}
                          />
                        </div>

                        {/* Prompt suggestion chips */}
                        {!ai.loading && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {PROMPT_SUGGESTIONS.map(s => (
                              <button
                                key={s.label}
                                onClick={() => { setAiPrompt(s.prompt); ai.clearError(); }}
                                className="px-3 py-1.5 text-[11px] font-medium bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-full text-[var(--text-secondary)] hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all"
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* AI Loading Progress Stepper */}
                        {ai.loading && (
                          <div className="mt-3 space-y-2">
                            {AI_STEPS.map((step, idx) => (
                              <div key={idx} className="flex items-center gap-2.5">
                                {idx < aiStep ? (
                                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                    <Check size={12} className="text-emerald-600" />
                                  </div>
                                ) : idx === aiStep ? (
                                  <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                    <Loader2 size={12} className="text-purple-600 animate-spin" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-[var(--surface-3)] shrink-0" />
                                )}
                                <span className={cn(
                                  "text-xs transition-colors",
                                  idx < aiStep ? "text-emerald-600 font-medium" :
                                  idx === aiStep ? "text-purple-600 font-bold" :
                                  "text-[var(--text-muted)]"
                                )}>
                                  {step.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {ai.error && (
                          <p className="mt-2 text-xs text-red-500 text-left">{ai.error}</p>
                        )}
                        {!ai.loading && (
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[10px] text-[var(--text-muted)]">Ctrl+Enter untuk generate</span>
                            <button
                              onClick={handleAIGenerate}
                              disabled={!aiPrompt.trim()}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all",
                                !aiPrompt.trim()
                                  ? "bg-[var(--surface-3)] text-[var(--text-muted)] cursor-not-allowed"
                                  : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/25"
                              )}
                            >
                              <Sparkles size={14} />
                              Buat dengan AI
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Feedback Template Card */}
                    <div className="p-[1px] rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 mb-5 shadow-lg shadow-emerald-500/10">
                      <div className="bg-[var(--surface-1)] rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 size={16} className="text-emerald-600" />
                          <span className="text-sm font-bold text-[var(--text-primary)]">Customer Feedback Dashboard</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Template</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mb-3">
                          Generate dashboard 5 halaman (Case Category, Detail Category, Detail Report, CGO Case Category, CGO Detail Report) dengan layout tetap sesuai standar.
                        </p>
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Dari</label>
                            <input
                              type="date"
                              value={cfDateFrom}
                              onChange={(e) => setCfDateFrom(e.target.value)}
                              className="w-full mt-1 px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-[var(--text-primary)]"
                              disabled={ai.loading}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Sampai</label>
                            <input
                              type="date"
                              value={cfDateTo}
                              onChange={(e) => setCfDateTo(e.target.value)}
                              className="w-full mt-1 px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-[var(--text-primary)]"
                              disabled={ai.loading}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Folder</label>
                            <input
                              type="text"
                              value={cfFolder}
                              onChange={(e) => setCfFolder(e.target.value)}
                              placeholder="Folder..."
                              className="w-full mt-1 px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-[var(--text-primary)]"
                              disabled={ai.loading}
                            />
                          </div>
                          <button
                            onClick={handleCustomerFeedbackGenerate}
                            disabled={!cfDateFrom || !cfDateTo || ai.loading}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap",
                              !cfDateFrom || !cfDateTo || ai.loading
                                ? "bg-[var(--surface-3)] text-[var(--text-muted)] cursor-not-allowed"
                                : "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-lg hover:shadow-emerald-500/25"
                            )}
                          >
                            {ai.loading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                            Generate
                          </button>
                        </div>
                        {ai.error && (
                          <p className="mt-2 text-xs text-red-500">{ai.error}</p>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex-1 h-px bg-[var(--surface-4)]" />
                      <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">atau buat manual</span>
                      <div className="flex-1 h-px bg-[var(--surface-4)]" />
                    </div>

                    {/* Enhanced 3-step guide cards */}
                    <div className="flex gap-3">
                      <div className="flex-1 p-3 bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-xl hover:-translate-y-0.5 transition-transform cursor-default group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white items-center justify-center text-[10px] font-bold">1</span>
                          <MousePointerClick size={13} className="text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Pilih field di panel kiri</p>
                      </div>
                      <div className="flex-1 p-3 bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-xl hover:-translate-y-0.5 transition-transform cursor-default group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white items-center justify-center text-[10px] font-bold">2</span>
                          <Play size={13} className="text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Klik &quot;Jalankan Query&quot;</p>
                      </div>
                      <div className="flex-1 p-3 bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-xl hover:-translate-y-0.5 transition-transform cursor-default group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white items-center justify-center text-[10px] font-bold">3</span>
                          <BarChart3 size={13} className="text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Atur grafik &amp; simpan</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <ResultsPanel
                  result={qe.data}
                  loading={qe.loading}
                  error={qe.error}
                  chartPreview={chartPreviewNode}
                />
              )}
            </div>
          </div>

          {/* Right: Chart Config — only show when we have results */}
          {hasResult && (
            <div className="w-[280px] shrink-0 overflow-hidden">
              <ChartConfigPanel
                visualization={visualization}
                result={qe.data}
                onChange={updateVisualization}
              />
            </div>
          )}
        </div>
      ) : (
        <DashboardComposer
          tiles={dash.tiles}
          onAddTile={dash.addEmptyTile}
          onEditTile={handleEditTile}
          onRemoveTile={dash.removeTile}
          onResizeTile={(id, w, h) => dash.updateTileLayout(id, { w, h })}
          onApplyPreset={dash.applyLayoutPreset}
          tileResults={tileResults}
          dashboardName={dash.name}
          dashboardDescription={dash.description}
          pages={dash.pages}
          yearRange={yearRange}
          onReset={dash.resetTiles}
          onFilterChange={setGlobalFilters}
          currentFilters={globalFilters}
          gridCols={12}
        />
      )}

      <SaveDashboardModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        initialName={dash.name}
        initialDescription={dash.description}
        initialFolder={dash.folder}
        existingFolders={existingFolders}
        onSave={handleSave}
        tileCount={dash.tiles.length}
        pageCount={dash.pages.length}
      />
    </div>
  );
}
