/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi utilitas untuk caching respon AI di database Supabase
 */

import 'server-only';

import crypto from 'crypto';

import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Envelope cache untuk menyimpan payload AI dengan metadata
 * @interface AICacheEnvelope
 */
export interface AICacheEnvelope<T = unknown> {
  /** Payload hasil dari AI */
  payload: T;
  /** Timestamp saat payload dibuat */
  generatedAt: string;
  /** Timestamp sinkronisasi sumber data */
  sourceSyncAt: string | null;
  /** Versi sinkronisasi data */
  syncVersion: number;
  /** Apakah cache sudah kadaluarsa */
  stale: boolean;
}

/**
 * Membuat hash dari scope untuk digunakan sebagai bagian dari cache key
 * @param scope - Objek scope untuk di-hash
 * @returns Hash SHA1 dalam bentuk hex string
 * @example
 * ```ts
 * const hash = buildAICacheScopeHash({ userId: '123', type: 'report' });
 * // returns: "a1b2c3d4e5f6..."
 * ```
 */
export function buildAICacheScopeHash(scope: unknown): string {
  return crypto.createHash('sha1').update(JSON.stringify(scope)).digest('hex');
}

/**
 * Membuat cache key unik untuk entry AI cache
 * @param feature - Nama fitur
 * @param scope - Objek scope untuk identifikasi
 * @param syncVersion - Versi sinkronisasi data
 * @returns Cache key dalam format "feature:syncVersion:scopeHash"
 * @example
 * ```ts
 * const key = buildAICacheKey('dashboard', { userId: '123' }, 5);
 * // returns: "dashboard:5:a1b2c3d4e5f6..."
 * ```
 */
export function buildAICacheKey(feature: string, scope: unknown, syncVersion: number): string {
  const scopeHash = buildAICacheScopeHash(scope);
  return `${feature}:${syncVersion}:${scopeHash}`;
}

/**
 * Membaca cache AI dari database berdasarkan cache key
 * @param cacheKey - Cache key untuk dicari
 * @returns Promise yang berisi cache envelope atau null jika tidak ditemukan
 * @throws Error jika terjadi error database
 * @example
 * ```ts
 * const cached = await readAICache('dashboard:5:a1b2c3');
 * if (cached) {
 *   console.log(cached.payload);
 * }
 * ```
 */
export async function readAICache<T>(cacheKey: string): Promise<AICacheEnvelope<T> | null> {
  const { data, error } = await supabaseAdmin
    .from('ai_cache_entries')
    .select('cache_key, insights, metadata, created_at')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const metadata = (data.metadata || {}) as Record<string, unknown>;
  return {
    payload: data.insights as T,
    generatedAt: String(metadata.generatedAt || data.created_at),
    sourceSyncAt: metadata.sourceSyncAt ? String(metadata.sourceSyncAt) : null,
    syncVersion: Number(metadata.syncVersion || 0),
    stale: Boolean(metadata.stale),
  };
}

/**
 * Mencari cache AI terbaru untuk suatu fitur
 * @param feature - Nama fitur untuk dicari
 * @param scopeHashPrefix - Prefix hash scope untuk filter lebih spesifik (opsional)
 * @returns Promise yang berisi cache envelope terbaru atau null jika tidak ditemukan
 * @throws Error jika terjadi error database
 * @example
 * ```ts
 * const latest = await findLatestAICache('dashboard');
 * if (latest) {
 *   console.log('Latest cached data:', latest.payload);
 * }
 * ```
 */
export async function findLatestAICache<T>(feature: string, scopeHashPrefix?: string): Promise<AICacheEnvelope<T> | null> {
  let query = supabaseAdmin
    .from('ai_cache_entries')
    .select('cache_key, insights, metadata, created_at')
    .ilike('cache_key', `${feature}:%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (scopeHashPrefix) {
    query = query.ilike('cache_key', `${feature}:%:${scopeHashPrefix}`);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0];
  const metadata = (row.metadata || {}) as Record<string, unknown>;

  return {
    payload: row.insights as T,
    generatedAt: String(metadata.generatedAt || row.created_at),
    sourceSyncAt: metadata.sourceSyncAt ? String(metadata.sourceSyncAt) : null,
    syncVersion: Number(metadata.syncVersion || 0),
    stale: true,
  };
}

/**
 * Menulis cache AI ke database
 * @param options - Opsi konfigurasi untuk penulisan cache
 * @param options.cacheKey - Cache key unik
 * @param options.feature - Nama fitur
 * @param options.payload - Payload data untuk di-cache
 * @param options.sourceSyncAt - Timestamp sinkronisasi sumber data
 * @param options.syncVersion - Versi sinkronisasi data
 * @param options.stale - Apakah cache ditandai sebagai kadaluarsa (default: false)
 * @param options.extraMetadata - Metadata tambahan untuk disimpan
 * @returns Promise yang resolve setelah berhasil menulis cache
 * @throws Error jika terjadi error database
 * @example
 * ```ts
 * await writeAICache({
 *   cacheKey: 'dashboard:5:a1b2c3',
 *   feature: 'dashboard',
 *   payload: { summary: '...' },
 *   sourceSyncAt: '2024-01-01T00:00:00Z',
 *   syncVersion: 5
 * });
 * ```
 */
export async function writeAICache<T>(options: {
  cacheKey: string;
  feature: string;
  payload: T;
  sourceSyncAt: string | null;
  syncVersion: number;
  stale?: boolean;
  extraMetadata?: Record<string, unknown>;
}): Promise<void> {
  const {
    cacheKey,
    feature,
    payload,
    sourceSyncAt,
    syncVersion,
    stale = false,
    extraMetadata = {},
  } = options;

  const generatedAt = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('ai_cache_entries')
    .upsert(
      {
        cache_key: cacheKey,
        insights: payload,
        metadata: {
          feature,
          generatedAt,
          sourceSyncAt,
          syncVersion,
          stale,
          ...extraMetadata,
        },
      },
      { onConflict: 'cache_key', ignoreDuplicates: false },
    );

  if (error) {
    throw error;
  }
}
