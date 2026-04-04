/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman laporan yang ditujukan ke Divisi HT (Human Training),
 * menampilkan semua laporan yang dikirimkan ke divisi HT.
 */

'use client';

import { Inbox } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

/**
 * Komponen halaman laporan yang ditujukan ke Divisi HT (Human Training)
 * Menampilkan semua laporan yang dikirimkan ke divisi HT
 * @returns {JSX.Element} Tampilan halaman laporan dispatched ke Divisi HT
 */
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
