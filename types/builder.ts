// ===== Query Definition Types =====

export type DateGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type AggregateFunction = 'COUNT' | 'COUNT_DISTINCT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

export type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'not_in'
  | 'like'
  | 'between'
  | 'is_null' | 'is_not_null';

export type FilterConjunction = 'AND' | 'OR';

export interface QueryDimension {
  table: string;
  field: string;
  alias?: string;
  dateGranularity?: DateGranularity;
}

export interface QueryMeasure {
  table: string;
  field: string;
  function: AggregateFunction;
  alias?: string;
}

export interface QueryFilter {
  table: string;
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | number[] | null;
  conjunction: FilterConjunction;
  _tag?: string;
}

export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
  /** If from a measure, use the alias */
  alias?: string;
}

export interface QueryJoin {
  from: string;
  to: string;
  joinKey: string; // key in JOINS registry
}

export interface QueryDefinition {
  source: string;
  joins: QueryJoin[];
  dimensions: QueryDimension[];
  measures: QueryMeasure[];
  filters: QueryFilter[];
  sorts: QuerySort[];
  limit?: number;
}

// ===== Chart / Visualization Types =====

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

export interface ChartVisualization {
  chartType: ChartType;
  xAxis?: string;       // alias or dimension field
  yAxis: string[];       // aliases or measure fields
  colorField?: string;   // optional series grouping
  title?: string;
  showLegend: boolean;
  showLabels?: boolean;
  displayLimit?: number; // Visual limit for "Top N" charts
  colors?: string[];
  crossFiltering?: boolean;
  openLinkInNewTab?: boolean;
}

// ===== Dashboard Types =====

export interface TileLayout {
  x: number;  // column position (0-based, 12-col grid)
  y: number;  // row position
  w: number;  // width in columns (1-12)
  h: number;  // height in rows
}

export interface DashboardTile {
  id: string;
  query: QueryDefinition;
  visualization: ChartVisualization;
  layout: TileLayout;
}

export interface GlobalFilter {
  field: string;
  table: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | null;
}

export interface DashboardPage {
  name: string;
  tiles: DashboardTile[];
}

export interface DashboardDefinition {
  name: string;
  description?: string;
  folder?: string;
  tiles: DashboardTile[];
  pages?: DashboardPage[];
  globalFilters?: GlobalFilter[];
  refreshInterval?: number; // seconds
}

// ===== Query Result Types =====

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

// ===== Schema Types =====

export type FieldType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'uuid';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  enumValues?: string[];
}

export interface TableDef {
  name: string;
  label: string;
  fields: FieldDef[];
}

export interface JoinDef {
  key: string;
  from: string;
  fromField: string;
  to: string;
  toField: string;
  label: string;
}
