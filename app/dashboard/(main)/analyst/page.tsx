import { cookies } from 'next/headers';
import { readSessionPayload } from '@/lib/auth-utils';
import { OCSDivisionDashboardClientLoader } from '@/components/dashboard/ocs/OCSDivisionDashboardClientLoader';
import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { reportsService } from '@/lib/services/reports-service';
import { DIVISIONS } from '@/lib/constants/divisions';

export const revalidate = 60;

export default async function AnalystPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await readSessionPayload(token) : null;

    if (session?.division === 'OCS') {
        return <OCSDivisionDashboardClientLoader division={DIVISIONS.OCS} />;
    }

    let initialReports;
    try {
        initialReports = await reportsService.getReports({ source: 'sync' });
    } catch {
        initialReports = undefined;
    }

    return <DivisionAnalystDashboard division={DIVISIONS.ANALYST} initialReports={initialReports} />;
}
