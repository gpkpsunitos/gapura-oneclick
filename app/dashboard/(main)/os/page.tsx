import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { OSDivisionDashboardClientLoader } from '@/components/dashboard/os/OSDivisionDashboardClientLoader';
import { DIVISIONS } from '@/lib/constants/divisions';
import { getStationLock } from '@/lib/get-station-lock';
import { queryReportPage } from '@/lib/server/report-page-query';
import type { Report } from '@/types';

export const dynamic = 'force-dynamic';

export default async function OSDashboard() {
  const token = (await cookies()).get('session')?.value;
  const payload = token ? await verifySession(token) : null;

  let initialReports: Report[] | undefined;
  let lockedBranches: string[] | undefined;

  const stationCode = payload?.id ? await getStationLock(payload.id, payload.role ?? '') : null;

  if (stationCode) {
    try {
      const page = await queryReportPage({
        session: payload!,
        scope: 'admin',
        limit: 50,
        filters: { station: stationCode },
      });
      initialReports = Array.from(page.reports) as Report[];
      lockedBranches = [stationCode];
    } catch {
      initialReports = [];
    }
  }

  return (
    <OSDivisionDashboardClientLoader
      division={DIVISIONS.OS}
      initialReports={initialReports}
      lockedBranches={lockedBranches}
    />
  );
}
