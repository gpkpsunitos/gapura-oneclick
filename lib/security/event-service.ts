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

// [FIX] Throttle detection engine invocations.
// Previously, every `logSecurityEvent()` call fired a `process.nextTick()`
// that triggered `DetectionEngine.analyze()`. Under burst traffic (e.g.,
// a brute-force attack generating hundreds of events/sec), this would
// queue an unbounded number of nextTick callbacks, each holding a reference
// to the event array and engine instance, preventing GC.
//
// We now batch events in a micro-buffer and flush at most once per tick.
let pendingEvents: SecurityEvent[] = [];
let flushScheduled = false;

function scheduleDetectionFlush(): void {
    if (flushScheduled) return;
    flushScheduled = true;
    process.nextTick(() => {
        flushScheduled = false;
        const events = pendingEvents;
        pendingEvents = [];
        if (events.length > 0) {
            DetectionEngine.getInstance().analyze(events).catch(err =>
                console.error('[SECURITY EVENT SERVICE] Detection trigger failure:', err)
            );
        }
    });
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

        // [FIX] Batch the event into the micro-buffer instead of firing
        // a separate process.nextTick for each event. The flush function
        // (scheduled once per tick) will send all accumulated events to
        // the detection engine in a single `.analyze()` call.
        const event: SecurityEvent = {
            id: 'internal', // Placeholder
            ...params,
            created_at: new Date().toISOString()
        };

        pendingEvents.push(event);
        scheduleDetectionFlush();

    } catch (err) {
        console.error('[SECURITY EVENT SERVICE] Critical failure:', err);
    }
}
