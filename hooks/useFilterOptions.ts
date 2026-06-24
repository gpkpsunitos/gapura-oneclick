
'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface FilterOptions {

  hubs: string[];

  branches: string[];

  airlines: string[];

  areas: string[];

  isLoading: boolean;
}

export function useFilterOptions(sourceSheet?: 'NON CARGO' | 'CGO'): FilterOptions {
  const { data, isLoading } = useSWR('/api/reports/analytics', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reports = data.reports.filter((r: any) => 
      !sourceSheet || r.source_sheet === sourceSheet
    );

    const hubs = new Set<string>();
    const branches = new Set<string>();
    const airlines = new Set<string>();
    const areas = new Set<string>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
