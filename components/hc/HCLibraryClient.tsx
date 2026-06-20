'use client';

import dynamic from 'next/dynamic';

import { DashboardWorkspaceSkeleton } from '@/components/dashboard/DashboardWorkspaceSkeleton';

const HCDocumentManagementPage = dynamic(
  () =>
    import('@/components/hc/HCDocumentManagementPage').then(
      (mod) => mod.HCDocumentManagementPage
    ),
  {
    ssr: false,
    loading: () => (
      <DashboardWorkspaceSkeleton
        title="Human Capital Library"
        subtitle="Loading HC documents, filters, and audience controls."
      />
    ),
  }
);

export function HCLibraryClient() {
  return <HCDocumentManagementPage />;
}
