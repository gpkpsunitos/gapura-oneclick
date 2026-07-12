import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';
import { readSessionPayload } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';
import { getStationLock } from '@/lib/get-station-lock';

// This page embeds per-user, station-scoped report data directly into the
// server-rendered HTML via `initialReports`. ISR (`revalidate`) would cache
// that personalized payload and serve it to every subsequent visitor
// regardless of their own role/station, so it must always render fresh.
export const dynamic = 'force-dynamic';

export default async function ManagerAllReportsPage() {
    const token = (await cookies()).get('session')?.value;
    const payload = token ? await readSessionPayload(token) : null;
    if (!payload?.id) redirect('/auth/login');

    const stationCode = await getStationLock(payload.id, payload.role ?? '');
    if (!stationCode) redirect('/dashboard/manager');

    let initialReports;
    try {
        const all = await reportsService.getReports({ source: 'sync' });
        initialReports = all.filter((r) => {
            const code = (r.stations?.code || r.branch || r.station_code || '').toString().toUpperCase();
            return code === stationCode;
        });
    } catch {
        initialReports = [];
    }

    return (
        <DivisionAnalystDashboard
            division={DIVISIONS.OP}
            initialReports={initialReports}
            lockedBranches={[stationCode]}
            forceView="reports"
        />
    );
}
