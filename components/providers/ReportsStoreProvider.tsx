'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Report } from '@/types';
import {
  getReportsCache,
  setReportsCache,
  clearReportsCache,
  isCacheStale,
  verifyCacheIntegrity,
} from '@/lib/stores/reports-store';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 min background refresh
const WARM_ENDPOINT = '/api/reports/warm';

interface WarmResponse {
  reports: Report[];
  cacheVersion: number;
  integrity: string;
  userId: string;
  timestamp: number;
}

interface ReportsStoreContextValue {
  reports: Report[];
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: number | null;
  cacheVersion: number;
  refresh: () => Promise<void>;
}

const ReportsStoreContext = createContext<ReportsStoreContextValue | null>(null);

// Complexity: Time O(1) | Space O(1)
export function useReportsStore(): ReportsStoreContextValue {
  const ctx = useContext(ReportsStoreContext);
  if (!ctx) {
    throw new Error('useReportsStore must be used within ReportsStoreProvider');
  }
  return ctx;
}

// Optional hook that returns null when provider absent (backward compat)
// Complexity: Time O(1) | Space O(1)
export function useReportsStoreOptional(): ReportsStoreContextValue | null {
  return useContext(ReportsStoreContext);
}

interface ProviderProps {
  userId: string;
  children: React.ReactNode;
}

export function ReportsStoreProvider({ userId, children }: ProviderProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [cacheVersion, setCacheVersion] = useState(0);
  const fetchInFlight = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch from warm endpoint → store in IndexedDB → update state
  // Complexity: Time O(N) | Space O(N)
  const fetchAndCache = useCallback(async () => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;

    try {
      const res = await fetch(WARM_ENDPOINT, { credentials: 'same-origin' });
      if (!res.ok) {
        console.warn(`[ReportsStore] Warm fetch failed: ${res.status}`);
        return;
      }

      const payload: WarmResponse = await res.json();

      setReports(payload.reports);
      setCacheVersion(payload.cacheVersion);
      setLastUpdated(payload.timestamp);
      setIsStale(false);
      setIsLoading(false);

      await setReportsCache(
        payload.reports,
        payload.cacheVersion,
        payload.integrity,
        payload.userId
      );
    } catch (err) {
      console.warn('[ReportsStore] Warm fetch error:', err);
    } finally {
      fetchInFlight.current = false;
    }
  }, []);

  // Hydrate from IndexedDB on mount, then fetch if stale/empty
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const cached = await getReportsCache(userId);

      if (cached && !cancelled) {
        // Verify integrity before trusting cached data
        const valid = await verifyCacheIntegrity(cached.data, cached.integrity);

        if (valid && !isCacheStale(cached.timestamp)) {
          setReports(cached.data);
          setCacheVersion(cached.cacheVersion);
          setLastUpdated(cached.timestamp);
          setIsStale(false);
          setIsLoading(false);
          return;
        }

        if (valid) {
          // Stale but intact — show immediately, refresh in background
          setReports(cached.data);
          setCacheVersion(cached.cacheVersion);
          setLastUpdated(cached.timestamp);
          setIsStale(true);
          setIsLoading(false);
        } else {
          // Corrupted — discard
          await clearReportsCache();
        }
      }

      // Cache empty, corrupt, or stale → fetch fresh
      if (!cancelled) {
        await fetchAndCache();
      }
    }

    hydrate();

    return () => { cancelled = true; };
  }, [userId, fetchAndCache]);

  // Background refresh interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchAndCache();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAndCache]);

  // Clear cache on unmount (e.g., logout navigation)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // No-op — Clear-Site-Data header on logout handles this
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchAndCache();
  }, [fetchAndCache]);

  const value = useMemo<ReportsStoreContextValue>(() => ({
    reports,
    isLoading,
    isStale,
    lastUpdated,
    cacheVersion,
    refresh,
  }), [reports, isLoading, isStale, lastUpdated, cacheVersion, refresh]);

  return (
    <ReportsStoreContext.Provider value={value}>
      {children}
    </ReportsStoreContext.Provider>
  );
}
