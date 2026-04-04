/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman laporan yang dikirim ke Divisi OS (Other Service),
 * menampilkan semua laporan yang masuk lintas divisi.
 */

'use client';

import { Inbox } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

/**
 * Komponen halaman laporan yang dikirim ke Divisi OS (Other Service)
 * Menampilkan semua laporan yang masuk lintas divisi
 * @returns {JSX.Element} Tampilan halaman laporan dispatched ke Divisi OS
 */
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
