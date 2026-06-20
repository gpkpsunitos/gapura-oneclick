'use client';

import { Layers } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function AllDivisionsReportsPage() {
    return (
        <DivisionReportsPage
            config={{
                code: '',
                name: 'Semua Laporan Divisi',
                color: '#6366f1',
                subtitle: 'Gabungan laporan dari semua divisi aktif (OP, OS, HC, HT)',
                icon: Layers,
                userRole: 'DIVISI_ESKALASI',
                basePath: '/dashboard/eskalasi/laporan-divisi',
                apiEndpoint: '/api/admin/reports',
            }}
        />
    );
}
