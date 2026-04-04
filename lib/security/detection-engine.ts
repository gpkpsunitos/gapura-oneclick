/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi mesin deteksi keamanan real-time dengan analisis perilaku dan heuristik berbasis aturan
 */

import { SecurityEvent, SecurityAlert } from '@/types/security';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Mesin Deteksi Keamanan Real-Time
 * Mengimplementasikan analisis perilaku ML-lite dan heuristik berbasis aturan
 * Kompleksitas: Analisis O(1) per event | Persistensi O(1)
 */
export class DetectionEngine {
    private static INSTANCE: DetectionEngine;
    private eventWindow: SecurityEvent[] = [];
    private WINDOW_SIZE = 1000;
    
    // Incremental Stats for O(1) Z-Score
    private trafficStats = { count: 0, sum: 0, sumSq: 0 };
    // Per-IP failure windows for O(K) brute force (K = failures in 30s)
    private ipFailures = new Map<string, number[]>();

    /**
     * Mendapatkan instance singleton DetectionEngine
     * @returns {DetectionEngine} Instance DetectionEngine
     * @example
     * ```ts
     * const engine = DetectionEngine.getInstance();
     * ```
     */
    public static getInstance(): DetectionEngine {
        if (!DetectionEngine.INSTANCE) {
            DetectionEngine.INSTANCE = new DetectionEngine();
        }
        return DetectionEngine.INSTANCE;
    }

    /**
     * Memproses stream event masuk dan mendeteksi ancaman
     * Kompleksitas: Waktu O(1) [dengan K-bounded failure windows] | Ruang O(W)
     * @param {SecurityEvent[]} events - Array event keamanan
     * @returns {Promise<void>}
     * @example
     * ```ts
     * await DetectionEngine.getInstance().analyze(events);
     * ```
     */
    public async analyze(events: SecurityEvent[]): Promise<void> {
        for (const event of events) {
            this.pushToWindow(event);
            await this.runRules(event);
        }
    }

    /**
     * Menambahkan event ke window dan menghapus event lama jika diperlukan
     * @private
     * @param {SecurityEvent} event - Event yang akan ditambahkan
     */
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

    /**
     * Mengupdate statistik berdasarkan mode (tambah atau hapus)
     * @private
     * @param {SecurityEvent} event - Event yang akan diproses
     * @param {'ADD' | 'REMOVE'} mode - Mode operasi
     */
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

    /**
     * Menjalankan aturan deteksi ancaman
     * @private
     * @async
     * @param {SecurityEvent} event - Event yang akan diperiksa
     * @returns {Promise<void>}
     */
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

    /**
     * Membuat alert keamanan dan menyimpannya ke database
     * @private
     * @async
     * @param {Partial<SecurityAlert>} alert - Data alert yang akan dibuat
     * @returns {Promise<void>}
     */
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
