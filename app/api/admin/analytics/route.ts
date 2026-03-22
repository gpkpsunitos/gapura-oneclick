import { NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';
import type { Report } from '@/types';
import { REPORT_STATUS } from '@/lib/constants/report-status';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

interface StationStats {
    station: string;
    total: number;
    resolved: number;
    pending: number;
    in_progress: number;
    high: number;
    medium: number;
    low: number;
}

interface DivisionStats {
    division: string;
    total: number;
    resolved: number;
    pending: number;
    high: number;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const division = searchParams.get('division');

        // 1. Fetch all reports from Google Sheets Cache
        const allReports = await reportsService.getReports();

        // 2. Filter by Date Range
        let filteredReports = allReports;
        let dateFrom: Date | null = null;
        let dateTo: Date | null = null;

        if (from && to) {
            dateFrom = new Date(from);
            dateTo = new Date(to);
        } else if (period) {
            const now = new Date();
            dateTo = now;
            switch (period) {
                case '7d': dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
                case '30d': dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
                case '3m': dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); break;
                case '6m': dateFrom = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()); break;
            }
        }

        if (dateFrom && dateTo) {
            const tFrom = dateFrom.getTime();
            const tTo = dateTo.getTime();
            filteredReports = filteredReports.filter(r => {
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
            if (r.status === REPORT_STATUS.CLOSED) stats.resolved++;
            if (r.status === REPORT_STATUS.OPEN) stats.pending++;
            if (r.status === REPORT_STATUS['ON PROGRESS']) stats.in_progress++;
            if (r.severity === 'high') stats.high++;
            if (r.severity === 'medium') stats.medium++;
            if (r.severity === 'low') stats.low++;
        });

        const stationData = Array.from(stationMap.values())
            .sort((a, b) => b.total - a.total); // Sort by total descending

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
            if (r.status === REPORT_STATUS.CLOSED) stats.resolved++;
            if (r.status === REPORT_STATUS.OPEN) stats.pending++;
            if (r.severity === 'high') stats.high++;
        });

        const divisionData = Array.from(divisionMap.values())
            .sort((a, b) => b.total - a.total);

        // --- Summary Stats ---
        const summary = {
            totalReports: filteredReports.length,
            resolvedReports: filteredReports.filter(r => r.status === REPORT_STATUS.CLOSED).length,
            pendingReports: filteredReports.filter(r => r.status === REPORT_STATUS.OPEN).length,
            highSeverity: filteredReports.filter(r => r.severity === 'high').length,
            avgResolutionRate: 0,
            slaBreachCount: 0 // Not calculated yet
        };

        if (summary.totalReports > 0) {
            summary.avgResolutionRate = (summary.resolvedReports / summary.totalReports) * 100;
        }

        // --- Trend Data (Last 6 Months) ---
        // This usually ignores the filter to show trend context, or respects it?
        // Usually trend is fixed 6 months back from NOW, regardless of filter, 
        // OR it respects the filter if the filter is wider.
        // Let's stick to the previous logic: explicitly calculate last 6 months trend
        
        const now = new Date();
        const trendMap = new Map<string, { month: string; total: number; resolved: number }>();
        
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.getFullYear()} ${d.toLocaleString('en-US', { month: 'short' })}`; // YYYY MMM
            trendMap.set(key, { month: label, total: 0, resolved: 0 });
        }

        allReports.forEach(r => {
            const d = new Date(r.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (trendMap.has(key)) {
                const stats = trendMap.get(key)!;
                stats.total++;
                if (r.status === REPORT_STATUS.CLOSED) stats.resolved++;
            }
        });

        const trendData = Array.from(trendMap.values());

        // --- Status Distribution ---
        const statusMap = new Map<string, number>();
        filteredReports.forEach(r => {
            const s = r.status || 'Unknown';
            statusMap.set(s, (statusMap.get(s) || 0) + 1);
        });
        
        const statusData = Array.from(statusMap.entries()).map(([name, value]) => ({
            name: name.replace(/_/g, ' '),
            value,
            color: getStatusColor(name)
        }));

        return NextResponse.json({
            summary,
            stationData,
            divisionData,
            statusData,
            trendData,
            // categoryData could be added similarly
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ error: 'Gagal memuat analitik' }, { status: 500 });
    }
}

function getStatusColor(status: string): string {
    switch (status) {
        case REPORT_STATUS.OPEN: return '#f59e0b'; // amber-500
        case REPORT_STATUS['ON PROGRESS']: return '#8b5cf6'; // violet-500
        case REPORT_STATUS.CLOSED: return '#22c55e'; // green-500
        default: return '#94a3b8'; // slate-400
    }
}
