'use client';

import { Report } from '@/types';
import { QueryDefinition } from '@/types/builder';
import { processQuery } from '@/lib/engine/query-processor';
import { buildPwaScopedStorageKey } from '@/lib/pwa/client-state';

const CACHE_KEY = 'gapura_reports_cache_v2';
const META_KEY = 'gapura_reports_meta_v2';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

interface CacheMeta {
  timestamp: number;
  count: number;
  version: string;
}

class ClientReportsService {
  private static instance: ClientReportsService;
  private memoryCache: Report[] | null = null;
  private pendingPromise: Promise<Report[]> | null = null;

  private constructor() {}

  static getInstance(): ClientReportsService {
    if (!ClientReportsService.instance) {
      ClientReportsService.instance = new ClientReportsService();
    }
    return ClientReportsService.instance;
  }

  async getReports(forceRefresh = false): Promise<Report[]> {
    if (typeof window === 'undefined') return [];

    // Deduplicate concurrent requests
    if (this.pendingPromise) {
      return this.pendingPromise;
    }

    // 1. Check memory cache
    if (!forceRefresh && this.memoryCache) {
      return this.memoryCache;
    }

    // 2. Check local storage
    if (!forceRefresh) {
      const cached = this.loadFromStorage();
      if (cached) {
        this.memoryCache = cached;
        // Background refresh if older than 5 mins but less than 15?
        // For now, strict expiration
        return cached;
      }
    }

    // 3. Fetch from API
    this.pendingPromise = (async () => {
      try {

        const response = await fetch('/api/reports/sync');
        if (!response.ok) throw new Error('Failed to sync reports');
        
        const data = await response.json();
        const reports = data.reports as Report[];
        
        this.saveToStorage(reports);
        this.memoryCache = reports;
        
        return reports;
      } catch (err) {

        // Fallback to stale cache if available
        const stale = this.loadFromStorage(true);
        if (stale) {

          this.memoryCache = stale;
          return stale;
        }
        throw err;
      } finally {
        this.pendingPromise = null;
      }
    })();

    return this.pendingPromise;
  }

  async executeQuery(query: QueryDefinition) {
    const reports = await this.getReports();
    return processQuery(query, reports);
  }
  
  private saveToStorage(reports: Report[]) {
    if (typeof window === 'undefined') return;
    try {
      const scopedCacheKey = buildPwaScopedStorageKey(CACHE_KEY);
      const scopedMetaKey = buildPwaScopedStorageKey(META_KEY);
      const serialized = JSON.stringify(reports);
      localStorage.setItem(scopedCacheKey, serialized);
      
      const meta: CacheMeta = {
        timestamp: Date.now(),
        count: reports.length,
        version: '2.0'
      };
      localStorage.setItem(scopedMetaKey, JSON.stringify(meta));
    } catch (e) {

      // Strategy: maybe clear other keys or warn user
    }
  }
  
  private loadFromStorage(ignoreExpiration = false): Report[] | null {
    if (typeof window === 'undefined') return null;
    try {
      const scopedMetaKey = buildPwaScopedStorageKey(META_KEY);
      const scopedCacheKey = buildPwaScopedStorageKey(CACHE_KEY);
      const metaStr = localStorage.getItem(scopedMetaKey);
      if (!metaStr) return null;
      
      const meta: CacheMeta = JSON.parse(metaStr);
      const now = Date.now();
      
      if (!ignoreExpiration && (now - meta.timestamp > CACHE_DURATION)) {

        return null; // Expired
      }
      
      const dataStr = localStorage.getItem(scopedCacheKey);
      if (!dataStr) return null;
      
      return JSON.parse(dataStr);
    } catch (e) {

      return null;
    }
  }
  
  clearCache() {
    this.memoryCache = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(buildPwaScopedStorageKey(CACHE_KEY));
      localStorage.removeItem(buildPwaScopedStorageKey(META_KEY));
    }
  }
}

export const clientReportsService = ClientReportsService.getInstance();
