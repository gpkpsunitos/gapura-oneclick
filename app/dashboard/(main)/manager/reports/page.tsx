import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';
import { readSessionPayload } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';
import { getStationLock } from '@/lib/get-station-lock';

export const revalidate = 60;

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
