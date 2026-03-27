'use client';

import { Inbox } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function OTDispatchedPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'OT',
                name: 'Laporan Divisi OT',
                color: '#f59e0b',
                subtitle: 'Laporan yang ditujukan ke Divisi Teknik',
                icon: Inbox,
                userRole: 'DIVISI_OT',
                basePath: '/dashboard/ot/dispatched',
                apiEndpoint: '/api/admin/reports?target_division=OT',
            }}
        />
    );
}
