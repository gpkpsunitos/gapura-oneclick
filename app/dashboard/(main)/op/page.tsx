import { OPDashboardClient } from '@/components/dashboard/OPDashboardClient';
import { reportsService } from '@/lib/services/reports-service';

export const revalidate = 60; // ISR: revalidate every 60s

export default async function OPDashboard() {
  // Prefetch reports on the server to eliminate client-side SWR waterfall.
  // Auth is already verified by (main)/layout.tsx.
  let initialReports;
  try {
    initialReports = await reportsService.getReports({ source: 'sync' });
  } catch {
    initialReports = undefined; // SWR will fetch client-side as fallback
  }

  return <OPDashboardClient initialReports={initialReports} />;
}
