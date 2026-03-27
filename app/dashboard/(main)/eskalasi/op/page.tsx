'use client';

import { FolderOpen } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';
import { DIVISIONS } from '@/lib/constants/divisions';

export default function OPReportsPage() {
    const div = DIVISIONS.OP;
    return (
        <DivisionReportsPage
            config={{
                code: div.code,
                name: `Laporan Divisi ${div.code}`,
                color: div.color,
                subtitle: `Laporan yang ditujukan ke Divisi ${div.name}`,
                icon: FolderOpen,
                userRole: 'DIVISI_ESKALASI',
                basePath: `/dashboard/eskalasi/${div.code.toLowerCase()}`,
                apiEndpoint: `/api/admin/reports?target_division=${div.code}`,
            }}
        />
    );
}
