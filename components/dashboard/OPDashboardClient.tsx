'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';
import type { Report, AnalyticsData } from '@/types';

interface OPDashboardClientProps {
  initialReports?: Report[];
  initialAnalytics?: AnalyticsData | null;
}

export function OPDashboardClient({ initialReports, initialAnalytics }: OPDashboardClientProps) {
  return (
    <DivisionAnalystDashboard
      division={DIVISIONS.OP}
      initialReports={initialReports}
      initialAnalytics={initialAnalytics}
    />
  );
}
