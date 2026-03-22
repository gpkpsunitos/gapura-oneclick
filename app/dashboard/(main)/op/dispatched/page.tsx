'use client';

import { Inbox } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function OPDispatchedPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'OP',
                name: 'Laporan Divisi OP',
                color: '#3b82f6',
                subtitle: 'Laporan yang ditujukan ke Divisi Operasi',
                icon: Inbox,
                userRole: 'DIVISI_OP',
                basePath: '/dashboard/op/dispatched',
                apiEndpoint: '/api/admin/reports?target_division=OP',
            }}
        />
    );
}
