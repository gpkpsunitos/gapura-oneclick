import { SecurityEvent, SecurityAlert } from '@/types/security';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Real-Time Security Detection Engine
 * Implements ML-lite behavioral analysis and rule-based heuristics.
 * Complexity: Analysis O(1) per event | Persistence O(1)
 */
export class DetectionEngine {
    private static INSTANCE: DetectionEngine;
    private eventWindow: SecurityEvent[] = [];
    private WINDOW_SIZE = 1000;
    
    // Incremental Stats for O(1) Z-Score
    private trafficStats = { count: 0, sum: 0, sumSq: 0 };
    // Per-IP failure windows for O(K) brute force (K = failures in 30s)
    private ipFailures = new Map<string, number[]>();

    public static getInstance(): DetectionEngine {
        if (!DetectionEngine.INSTANCE) {
            DetectionEngine.INSTANCE = new DetectionEngine();
        }
        return DetectionEngine.INSTANCE;
    }

    /**
     * Process an incoming stream of events and detect threats.
     * Complexity: Time O(1) [with K-bounded failure windows] | Space O(W)
     */
    public async analyze(events: SecurityEvent[]): Promise<void> {
        for (const event of events) {
            this.pushToWindow(event);
            await this.runRules(event);
        }
    }

    private pushToWindow(event: SecurityEvent) {
        // 1. Handle Removal (Inc. Trimming)
        if (this.eventWindow.length >= this.WINDOW_SIZE) {
            const old = this.eventWindow.shift();
            if (old) this.updateStats(old, 'REMOVE');
        }

        // 2. Handle Addition
        this.eventWindow.push(event);
        this.updateStats(event, 'ADD');
    }

    private updateStats(event: SecurityEvent, mode: 'ADD' | 'REMOVE') {
        const sign = mode === 'ADD' ? 1 : -1;

        // Traffic Stats
        if (event.event_type === 'traffic' && typeof event.payload.bytes === 'number') {
            const val = event.payload.bytes;
            this.trafficStats.count += sign;
            this.trafficStats.sum += sign * val;
            this.trafficStats.sumSq += sign * (val * val);
        }

        // Login Failure Maintenance (Cleanup on removal from window)
        if (mode === 'REMOVE' && event.event_type === 'login' && event.payload.success === false && event.ip_address) {
            const history = this.ipFailures.get(event.ip_address);
            if (history) {
                const ts = new Date(event.created_at).getTime();
                const idx = history.indexOf(ts);
                if (idx !== -1) history.splice(idx, 1);
                if (history.length === 0) this.ipFailures.delete(event.ip_address);
            }
        }
    }

    private async runRules(event: SecurityEvent) {
        const now = Date.now();

        // 1. Brute Force Detection
        if (event.event_type === 'login' && event.payload.success === false && event.ip_address) {
            let history = this.ipFailures.get(event.ip_address);
            if (!history) {
                history = [];
                this.ipFailures.set(event.ip_address, history);
            }
            
            const ts = new Date(event.created_at).getTime();
            history.push(ts);

            // Clean up sliding window strictly for this IP (30s)
            while (history.length > 0 && now - history[0] > 30000) {
                history.shift();
            }

            if (history.length > 10) {
                this.createAlert({
                    title: 'Potential Brute Force Attack',
                    description: `IP ${event.ip_address} failed 10+ logins in 30 seconds. Path: ${event.source}`,
                    severity: 'CRITICAL',
                    metadata: { ip: event.ip_address, count: history.length }
                });
            }
        }

        // 2. Anomaly Detection (Z-Score on Traffic)
        if (event.event_type === 'traffic' && typeof event.payload.bytes === 'number') {
            const { count, sum, sumSq } = this.trafficStats;
            
            if (count > 50) {
                const mean = sum / count;
                const variance = Math.max(0, (sumSq / count) - (mean * mean));
                const stdDev = Math.sqrt(variance);
                const bytes = event.payload.bytes;
                const zScore = (bytes - mean) / (stdDev || 1);

                if (zScore > 3.5) { // Tightened threshold
                    this.createAlert({
                        title: 'Data Exfiltration Anomaly',
                        description: `Traffic spike detected. Z-Score: ${zScore.toFixed(2)}. Bytes: ${bytes}`,
                        severity: 'HIGH',
                        metadata: { zScore, bytes, mean, stdDev }
                    });
                }
            }
        }

        // 3. Privilege Escalation Pattern
        if (event.event_type === 'access' && event.payload.action === 'ROLE_CHANGE') {
            if (event.payload.new_role === 'SUPER_ADMIN' && !event.payload.is_authorized_flow) {
                this.createAlert({
                    title: 'Suspicious Privilege Escalation',
                    description: `Unauthorized attempt to elevate to SUPER_ADMIN detected.`,
                    severity: 'CRITICAL',
                    metadata: { actor: event.actor_id }
                });
            }
        }
    }

    private async createAlert(alert: Partial<SecurityAlert>) {
        try {
            const { error } = await supabaseAdmin
                .from('security_alerts')
                .insert([{
                    ...alert,
                    status: 'OPEN',
                    created_at: new Date().toISOString()
                }]);
            
            if (error) console.error('Alert persistence failed', error);
        } catch (e) {
            console.error('Critical failure in alert generation', e);
        }
    }
}
