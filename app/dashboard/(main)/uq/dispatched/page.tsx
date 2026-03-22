'use client';

import { Inbox } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function UQDispatchedPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'UQ',
                name: 'Laporan Divisi UQ',
                color: '#ec4899',
                subtitle: 'Laporan yang ditujukan ke Divisi Quality',
                icon: Inbox,
                userRole: 'DIVISI_UQ',
                basePath: '/dashboard/uq/dispatched',
                apiEndpoint: '/api/admin/reports?target_division=UQ',
            }}
        />
    );
}
