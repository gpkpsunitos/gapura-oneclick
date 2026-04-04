/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi fungsi untuk mencatat aksi yang terkait dengan keamanan ke audit trail
 */

import { createClient } from '@/lib/supabase-admin';

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
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    try {
        const { error } = await supabase
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
