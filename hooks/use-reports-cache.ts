
import useSWR, { SWRConfiguration } from 'swr';
import { Report } from '@/types';
import { useEffect, useState } from 'react';
import { buildPwaScopedStorageKey } from '@/lib/pwa/client-state';

const STORAGE_KEY = 'reports-cache-v3';

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

// Persist off the render/interaction path: serializing megabytes of reports
// into localStorage is synchronous and would otherwise land right when the
// page becomes interactive.
function persistWhenIdle(key: string, data: Report[]) {
  const write = () => {
    const serialized = JSON.stringify({ data, timestamp: Date.now() });
    try {
      localStorage.setItem(key, serialized);
    } catch {
      try {
        for (let i = localStorage.length - 1; i >= 0; i -= 1) {
          const k = localStorage.key(i);
          if (k && k.includes(STORAGE_KEY)) localStorage.removeItem(k);
        }
        localStorage.setItem(key, serialized);
      } catch {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[use-reports-cache] localStorage full; skipping persist');
        }
      }
    }
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(write, { timeout: 5000 });
  } else {
    setTimeout(write, 500);
  }
}

export function useReportsData(url: string = '/api/reports', options?: SWRConfiguration) {
  const STORAGE_KEY_WITH_URL =
    typeof window !== 'undefined'
      ? buildPwaScopedStorageKey(`${STORAGE_KEY}:${url}`)
      : `${STORAGE_KEY}:${url}`;
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const { data, error, isLoading, mutate, isValidating } = useSWR<Report[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60,
      onSuccess: (newData) => {
        if (typeof window !== 'undefined') {
          setLastUpdated(Date.now());
          persistWhenIdle(STORAGE_KEY_WITH_URL, newData);
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
           if (parsed.timestamp) setLastUpdated(parsed.timestamp);
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
    lastUpdated,
  };
}
