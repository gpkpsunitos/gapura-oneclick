/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi mesin kepatuhan untuk standar keamanan termasuk ISO 27001, NIST, dan GDPR
 */

import { SecurityStats, SecurityAlert } from '@/types/security';

/**
 * Mesin Kepatuhan untuk Standar Keamanan
 * Menyediakan penilaian untuk ISO 27001, NIST, dan GDPR
 */
export class ComplianceEngine {
    
    /**
     * Menghitung skor kepatuhan ISO 27001
     * Kompleksitas: Waktu O(n) | Ruang O(1)
     * @param {SecurityStats} stats - Statistik keamanan
     * @param {SecurityAlert[]} alerts - Array alert keamanan
     * @returns {number} Skor ISO 27001 (0-100)
     * @example
     * ```ts
     * const score = ComplianceEngine.calculateISO27001Score(stats, alerts);
     * console.log('ISO 27001 Score:', score);
     * ```
     */
    static calculateISO27001Score(stats: SecurityStats, alerts: SecurityAlert[]): number {
        let baseScore = 100;
        
        // Deduct for critical alerts
        const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
        baseScore -= criticalCount * 15;
        
        // Deduct for unpatched systems
        const patchGap = stats.totalSystems - stats.patchStatusCount;
        baseScore -= patchGap * 2;
        
        return Math.max(0, baseScore);
    }

    /**
     * Menghitung skor kepatuhan GDPR
     * @param {SecurityStats} stats - Statistik keamanan
     * @returns {{ score: number; status: string }} Skor dan status kepatuhan
     * @example
     * ```ts
     * const result = ComplianceEngine.calculateGDPRScore(stats);
     * console.log('GDPR Score:', result.score);
     * console.log('Status:', result.status);
     * ```
     */
    static calculateGDPRScore(stats: SecurityStats): { score: number; status: string } {
        const score = (stats.patchStatusCount / stats.totalSystems) * 100;
        return {
            score,
            status: score > 90 ? 'COMPLIANT' : 'ACTION_REQUIRED'
        };
    }
}
