'use client';

import { Inbox } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function OSDispatchedPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'OS',
                name: 'Semua Laporan OS',
                color: '#10b981',
                subtitle: 'Monitoring semua laporan masuk lintas divisi',
                icon: Inbox,
                userRole: 'DIVISI_OS',
                basePath: '/dashboard/os/dispatched',
                apiEndpoint: '/api/admin/reports',
                enforceDivisionScope: false,
            }}
        />
    );
}
