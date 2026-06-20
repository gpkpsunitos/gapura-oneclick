import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, role, station_id')
        .eq('id', session.id)
        .single();

    if (!user || (user.role !== 'MANAGER_CABANG' && user.role !== 'SUPER_ADMIN' && user.role !== 'ANALYST')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stationId = user.station_id;
    if (!stationId) {
        return NextResponse.json({ error: 'No station assigned' }, { status: 400 });
    }

    const { data: station } = await supabaseAdmin
        .from('stations')
        .select('code, name')
        .eq('id', stationId)
        .single();

    const { data: rows, error } = await supabaseAdmin
        .from('reports_sync')
        .select('id, status, severity, main_category, category, airline, airlines, area, date_of_event, created_at, source_sheet')
        .eq('station_id', stationId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const reports = rows || [];
    const total = reports.length;
    const openCount = reports.filter(r => r.status === 'OPEN').length;
    const closedCount = reports.filter(r => r.status === 'CLOSED').length;
    const resolutionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

    const categoryMap: Record<string, number> = {};
    const severityMap: Record<string, number> = {};
    const areaMap: Record<string, number> = {};
    const airlineMap: Record<string, number> = {};
    const monthlyMap: Record<string, { total: number; Irregularity: number; Complaint: number; Compliment: number }> = {};

    for (const r of reports) {
        const cat = r.main_category || r.category || 'Lainnya';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;

        const sev = r.severity || 'UNKNOWN';
        severityMap[sev] = (severityMap[sev] || 0) + 1;

        const area = r.area || 'Tidak Diketahui';
        areaMap[area] = (areaMap[area] || 0) + 1;

        const airline = r.airline || r.airlines || 'Tidak Diketahui';
        airlineMap[airline] = (airlineMap[airline] || 0) + 1;

        const dateStr = r.date_of_event || r.created_at;
        if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyMap[monthKey]) {
                    monthlyMap[monthKey] = { total: 0, Irregularity: 0, Complaint: 0, Compliment: 0 };
                }
                monthlyMap[monthKey].total++;
                if (cat === 'Irregularity' || cat === 'Complaint' || cat === 'Compliment') {
                    monthlyMap[monthKey][cat]++;
                }
            }
        }
    }

    const categoryDistribution = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const severityDistribution = Object.entries(severityMap)
        .map(([name, value]) => {
            const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
            return { name, value, _order: order[name] ?? 99 };
        })
        .sort((a, b) => a._order - b._order)
        .map(({ name, value }) => ({ name, value }));

    const areaDistribution = Object.entries(areaMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const topAirlines = Object.entries(airlineMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    const monthlyTrend = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, data]) => {
            const [y, m] = month.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
            return {
                month: `${monthNames[parseInt(m) - 1]} ${y}`,
                ...data,
            };
        });

    const statusDistribution = [
        { name: 'Open', value: openCount },
        { name: 'Closed', value: closedCount },
    ].filter(d => d.value > 0);

    return NextResponse.json({
        station: { code: station?.code || stationId, name: station?.name || stationId },
        summary: { total, open: openCount, closed: closedCount, resolutionRate },
        categoryDistribution,
        severityDistribution,
        areaDistribution,
        topAirlines,
        monthlyTrend,
        statusDistribution,
    });
}
