import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';
import { reportsService } from '@/lib/services/reports-service';
import { REPORT_STATUS } from '@/lib/constants/report-status';

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

        // Build date filter
        let dateFrom: Date | null = null;
        let dateTo: Date | null = null;

        if (from && to) {
            dateFrom = new Date(from);
            dateTo = new Date(to);
        } else if (period) {
            const now = new Date();
            dateTo = now;
            switch (period) {
                case '7d':
                    dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '3m':
                    dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                    break;
                case '6m':
                    dateFrom = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                    break;
            }
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Fetch directly from the live Google Sheets source so admin stats match
        // the current spreadsheet schema and values.
        const reports = await reportsService.getReports({ source: 'sheets' });

        // Filter reports by date
        let filteredReports = reports;
        if (dateFrom || dateTo) {
            filteredReports = reports.filter(r => {
                const createdAt = new Date(r.created_at);
                if (dateFrom && createdAt < dateFrom) return false;
                if (dateTo && createdAt > dateTo) return false;
                return true;
            });
        }

        // Calculate Stats
        const totalReports = filteredReports.length;
        let menungguFeedback = 0;
        let sudahDiverifikasi = 0;
        let selesai = 0;
        let criticalSeverity = 0;
        let highSeverity = 0;
        let mediumSeverity = 0;
        let lowSeverity = 0;
        let slaBreachCount = 0;

        for (const r of filteredReports) {
            if (r.status === REPORT_STATUS.OPEN) menungguFeedback++;
            else if (r.status === REPORT_STATUS['ON PROGRESS']) sudahDiverifikasi++;
            else if (r.status === REPORT_STATUS.CLOSED) selesai++;

            if (r.severity === 'CRITICAL' || r.severity === 'TOP RISK') criticalSeverity++;
            else if (r.severity === 'HIGH') highSeverity++;
            else if (r.severity === 'MEDIUM') mediumSeverity++;
            else lowSeverity++;

            if (r.status !== REPORT_STATUS.CLOSED && r.sla_deadline && new Date(r.sla_deadline) < now) {
                slaBreachCount++;
            }
        }

        // Trends (from ALL reports, usually relative to now, regardless of filter? 
        // Original code used `FROM reports` for trends, not `FROM filtered`.
        // So we use `reports` for trends.
        let todayReports = 0;
        let weekReports = 0;
        let monthReports = 0;
        for (const r of reports) {
            const created = new Date(r.created_at).getTime();
            if (created >= startOfDay.getTime()) todayReports++;
            if (created >= startOfWeek.getTime()) weekReports++;
            if (created >= startOfMonth.getTime()) monthReports++;
        }

        // Top Locations
        const locationBreakdown: Record<string, number> = {};
        filteredReports.forEach(r => {
            // Priority: Station Code > Location Name > 'Tidak Diketahui'
            // Check if we have station info joined (reportsService might not join fully if types are simple)
            // But reportsService.getReports() returns Report objects which usually have fields from Sheets.
            // Sheets has 'station_code' or 'branch'.
            const loc = r.station_code || r.branch || r.location || 'Tidak Diketahui';
            locationBreakdown[loc] = (locationBreakdown[loc] || 0) + 1;
        });

        const topLocations = Object.entries(locationBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([location, count]) => ({ location, count }));

        // Recent Reports (limit 5)
        // Original code: order by created_at desc limit 5
        const recentReports = [...reports]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map(r => ({
                id: r.id,
                title: r.title || r.description || 'No Title',
                report: r.report,
                primary_tag: r.primary_tag,
                location: r.location || r.station_code || r.branch,
                status: r.status,
                severity: r.severity,
                created_at: r.created_at,
                priority: r.priority,
                sla_deadline: r.sla_deadline,
                users: r.users ? { full_name: r.users.full_name } : (r.reporter_name ? { full_name: r.reporter_name } : null),
                stations: r.stations ? { code: r.stations.code } : (r.station_code ? { code: r.station_code } : null)
            }));

        // User Stats (Still from Supabase as Users are there)
        const { count: pendingUsers } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: activeUsers } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active');

        const resolutionRate = totalReports ? Math.round((selesai / totalReports) * 100) : 0;

        return NextResponse.json({
            overview: {
                totalReports,
                menungguFeedback,
                sudahDiverifikasi,
                selesai,
                pendingUsers: pendingUsers || 0,
                activeUsers: activeUsers || 0,
                resolutionRate,
                slaBreachCount,
            },
            severity: {
                'TOP RISK': criticalSeverity,
                HIGH: highSeverity,
                MEDIUM: mediumSeverity,
                LOW: lowSeverity,
            },
            severityBreakdown: {
                critical: criticalSeverity,
                high: highSeverity,
                medium: mediumSeverity,
                low: lowSeverity
            },
            trends: {
                today: todayReports,
                thisWeek: weekReports,
                thisMonth: monthReports,
            },
            recentReports,
            topLocations,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
                'CDN-Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
            },
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}

// Removed fallbackStats as we are now using a reliable service-based approach

