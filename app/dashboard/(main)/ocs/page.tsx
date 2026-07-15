import { cookies } from 'next/headers';
import { readSessionPayload } from '@/lib/auth-utils';
import { OCSDivisionDashboardClientLoader } from '@/components/dashboard/ocs/OCSDivisionDashboardClientLoader';
import { DIVISIONS } from '@/lib/constants/divisions';
import { reportsService } from '@/lib/services/reports-service';
import { getStationLock } from '@/lib/get-station-lock';

export const revalidate = 60;

export default async function OCSDashboard() {
  const token = (await cookies()).get('session')?.value;
  const payload = token ? await readSessionPayload(token) : null;

  let initialReports;
  let lockedBranches: string[] | undefined;

  const stationCode = payload?.id ? await getStationLock(payload.id, payload.role ?? '') : null;

  if (stationCode) {
    try {
      const all = await reportsService.getReports({ source: 'sync', projection: 'list' });
      initialReports = all.filter((r) => {
        const code = (r.stations?.code || r.branch || r.station_code || '').toString().toUpperCase();
        return code === stationCode;
      });
      lockedBranches = [stationCode];
    } catch {
      initialReports = [];
    }
  }

  return (
    <OCSDivisionDashboardClientLoader
      division={DIVISIONS.OCS}
      initialReports={initialReports}
      lockedBranches={lockedBranches}
    />
  );
}
