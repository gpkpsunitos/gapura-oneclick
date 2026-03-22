import useSWR, { SWRConfiguration } from 'swr';
import { fetchWithDemo } from './utils';

const fetcher = async (url: string) => {
  const res = await fetchWithDemo(url);
  if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
  return res.json();
};

/**
 * SWR hook with sensible defaults for IRRS dashboards.
 * - Deduplicates concurrent identical requests
 * - Stale-while-revalidate on client side
 * - Reduces re-fetches on navigation
 */
export function useData<T = unknown>(
  url: string | null,
  options?: SWRConfiguration
) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30s dedup window
    ...options,
  });
}

/**
 * SWR hook for data that rarely changes (master data, filter options).
 */
export function useStaticData<T = unknown>(
  url: string | null,
  options?: SWRConfiguration
) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000, // 5min dedup
    revalidateIfStale: false,
    ...options,
  });
}
