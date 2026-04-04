/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman dashboard analyst karyawan cabang,
 * menampilkan analitik dan statistik berdasarkan divisi ANALYST.
 */

'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import type { DivisionConfig } from '@/components/dashboard/AnalyticsDashboard';

/**
 * Konfigurasi untuk divisi ANALYST
 * Berisi informasi identitas, warna, gaya tampilan, dan properti visual
 * @constant
 * @type {DivisionConfig}
 */
const divisionConfig: DivisionConfig = {
  code: 'ANALYST',
  name: 'Analyst Dashboard Cabang',
  color: '#0ea5e9',
  gradient: 'from-sky-500/15 via-sky-400/10 to-sky-300/5',
  bgLight: 'bg-sky-500/5',
  textColor: 'text-sky-600',
};

/**
 * Komponen halaman dashboard analyst karyawan cabang
 * Menampilkan analitik dan statistik berdasarkan konfigurasi divisi ANALYST
 * @returns {JSX.Element} Tampilan dashboard analyst karyawan cabang
 */
export default function EmployeeAnalystDashboardPage() {
  return <DivisionAnalystDashboard division={divisionConfig} />;
}
