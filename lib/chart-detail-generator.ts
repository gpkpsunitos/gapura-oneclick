'use client';

import type {
  DashboardTile,
  QueryResult,
  ChartVisualization,
  QueryDefinition,
  QueryFilter,
  QueryDimension,
  QueryMeasure,
  QuerySort,
  ChartType,
} from '@/types/builder';
import type { CustomChartType } from '@/components/chart-detail/SupportingCharts';

// ── Analytical chart spec ────────────────────────────────────────────────────
export interface AnalyticalChart {
  visualization: ChartVisualization;
  query: QueryDefinition;
  explanation: string;
  customChartType?: CustomChartType;
}

export interface AnalyticalChartsResult {
  charts: AnalyticalChart[];
  dataMap: Record<number, QueryResult>;
}

// ── Dimension alias map ──────────────────────────────────────────────────────
// Template uses inconsistent field names (airline vs airlines, main_category vs
// category). This map normalizes to the canonical REPORT_DIMENSIONS key.
// Complexity: Time O(1) | Space O(1)
const DIM_ALIASES: Record<string, string> = {
  airline: 'airlines',
  main_category: 'category',
  date_of_event: 'month',
};

function normalizeDimField(field: string): string {
  return DIM_ALIASES[field] || field;
}

// ── Known dimensions in reports table ────────────────────────────────────────
// Complexity: O(1) for the dimension registry lookup
const REPORT_DIMENSIONS: Record<string, { label: string; isDate?: boolean }> = {
  branch:                        { label: 'Cabang (Bandara)' },
  station_code:                  { label: 'Kode Stasiun' },
  hub:                           { label: 'Hub' },
  airlines:                      { label: 'Maskapai' },
  jenis_maskapai:                { label: 'Jenis Maskapai' },
  category:                      { label: 'Kategori Utama' },
  severity:                      { label: 'Severity' },
  area:                          { label: 'Area' },
  status:                        { label: 'Status' },
  irregularity_complain_category:{ label: 'Sub-Kategori' },
  terminal_area_category:        { label: 'Area Terminal' },
  apron_area_category:           { label: 'Area Apron' },
  general_category:              { label: 'Kategori Umum' },
  month:                         { label: 'Bulan', isDate: true },
  day:                           { label: 'Hari' },
};

// ── Color Constants for Supporting Charts ────────────────────────────────────
const GAPURA_GREEN_LIGHT = '#7cb342';
const GAPURA_GREEN_DARK = '#558b2f';
const GAPURA_BLUE = '#42a5f5';
const GAPURA_YELLOW = '#fdd835';
const GAPURA_RED = '#ef5350';
const GAPURA_ORANGE = '#ffa726';
const GAPURA_GREY = '#bdbdbd';
const GAPURA_AMBER = '#ffca28';
const GAPURA_PURPLE = '#ab47bc';

const SEMANTIC_COLORS: Record<string, string> = {
  'irregularity': GAPURA_RED,
  'complaint': GAPURA_ORANGE,
  'compliment': GAPURA_GREEN_LIGHT,
  'terminal': GAPURA_BLUE,
  'terminal area': GAPURA_BLUE,
  'apron': GAPURA_AMBER,
  'apron area': GAPURA_AMBER,
  'general': GAPURA_GREY,
  'cargo': '#8d6e63',
  'open': GAPURA_RED,
  'closed': GAPURA_GREEN_LIGHT,
  'in progress': GAPURA_YELLOW,
  'done': GAPURA_GREEN_LIGHT,
};

// ── Preferred cross-analysis order ───────────────────────────────────────────
// When the main chart shows dimension X, these are the dimensions we'll use
// for cross-analyses, in priority order. We skip X itself.
const CROSS_ANALYSIS_PRIORITY = [
  'branch',
  'category',
  'airlines',
  'area',
  'jenis_maskapai',
  'status',
  'irregularity_complain_category',
  'hub',
  'month',
];

// ── Helper: detect SEMANTIC main dimension ───────────────────────────────────
// For pivots/tables: xAxis is the column header (analytical focus), so we
// prioritize it over raw query dimension order.
// For standard charts: first matching query dimension is the main one.
// Complexity: Time O(d) where d = number of dimensions | Space O(1)
function detectMainDimension(tile: DashboardTile): string | null {
  const chartType = tile.visualization.chartType;
  const isPivotOrTable = chartType === 'pivot' || chartType === 'table';

  // Pivots: xAxis = column header = the dimension the chart is "about"
  if (isPivotOrTable) {
    const xAxis = tile.visualization.xAxis;
    if (xAxis) {
      const normalized = normalizeDimField(xAxis);
      if (REPORT_DIMENSIONS[normalized]) return normalized;
    }
  }

  // Standard charts / fallback: first recognized query dimension
  for (const d of tile.query.dimensions || []) {
    if (d.table === 'reports') {
      const normalized = normalizeDimField(d.field);
      if (REPORT_DIMENSIONS[normalized]) return normalized;
    }
  }

  // Last resort: check visualization xAxis for non-pivots too
  const xAxis = tile.visualization.xAxis;
  if (xAxis) {
    const normalized = normalizeDimField(xAxis);
    if (REPORT_DIMENSIONS[normalized]) return normalized;
  }
  return null;
}

// ── Helper: detect ALL dimensions the chart already covers ───────────────────
// Used to skip redundant supporting charts. A pivot with [branch, category]
// should NOT generate a "Komposisi Kategori" donut.
// Complexity: Time O(d) | Space O(d)
function detectAllDimensions(tile: DashboardTile): Set<string> {
  const dims = new Set<string>();
  for (const d of tile.query.dimensions || []) {
    if (d.table === 'reports') {
      const normalized = normalizeDimField(d.field);
      if (REPORT_DIMENSIONS[normalized]) dims.add(normalized);
    }
  }
  return dims;
}

// ── Helper: build cross-cut queries using the main chart's filters ───────────
// Key insight: we inherit ALL filters from the parent chart (date range, source_sheet, etc.)
// and only swap out the dimension+measure to get a different analytical cut.
// Complexity: Time O(1) per query build | Space O(filters)
function buildCrossQuery(
  parentFilters: QueryFilter[],
  dimension: string,
  limit?: number,
): QueryDefinition {
  const dims: QueryDimension[] = [{ table: 'reports', field: dimension }];
  const measures: QueryMeasure[] = [{
    table: 'reports',
    field: 'id',
    function: 'COUNT',
    alias: 'jumlah',
  }];
  const sorts: QuerySort[] = [{ field: 'jumlah', direction: 'desc', alias: 'jumlah' }];

  return {
    source: 'reports',
    joins: [],
    dimensions: dims,
    measures,
    filters: [...parentFilters],
    sorts,
    limit: limit || 10000,
  };
}

// ── Helper: build stacked (2-dim) query ──────────────────────────────────────
// e.g. category × branch → stacked bar breakdown
// Complexity: Time O(1) | Space O(filters)
function buildStackedQuery(
  parentFilters: QueryFilter[],
  dim1: string,
  dim2: string,
  limit?: number,
): QueryDefinition {
  return {
    source: 'reports',
    joins: [],
    dimensions: [
      { table: 'reports', field: dim1 },
      { table: 'reports', field: dim2 },
    ],
    measures: [{
      table: 'reports',
      field: 'id',
      function: 'COUNT',
      alias: 'jumlah',
    }],
    filters: [...parentFilters],
    sorts: [{ field: 'jumlah', direction: 'desc', alias: 'jumlah' }],
    limit: limit || 10000,
  };
}

// ── Helper: build time-trend query ───────────────────────────────────────────
// Complexity: Time O(1) | Space O(filters)
function buildTimeTrendQuery(
  parentFilters: QueryFilter[],
  granularity: 'month' | 'day' = 'month',
): QueryDefinition {
  return {
    source: 'reports',
    joins: [],
    dimensions: [{ table: 'reports', field: granularity }],
    measures: [{
      table: 'reports',
      field: 'id',
      function: 'COUNT',
      alias: 'jumlah',
    }],
    filters: [...parentFilters],
    sorts: [{ field: granularity, direction: 'asc' }],
    limit: 10000,
  };
}

// ── Helper: build report table query ─────────────────────────────────────────
// Mimics the "Report Landside & Airside" structure from the dashboard template
// Complexity: Time O(1) | Space O(filters)
function buildReportTableQuery(parentFilters: QueryFilter[]): QueryDefinition {
  return {
    source: 'reports',
    joins: [],
    dimensions: [
      { table: 'reports', field: 'date_of_event', alias: 'Date' },
      { table: 'reports', field: 'main_category', alias: 'Category' },
      { table: 'reports', field: 'branch', alias: 'Branch' },
      { table: 'reports', field: 'airline', alias: 'Airlines' },
      { table: 'reports', field: 'flight_number', alias: 'Flight' },
      { table: 'reports', field: 'description', alias: 'Report' },
      { table: 'reports', field: 'root_caused', alias: 'Root Caused' },
      { table: 'reports', field: 'action_taken', alias: 'Action Taken' },
      { table: 'reports', field: 'evidence_url', alias: 'Evidence Link' },
    ],
    measures: [],
    filters: [...parentFilters],
    sorts: [{ field: 'Date', direction: 'desc' }],
    limit: 10000,
  };
}

// ── Core: Generate analytical chart definitions ──────────────────────────────
// Generates up to 6 cross-dimensional charts like a senior data analyst would:
// 1. Alternative viz of the same data (donut / bar swap)
// 2. Top Bandara (branch) penyumbang — which airport contributes most?
// 3. Top Maskapai (airline) — which airline has most cases?
// 4. Severity distribution — how severe are the cases?
// 5. Time trend — when do cases peak?
// 6. Stacked breakdown — category × branch heatmap
// Complexity: Time O(1) per chart | Space O(charts)
export function generateAnalyticalCharts(
  tile: DashboardTile,
  result: QueryResult,
): AnalyticalChartsResult {
  const viz = tile.visualization;
  const mainType = viz.chartType || 'bar';
  const mainDimension = detectMainDimension(tile);
  let parentFilters = tile.query.filters || [];
  
  // ── Context Check: Ensure "Non Cargo" consistency ──────────────────────────
  // User Requirement: "if using chart detail for page besides CGO, use data from sheets non cargo"
  // We check if the current context is explicitly CGO. If not, we enforce the Non-Cargo filter.
  // This prevents analytical charts (Top Maskapai, etc.) from mixing Cargo data inadvertently.
  const isCgoContext = parentFilters.some(f => f.field === 'source_sheet' && f.value === 'CGO');
  
  if (!isCgoContext) {
    const hasNonCargo = parentFilters.some(f => (f.field === 'source_sheet' || f.field === 'sheet_name') && f.value === 'NON CARGO');
    
    if (!hasNonCargo) {
       parentFilters = [
         ...parentFilters, 
         {
           table: 'reports',
           field: 'source_sheet',
           operator: 'eq',
           value: 'NON CARGO',
           conjunction: 'AND'
         }
       ];
    }
  }
  const title = viz.title || 'Data';

  // KPI shows a single aggregate number — no dimension to cross-analyse

  if (result.rows.length < 1) {
    return { charts: [], dataMap: {} };
  }

  const charts: AnalyticalChart[] = [];
  const dataMap: Record<number, QueryResult> = {};
  let idx = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CHART 1: Alternative visualization of the same data
  // Skip for table/pivot/heatmap — bar↔donut swap is meaningless for these.
  // For high-cardinality visual charts → use heatmap (dim × category) instead.
  // ═══════════════════════════════════════════════════════════════════════════
  const NON_VISUAL_TYPES = new Set(['table', 'pivot', 'heatmap']);

  if (!NON_VISUAL_TYPES.has(mainType)) {
    const HIGH_CARDINALITY_DIMS = new Set(['branch', 'station_code', 'airlines']);
    const isHighCardinality = mainDimension && HIGH_CARDINALITY_DIMS.has(mainDimension) && result.rows.length >= 10;

    if (isHighCardinality && mainDimension) {
      const heatmapQuery = buildStackedQuery(parentFilters, mainDimension, 'category', 10000);
      charts.push({
        visualization: {
          chartType: 'heatmap',
          xAxis: mainDimension,
          yAxis: ['category'],
          colorField: 'jumlah',
          title: `${title} — Heatmap per Kategori`,
          showLegend: true,
          showLabels: true,
        },
        query: heatmapQuery,
        explanation: 'Peta panas distribusi laporan: dimensi utama vs kategori (Irregularity/Complaint/Compliment). Warna lebih gelap = volume lebih tinggi.',
      });
      idx++;
    } else {
      const altType = (mainType === 'bar' || mainType === 'horizontal_bar' || mainType === 'stacked_bar')
        ? 'donut' : 'bar';

      charts.push({
        visualization: {
          ...viz,
          chartType: altType,
          title: `${title} — ${altType === 'donut' ? 'Proporsi' : 'Perbandingan'}`,
          showLegend: altType === 'donut',
          showLabels: true,
        },
        query: tile.query,
        explanation: altType === 'donut'
          ? 'Proporsi relatif setiap kategori terhadap total keseluruhan.'
          : 'Perbandingan langsung antar kategori dalam bentuk batang.',
      });
      dataMap[idx] = result;
      idx++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHARTS 2-5: Cross-dimensional analytics
  // Pick top 4 dimensions that DIFFER from the main chart dimension
  // ═══════════════════════════════════════════════════════════════════════════
  // Skip ALL dimensions the chart already covers, not just mainDimension
  const usedDims = detectAllDimensions(tile);
  const crossDimensions = CROSS_ANALYSIS_PRIORITY.filter(d => !usedDims.has(d));

  const crossChartConfigs: Array<{
    dimension: string;
    chartType: 'horizontal_bar' | 'donut' | 'bar' | 'line' | 'grouped_bar' | 'heatmap';
    titlePrefix: string;
    explanation: string;
    limit?: number;
    colors?: string[];
    customChartType?: CustomChartType;
  }> = [];

  for (const dim of crossDimensions) {
    if (crossChartConfigs.length >= 4) break;

    const dimInfo = REPORT_DIMENSIONS[dim];
    if (!dimInfo) continue;

    // Branch breakdown chart removed per user request
    if (dim === 'branch' || dim === 'station_code') {
      continue;
    } else if (dim === 'airlines') {
      crossChartConfigs.push({
        dimension: dim,
        chartType: 'grouped_bar', // Updated to grouped triple bar
        titlePrefix: `Top Maskapai Penyumbang`,
        explanation: `Maskapai mana yang paling sering terlibat? Data ini membantu prioritisasi engagement dengan mitra.`,
        limit: 10000,
      });
    } else if (dim === 'category') {
      crossChartConfigs.push({
        dimension: dim,
        chartType: 'donut',
        titlePrefix: `Komposisi Kategori`,
        explanation: `Berapa proporsi Irregularity vs Complaint vs Compliment? Indikator health operasional.`,
        colors: [GAPURA_RED, GAPURA_ORANGE, GAPURA_GREEN_LIGHT],
      });
    } else if (dim === 'area') {
      crossChartConfigs.push({
        dimension: dim,
        chartType: 'grouped_bar', // Kept as fallback
        titlePrefix: `Kategori per Area`,
        explanation: `Distribusi Irregularity, Complaint, dan Compliment di Terminal, Apron, dan General Area.`,
        limit: 10000,
        customChartType: 'area_breakdown', // Use specialized component
      });
    } else if (dim === 'jenis_maskapai') {
      crossChartConfigs.push({
        dimension: dim,
        chartType: 'donut',
        titlePrefix: `Breakdown Jenis Maskapai`,
        explanation: `Perbandingan antara maskapai Lokal, MPA, Garuda Indonesia, Citilink, Pelita Air, dll.`,
      });
    } else if (dim === 'status') {
      crossChartConfigs.push({
        dimension: dim,
        chartType: 'donut',
        titlePrefix: `Status Penyelesaian`,
        explanation: `Berapa banyak kasus masih Open vs Closed? Indikator efektivitas penanganan.`,
        colors: [GAPURA_RED, GAPURA_GREEN_LIGHT, GAPURA_YELLOW],
      });
    } else if (dim === 'month') {
      crossChartConfigs.push({
        dimension: dim,
        chartType: 'line',
        titlePrefix: `Tren Bulanan`,
        explanation: `Bagaimana tren volume laporan dari bulan ke bulan? Identifikasi pola musiman dan lonjakan.`,
      });
    } else if (dim === 'irregularity_complain_category') {
      crossChartConfigs.push({
        dimension: dim,
        chartType: 'horizontal_bar',
        titlePrefix: `Detail Sub-Kategori`,
        explanation: `Breakdown lebih detail: sub-kategori apa yang paling dominan?`,
        limit: 10000,
      });
    } else if (dim === 'hub') {
      crossChartConfigs.push({
        dimension: dim,
        chartType: 'bar',
        titlePrefix: `Distribusi per Hub`,
        explanation: `Perbandingan volume laporan antar hub operasional.`,
      });
    }
  }

  for (const config of crossChartConfigs) {
    const isTimeSeries = config.dimension === 'month' || config.dimension === 'day';
    let query;

    const isHeatmapOrGrouped = config.chartType === 'heatmap' || config.chartType === 'grouped_bar';
    if (isHeatmapOrGrouped) {
       // Heatmap and grouped bar need specific stacked query (Dimension x Category)
       query = buildStackedQuery(parentFilters, config.dimension, 'category', config.limit);
    } else {
       query = isTimeSeries
        ? buildTimeTrendQuery(parentFilters, config.dimension as 'month' | 'day')
        : buildCrossQuery(parentFilters, config.dimension, config.limit);
    }

    charts.push({
      visualization: {
        chartType: config.chartType,
        xAxis: config.dimension,
        yAxis: ['jumlah'],
        title: config.titlePrefix,
        showLegend: config.chartType === 'donut',
        showLabels: true,
        colors: (config as any).colors, // Inject semantic colors if defined
      },
      query,
      explanation: config.explanation,
      customChartType: (config as any).customChartType,
    });
    // dataMap will be filled by the caller after fetching
    idx++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM CHARTS: Detailed analytical charts for specific dimensions
  // These provide deep insights with custom visualizations
  // ═══════════════════════════════════════════════════════════════════════════
  
  // CHART 6: Severity Distribution (if severity not already used)
  // DISABLED per user request
  if (!usedDims.has('severity') && false) {
    const severityQuery = buildCrossQuery(parentFilters, 'severity', 10000);
    charts.push({
      visualization: {
        chartType: 'bar',
        xAxis: 'severity',
        yAxis: ['jumlah'],
        title: 'Distribusi Severity',
        showLegend: false,
        showLabels: true,
        colors: [GAPURA_RED, GAPURA_ORANGE, GAPURA_YELLOW, GAPURA_GREEN_LIGHT],
      },
      query: severityQuery,
      explanation: 'Breakdown kasus berdasarkan tingkat keparahan: Critical, High, Medium, Low. Fokus pada kasus kritis untuk penanganan prioritas.',
      customChartType: 'severity_distribution',
    });
    idx++;
  }

  // CHART 7: Status Breakdown (if status not already used)
  if (!usedDims.has('status') && idx < 10) {
    const statusQuery = buildCrossQuery(parentFilters, 'status', 10000);
    charts.push({
      visualization: {
        chartType: 'donut',
        xAxis: 'status',
        yAxis: ['jumlah'],
        title: 'Status Penyelesaian',
        showLegend: true,
        showLabels: true,
        colors: [GAPURA_GREEN_LIGHT, GAPURA_RED, GAPURA_YELLOW, GAPURA_BLUE, GAPURA_ORANGE],
      },
      query: statusQuery,
      explanation: 'Proporsi status penyelesaian kasus: Selesai, Terbuka, Dalam Proses, Menunggu Feedback, Ditolak. Indikator efektivitas penanganan.',
      customChartType: 'status_breakdown',
    });
    idx++;
  }

  // CHART 8: Sub-Category Detail (if irregularity_complain_category not already used)
  if (!usedDims.has('irregularity_complain_category') && idx < 10) {
    const subCategoryQuery: QueryDefinition = {
      source: 'reports',
      joins: [],
      dimensions: [
        { table: 'reports', field: 'irregularity_complain_category', alias: 'subCategory' },
        { table: 'reports', field: 'category', alias: 'parentCategory' },
      ],
      measures: [{
        table: 'reports',
        field: 'id',
        function: 'COUNT',
        alias: 'count',
      }],
      filters: [
        ...parentFilters,
        { table: 'reports', field: 'irregularity_complain_category', operator: 'is_not_null', value: '', conjunction: 'AND' }
      ],
      sorts: [{ field: 'count', direction: 'desc' }],
      limit: 10000,
    };
    charts.push({
      visualization: {
        chartType: 'horizontal_bar',
        xAxis: 'subCategory',
        yAxis: ['count'],
        title: 'Detail Sub-Kategori',
        showLegend: false,
        showLabels: true,
        displayLimit: 15,
      },
      query: subCategoryQuery,
      explanation: 'Breakdown detail sub-kategori keluhan dan irregularitas. Identifikasi masalah spesifik yang paling sering terjadi.',
      customChartType: 'subcategory_detail',
    });
    idx++;
  }

  // CHART 9: Target Division Distribution (DISABLED - data is empty in Google Sheets)
  // According to debug analysis: Target Division column has 0 valid values (all 426 rows are null)
  // Uncomment below if data is populated in the future
  /*
  if (!usedDims.has('target_division') && idx < 10) {
    const divisionQuery = buildCrossQuery(parentFilters, 'target_division', 10000);
    charts.push({
      visualization: {
        chartType: 'bar',
        xAxis: 'target_division',
        yAxis: ['jumlah'],
        title: 'Distribusi per Divisi',
        showLegend: false,
        showLabels: true,
        colors: [GAPURA_BLUE, GAPURA_PURPLE, GAPURA_ORANGE, GAPURA_RED],
      },
      query: divisionQuery,
      explanation: 'Distribusi kasus per divisi penanganan: OS (Services), OP (Operasi), OT (Teknik), UQ (Quality). Analisis beban kerja divisi.',
      customChartType: 'target_division',
    });
    idx++;
  }
  */

  // CHART 10: Area Sub-Category Analysis (detailed area breakdown)
  // Use terminal_area_category with is_not_null filter (following customer-feedback-template pattern)
  // Increased limit to 15 to ensure these charts appear
  if (!usedDims.has('terminal_area_category') && idx < 15) {
    const terminalAreaQuery: QueryDefinition = {
      source: 'reports',
      joins: [],
      dimensions: [
        { table: 'reports', field: 'terminal_area_category', alias: 'Category' },
        { table: 'reports', field: 'area', alias: 'Area' },
      ],
      measures: [{
        table: 'reports',
        field: 'id',
        function: 'COUNT',
        alias: 'Total',
      }],
      filters: [
        ...parentFilters,
        { table: 'reports', field: 'terminal_area_category', operator: 'is_not_null', value: '', conjunction: 'AND' }
      ],
      sorts: [{ field: 'Total', direction: 'desc' }],
      limit: 10000,
    };

    charts.push({
      visualization: {
        chartType: 'horizontal_bar',
        xAxis: 'Category',
        yAxis: ['Total'],
        title: 'Sub-Kategori Area Terminal',
        showLegend: false,
        showLabels: true,
        colors: [GAPURA_BLUE],
        displayLimit: 10,
      },
      query: terminalAreaQuery,
      explanation: 'Breakdown sub-kategori masalah di area Terminal: Check-in, Boarding Gate, Arrival, dll.',
      customChartType: 'area_subcategory',
    });
    idx++;
  }

  // CHART 10b: Apron Area Sub-Category
  if (!usedDims.has('apron_area_category') && idx < 15) {
    const apronAreaQuery: QueryDefinition = {
      source: 'reports',
      joins: [],
      dimensions: [
        { table: 'reports', field: 'apron_area_category', alias: 'Category' },
        { table: 'reports', field: 'area', alias: 'Area' },
      ],
      measures: [{
        table: 'reports',
        field: 'id',
        function: 'COUNT',
        alias: 'Total',
      }],
      filters: [
        ...parentFilters,
        { table: 'reports', field: 'apron_area_category', operator: 'is_not_null', value: '', conjunction: 'AND' }
      ],
      sorts: [{ field: 'Total', direction: 'desc' }],
      limit: 10000,
    };

    charts.push({
      visualization: {
        chartType: 'horizontal_bar',
        xAxis: 'Category',
        yAxis: ['Total'],
        title: 'Sub-Kategori Area Apron',
        showLegend: false,
        showLabels: true,
        colors: [GAPURA_AMBER],
        displayLimit: 10,
      },
      query: apronAreaQuery,
      explanation: 'Breakdown sub-kategori masalah di area Apron: Parking Stand, Taxiway, dll.',
      customChartType: 'area_subcategory',
    });
    idx++;
  }

  // CHART 10c: General Category Sub-Category
  if (!usedDims.has('general_category') && idx < 15) {
    const generalCategoryQuery: QueryDefinition = {
      source: 'reports',
      joins: [],
      dimensions: [
        { table: 'reports', field: 'general_category', alias: 'Category' },
        { table: 'reports', field: 'area', alias: 'Area' },
      ],
      measures: [{
        table: 'reports',
        field: 'id',
        function: 'COUNT',
        alias: 'Total',
      }],
      filters: [
        ...parentFilters,
        { table: 'reports', field: 'general_category', operator: 'is_not_null', value: '', conjunction: 'AND' }
      ],
      sorts: [{ field: 'Total', direction: 'desc' }],
      limit: 10000,
    };

    charts.push({
      visualization: {
        chartType: 'horizontal_bar',
        xAxis: 'Category',
        yAxis: ['Total'],
        title: 'Sub-Kategori Area General',
        showLegend: false,
        showLabels: true,
        colors: [GAPURA_GREY],
        displayLimit: 10,
      },
      query: generalCategoryQuery,
      explanation: 'Breakdown sub-kategori masalah di area General: Overall Company Service, Safety Performance, dll.',
      customChartType: 'area_subcategory',
    });
    idx++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHART N: Heatmap cross-tabulation (dim × category)
  // stacked_bar has no renderer in ChartPreview → use heatmap instead
  // ═══════════════════════════════════════════════════════════════════════════
  // Pick the best two dimensions for a heatmap cross-tabulation.
  // Strategy: use mainDimension as one axis and find the best complementary
  // dimension that isn't already used by the chart.
  const HEATMAP_CONFIGS: Record<string, { crossDim: string; title: string; explanation: string; limit: number }> = {
    category:  { crossDim: 'branch',   title: 'Kategori per Bandara',           explanation: 'Bandara mana paling banyak Irregularity/Complaint/Compliment?', limit: 10000 },
    branch:    { crossDim: 'category', title: 'Komposisi Kategori per Bandara',  explanation: 'Breakdown Irregularity/Complaint/Compliment per bandara.',       limit: 10000 },
    station_code: { crossDim: 'category', title: 'Komposisi Kategori per Stasiun', explanation: 'Breakdown per stasiun.',                                      limit: 10000 },
    airlines:  { crossDim: 'category', title: 'Kategori per Maskapai',          explanation: 'Maskapai mana paling banyak Complaint vs Irregularity?',         limit: 10000 },
    area:      { crossDim: 'category', title: 'Kategori per Area',              explanation: 'Distribusi Irregularity/Complaint/Compliment di Terminal, Apron, dan General.', limit: 10000 },
    hub:       { crossDim: 'category', title: 'Kategori per Hub',               explanation: 'Breakdown kategori laporan per hub operasional.',                limit: 10000 },
    terminal_area_category: { crossDim: 'branch', title: 'Area Terminal per Bandara', explanation: 'Distribusi sub-kategori Terminal Area per bandara.',        limit: 10000 },
    apron_area_category:    { crossDim: 'branch', title: 'Area Apron per Bandara',    explanation: 'Distribusi sub-kategori Apron Area per bandara.',           limit: 10000 },
    general_category:       { crossDim: 'branch', title: 'Kategori Umum per Bandara', explanation: 'Distribusi sub-kategori Umum per bandara.',                limit: 10000 },
  };

  if (mainDimension && HEATMAP_CONFIGS[mainDimension]) {
    let config = HEATMAP_CONFIGS[mainDimension];
    // If the cross dimension is already used by the chart, pick a fallback
    if (usedDims.has(config.crossDim)) {
      const fallback = mainDimension === 'category' ? 'airlines' : 'area';
      if (!usedDims.has(fallback)) {
        const fallbackLabel = REPORT_DIMENSIONS[fallback]?.label || fallback;
        config = { crossDim: fallback, title: `${REPORT_DIMENSIONS[mainDimension]?.label} per ${fallbackLabel}`, explanation: `Heatmap cross-tabulation ${mainDimension} × ${fallback}.`, limit: 10000 };
      }
    }

    if (!usedDims.has(config.crossDim)) {
      const dim1 = mainDimension;
      const dim2 = config.crossDim;
      const hmQuery = buildStackedQuery(parentFilters, dim1, dim2, config.limit);
      
      // Determine color based on main dimension for heatmap
      let hmColor = GAPURA_BLUE;
      let configChartType = 'heatmap';

      if (dim1 === 'airlines' || dim1 === 'area') {
        configChartType = 'grouped_bar';
      }
      else if (dim1 === 'category') hmColor = GAPURA_RED;
      else if (dim1 === 'branch') hmColor = GAPURA_GREEN_DARK;

      charts.push({
        visualization: {
          chartType: configChartType as ChartType,
          xAxis: dim2,
          yAxis: [dim1],
          colorField: 'jumlah',
          title: config.title,
          showLegend: true,
          showLabels: true,
          colors: [hmColor], // Base color for heatmap intensity
        },
        query: hmQuery,
        explanation: config.explanation,
      });
      idx++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL CUSTOM CHARTS
  // These provide additional deep insights beyond the standard charts
  // ═══════════════════════════════════════════════════════════════════════════

  // CHART: Priority Analysis
  // DISABLED per user request
  if (!usedDims.has('priority') && idx < 12 && false) {
    const priorityQuery = buildCrossQuery(parentFilters, 'priority', 10000);
    charts.push({
      visualization: {
        chartType: 'bar',
        xAxis: 'priority',
        yAxis: ['jumlah'],
        title: 'Analisis Prioritas',
        showLegend: false,
        showLabels: true,
        colors: [GAPURA_RED, GAPURA_YELLOW, GAPURA_GREEN_LIGHT],
      },
      query: priorityQuery,
      explanation: 'Distribusi kasus berdasarkan tingkat prioritas: High, Medium, Low. Prioritaskan penanganan kasus High Priority.',
      customChartType: 'priority_analysis',
    });
    idx++;
  }

  // CHART: Airline Type vs Category
  if (!usedDims.has('jenis_maskapai') && idx < 12) {
    const airlineTypeQuery = buildStackedQuery(parentFilters, 'jenis_maskapai', 'category', 10000);
    charts.push({
      visualization: {
        chartType: 'grouped_bar',
        xAxis: 'jenis_maskapai',
        yAxis: ['jumlah'],
        title: 'Kategori per Jenis Maskapai',
        showLegend: true,
        showLabels: true,
      },
      query: airlineTypeQuery,
      explanation: 'Cross-analysis antara jenis maskapai (Lokal, MPA, Garuda, Citilink, dll) dan kategori kasus. Identifikasi pola maskapai spesifik.',
      customChartType: 'airline_type_category',
    });
    idx++;
  }


  // CHART: Monthly Trend
  if (!usedDims.has('month') && idx < 12) {
    const monthlyQuery = buildTimeTrendQuery(parentFilters, 'month');
    charts.push({
      visualization: {
        chartType: 'line',
        xAxis: 'month',
        yAxis: ['jumlah'],
        title: 'Tren Bulanan',
        showLegend: false,
        showLabels: true,
      },
      query: monthlyQuery,
      explanation: 'Analisis tren volume laporan dari bulan ke bulan dengan indikator perubahan. Identifikasi pola musiman dan lonjakan kasus.',
      customChartType: 'monthly_trend',
    });
    idx++;
  }

  // CHART: Category Distribution (donut chart)
  if (!usedDims.has('category') && idx < 12) {
    const categoryQuery = buildCrossQuery(parentFilters, 'category', 10000);
    charts.push({
      visualization: {
        chartType: 'donut',
        xAxis: 'category',
        yAxis: ['jumlah'],
        title: 'Distribusi Kategori',
        showLegend: true,
        showLabels: true,
        colors: [GAPURA_RED, GAPURA_ORANGE, GAPURA_GREEN_LIGHT],
      },
      query: categoryQuery,
      explanation: 'Proporsi Irregularity vs Complaint vs Compliment dengan Health Score. Indikator kesehatan operasional secara keseluruhan.',
      customChartType: 'category_distribution',
    });
    idx++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL CHART: Detailed Report Table (Linked to all contexts)
  // Always included as the final exhaustive deep-dive at the bottom
  // ═══════════════════════════════════════════════════════════════════════════
  const reportTableQuery = buildReportTableQuery(parentFilters);
  charts.push({
    visualization: {
      chartType: 'table',
      xAxis: 'Date',
      yAxis: [],
      title: 'Detail Laporan Terkait',
      showLegend: false,
      showLabels: false,
    },
    query: reportTableQuery,
    explanation: 'Daftar lengkap laporan yang mendasari visualisasi di atas. Gunakan ini untuk cross-referencing detail kejadian, penyebab, dan tindakan yang telah diambil.',
  });
  idx++;

  return { charts, dataMap };
}

// ── Fetch supporting chart data from the query API ───────────────────────────
// Each cross-dimensional chart needs its own query execution because it uses
// a different dimension than the main chart.
// Complexity: Time O(k * API_latency) parallelized | Space O(k * n)
export async function fetchAnalyticalChartData(
  charts: AnalyticalChart[],
  existingDataMap: Record<number, QueryResult>,
): Promise<Record<number, QueryResult>> {
  const dataMap = { ...existingDataMap };
  const fetchTasks: Array<{ idx: number; query: QueryDefinition }> = [];

  for (let i = 0; i < charts.length; i++) {
    if (dataMap[i]) continue; // Already have data (e.g., alt viz reuses main data)
    fetchTasks.push({ idx: i, query: charts[i].query });
  }

  if (fetchTasks.length === 0) return dataMap;

  // Batch fetch via Promise.allSettled — resilient to individual failures
  const results = await Promise.allSettled(
    fetchTasks.map(async (task) => {
      const normalizedQuery = {
        ...task.query,
        dimensions: task.query.dimensions || [],
        measures: task.query.measures || [],
        filters: task.query.filters || [],
        joins: task.query.joins || [],
        sorts: task.query.sorts || [],
      };

      // DEBUG: Log query for area subcategory charts
      const chartTitle = charts[task.idx]?.visualization?.title || '';
      if (chartTitle.includes('Area') || chartTitle.includes('Sub-Kategori')) {
        console.log(`🔍 Query for "${chartTitle}":`, JSON.stringify(normalizedQuery, null, 2));
      }

      const res = await fetch('/api/dashboards/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: normalizedQuery }),
      });

      if (!res.ok) throw new Error(`Query failed: ${res.status}`);
      const result: QueryResult = await res.json();
      
      // DEBUG: Log result for area subcategory charts
      if (chartTitle.includes('Area') || chartTitle.includes('Sub-Kategori')) {
        console.log(`📊 Result for "${chartTitle}":`, {
          columns: result.columns,
          rowCount: result.rows?.length,
          firstRow: result.rows?.[0],
        });
      }
      
      return { idx: task.idx, result };
    }),
  );

  for (const outcome of results) {
    if (outcome.status === 'fulfilled') {
      dataMap[outcome.value.idx] = outcome.value.result;
    }
  }

  return dataMap;
}
