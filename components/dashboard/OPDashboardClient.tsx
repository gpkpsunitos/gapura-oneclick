'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';
import type { Report, AnalyticsData } from '@/types';

interface OPDashboardClientProps {
  initialReports?: Report[];
  initialAnalytics?: AnalyticsData | null;
  lockedBranches?: string[];
}

export function OPDashboardClient({ initialReports, initialAnalytics, lockedBranches }: OPDashboardClientProps) {
  return (
    <DivisionAnalystDashboard
      division={DIVISIONS.OP}
      initialReports={initialReports}
      initialAnalytics={initialAnalytics}
      lockedBranches={lockedBranches}
    />
  );
}
