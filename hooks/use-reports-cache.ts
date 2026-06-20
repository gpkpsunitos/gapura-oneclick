
import useSWR, { SWRConfiguration } from 'swr';
import { Report } from '@/types';
import { useEffect, useState } from 'react';
import { buildPwaScopedStorageKey } from '@/lib/pwa/client-state';
import { useReportsStoreOptional } from '@/components/providers/ReportsStoreProvider';

const STORAGE_KEY = 'reports-cache-v3';

interface CacheData {
  data: Report[];
  timestamp: number;
}

// Complexity: Time O(1) | Space O(N)
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch reports');
  const payload = await res.json();
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.reports)) {
    return payload.reports;
  }
  return [];
};

interface UseReportsOptions extends SWRConfiguration {
  useStore?: boolean;
}

// Complexity: Time O(1) | Space O(N)
export function useReportsData(url: string = '/api/reports', options?: UseReportsOptions) {
  const { useStore = false, ...swrOptions } = options || {};
  const store = useReportsStoreOptional();

  // Fast path: consume from centralized ReportsStoreProvider if available and requested
  if (useStore && store) {
    return {
      reports: store.reports,
      isLoading: store.isLoading,
      isError: undefined,
      isValidating: false,
      isOffline: false,
      refresh: store.refresh,
      lastUpdated: store.lastUpdated,
    };
  }

  // Fallback: independent SWR fetch (backward compat)
  return useReportsDataSWR(url, swrOptions);
}

function useReportsDataSWR(url: string, options?: SWRConfiguration) {
  const STORAGE_KEY_WITH_URL =
    typeof window !== 'undefined'
      ? buildPwaScopedStorageKey(`${STORAGE_KEY}:${url}`)
      : `${STORAGE_KEY}:${url}`;
  const [isOffline, setIsOffline] = useState(false);
  
  const { data, error, isLoading, mutate, isValidating } = useSWR<Report[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60,
      onSuccess: (newData) => {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_KEY_WITH_URL, JSON.stringify({
              data: newData,
              timestamp: Date.now()
            }));
          } catch (err) {
            // ponytail: localStorage has a ~5 MB cap; the reports payload can
            // outgrow it as branches accumulate data. Best-effort: drop this
            // key (and any sibling reports caches) and retry once. If that
            // still fails, give up — SWR's in-memory cache covers this tab.
            try {
              localStorage.removeItem(STORAGE_KEY_WITH_URL);
              for (let i = localStorage.length - 1; i >= 0; i -= 1) {
                const k = localStorage.key(i);
                if (k && k.includes(STORAGE_KEY)) localStorage.removeItem(k);
              }
              localStorage.setItem(STORAGE_KEY_WITH_URL, JSON.stringify({
                data: newData,
                timestamp: Date.now()
              }));
            } catch {
              if (process.env.NODE_ENV !== 'production') {
                console.warn('[use-reports-cache] localStorage full; skipping persist', err);
              }
            }
          }
          setIsOffline(false);
        }
      },
      onError: (err) => {
        console.error('SWR Fetch Error:', err);
        if (!navigator.onLine) {
          setIsOffline(true);
        }
      },
      ...options
    }
  );

  useEffect(() => {
      const local = localStorage.getItem(STORAGE_KEY_WITH_URL);
      if (local && !data) {
        try {
           const parsed = JSON.parse(local);
           mutate(parsed.data, false); 
        } catch(e) {}
      }
  }, [url]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    reports: data || [],
    isLoading,
    isError: error,
    isValidating,
    isOffline,
    refresh: () => mutate(),
    lastUpdated: typeof window !== 'undefined' ? 
      (JSON.parse(localStorage.getItem(STORAGE_KEY_WITH_URL) || 'null')?.timestamp || null) : null
  };
}

