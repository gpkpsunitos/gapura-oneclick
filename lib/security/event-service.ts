/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi layanan untuk mencatat event keamanan dari dalam logika sistem
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { SecurityEvent, SecuritySeverity } from '@/types/security';
import { DetectionEngine } from './detection-engine';

/**
 * Parameter untuk log event keamanan
 */
interface SecurityEventParams {
    source: string;
    event_type: 'login' | 'traffic' | 'access' | 'anomaly';
    severity: SecuritySeverity;
    payload: Record<string, unknown>;
    ip_address?: string;
    actor_id?: string;
}

/**
 * Mencatat event keamanan dari dalam logika sistem
 * Mendekoupling logika dari persistensi/analisis
 * @param {SecurityEventParams} params - Parameter event keamanan
 * @returns {Promise<void>}
 * @example
 * ```ts
 * await logSecurityEvent({
 *   source: 'auth-service',
 *   event_type: 'login',
 *   severity: 'MEDIUM',
 *   payload: { success: true },
 *   ip_address: '192.168.1.1',
 *   actor_id: 'user-123'
 * });
 * ```
 */
export async function logSecurityEvent(params: SecurityEventParams) {
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
