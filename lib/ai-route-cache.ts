/**
 * @file
 * 
 * File ini berisi utilitas untuk caching respon AI dengan deduplikasi
 * request yang sedang berjalan dan fallback ke data stale
 */

import 'server-only';

import { buildAICacheKey, buildAICacheScopeHash, findLatestAICache, readAICache, writeAICache } from '@/lib/ai-cache';
import { getSyncState } from '@/lib/sync-state';

/**
 * Hasil cache untuk respon AI
 * @interface CacheResult
 */
type CacheResult<T> = {
  /** Payload hasil dari AI */
  payload: T;
  /** Apakah hasil diambil dari cache */
  cached: boolean;
  /** Timestamp saat payload dibuat */
  generatedAt: string;
  /** Timestamp sinkronisasi sumber data */
  sourceSyncAt: string | null;
  /** Apakah cache sudah kadaluarsa */
  stale: boolean;
};

/** Map untuk menyimpan request yang sedang berjalan */
const inflightRequests = new Map<string, Promise<CacheResult<unknown>>>();

/**
 * Mengambil atau membuat cache untuk respon AI
 * @param options - Opsi konfigurasi untuk caching
 * @param options.feature - Nama fitur untuk identifikasi cache
 * @param options.scope - Scope data untuk pembuatan cache key
 * @param options.resolver - Fungsi untuk generate data jika cache tidak tersedia
 * @param options.allowStaleFallback - Menggunakan data stale jika generate gagal (default: true)
 * @param options.extraMetadata - Metadata tambahan untuk disimpan di cache
 * @returns Promise yang berisi hasil cache dengan status
 * @example
 * ```ts
 * const result = await resolveCachedAI({
 *   feature: 'dashboard-summary',
 *   scope: { userId: '123', dateRange: '2024' },
 *   resolver: async ({ syncVersion }) => {
 *     return await generateSummary(syncVersion);
 *   }
 * });
 * ```
 */
export async function resolveCachedAI<T>(options: {
  feature: string;
  scope: unknown;
  resolver: (context: { syncVersion: number; sourceSyncAt: string | null }) => Promise<T>;
  allowStaleFallback?: boolean;
  extraMetadata?: Record<string, unknown>;
}): Promise<CacheResult<T>> {
  const { feature, scope, resolver, allowStaleFallback = true, extraMetadata = {} } = options;
  const syncState = await getSyncState('reports');
  const syncVersion = Number(syncState.sync_version || 0);
  const sourceSyncAt = syncState.last_sync_at || null;
  const cacheKey = buildAICacheKey(feature, scope, syncVersion);

  const cached = await readAICache<T>(cacheKey);
  if (cached) {
    return {
      payload: cached.payload,
      cached: true,
      generatedAt: cached.generatedAt,
      sourceSyncAt: cached.sourceSyncAt,
      stale: cached.stale,
    };
  }

  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)! as Promise<CacheResult<T>>;
  }

  const scopeHash = buildAICacheScopeHash(scope);
  const request = (async () => {
    try {
      const payload = await resolver({ syncVersion, sourceSyncAt });
      const generatedAt = new Date().toISOString();
      await writeAICache({
        cacheKey,
        feature,
        payload,
        sourceSyncAt,
        syncVersion,
        stale: false,
        extraMetadata,
      });

      return {
        payload,
        cached: false,
        generatedAt,
        sourceSyncAt,
        stale: false,
      };
    } catch (error) {
      if (allowStaleFallback) {
        const fallback = await findLatestAICache<T>(feature, scopeHash);
        if (fallback) {
          return {
            payload: fallback.payload,
            cached: true,
            generatedAt: fallback.generatedAt,
            sourceSyncAt: fallback.sourceSyncAt,
            stale: true,
          };
        }
      }
      throw error;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, request as Promise<CacheResult<unknown>>);
  return request;
}
