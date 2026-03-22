import { createClient } from '@/lib/supabase-admin';

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
 * Log a security-related action to the audit trail.
 * Aligned with database schema: actor_id, entity_type, etc.
 * Complexity: Time O(1) | Space O(1)
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
