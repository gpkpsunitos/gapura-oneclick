import { SecurityStats, SecurityAlert } from '@/types/security';

/**
 * Compliance Engine for Security Standards
 * Provides scoring for ISO 27001, NIST, and GDPR.
 */
export class ComplianceEngine {
    // Complexity: Time O(n) | Space O(1)
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

    static calculateGDPRScore(stats: SecurityStats): { score: number; status: string } {
        const score = (stats.patchStatusCount / stats.totalSystems) * 100;
        return {
            score,
            status: score > 90 ? 'COMPLIANT' : 'ACTION_REQUIRED'
        };
    }
}
