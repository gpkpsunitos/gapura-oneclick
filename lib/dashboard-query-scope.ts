/**
 * @file
 * 
 * File ini berisi utilitas untuk manajemen filter dan scope pada query dashboard
 */

import type { QueryDefinition, QueryFilter } from '@/types/builder';

/**
 * Interface untuk filter scope dashboard
 * @interface DashboardScopeFilters
 */
export interface DashboardScopeFilters {
  /** Filter hub */
  hub?: string;
  /** Filter branch */
  branch?: string;
  /** Filter maskapai */
  maskapai?: string;
  /** Filter airline */
  airline?: string;
  /** Filter kategori utama */
  main_category?: string;
  /** Filter area */
  area?: string;
  /** Filter divisi tujuan */
  target_division?: string;
  /** Filter severity */
  severity?: string;
  /** Filter status */
  status?: string;
}

/**
 * Konfigurasi mapping filter ke field database
 * @constant DASHBOARD_FILTER_FIELDS
 */
export const DASHBOARD_FILTER_FIELDS = [
  { key: 'hub', table: 'reports', field: 'hub' },
  { key: 'branch', table: 'reports', field: 'branch' },
  { key: 'maskapai', table: 'reports', field: 'jenis_maskapai' },
  { key: 'airline', table: 'reports', field: 'airlines' },
  { key: 'main_category', table: 'reports', field: 'category' },
  { key: 'area', table: 'reports', field: 'area' },
  { key: 'target_division', table: 'reports', field: 'target_division' },
  { key: 'severity', table: 'reports', field: 'severity' },
  { key: 'status', table: 'reports', field: 'status' },
] as const;

/**
 * Menormalisasi filter dashboard dengan menghapus nilai kosong dan 'all'
 * @param filters - Objek filter untuk dinormalisasi
 * @param dateFrom - Tanggal awal (opsional)
 * @param dateTo - Tanggal akhir (opsional)
 * @returns Objek dengan filters yang sudah dinormalisasi dan range tanggal
 * @example
 * ```ts
 * const normalized = normalizeDashboardScope(
 *   { hub: 'CGK', branch: 'all' },
 *   '2024-01-01',
 *   '2024-12-31'
 * );
 * // returns: { filters: { hub: 'CGK' }, dateFrom: '2024-01-01', dateTo: '2024-12-31' }
 * ```
 */
export function normalizeDashboardScope(filters: DashboardScopeFilters, dateFrom?: string, dateTo?: string) {
  return {
    filters: Object.fromEntries(
      Object.entries(filters)
        .filter(([, value]) => value && value !== 'all')
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  };
}

/**
 * Menerapkan filter scope dashboard ke definisi query
 * @param queryConfig - Konfigurasi query yang akan difilter
 * @param options - Opsi filter dan konfigurasi tambahan
 * @param options.filters - Filter scope untuk diterapkan
 * @param options.dateFrom - Tanggal awal filter
 * @param options.dateTo - Tanggal akhir filter
 * @param options.activePage - Nomor halaman aktif untuk filter CGO
 * @returns Query definition dengan filter yang sudah diterapkan
 * @example
 * ```ts
 * const scopedQuery = applyDashboardScopeToQuery(baseQuery, {
 *   filters: { hub: 'CGK' },
 *   dateFrom: '2024-01-01',
 *   dateTo: '2024-12-31',
 *   activePage: 2
 * });
 * ```
 */
export function applyDashboardScopeToQuery(
  queryConfig: QueryDefinition,
  options: {
    filters?: DashboardScopeFilters;
    dateFrom?: string;
    dateTo?: string;
    activePage?: number;
  },
): QueryDefinition {
  const { filters = {}, dateFrom, dateTo, activePage } = options;

  const extraFilters = Object.entries(filters)
    .filter(([, value]) => value && value !== 'all')
    .map(([key, value]) => {
      const filterField = DASHBOARD_FILTER_FIELDS.find((entry) => entry.key === key);
      if (!filterField) {
        return null;
      }

      return {
        table: filterField.table,
        field: filterField.field,
        operator: 'eq',
        value,
        conjunction: 'AND',
      } as QueryFilter;
    })
    .filter((value): value is QueryFilter => Boolean(value));

  const dateFilters: QueryFilter[] = [];
  if (dateFrom) {
    dateFilters.push({
      table: 'reports',
      field: 'created_at',
      operator: 'gte',
      value: dateFrom,
      conjunction: 'AND',
    });
  }
  if (dateTo) {
    dateFilters.push({
      table: 'reports',
      field: 'created_at',
      operator: 'lte',
      value: dateTo,
      conjunction: 'AND',
    });
  }

  const cgoFilters: QueryFilter[] = [3, 4].includes(activePage ?? -1)
    ? [{
        table: 'reports',
        field: 'source_sheet',
        operator: 'eq',
        value: 'CGO',
        conjunction: 'AND',
      }]
    : [];

  return {
    ...queryConfig,
    joins: queryConfig.joins || [],
    dimensions: queryConfig.dimensions || [],
    measures: queryConfig.measures || [],
    sorts: queryConfig.sorts || [],
    filters: [
      ...(queryConfig.filters || []),
      ...extraFilters,
      ...dateFilters,
      ...cgoFilters,
    ],
  };
}
