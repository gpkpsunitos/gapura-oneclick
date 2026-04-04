/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman Employee HC Leave yang memuat HCLeaveWorkspace komponen
 */

import dynamic from 'next/dynamic';

/**
 * Komponen HCLeaveWorkspace yang diload secara dinamis
 */
const HCLeaveWorkspace = dynamic(
  () => import('@/components/hc/HCLeaveWorkspace').then(m => ({ default: m.HCLeaveWorkspace })),
  { loading: () => <div className="h-96 animate-pulse bg-gray-100 rounded-xl" /> }
);

/**
 * Komponen halaman Employee HC Leave
 * Memuat komponen HCLeaveWorkspace dengan mode "branch"
 * @returns JSX element komponen HCLeaveWorkspace
 */
export default function EmployeeHCLeavePage() {
    return <HCLeaveWorkspace mode="branch" />;
}
