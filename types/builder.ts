/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi definisi tipe data untuk Query Builder, mencakup definisi query,
 * visualisasi chart, dashboard, dan schema database.
 */

// ===== Query Definition Types =====

/**
 * Granularitas tanggal untuk agregasi
 */
export type DateGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Fungsi agregasi untuk query
 */
export type AggregateFunction = 'COUNT' | 'COUNT_DISTINCT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

/**
 * Operator filter
 */
export type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'not_in'
  | 'like'
  | 'between'
  | 'is_null' | 'is_not_null';

/**
 * Konjungsi filter */
export type FilterConjunction = 'AND' | 'OR';

/**
 * Dimensi query
 */
export interface QueryDimension {
  /** Nama tabel */
  table: string;
  /** Nama field */
  field: string;
  /** Alias */
  alias?: string;
  /** Granularitas tanggal */
  dateGranularity?: DateGranularity;
}

/**
 * Measure query
 */
export interface QueryMeasure {
  /** Nama tabel */
  table: string;
  /** Nama field */
  field: string;
  /** Fungsi agregasi */
  function: AggregateFunction;
  /** Alias */
  alias?: string;
}

/**
 * Filter query
 */
export interface QueryFilter {
  /** Nama tabel */
  table: string;
  /** Nama field */
  field: string;
  /** Operator filter */
  operator: FilterOperator;
  /** Nilai filter */
  value: string | number | boolean | string[] | number[] | null;
  /** Konjungsi filter */
  conjunction: FilterConjunction;
  /** Tag untuk identifikasi */
  _tag?: string;
}

/**
 * Sort query
 */
export interface QuerySort {
  /** Nama field */
  field: string;
  /** Arah pengurutan */
  direction: 'asc' | 'desc';
  /** Alias (jika dari measure) */
  alias?: string;
}

/**
 * Join query
 */
export interface QueryJoin {
  /** Tabel sumber */
  from: string;
  /** Tabel tujuan */
  to: string;
  /** Key join dari registry JOINS */
  joinKey: string;
}

/**
 * Definisi query lengkap
 */
export interface QueryDefinition {
  /** Tabel sumber */
  source: string;
  /** Daftar join */
  joins: QueryJoin[];
  /** Daftar dimensi */
  dimensions: QueryDimension[];
  /** Daftar measure */
  measures: QueryMeasure[];
  /** Daftar filter */
  filters: QueryFilter[];
  /** Daftar sort */
  sorts: QuerySort[];
  /** Batas hasil */
  limit?: number;
}

// ===== Chart / Visualization Types =====

/**
 * Tipe chart untuk visualisasi
 */
export type ChartType =
  | 'bar'
  | 'horizontal_bar'
  | 'stacked_bar'
  | 'grouped_bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'heatmap'
  | 'table'
  | 'pivot'
  | 'kpi'
  | 'branch_area_grid'
  | 'combo';

/**
 * Konfigurasi visualisasi chart
 */
export interface ChartVisualization {
  /** Tipe chart */
  chartType: ChartType;
  /** Sumbu X (alias atau field dimensi) */
  xAxis?: string;
  /** Sumbu Y (array alias atau field measure) */
  yAxis: string[];
  /** Field untuk pengelompokan warna */
  colorField?: string;
  /** Judul chart */
  title?: string;
  /** Tampilkan legenda */
  showLegend: boolean;
  /** Tampilkan label */
  showLabels?: boolean;
  /** Batas visual untuk chart "Top N" */
  displayLimit?: number;
  /** Warna custom */
  colors?: string[];
  /** Cross filtering */
  crossFiltering?: boolean;
  /** Buka link di tab baru */
  openLinkInNewTab?: boolean;
}

// ===== Dashboard Types =====

/**
 * Layout tile dashboard
 */
export interface TileLayout {
  /** Posisi kolom (0-based, grid 12 kolom) */
  x: number;
  /** Posisi baris */
  y: number;
  /** Lebar dalam kolom (1-12) */
  w: number;
  /** Tinggi dalam baris */
  h: number;
}

/**
 * Tile dashboard
 */
export interface DashboardTile {
  /** ID tile */
  id: string;
  /** Definisi query */
  query: QueryDefinition;
  /** Konfigurasi visualisasi */
  visualization: ChartVisualization;
  /** Layout tile */
  layout: TileLayout;
}

/**
 * Filter global dashboard
 */
export interface GlobalFilter {
  /** Nama field */
  field: string;
  /** Nama tabel */
  table: string;
  /** Operator filter */
  operator: FilterOperator;
  /** Nilai filter */
  value: string | number | boolean | string[] | null;
}

/**
 * Halaman dashboard
 */
export interface DashboardPage {
  /** Nama halaman */
  name: string;
  /** Daftar tile */
  tiles: DashboardTile[];
}

/**
 * Definisi dashboard lengkap
 */
export interface DashboardDefinition {
  /** Nama dashboard */
  name: string;
  /** Deskripsi dashboard */
  description?: string;
  /** Folder dashboard */
  folder?: string;
  /** Daftar tile */
  tiles: DashboardTile[];
  /** Halaman dashboard */
  pages?: DashboardPage[];
  /** Filter global */
  globalFilters?: GlobalFilter[];
  /** Interval refresh dalam detik */
  refreshInterval?: number;
}

// ===== Query Result Types =====

/**
 * Hasil query
 */
export interface QueryResult {
  /** Daftar nama kolom */
  columns: string[];
  /** Daftar baris data */
  rows: Record<string, unknown>[];
  /** Jumlah baris */
  rowCount: number;
  /** Waktu eksekusi dalam milidetik */
  executionTimeMs: number;
}

// ===== Schema Types =====

/**
 * Tipe field database
 */
export type FieldType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'uuid';

/**
 * Definisi field
 */
export interface FieldDef {
  /** Nama field */
  name: string;
  /** Label field */
  label: string;
  /** Tipe field */
  type: FieldType;
  /** Nilai enum (jika ada) */
  enumValues?: string[];
}

/**
 * Definisi tabel
 */
export interface TableDef {
  /** Nama tabel */
  name: string;
  /** Label tabel */
  label: string;
  /** Daftar field */
  fields: FieldDef[];
}

/**
 * Definisi join
 */
export interface JoinDef {
  /** Key join */
  key: string;
  /** Tabel sumber */
  from: string;
  /** Field sumber */
  fromField: string;
  /** Tabel tujuan */
  to: string;
  /** Field tujuan */
  toField: string;
  /** Label join */
  label: string;
}
