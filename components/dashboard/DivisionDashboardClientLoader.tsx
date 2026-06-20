'use client';

import dynamic from 'next/dynamic';
import type { DivisionConfig } from '@/components/dashboard/AnalyticsDashboard';
import { DashboardWorkspaceSkeleton } from '@/components/dashboard/DashboardWorkspaceSkeleton';

const DivisionAnalystDashboard = dynamic(
  () => import('@/components/dashboard/DivisionAnalystDashboard').then((mod) => mod.DivisionAnalystDashboard),
  {
    ssr: false,
    loading: () => (
      <DashboardWorkspaceSkeleton
        title="Preparing dashboard"
        subtitle="Loading analytics data, trends, and latest reports"
      />
    ),
  }
);

interface DivisionDashboardClientLoaderProps {
  division: DivisionConfig;
}

export function DivisionDashboardClientLoader({ division }: DivisionDashboardClientLoaderProps) {
  return <DivisionAnalystDashboard division={division} />;
}
