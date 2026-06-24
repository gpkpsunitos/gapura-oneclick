import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';
import { readSessionPayload } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const revalidate = 60;

export default async function ManagerAllReportsPage() {
    const token = (await cookies()).get('session')?.value;
    const payload = token ? await readSessionPayload(token) : null;
    if (!payload?.id) redirect('/auth/login');

    const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('station_id')
        .eq('id', payload.id)
        .single();
    if (!dbUser?.station_id) redirect('/dashboard/manager');

    const { data: station } = await supabaseAdmin
        .from('stations')
        .select('code')
        .eq('id', dbUser.station_id)
        .single();
    const stationCode = (station?.code || '').toUpperCase();

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
