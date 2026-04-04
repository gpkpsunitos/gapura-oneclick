/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi utilitas untuk manajemen state sinkronisasi data
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

/** Source data untuk sinkronisasi laporan */
export const REPORTS_SYNC_SOURCE = 'reports';

/**
 * Record state sinkronisasi data
 * @interface SyncStateRecord
 */
export interface SyncStateRecord {
  /** Sumber data */
  source: string;
  /** Timestamp sinkronisasi terakhir */
  last_sync_at: string | null;
  /** Versi sinkronisasi */
  sync_version: number;
  /** Status sinkronisasi */
  status: string;
  /** Timestamp kedaluwarsa lock */
  locked_until: string | null;
  /** Pesan error terakhir */
  last_error: string | null;
  /** Jumlah baris data */
  row_count: number;
  /** Timestamp update terakhir */
  updated_at: string;
}

/** Row hasil RPC untuk lock sinkronisasi */
interface SyncLockRpcRow extends SyncStateRecord {
  /** Apakah lock berhasil diperoleh */
  acquired: boolean;
}

/**
 * Memastikan record sync state ada untuk source tertentu
 * @param source - Sumber data
 * @returns Promise yang resolve setelah record dibuat jika belum ada
 * @throws Error jika terjadi error database
 * @example
 * ```ts
 * await ensureSyncState('reports');
 * ```
 */
async function ensureSyncState(source: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('sync_state')
    .upsert({ source, status: 'idle' }, { onConflict: 'source', ignoreDuplicates: true });

  if (error) {
    throw error;
  }
}

/**
 * Mengambil state sinkronisasi untuk source tertentu
 * @param source - Sumber data (default: 'reports')
 * @returns Promise yang berisi record sync state
 * @throws Error jika record tidak ditemukan atau terjadi error database
 * @example
 * ```ts
 * const state = await getSyncState('reports');
 * console.log(`Sync version: ${state.sync_version}`);
 * ```
 */
export async function getSyncState(source = REPORTS_SYNC_SOURCE): Promise<SyncStateRecord> {
  await ensureSyncState(source);

  const { data, error } = await supabaseAdmin
    .from('sync_state')
    .select('*')
    .eq('source', source)
    .single();

  if (error || !data) {
    throw error || new Error(`Missing sync_state row for ${source}`);
  }

  return data as SyncStateRecord;
}

/**
 * Mengambil versi sinkronisasi untuk source tertentu
 * @param source - Sumber data (default: 'reports')
 * @returns Promise yang berisi versi sinkronisasi
 * @throws Error jika terjadi error database
 * @example
 * ```ts
 * const version = await getSyncVersion('reports');
 * console.log(`Current version: ${version}`);
 * ```
 */
export async function getSyncVersion(source = REPORTS_SYNC_SOURCE): Promise<number> {
  const state = await getSyncState(source);
  return Number(state.sync_version || 0);
}

/**
 * Mencoba mendapatkan lock untuk sinkronisasi data
 * @param source - Sumber data (default: 'reports')
 * @param lockSeconds - Durasi lock dalam detik (default: 300)
 * @returns Promise yang berisi status lock dan state saat ini
 * @throws Error jika terjadi error database
 * @example
 * ```ts
 * const { acquired, state } = await acquireSyncLock('reports', 60);
 * if (acquired) {
 *   // Lakukan sinkronisasi
 * } else {
 *   console.log('Lock already held by another process');
 * }
 * ```
 */
export async function acquireSyncLock(
  source = REPORTS_SYNC_SOURCE,
  lockSeconds = 300,
): Promise<{ acquired: boolean; state: SyncStateRecord }> {
  const { data, error } = await supabaseAdmin.rpc('acquire_sync_lock', {
    p_source: source,
    p_lock_seconds: lockSeconds,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as SyncLockRpcRow | undefined) : (data as SyncLockRpcRow | null);
  if (!row) {
    const state = await getSyncState(source);
    return { acquired: false, state };
  }

  const { acquired, ...state } = row;
  return { acquired: Boolean(acquired), state };
}

export async function completeSyncState(options: {
  source?: string;
  success: boolean;
  rowCount?: number | null;
  error?: string | null;
  bumpVersion?: boolean;
}): Promise<SyncStateRecord> {
  const { source = REPORTS_SYNC_SOURCE, success, rowCount = null, error = null, bumpVersion = false } = options;

  const { data, error: rpcError } = await supabaseAdmin.rpc('complete_sync_state', {
    p_source: source,
    p_success: success,
    p_row_count: rowCount,
    p_error: error,
    p_bump_version: bumpVersion,
  });

  if (rpcError || !data) {
    throw rpcError || new Error(`Failed to complete sync state for ${source}`);
  }

  return data as SyncStateRecord;
}

export async function bumpSyncVersion(source = REPORTS_SYNC_SOURCE, rowCount?: number | null): Promise<SyncStateRecord> {
  const { data, error } = await supabaseAdmin.rpc('bump_sync_state_version', {
    p_source: source,
    p_row_count: rowCount ?? null,
  });

  if (error || !data) {
    throw error || new Error(`Failed to bump sync version for ${source}`);
  }

  return data as SyncStateRecord;
}
