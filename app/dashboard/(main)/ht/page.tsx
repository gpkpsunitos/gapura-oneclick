/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman dashboard Divisi HT (Human Training),
 * menampilkan analitik dan statistik untuk divisi HT.
 */

'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';

/**
 * Komponen dashboard Divisi HT (Human Training)
 * Menampilkan analitik dan statistik berdasarkan konfigurasi divisi HT dari DIVISIONS
 * @returns {JSX.Element} Tampilan dashboard Divisi HT
 */
export default function HTDashboard() {
    return <DivisionAnalystDashboard division={DIVISIONS.HT} enforceDivisionScope={false} />;
}
