/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman Employee AI Reports yang memuat DivisionAIReportsDashboard komponen
 */

'use client';

import dynamic from 'next/dynamic';

/**
 * Komponen DivisionAIReportsDashboard yang diload secara dinamis
 */
const DivisionAIReportsDashboard = dynamic(
  () => import('@/components/dashboard/ai-reports/DivisionAIReportsDashboard'),
  { loading: () => <div className="h-96 animate-pulse bg-gray-100 rounded-xl" /> }
);

/**
 * Komponen halaman Employee AI Reports
 * Memuat komponen DivisionAIReportsDashboard dengan division "EMPLOYEE"
 * @returns JSX element komponen DivisionAIReportsDashboard
 */
export default function EmployeeAIReportsPage() {
   return <DivisionAIReportsDashboard division="EMPLOYEE" />;
}
