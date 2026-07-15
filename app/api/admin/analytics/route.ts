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
    'TOP RISK': number;
    'HIGH RISK': number;
    'MEDIUM': number;
    'LOW': number;
}

interface DivisionStats {
    division: string;
    total: number;
    resolved: number;
    pending: number;
    'TOP RISK': number;
    'HIGH RISK': number;
}

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value ?? null;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const session = await verifySession(token);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (session.role !== 'SUPER_ADMIN' && session.role !== 'ANALYST') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const division = searchParams.get('division');
        const sourceParam = searchParams.get('source');
        const source: 'sheets' | 'sync' = sourceParam === 'sheets' ? 'sheets' : 'sync';

        const allReports = await reportsService.getReports({ source });

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

        const stationMap = new Map<string, StationStats>();
        let summaryResolved = 0;
        let summaryPending = 0;
        let summaryHighSeverity = 0;

        filteredReports.forEach(r => {

            if (r.status === REPORT_STATUS.CLOSED) summaryResolved++;
            if (r.status === REPORT_STATUS.OPEN) summaryPending++;
            if (r.severity === 'HIGH RISK' || r.severity === 'TOP RISK') summaryHighSeverity++;

            const stationName = r.station_code || r.branch || 'Unknown';
            if (!stationMap.has(stationName)) {
                stationMap.set(stationName, {
                    station: stationName,
                    total: 0, resolved: 0, pending: 0, in_progress: 0,
                    'TOP RISK': 0, 'HIGH RISK': 0, 'MEDIUM': 0, 'LOW': 0
                });
            }
            const stats = stationMap.get(stationName)!;
            stats.total++;
            if (r.status === REPORT_STATUS.CLOSED) stats.resolved++;
            if (r.status === REPORT_STATUS.OPEN) stats.pending++;
            if (r.status === REPORT_STATUS['ON PROGRESS']) stats.in_progress++;
            if (r.severity === 'TOP RISK') {
                stats['TOP RISK']++;
            } else if (r.severity === 'HIGH RISK') {
                stats['HIGH RISK']++;
            } else if (r.severity === 'MEDIUM') {
                stats['MEDIUM']++;
            } else if (r.severity === 'LOW') {
                stats['LOW']++;
            }
        });

        const stationData = Array.from(stationMap.values())
            .sort((a, b) => b.total - a.total);

        const divisionMap = new Map<string, DivisionStats>();

        filteredReports.forEach(r => {
            const divName = r.target_division || 'Unassigned';
            if (!divisionMap.has(divName)) {
                divisionMap.set(divName, {
                    division: divName,
                    total: 0, resolved: 0, pending: 0, 'TOP RISK': 0, 'HIGH RISK': 0
                });
            }
            const stats = divisionMap.get(divName)!;
            stats.total++;
            if (r.status === REPORT_STATUS.CLOSED) stats.resolved++;
            if (r.status === REPORT_STATUS.OPEN) stats.pending++;
            if (r.severity === 'TOP RISK') {
                stats['TOP RISK']++;
            } else if (r.severity === 'HIGH RISK') {
                stats['HIGH RISK']++;
            }
        });

        const divisionData = Array.from(divisionMap.values())
            .sort((a, b) => b.total - a.total);

        const summary = {
            totalReports: filteredReports.length,
            resolvedReports: summaryResolved,
            pendingReports: summaryPending,
            highSeverity: summaryHighSeverity,
            avgResolutionRate: 0,
            slaBreachCount: 0
        };

        if (summary.totalReports > 0) {
            summary.avgResolutionRate = (summary.resolvedReports / summary.totalReports) * 100;
        }

        const now = new Date();
        const trendMap = new Map<string, { month: string; total: number; resolved: number }>();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.getFullYear()} ${d.toLocaleString('en-US', { month: 'short' })}`;
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
        }, {
            headers: { 'Cache-Control': 'private, no-store, max-age=0' },
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ error: 'Gagal memuat analitik' }, { status: 500 });
    }
}

function getStatusColor(status: string): string {
    switch (status) {
        case REPORT_STATUS.OPEN: return '#f59e0b';
        case REPORT_STATUS['ON PROGRESS']: return '#8b5cf6';
        case REPORT_STATUS.CLOSED: return '#22c55e';
        default: return '#94a3b8';
    }
}
