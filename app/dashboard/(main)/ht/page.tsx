/**
 * @file
 * 
 * File ini berisi halaman dashboard Divisi HT (Human Training),
 * menampilkan analitik dan statistik untuk divisi HT.
 */

import { DivisionDashboardClientLoader } from '@/components/dashboard/DivisionDashboardClientLoader';
import { DIVISIONS } from '@/lib/constants/divisions';

/**
 * Komponen dashboard Divisi HT (Human Training)
 * Menampilkan analitik dan statistik berdasarkan konfigurasi divisi HT dari DIVISIONS
 * @returns {JSX.Element} Tampilan dashboard Divisi HT
 */
export default function HTDashboard() {
    return <DivisionDashboardClientLoader division={DIVISIONS.HT} />;
}
