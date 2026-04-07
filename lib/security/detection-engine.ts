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
 *
 * [FIX SUMMARY]
 * 1. Replaced Array-based `eventWindow` with a circular buffer (O(1) push
 *    instead of O(n) Array.shift).
 * 2. Added bounded cleanup for `ipFailures` Map to prevent unbounded key
 *    accumulation from IPs that stop generating events.
 * 3. Added `destroy()` method for explicit resource release.
 */
export class DetectionEngine {
    private static INSTANCE: DetectionEngine | null = null;

    // [FIX] Circular buffer replaces the old linear array.
    // Array.shift() on a 1000-element array is O(n) because it re-indexes
    // every remaining element. The ring buffer achieves O(1) for both
    // push and eviction by overwriting the oldest slot via modular index.
    private ringBuffer: (SecurityEvent | undefined)[];
    private ringHead = 0; // Next write position
    private ringCount = 0; // Number of filled slots
    private readonly WINDOW_SIZE = 1000;

    // Incremental Stats for O(1) Z-Score
    private trafficStats = { count: 0, sum: 0, sumSq: 0 };

    // Per-IP failure windows for O(K) brute force (K = failures in 30s)
    // [FIX] Added MAX_IP_ENTRIES cap to prevent unbounded growth.
    private ipFailures = new Map<string, number[]>();
    private readonly MAX_IP_ENTRIES = 5000;

    /**
     * [FIX] Bounded IP failure tracking.
     *
     * When an IP ages out of the window, we clean its entries from `ipFailures`.
     * Additionally, if the Map exceeds MAX_IP_ENTRIES, we proactively prune
     * the oldest keys to prevent unbounded memory growth from long-running
     * processes that see many unique IPs.
     */
    private pruneIpFailures(): void {
        if (this.ipFailures.size <= this.MAX_IP_ENTRIES) return;
        // Delete the first 20% of entries (oldest by insertion order)
        const toDelete = Math.floor(this.MAX_IP_ENTRIES * 0.2);
        let deleted = 0;
        for (const key of this.ipFailures.keys()) {
            if (deleted >= toDelete) break;
            this.ipFailures.delete(key);
            deleted++;
        }
    }

    /**
     * Mendapatkan instance singleton DetectionEngine
     * @returns {DetectionEngine} Instance DetectionEngine
     */
    public static getInstance(): DetectionEngine {
        if (!DetectionEngine.INSTANCE) {
            DetectionEngine.INSTANCE = new DetectionEngine();
        }
        return DetectionEngine.INSTANCE;
    }

    private constructor() {
        // Pre-allocate the ring buffer to the exact window size
        this.ringBuffer = new Array(this.WINDOW_SIZE).fill(undefined);
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

        // [FIX] Periodically prune the ipFailures map to prevent unbounded growth
        this.pruneIpFailures();
    }

    /**
     * [FIX] Push an event into the circular buffer, evicting the oldest
     * entry in O(1) time. The previous implementation used Array.push()
     * + Array.shift(), which was O(n) per eviction due to array re-indexing.
     */
    private pushToWindow(event: SecurityEvent) {
        // Compute the slot we're about to overwrite
        const slotIndex = this.ringHead % this.WINDOW_SIZE;
        const old = this.ringBuffer[slotIndex];

        // If the slot was occupied, remove its contribution to stats
        if (old !== undefined && this.ringCount >= this.WINDOW_SIZE) {
            this.updateStats(old, 'REMOVE');
        }

        // Write the new event and advance the head
        this.ringBuffer[slotIndex] = event;
        this.ringHead++;
        if (this.ringCount < this.WINDOW_SIZE) this.ringCount++;

        // Add new event's contribution
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
     * [FIX] Destroy the singleton and release all held memory.
     * Resets the ring buffer, stats, and IP failure map.
     */
    public static destroyInstance(): void {
        if (!DetectionEngine.INSTANCE) return;
        DetectionEngine.INSTANCE.ringBuffer = [];
        DetectionEngine.INSTANCE.ipFailures.clear();
        DetectionEngine.INSTANCE.trafficStats = { count: 0, sum: 0, sumSq: 0 };
        DetectionEngine.INSTANCE.ringHead = 0;
        DetectionEngine.INSTANCE.ringCount = 0;
        DetectionEngine.INSTANCE = null;
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
