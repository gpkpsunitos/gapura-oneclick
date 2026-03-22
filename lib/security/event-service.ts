import { supabaseAdmin } from '@/lib/supabase-admin';
import { SecurityEvent, SecuritySeverity } from '@/types/security';
import { DetectionEngine } from './detection-engine';

/**
 * Log a security event from within the system logic.
 * Decouples logic from persistence/analysis.
 */
export async function logSecurityEvent(params: {
    source: string;
    event_type: 'login' | 'traffic' | 'access' | 'anomaly';
    severity: SecuritySeverity;
    payload: Record<string, unknown>;
    ip_address?: string;
    actor_id?: string;
}) {
    try {
        const { error } = await supabaseAdmin
            .from('security_events')
            .insert([{
                ...params,
                created_at: new Date().toISOString()
            }]);

        if (error) {
            console.error('[SECURITY EVENT SERVICE] Persistence error:', error);
            return;
        }

        // Trigger real-time detection
        // We cast to SecurityEvent for the internal engine
        const event: SecurityEvent = {
            id: 'internal', // Placeholder
            ...params,
            created_at: new Date().toISOString()
        };

        process.nextTick(() => {
            DetectionEngine.getInstance().analyze([event]).catch(err => 
                console.error('[SECURITY EVENT SERVICE] Detection trigger failure:', err)
            );
        });

    } catch (err) {
        console.error('[SECURITY EVENT SERVICE] Critical failure:', err);
    }
}
