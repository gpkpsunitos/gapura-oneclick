/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi fungsi utilitas untuk menghitung data analitik termasuk statistik stasiun, divisi, dan tren
 */

import type { Report } from '@/types';

/**
 * Statistik untuk setiap stasiun
 */
export interface StationStats {
    station: string;
    total: number;
    resolved: number;
    pending: number;
    in_progress: number;
    high: number;
    medium: number;
    low: number;
}

/**
 * Statistik untuk setiap divisi
 */
export interface DivisionStats {
    division: string;
    total: number;
    resolved: number;
    pending: number;
    high: number;
}

/**
 * Data analitik lengkap
 */
export interface AnalyticsData {
    stationStats: StationStats[];
    divisionStats: DivisionStats[];
    trendData: { date: string; count: number }[];
    summary: {
        total: number;
        resolved: number;
        pending: number;
        high: number;
    };
}

/**
 * Menghitung data analitik dari array laporan
 * @param {Report[]} reports - Array laporan
 * @param {{ from: Date; to: Date }} [dateRange] - Rentang tanggal filter (opsional)
 * @returns {AnalyticsData} Objek data analitik lengkap
 * @example
 * ```ts
 * const analytics = computeAnalytics(reports, {
 *   from: new Date('2024-01-01'),
 *   to: new Date('2024-01-31')
 * });
 * console.log(analytics.summary);
 * console.log(analytics.stationStats);
 * ```
 */
export function computeAnalytics(reports: Report[], dateRange?: { from: Date; to: Date }): AnalyticsData {
    let filteredReports = reports;

    if (dateRange) {
        const tFrom = dateRange.from.getTime();
        const tTo = dateRange.to.getTime();
        filteredReports = reports.filter(r => {
            const t = new Date(r.created_at).getTime();
            return t >= tFrom && t <= tTo;
        });
    }

    // --- Station Stats ---
    const stationMap = new Map<string, StationStats>();
    
    filteredReports.forEach(r => {
        const stationName = r.station_code || r.branch || 'Unknown';
        if (!stationMap.has(stationName)) {
            stationMap.set(stationName, {
                station: stationName,
                total: 0, resolved: 0, pending: 0, in_progress: 0,
                high: 0, medium: 0, low: 0
            });
        }
        const stats = stationMap.get(stationName)!;
        stats.total++;
        if (r.status === 'CLOSED') stats.resolved++;
        if (r.status === 'OPEN') stats.pending++;
        if (r.status === 'ON PROGRESS') stats.in_progress++;
        
        const severity = r.severity?.toLowerCase();
        if (severity === 'high') stats.high++;
        if (severity === 'medium') stats.medium++;
        if (severity === 'low') stats.low++;
    });

    const stationStats = Array.from(stationMap.values())
        .sort((a, b) => b.total - a.total);

    // --- Division Stats ---
    const divisionMap = new Map<string, DivisionStats>();
    
    filteredReports.forEach(r => {
        const divName = r.target_division || 'Unassigned';
        if (!divisionMap.has(divName)) {
            divisionMap.set(divName, {
                division: divName,
                total: 0, resolved: 0, pending: 0, high: 0
            });
        }
        const stats = divisionMap.get(divName)!;
        stats.total++;
        if (r.status === 'CLOSED') stats.resolved++;
        if (r.status === 'OPEN') stats.pending++;
        
        const severity = r.severity?.toLowerCase();
        if (severity === 'high') stats.high++;
    });

    const divisionStats = Array.from(divisionMap.values())
        .sort((a, b) => b.total - a.total);

    // --- Trend Data ---
    const trendMap = new Map<string, number>();
    
    filteredReports.forEach(r => {
        const date = new Date(r.created_at).toISOString().split('T')[0];
        trendMap.set(date, (trendMap.get(date) || 0) + 1);
    });

    const trendData = Array.from(trendMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // --- Summary ---
    const summary = {
        total: filteredReports.length,
        resolved: filteredReports.filter(r => r.status === 'CLOSED').length,
        pending: filteredReports.filter(r => r.status === 'OPEN').length,
        high: filteredReports.filter(r => r.severity?.toLowerCase() === 'high').length
    };

    return {
        stationStats,
        divisionStats,
        trendData,
        summary
    };
}
