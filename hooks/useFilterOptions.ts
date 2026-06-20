/**
 * @file
 * 
 * File ini berisi hook React untuk mengambil opsi filter dari data laporan
 */

'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

// Complexity: Time O(N) | Space O(K) where N is number of reports
/**
 * Fetcher untuk mengambil data dari API
 * @param url - URL endpoint
 * @returns Promise yang berisi data JSON
 */
const fetcher = (url: string) => fetch(url).then(r => r.json());

/**
 * Opsi filter untuk dashboard
 * @interface FilterOptions
 */
interface FilterOptions {
  /** Daftar hub yang tersedia */
  hubs: string[];
  /** Daftar branch yang tersedia */
  branches: string[];
  /** Daftar airline yang tersedia */
  airlines: string[];
  /** Daftar area yang tersedia */
  areas: string[];
  /** Status loading data */
  isLoading: boolean;
}

/**
 * Hook untuk mengambil opsi filter dari analytics laporan
 * @param sourceSheet - Filter source sheet ('NON CARGO' atau 'CGO')
 * @returns Object berisi opsi filter dan status loading
 * @example
 * ```tsx
 * const { hubs, branches, airlines, areas, isLoading } = useFilterOptions('NON CARGO');
 * if (isLoading) return <Loading />;
 * return <FilterDropdown options={hubs} />;
 * ```
 */
export function useFilterOptions(sourceSheet?: 'NON CARGO' | 'CGO'): FilterOptions {
  const { data, isLoading } = useSWR('/api/reports/analytics', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });

  const options = useMemo(() => {
    if (!data?.reports || !Array.isArray(data.reports)) {
      return {
        hubs: [],
        branches: [],
        airlines: [],
        areas: [],
      };
    }

    const reports = data.reports.filter((r: any) => 
      !sourceSheet || r.source_sheet === sourceSheet
    );

    const hubs = new Set<string>();
    const branches = new Set<string>();
    const airlines = new Set<string>();
    const areas = new Set<string>();

    reports.forEach((r: any) => {
      if (r.hub) hubs.add(String(r.hub).trim());
      if (r.branch) branches.add(String(r.branch).trim());
      if (r.airlines) airlines.add(String(r.airlines).trim());
      else if (r.airline) airlines.add(String(r.airline).trim());
      if (r.area) areas.add(String(r.area).trim());
    });

    return {
      hubs: Array.from(hubs).sort(),
      branches: Array.from(branches).sort(),
      airlines: Array.from(airlines).sort(),
      areas: Array.from(areas).sort(),
    };
  }, [data, sourceSheet]);

  return {
    ...options,
    isLoading,
  };
}
