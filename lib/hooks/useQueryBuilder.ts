/**
 * @file
 * 
 * File ini berisi React hook untuk membangun query secara interaktif
 * dengan dukungan dimensions, measures, filters, sorts, dan joins
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  QueryDefinition,
  QueryDimension,
  QueryMeasure,
  QueryFilter,
  QuerySort,
} from '@/types/builder';
import { getJoinsForSource, getFieldsForTable, JOINS } from '@/lib/builder/schema';
import type { FieldDef } from '@/types/builder';

/** Definisi query default */
const defaultQuery: QueryDefinition = {
  source: 'reports',
  joins: [],
  dimensions: [],
  measures: [],
  filters: [],
  sorts: [],
  limit: 1000,
};

/**
 * Hook untuk membangun query secara interaktif
 * 
 * @param initial - Query awal (optional)
 * @returns Object berisi state query dan fungsi untuk memanipulasi query
 */
export function useQueryBuilder(initial?: Partial<QueryDefinition>) {
  const [query, setQuery] = useState<QueryDefinition>({ ...defaultQuery, ...initial });

  /**
   * Set sumber data query
   * 
   * @param source - Nama tabel sumber data
   */
  const setSource = useCallback((source: string) => {
    setQuery(() => ({
      ...defaultQuery,
      source,
      // Reset everything when source changes
    }));
  }, []);

  // Dimensions
  /**
   * Tambahkan dimension ke query
   * 
   * @param dim - Dimension yang akan ditambahkan
   */
  const addDimension = useCallback((dim: QueryDimension) => {
    setQuery(prev => ({
      ...prev,
      dimensions: [...prev.dimensions, dim],
    }));
  }, []);

  /**
   * Hapus dimension berdasarkan index
   * 
   * @param index - Index dimension yang akan dihapus
   */
  const removeDimension = useCallback((index: number) => {
    setQuery(prev => ({
      ...prev,
      dimensions: prev.dimensions.filter((_, i) => i !== index),
    }));
  }, []);

  /**
   * Update dimension berdasarkan index
   * 
   * @param index - Index dimension yang akan diupdate
   * @param updates - Partial update untuk dimension
   */
  const updateDimension = useCallback((index: number, updates: Partial<QueryDimension>) => {
    setQuery(prev => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) => i === index ? { ...d, ...updates } : d),
    }));
  }, []);

  // Measures
  /**
   * Tambahkan measure ke query
   * 
   * @param measure - Measure yang akan ditambahkan
   */
  const addMeasure = useCallback((measure: QueryMeasure) => {
    setQuery(prev => ({
      ...prev,
      measures: [...prev.measures, measure],
    }));
  }, []);

  /**
   * Hapus measure berdasarkan index
   * 
   * @param index - Index measure yang akan dihapus
   */
  const removeMeasure = useCallback((index: number) => {
    setQuery(prev => ({
      ...prev,
      measures: prev.measures.filter((_, i) => i !== index),
    }));
  }, []);

  /**
   * Update measure berdasarkan index
   * 
   * @param index - Index measure yang akan diupdate
   * @param updates - Partial update untuk measure
   */
  const updateMeasure = useCallback((index: number, updates: Partial<QueryMeasure>) => {
    setQuery(prev => ({
      ...prev,
      measures: prev.measures.map((m, i) => i === index ? { ...m, ...updates } : m),
    }));
  }, []);

  // Filters
  /**
   * Tambahkan filter ke query
   * 
   * @param filter - Filter yang akan ditambahkan
   */
  const addFilter = useCallback((filter: QueryFilter) => {
    setQuery(prev => ({
      ...prev,
      filters: [...prev.filters, filter],
    }));
  }, []);

  /**
   * Hapus filter berdasarkan index
   * 
   * @param index - Index filter yang akan dihapus
   */
  const removeFilter = useCallback((index: number) => {
    setQuery(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  }, []);

  /**
   * Update filter berdasarkan index
   * 
   * @param index - Index filter yang akan diupdate
   * @param updates - Partial update untuk filter
   */
  const updateFilter = useCallback((index: number, updates: Partial<QueryFilter>) => {
    setQuery(prev => ({
      ...prev,
      filters: prev.filters.map((f, i) => i === index ? { ...f, ...updates } : f),
    }));
  }, []);

  // Sorts
  /**
   * Tambahkan sort ke query
   * 
   * @param sort - Sort yang akan ditambahkan
   */
  const addSort = useCallback((sort: QuerySort) => {
    setQuery(prev => ({
      ...prev,
      sorts: [...prev.sorts, sort],
    }));
  }, []);

  /**
   * Hapus sort berdasarkan index
   * 
   * @param index - Index sort yang akan dihapus
   */
  const removeSort = useCallback((index: number) => {
    setQuery(prev => ({
      ...prev,
      sorts: prev.sorts.filter((_, i) => i !== index),
    }));
  }, []);

  // Joins
  /**
   * Toggle join ke/dari query
   * 
   * @param joinKey - Key join yang akan di-toggle
   */
  const toggleJoin = useCallback((joinKey: string) => {
    setQuery(prev => {
      const exists = prev.joins.some(j => j.joinKey === joinKey);
      if (exists) {
        // Remove join and all dimensions/measures/filters from that table
        const joinDef = JOINS.find(j => j.key === joinKey);
        const removedTable = joinDef?.to;
        return {
          ...prev,
          joins: prev.joins.filter(j => j.joinKey !== joinKey),
          dimensions: removedTable ? prev.dimensions.filter(d => d.table !== removedTable) : prev.dimensions,
          measures: removedTable ? prev.measures.filter(m => m.table !== removedTable) : prev.measures,
          filters: removedTable ? prev.filters.filter(f => f.table !== removedTable) : prev.filters,
        };
      } else {
        const joinDef = JOINS.find(j => j.key === joinKey);
        if (!joinDef) return prev;
        return {
          ...prev,
          joins: [...prev.joins, { from: joinDef.from, to: joinDef.to, joinKey }],
        };
      }
    });
  }, []);

  /**
   * Set batas jumlah baris query
   * 
   * @param limit - Jumlah baris maksimum
   */
  const setLimit = useCallback((limit: number) => {
    setQuery(prev => ({ ...prev, limit: Math.min(limit, 5000) }));
  }, []);

  /**
   * Reset query ke default
   */
  const reset = useCallback(() => {
    setQuery({ ...defaultQuery });
  }, []);

  /**
   * Load query lengkap
   * 
   * @param q - Query definition yang akan dimuat
   */
  const loadQuery = useCallback((q: QueryDefinition) => {
    setQuery(q);
  }, []);

  // Derive available tables and fields
  /**
   * Daftar tabel yang tersedia berdasarkan sumber dan joins
   */
  const availableTables = useMemo(() => {
    const tables = [query.source];
    for (const j of query.joins) {
      const joinDef = JOINS.find(jd => jd.key === j.joinKey);
      if (joinDef) tables.push(joinDef.to);
    }
    return [...new Set(tables)];
  }, [query.source, query.joins]);

  /**
   * Daftar field yang tersedia dari semua tabel
   */
  const availableFields = useMemo(() => {
    const fields: Array<{ table: string; field: FieldDef }> = [];
    for (const table of availableTables) {
      for (const f of getFieldsForTable(table)) {
        fields.push({ table, field: f });
      }
    }
    return fields;
  }, [availableTables]);

  /**
   * Daftar joins yang tersedia untuk sumber data saat ini
   */
  const availableJoins = useMemo(() => {
    return getJoinsForSource(query.source);
  }, [query.source]);

  return {
    query,
    setQuery,
    setSource,
    addDimension,
    removeDimension,
    updateDimension,
    addMeasure,
    removeMeasure,
    updateMeasure,
    addFilter,
    removeFilter,
    updateFilter,
    addSort,
    removeSort,
    toggleJoin,
    setLimit,
    reset,
    loadQuery,
    availableTables,
    availableFields,
    availableJoins,
  };
}
