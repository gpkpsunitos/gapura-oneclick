import { OPDashboardClient } from '@/components/dashboard/OPDashboardClient';
import { reportsService } from '@/lib/services/reports-service';

export const revalidate = 60;

export default async function OPDashboard() {

  let initialReports;
  try {
    initialReports = await reportsService.getReports({ source: 'sync' });
  } catch {
    initialReports = undefined;
  }

  return <OPDashboardClient initialReports={initialReports} />;
}
