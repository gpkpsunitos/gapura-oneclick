/**
 * @file
 * 
 * File ini berisi fungsi untuk mencatat aksi yang terkait dengan keamanan ke audit trail
 */

// [FIX] Import the shared singleton admin client instead of the `createClient`
// factory. Previously, `createClient()` was called inside `logSecurityAudit()`
// on EVERY invocation, creating a new Supabase client (with its own HTTP
// connection pool, auth state, and real-time channel) each time. These were
// never explicitly closed, causing connection/resource accumulation under
// high audit traffic.
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Entri audit log
 */
export interface AuditEntry {
    actorId: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Mencatat aksi yang terkait dengan keamanan ke audit trail
 * Selaras dengan skema database: actor_id, entity_type, dll
 * Kompleksitas: Waktu O(1) | Ruang O(1)
 * @param {AuditEntry} entry - Data entri audit
 * @returns {Promise<void>}
 * @example
 * ```ts
 * await logSecurityAudit({
 *   actorId: 'user-123',
 *   action: 'UPDATE',
 *   entityType: 'Report',
 *   entityId: 'report-456',
 *   oldValue: { status: 'OPEN' },
 *   newValue: { status: 'CLOSED' },
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...'
 * });
 * ```
 */
export async function logSecurityAudit(entry: AuditEntry) {
    // [FIX] Use the module-level `supabaseAdmin` singleton instead of
    // creating a new client on every call. One client = one connection pool,
    // properly reused across all audit log writes.
    try {
        const { error } = await supabaseAdmin
            .from('audit_logs')
            .insert({
                actor_id: entry.actorId,
                action: entry.action,
                entity_type: entry.entityType,
                entity_id: entry.entityId,
                old_value: entry.oldValue,
                new_value: entry.newValue,
                ip_address: entry.ipAddress,
                user_agent: entry.userAgent,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('[AUDIT_LOG_ERROR]', error);
        }
    } catch (e) {
        console.error('[AUDIT_LOG_CRITICAL]', e);
    }
}
