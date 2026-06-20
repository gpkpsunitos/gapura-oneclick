/**
 * @file
 * 
 * File ini berisi utilitas untuk caching snapshot dashboard di database Supabase
 */

import 'server-only';

import crypto from 'crypto';

import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Entry cache untuk snapshot dashboard
 * @interface DashboardCacheEntry
 */
export interface DashboardCacheEntry<T = unknown> {
  /** Key unik cache */
  cache_key: string;
  /** Key scope untuk identifikasi */
  scope_key: string;
  /** Slug dashboard */
  dashboard_slug: string;
  /** ID tile (opsional) */
  tile_id: string | null;
  /** Payload data yang di-cache */
  payload: T;
  /** Timestamp kedaluwarsa cache */
  expires_at: string;
  /** Versi sinkronisasi data */
  sync_version: number;
  /** Timestamp pembuatan cache */
  created_at: string;
}

/**
 * Membuat hash dari bagian-bagian cache key
 * @param parts - Bagian-bagian untuk di-hash
 * @returns Hash SHA1 dalam bentuk hex string
 * @example
 * ```ts
 * const hash = hashCacheKey({ dashboard: 'irrs', scope: { hub: 'CGK' } });
 * // returns: "a1b2c3d4e5f6..."
 * ```
 */
export function hashCacheKey(parts: unknown): string {
  return crypto.createHash('sha1').update(JSON.stringify(parts)).digest('hex');
}

/**
 * Membaca snapshot dashboard dari cache
 * @param cacheKey - Cache key untuk dicari
 * @param expectedSyncVersion - Versi sinkronisasi yang diharapkan
 * @returns Promise yang berisi cache entry atau null jika tidak ditemukan/kadaluarsa
 * @throws Error jika terjadi error database
 * @example
 * ```ts
 * const snapshot = await readDashboardSnapshot('cache-key-123', 5);
 * if (snapshot) {
 *   console.log(snapshot.payload);
 * }
 * ```
 */
export async function readDashboardSnapshot<T>(
  cacheKey: string,
  expectedSyncVersion: number,
): Promise<DashboardCacheEntry<T> | null> {
  const { data, error } = await supabaseAdmin
    .from('dashboard_cache_entries')
    .select('cache_key, scope_key, dashboard_slug, tile_id, payload, expires_at, sync_version, created_at')
    .eq('cache_key', cacheKey)
    .eq('sync_version', expectedSyncVersion)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as DashboardCacheEntry<T> | null) || null;
}

/**
 * Menulis snapshot dashboard ke cache
 * @param options - Opsi konfigurasi untuk penulisan cache
 * @param options.cacheKey - Cache key unik
 * @param options.scopeKey - Key scope untuk identifikasi
 * @param options.dashboardSlug - Slug dashboard
 * @param options.tileId - ID tile (opsional)
 * @param options.payload - Payload data untuk di-cache
 * @param options.syncVersion - Versi sinkronisasi data
 * @param options.ttlSeconds - Time to live dalam detik (default: 300)
 * @returns Promise yang resolve setelah berhasil menulis cache
 * @throws Error jika terjadi error database
 * @example
 * ```ts
 * await writeDashboardSnapshot({
 *   cacheKey: 'snapshot-123',
 *   scopeKey: 'scope-456',
 *   dashboardSlug: 'irrs',
 *   payload: { data: [...] },
 *   syncVersion: 5,
 *   ttlSeconds: 600
 * });
 * ```
 */
export async function writeDashboardSnapshot(options: {
  cacheKey: string;
  scopeKey: string;
  dashboardSlug: string;
  tileId?: string | null;
  payload: unknown;
  syncVersion: number;
  ttlSeconds?: number;
}): Promise<void> {
  const {
    cacheKey,
    scopeKey,
    dashboardSlug,
    tileId = null,
    payload,
    syncVersion,
    ttlSeconds = 300,
  } = options;

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from('dashboard_cache_entries')
    .upsert(
      {
        cache_key: cacheKey,
        scope_key: scopeKey,
        dashboard_slug: dashboardSlug,
        tile_id: tileId,
        payload,
        expires_at: expiresAt,
        sync_version: syncVersion,
      },
      { onConflict: 'cache_key', ignoreDuplicates: false },
    );

  if (error) {
    throw error;
  }
}

/**
 * Menghapus snapshot cache dashboard berdasarkan kriteria
 * @param options - Opsi filter untuk penghapusan
 * @param options.dashboardSlug - Slug dashboard untuk dihapus (opsional)
 * @param options.maxSyncVersion - Hapus cache dengan sync version lebih kecil dari ini (opsional)
 * @returns Promise yang resolve setelah berhasil menghapus cache
 * @throws Error jika terjadi error database
 * @example
 * ```ts
 * // Hapus semua cache untuk dashboard tertentu
 * await purgeDashboardSnapshots({ dashboardSlug: 'irrs' });
 * 
 * // Hapus cache dengan sync version lama
 * await purgeDashboardSnapshots({ maxSyncVersion: 5 });
 * ```
 */
export async function purgeDashboardSnapshots(options?: {
  dashboardSlug?: string;
  maxSyncVersion?: number;
}): Promise<void> {
  let query = supabaseAdmin.from('dashboard_cache_entries').delete();

  if (options?.dashboardSlug) {
    query = query.eq('dashboard_slug', options.dashboardSlug);
  }

  if (typeof options?.maxSyncVersion === 'number') {
    query = query.lt('sync_version', options.maxSyncVersion);
  }

  const { error } = await query;
  if (error) {
    throw error;
  }
}

/**
 * Menghapus semua snapshot cache dashboard yang sudah kedaluwarsa
 * @returns Promise yang resolve setelah berhasil menghapus cache kadaluarsa
 * @throws Error jika terjadi error database
 * @example
 * ```ts
 * await purgeExpiredDashboardSnapshots();
 * console.log('Expired caches cleaned up');
 * ```
 */
export async function purgeExpiredDashboardSnapshots(): Promise<void> {
  const { error } = await supabaseAdmin
    .from('dashboard_cache_entries')
    .delete()
    .lte('expires_at', new Date().toISOString());

  if (error) {
    throw error;
  }
}
