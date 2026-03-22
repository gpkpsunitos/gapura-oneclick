'use client';

import { Inbox } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function OSDispatchedPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'OS',
                name: 'Laporan Divisi OS',
                color: '#10b981',
                subtitle: 'Laporan yang ditujukan ke Divisi Operational Services',
                icon: Inbox,
                userRole: 'DIVISI_OS',
                basePath: '/dashboard/os/dispatched',
                apiEndpoint: '/api/admin/reports?target_division=OS',
            }}
        />
    );
}
