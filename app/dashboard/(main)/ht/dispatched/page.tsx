'use client';

import { Inbox } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function HTDispatchedPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'HT',
                name: 'Laporan Divisi HT',
                color: '#06b6d4',
                subtitle: 'Laporan yang ditujukan ke Divisi Human Training',
                icon: Inbox,
                userRole: 'DIVISI_HT',
                basePath: '/dashboard/ht/dispatched',
                apiEndpoint: '/api/admin/reports?target_division=HT',
            }}
        />
    );
}
