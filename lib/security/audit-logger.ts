
import { supabaseAdmin } from '@/lib/supabase-admin';

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

export async function logSecurityAudit(entry: AuditEntry) {

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
