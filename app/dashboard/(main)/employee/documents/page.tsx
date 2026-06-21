'use client';

import dynamic from 'next/dynamic';
import { DashboardWorkspaceSkeleton } from '@/components/dashboard/DashboardWorkspaceSkeleton';

const AnalystDocumentViewerPage = dynamic(
    () => import('@/components/analyst/AnalystDocumentViewerPage').then((m) => m.AnalystDocumentViewerPage),
    {
        ssr: false,
        loading: () => (
            <DashboardWorkspaceSkeleton
                title="Documents"
                subtitle="Loading documents shared with your branch."
            />
        ),
    }
);

export default function EmployeeDocumentsPage() {
    return <AnalystDocumentViewerPage />;
}
