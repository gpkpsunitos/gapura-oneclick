/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman dashboard Divisi OS (Other Service),
 * menampilkan analitik dan statistik untuk divisi OS.
 */

'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';

/**
 * Komponen dashboard Divisi OS (Other Service)
 * Menampilkan analitik dan statistik berdasarkan konfigurasi divisi OS dari DIVISIONS
 * @returns {JSX.Element} Tampilan dashboard Divisi OS
 */
export default function OSDashboard() {
    return <DivisionAnalystDashboard division={DIVISIONS.OS} enforceDivisionScope={false} />;
}
