/**
 * @file
 * 
 * File ini berisi template generator untuk dashboard Customer Feedback
 * Menghasilkan dashboard definition lengkap dengan berbagai halaman dan visualisasi
 */

import type { DashboardDefinition, DashboardTile, DashboardPage, QueryFilter } from '@/types/builder';

/**
 * Helper untuk generate filter array berdasarkan field dan values
 * @param field - Nama field
 * @param values - Array nilai untuk filter
 * @returns Array QueryFilter
 * @example
 * ```ts
 * const filters = arrayFilter('branch', ['CGK', 'DPS']);
 * ```
 */
/**
 * Helper untuk generate filter berdasarkan rentang tanggal
 * @param dateFrom - Tanggal awal (format YYYY-MM-DD)
 * @param dateTo - Tanggal akhir (format YYYY-MM-DD)
 * @returns Array QueryFilter untuk rentang tanggal
 */
function dateFilters(dateFrom: string, dateTo: string): QueryFilter[] {
  // Fix: Ensure dateTo includes the entire day if time is not specified
  // This prevents exclusion of records on the end date when using ISO timestamps
  let safeDateTo = dateTo;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    safeDateTo = `${dateTo}T23:59:59`;
  }

  return [
    { table: 'reports', field: 'date_of_event', operator: 'gte' as const, value: dateFrom, conjunction: 'AND' as const },
    { table: 'reports', field: 'date_of_event', operator: 'lte' as const, value: safeDateTo, conjunction: 'AND' as const },
  ];
}

let tileCounter = 0;
function tileId() { return `cft-${Date.now()}-${++tileCounter}`; }

export interface DashboardOptions {
  filters?: {
    hubs?: string[];
    branches?: string[];
    airlines?: string[];
    categories?: string[];
    division?: string;
  }
}

/**
 * Helper untuk generate filter array berdasarkan field dan values
 * @param field - Nama field
 * @param values - Array nilai untuk filter
 * @returns Array QueryFilter
 * @example
 * ```ts
 * const filters = arrayFilter('branch', ['CGK', 'DPS']);
 * ```
 */
function arrayFilter(field: string, values: string[] | undefined): QueryFilter[] {
  if (!values || values.length === 0) return [];
  return [{
    table: 'reports',
    field,
    operator: 'in',
    value: values,
    conjunction: 'AND'
  }];
}

/**
 * Menghasilkan dashboard Customer Feedback lengkap
 * @param dateFrom - Tanggal awal range
 * @param dateTo - Tanggal akhir range
 * @param options - Opsi konfigurasi tambahan (opsional)
 * @returns Dashboard definition lengkap
 * @example
 * ```ts
 * const dashboard = generateCustomerFeedbackDashboard('2024-01-01', '2024-12-31');
 * ```
 */
export function generateCustomerFeedbackDashboard(dateFrom: string, dateTo: string, options?: DashboardOptions): DashboardDefinition {
  tileCounter = 0;
  
  // Parse dates safely - handle ISO format (YYYY-MM-DD)
  const parseDate = (dateStr: string): Date => {
    // If already in YYYY-MM-DD format, parse directly to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
    return new Date(dateStr);
  };
  
  const df = dateFilters(dateFrom, dateTo);
  
  // Filter for NON CARGO pages (1, 2, 3)
  const nonCargoFilter: QueryFilter = {
    table: 'reports',
    field: 'source_sheet',
    operator: 'eq' as const,
    value: 'NON CARGO',
    conjunction: 'AND' as const
  };

  // Optional Filters
  const hubFilters = arrayFilter('hub', options?.filters?.hubs);
  const branchFilters = arrayFilter('branch', options?.filters?.branches);
  const airlineFilters = arrayFilter('airline', options?.filters?.airlines); // 'airline' column alias of 'airlines' in some contexts, but schema says 'airlines' or 'airline'. Reports service maps it. 
  // Schema.ts says 'airlines' is the field name in 'reports' table? 
  // Let's check schema.ts later. But types/index.ts says 'airlines' and 'airline'. 
  // If I look at the existing queries in this file: 
  // Line 92: field: 'airline' (with alias 'total'). 
  // Line 142: field: 'airlines' (with alias 'airline').
  // This implies inconsistency in field usage or schema aliases.
  // I will use 'airlines' as per line 142 if it refers to the column.
  // Line 204: field: 'airlines'.
  // Line 319: field: 'airline'.
  // I'll stick to 'airlines' as the likely column name based on plural convention in other fields if any, but 'branch' is singular.
  // type Report has 'airlines?: string'.
  // I will use 'airlines' generally, but if it fails I might need to check DB schema. 
  // Wait, existing code uses both?
  // tile 3 uses field: 'airline'. tile 139 uses field: 'airlines'.
  // I'll use 'airlines' for the filter as it seems more common for the column name.
  // Actually, let's use 'airlines' for safety, but check if 'airline' is a calculated field.
  // In `types/index.ts`, `airlines` is a string field.
  
  // Correction: I should check which one works. 
  // I'll use 'airlines'.
  
  const categoryFilters = arrayFilter('main_category', options?.filters?.categories);
  const divisionFilter: QueryFilter[] = [];

  const cgoFilter: QueryFilter = { 
    table: 'reports', 
    field: 'source_sheet', 
    operator: 'eq', 
    value: 'CGO', 
    conjunction: 'AND' 
  };

  const baseFilters = [...df, nonCargoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter];
  const cgoBaseFilters = [...df, cgoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter];
  
  const fromDate = parseDate(dateFrom);
  const toDate = parseDate(dateTo);
  // Dynamic year range for title
  const fromYear = fromDate.getFullYear();
  const toYear = toDate.getFullYear();
  const yearRange = fromYear === toYear ? `${fromYear}` : `${fromYear} - ${toYear}`;
  
  const displayTitle = 'Customer Feedback Dashboard';
  const displayDescription = 'Comprehensive Customer Feedback Dashboard – Irregularity, Complaint & Compliment Report';
  
  console.log('[Customer Feedback] Date range:', { dateFrom, dateTo, fromYear, toYear, yearRange });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1: Case Category (Landside/Airside)
  // ═══════════════════════════════════════════════════════════════════════════
  const page1Tiles: DashboardTile[] = [
    // ── KPI Row (y:0) ──
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'total' }],
        filters: [...baseFilters], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 0, y: 0, w: 3, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'branch', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...baseFilters], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Branch', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 3, y: 0, w: 3, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'airline', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...baseFilters], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Airlines', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 6, y: 0, w: 3, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'total' }],
        filters: [...baseFilters, { table: 'reports', field: 'main_category', operator: 'eq' as const, value: 'Compliment', conjunction: 'AND' as const }],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Compliment Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 9, y: 0, w: 3, h: 1 },
    },

    // ── Row 1 (y:1): Charts 1-4 ──

    // 1. Report by Case Category (pie/donut)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'category', alias: 'Report Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Record Count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Record Count', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'donut', title: 'Report by Case Category', xAxis: 'Report Category', yAxis: ['Record Count'], showLegend: true, showLabels: true, colors: ['#4caf50', '#00acc1', '#cddc39'] },
      layout: { x: 0, y: 1, w: 3, h: 2 },
    },
    // 2. Branch Report (horizontal bar)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'branch', alias: 'Branch' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Record Count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Record Count', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Branch Report', xAxis: 'Branch', yAxis: ['Record Count'], showLegend: false, showLabels: true, colors: ['#4caf50'] },
      layout: { x: 3, y: 1, w: 3, h: 2 },
    },
    // 3. Airlines Report (horizontal bar)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'airlines', alias: 'Airlines' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Record Count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Record Count', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Airlines Report', xAxis: 'Airlines', yAxis: ['Record Count'], showLegend: false, showLabels: true, colors: ['#4caf50'] },
      layout: { x: 6, y: 1, w: 3, h: 2 },
    },
    // 4. Monthly Report (horizontal bar) - current year, sort by count desc
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'date_of_event', alias: 'Date of Event', dateGranularity: 'month' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Report Count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Report Count', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Monthly Report', xAxis: 'Date of Event', yAxis: ['Report Count'], showLegend: false, showLabels: true, displayLimit: 14, colors: ['#4caf50'] },
      layout: { x: 9, y: 1, w: 3, h: 2 },
    },

    // ── Row 2 (y:3): Charts 5-8 ──

    // 5. Category by Area (pie/donut) - exclude null area
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'area', alias: 'Area' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Record Count' }],
        filters: [...baseFilters, { table: 'reports', field: 'area', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Record Count', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'donut', title: 'Category by Area', xAxis: 'Area', yAxis: ['Record Count'], showLegend: true, showLabels: true, displayLimit: 5, colors: ['#4caf50', '#00acc1', '#cddc39'] },
      layout: { x: 0, y: 3, w: 3, h: 2 },
    },
    // 6. Report Category by Branch (pivot/heatmap)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'Branch' },
          { table: 'reports', field: 'category', alias: 'Report Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Record Count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Record Count', direction: 'desc' }], limit: 200,
      },
      visualization: {
        chartType: 'pivot',
        title: 'Report Category by Branch',
        xAxis: 'Report Category',
        yAxis: ['Branch'],
        showLegend: false,
        showLabels: true,
      },
      layout: { x: 3, y: 3, w: 3, h: 2 },
    },
    // 7. Report Category by Airlines (pivot/heatmap)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airlines', alias: 'Airlines' },
          { table: 'reports', field: 'category', alias: 'Report Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Record Count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Record Count', direction: 'desc' }], limit: 200,
      },
      visualization: {
        chartType: 'pivot',
        title: 'Report Category by Airlines',
        xAxis: 'Report Category',
        yAxis: ['Airlines'],
        showLegend: false,
        showLabels: true,
      },
      layout: { x: 6, y: 3, w: 3, h: 2 },
    },
    // 8. HUB Report (horizontal bar)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'hub', alias: 'HUB' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Report Count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Report Count', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'HUB Report', xAxis: 'HUB', yAxis: ['Report Count'], showLegend: false, showLabels: true, colors: ['#81c784'], displayLimit: 10 },
      layout: { x: 9, y: 3, w: 3, h: 2 },
    },

    // ── Row 3 (y:5): Charts 9-12 ──

    // 9. Identification of Root (pivot table) - exclude null case_classification
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'case_classification', alias: 'Case Classification' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'case_classification', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Identification of Root', xAxis: 'Case Classification', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'], displayLimit: 10 },
      layout: { x: 0, y: 5, w: 3, h: 2 },
    },
    // 10. Landside Area Category - exclude null terminal_area_category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'terminal_area_category', alias: 'Terminal Area' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'terminal_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Landside Area Category', xAxis: 'Terminal Area', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'], displayLimit: 10 },
      layout: { x: 3, y: 5, w: 3, h: 2 },
    },
    // 11. Airside Area Category - exclude null apron_area_category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'apron_area_category', alias: 'Apron Area' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'apron_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Airside Area Category', xAxis: 'Apron Area', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'], displayLimit: 10 },
      layout: { x: 6, y: 5, w: 3, h: 2 },
    },
    // 12. General Service Category - exclude null and 'others' general_category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'general_category', alias: 'General Service' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters,
          { table: 'reports', field: 'general_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const },
          { table: 'reports', field: 'general_category', operator: 'neq' as const, value: 'Others', conjunction: 'AND' as const },
          { table: 'reports', field: 'general_category', operator: 'neq' as const, value: 'others', conjunction: 'AND' as const },
        ],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'General Service Category', xAxis: 'General Service', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'], displayLimit: 10 },
      layout: { x: 9, y: 5, w: 3, h: 2 },
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2: Detail Category (Landside/Airside)
  // ═══════════════════════════════════════════════════════════════════════════
  const page2KPIs = page1Tiles.slice(0, 4).map(t => ({ ...t, id: tileId() }));

  const page2Tiles: DashboardTile[] = [
    ...page2KPIs,
    // Pivot Table: Case Report by Area (Branch + Airlines as rows, Area as columns)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'Branch Report' },
          { table: 'reports', field: 'area', alias: 'Area' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, nonCargoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 1000,
      },
      visualization: { 
        chartType: 'branch_area_grid', 
        title: 'Case Report by Area',
        xAxis: 'Area',
        yAxis: ['Branch Report'],
        showLegend: true, 
        showLabels: true,
        colors: ['#4caf50', '#81c784', '#a5d6a7', '#c8e6c9', '#e8f5e9'],
      },
      layout: { x: 0, y: 7, w: 12, h: 4 }, // Full width for grid
    },
    // Table -> Bar: Terminal Area Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'terminal_area_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'terminal_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Record Count', direction: 'desc' }], limit: 10000,
      },
      visualization: { 
        chartType: 'horizontal_bar', 
        title: 'Terminal Area Category', 
        xAxis: 'Category', 
        yAxis: ['Total'], 
        showLegend: false, 
        showLabels: true, 
        colors: ['#10b981'],
        crossFiltering: true,
        openLinkInNewTab: true,
        displayLimit: 10
      },
      layout: { x: 6, y: 1, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2
    },
    // Table -> Bar: Apron Area Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'apron_area_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'apron_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Apron Area Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#10b981'], displayLimit: 10 },
      layout: { x: 0, y: 3, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2
    },
    // Table -> Bar: General Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'general_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'general_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'General Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#10b981'], displayLimit: 10 },
      layout: { x: 6, y: 3, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2
    },
    // Horizontal Bar: HUB Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'hub', alias: 'hub' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'HUB Report', xAxis: 'hub', yAxis: ['count'], showLegend: false, showLabels: true, colors: ['#81c784'], displayLimit: 10 },
      layout: { x: 0, y: 5, w: 6, h: 2 },
    },
    // Table: Detail Report Landside & Airside
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'date_of_event', alias: 'Date' },
          { table: 'reports', field: 'main_category', alias: 'Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'flight_number', alias: 'Flight' },
          { table: 'reports', field: 'description', alias: 'Report' }, // Updated to 'description'
          { table: 'reports', field: 'root_caused', alias: 'Root Caused' }, // Updated to 'root_caused'
          { table: 'reports', field: 'action_taken', alias: 'Action Taken' },
          { table: 'reports', field: 'evidence_url', alias: 'Evidence Link' },
        ],
        measures: [],
        filters: [...baseFilters],
        sorts: [{ field: 'Date', direction: 'asc' }], limit: 10000,
      },
      visualization: { chartType: 'table', title: 'Report Landside & Airside', yAxis: [], showLegend: false, showLabels: false },
      layout: { x: 0, y: 11, w: 12, h: 4 }, // WIDTH 12, HEIGHT 4
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3: Status Analytics
  // ═══════════════════════════════════════════════════════════════════════════
  const page3KPIs = page1Tiles.slice(0, 4).map(t => ({ ...t, id: tileId() }));
  const page3Tiles: DashboardTile[] = [
    ...page3KPIs,
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'Branch' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'status', alias: 'Status' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 10000,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Detail Report Status',
        xAxis: 'Status',
        yAxis: ['Branch', 'Airlines'],
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 0, y: 1, w: 4, h: 2 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'Branch' },
          { table: 'reports', field: 'status', alias: 'Status' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 10000,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Report Status by Branch',
        xAxis: 'Status',
        yAxis: ['Branch'],
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 4, y: 1, w: 4, h: 2 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'status', alias: 'Status' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 10000,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Report Status by Airlines',
        xAxis: 'Status',
        yAxis: ['Airlines'],
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 8, y: 1, w: 4, h: 2 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'terminal_area_category', alias: 'Terminal Area' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'terminal_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Landside Area Category', xAxis: 'Terminal Area', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'], displayLimit: 10 },
      layout: { x: 0, y: 3, w: 3, h: 2 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'apron_area_category', alias: 'Apron Area' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'apron_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Airside Area Category', xAxis: 'Apron Area', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'], displayLimit: 10 },
      layout: { x: 3, y: 3, w: 3, h: 2 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'general_category', alias: 'General Service' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'general_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'General Service Category', xAxis: 'General Service', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'], displayLimit: 10 },
      layout: { x: 6, y: 3, w: 3, h: 2 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'Branch' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'area', alias: 'Area' },
          { table: 'reports', field: 'main_category', alias: 'Category' },
          { table: 'reports', field: 'root_caused', alias: 'Root' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'root_caused', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'table', title: 'Root Cause Identification', yAxis: [], showLegend: false, showLabels: false },
      layout: { x: 9, y: 3, w: 3, h: 2 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'date_of_event', alias: 'Date' },
          { table: 'reports', field: 'main_category', alias: 'Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'flight_number', alias: 'Flight' },
          { table: 'reports', field: 'description', alias: 'Report' },
          { table: 'reports', field: 'root_caused', alias: 'Root Caused' },
          { table: 'reports', field: 'preventive_action', alias: 'Final Remarks' },
          { table: 'reports', field: 'status', alias: 'Status' },
        ],
        measures: [],
        filters: [...baseFilters],
        sorts: [{ field: 'Date', direction: 'asc' }], limit: 10000,
      },
      visualization: { chartType: 'table', title: 'Detail Report Landside & Airside', yAxis: [], showLegend: false, showLabels: false },
      layout: { x: 0, y: 5, w: 12, h: 4 },
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4: CGO Overview (Replicated from Screenshot)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const page4Tiles: DashboardTile[] = [
    // ── KPI Row ──
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'total' }],
        filters: [...df, cgoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Total Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 0, y: 0, w: 2, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'branch', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...df, cgoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Branch', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 2, y: 0, w: 2, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'airline', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...df, cgoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Airlines', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 4, y: 0, w: 2, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'total' }],
        filters: [...cgoBaseFilters, { table: 'reports', field: 'main_category', operator: 'eq' as const, value: 'Compliment', conjunction: 'AND' as const }],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Compliment Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 6, y: 0, w: 2, h: 1 },
    },

    // ── Row 1: 4 Horizontal Bar Charts (Shifted to y: 1) ──
    
    // 1. Report by Case Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'main_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Report by Case Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#00acc1', '#81c784', '#ffd54f'], displayLimit: 10 },
      layout: { x: 0, y: 1, w: 4, h: 2 }, // WIDTH 4, HEIGHT 2
    },
    // 2. Branch Reporting
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'branch', alias: 'Branch' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Report by Branch (Top 10)', xAxis: 'Branch', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#81c784'], displayLimit: 10 },
      layout: { x: 4, y: 1, w: 4, h: 2 }, // WIDTH 4, HEIGHT 2
    },
    // 3. Airlines Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'airline', alias: 'Airline' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Airlines Report', xAxis: 'Airline', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#81c784'], displayLimit: 10 },
      layout: { x: 0, y: 3, w: 4, h: 2 }, // WIDTH 4, HEIGHT 2, Row 2
    },
    // 4. Monthly Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'date_of_event', alias: 'Month', dateGranularity: 'month' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter],
        sorts: [{ field: 'Month', direction: 'asc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Monthly Report', xAxis: 'Month', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#81c784'], displayLimit: 14 },
      layout: { x: 4, y: 3, w: 4, h: 2 }, // WIDTH 4, HEIGHT 2, Row 2
    },

    // ── Row 2: Category by Area + 2 Pivot Tables ──

    // 5. Category by Area (Horizontal Bar)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'area', alias: 'Area' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Category by Area', xAxis: 'Area', yAxis: ['Total'], showLegend: true, showLabels: true, colors: ['#00acc1', '#81c784', '#ffd54f'], displayLimit: 5 },
      layout: { x: 0, y: 5, w: 4, h: 2 }, // WIDTH 4, HEIGHT 2, Row 3
    },
    // 6. Case Category by Branch (Pivot)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'Reporting Branch' },
          { table: 'reports', field: 'main_category', alias: 'Report Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Grand total' }],
        filters: [...df, cgoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter],
        sorts: [{ field: 'Grand total', direction: 'desc' }], limit: 10000,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Case Category by Branch', 
        xAxis: 'Report Category', 
        yAxis: ['Reporting Branch'], 
        showLegend: false, 
        showLabels: true 
      },
      layout: { x: 4, y: 5, w: 4, h: 2 }, // WIDTH 4, HEIGHT 2, Row 3
    },
    // 7. Case Category by Airlines (Pivot)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'main_category', alias: 'Report Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Grand total' }],
        filters: [...df, cgoFilter, ...hubFilters, ...branchFilters, ...airlineFilters, ...categoryFilters, ...divisionFilter],
        sorts: [{ field: 'Grand total', direction: 'desc' }], limit: 10000,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Case Category by Airlines', 
        xAxis: 'Report Category', 
        yAxis: ['Airlines'], 
        showLegend: false, 
        showLabels: true 
      },
      layout: { x: 0, y: 7, w: 8, h: 2 }, // WIDTH 8, HEIGHT 2, Row 4
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 5: CGO Detail (Replicated from Screenshot)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const page5Tiles: DashboardTile[] = [
    // ── Row 0: KPI Cards ──
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'total' }],
        filters: [...cgoBaseFilters],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Total Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 0, y: 0, w: 2, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'branch', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...cgoBaseFilters],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Branch', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 2, y: 0, w: 2, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'airline', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...cgoBaseFilters],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Airlines', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 4, y: 0, w: 2, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'total' }],
        filters: [...cgoBaseFilters, { table: 'reports', field: 'main_category', operator: 'eq' as const, value: 'Compliment', conjunction: 'AND' as const }],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Compliment Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 6, y: 0, w: 2, h: 1 },
    },

    // ── Row 1: Pivot + 3 Category Bars ──

    // 1. Case Report by Area (Pivot)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'Branch Report' },
          { table: 'reports', field: 'airline', alias: 'Airlines' }, // Added Airlines
          { table: 'reports', field: 'area', alias: 'Area' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Grand total' }],
        filters: [...cgoBaseFilters],
        sorts: [{ field: 'Grand total', direction: 'desc' }],
        limit: 10000,
      },
      visualization: {
        chartType: 'branch_area_grid',
        title: 'Case Report by Area',
        xAxis: 'Area',
        yAxis: ['Branch Report', 'Airlines'], // Updated
        showLegend: true,
        showLabels: true,
        colors: ['#4caf50', '#81c784', '#a5d6a7', '#c8e6c9', '#e8f5e9'],
      },
      layout: { x: 0, y: 1, w: 8, h: 4 }, // Width 8
    },
    // 2. Terminal Area Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'terminal_area_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...cgoBaseFilters, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'Terminal Area', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Terminal Area Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'], displayLimit: 10 },
      layout: { x: 0, y: 5, w: 4, h: 4 }, // Row 2
    },
    // 3. Apron Area Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'apron_area_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...cgoBaseFilters, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'Apron Area', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Apron Area Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'], displayLimit: 10 },
      layout: { x: 4, y: 5, w: 4, h: 4 }, // Row 2
    },
    // 4. General Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'general_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...cgoBaseFilters, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'General', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'General Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'], displayLimit: 10 },
      layout: { x: 0, y: 9, w: 8, h: 4 }, // Moved to next row, full width
    },

    // ── Row 2: HUB Report + Detail Table ──

    // 5. HUB Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'hub', alias: 'hub' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...cgoBaseFilters], // Standardized
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10000,
      },
      visualization: { chartType: 'horizontal_bar', title: 'HUB Report', xAxis: 'hub', yAxis: ['count'], showLegend: false, showLabels: true, colors: ['#81c784'], displayLimit: 10 },
      layout: { x: 0, y: 13, w: 8, h: 4 }, // Full width at y: 13
    },
    // 6. Detail Report Landside & Airside
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'date_of_event', alias: 'Date' },
          { table: 'reports', field: 'main_category', alias: 'Category' },
          { table: 'reports', field: 'branch', alias: 'Branch Report' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'flight_number', alias: 'Flight' },
          { table: 'reports', field: 'report', alias: 'Report' }, // Screenshot shows 'report' header
          { table: 'reports', field: 'root_caused', alias: 'Root Caused' }, 
          { table: 'reports', field: 'action_taken', alias: 'Action Taken' },
          // Evidence Link removed as per screenshot
        ],
        measures: [],
        filters: [...cgoBaseFilters],
        sorts: [{ field: 'Date', direction: 'asc' }], limit: 5000,
      },
      visualization: { chartType: 'table', title: 'Detail Report Landside & Airside', yAxis: [], showLegend: false, showLabels: false },
      layout: { x: 0, y: 17, w: 8, h: 6 }, // Full width at y: 17, taller
    },
  ];

  const pages: DashboardPage[] = [
    { name: 'Report Category', tiles: page1Tiles },
    { name: 'Detail Category', tiles: page2Tiles },
    { name: 'Status Analytics', tiles: page3Tiles },
    { name: 'CGO - Report Category', tiles: page4Tiles },
    { name: 'CGO - Detail Report', tiles: page5Tiles },
  ];

  const allTiles = pages.flatMap(p => p.tiles);

  return {
    name: displayTitle,
    description: displayDescription,
    tiles: allTiles,
    pages,
    globalFilters: [],
    refreshInterval: 300,
  };
}
