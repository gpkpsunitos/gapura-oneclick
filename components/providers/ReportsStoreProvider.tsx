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

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
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

export function useReportsStore(): ReportsStoreContextValue {
  const ctx = useContext(ReportsStoreContext);
  if (!ctx) {
    throw new Error('useReportsStore must be used within ReportsStoreProvider');
  }
  return ctx;
}

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

  const fetchAndCache = useCallback(async () => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;

    try {
      const res = await fetch(WARM_ENDPOINT, { credentials: 'same-origin' });
      if (!res.ok) {
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
    } finally {
      fetchInFlight.current = false;
      // Clear loading on every path: a non-OK response or thrown error used to
      // leave isLoading=true forever (infinite spinner on cold cache + transient fail).
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const cached = await getReportsCache(userId);

      if (cached && !cancelled) {

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

          setReports(cached.data);
          setCacheVersion(cached.cacheVersion);
          setLastUpdated(cached.timestamp);
          setIsStale(true);
          setIsLoading(false);
        } else {

          await clearReportsCache();
        }
      }

      if (!cancelled) {
        await fetchAndCache();
      }
    }

    hydrate();

    return () => { cancelled = true; };
  }, [userId, fetchAndCache]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchAndCache();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAndCache]);

  useEffect(() => {
    const handleBeforeUnload = () => {

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
