/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman dashboard Divisi UQ (Unit Quality),
 * menampilkan analitik dan statistik untuk divisi UQ.
 */

'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';

/**
 * Komponen dashboard Divisi UQ (Unit Quality)
 * Menampilkan analitik dan statistik berdasarkan konfigurasi divisi UQ dari DIVISIONS
 * @returns {JSX.Element} Tampilan dashboard Divisi UQ
 */
export default function UQDashboard() {
    return <DivisionAnalystDashboard division={DIVISIONS.UQ} enforceDivisionScope={false} />;
}
