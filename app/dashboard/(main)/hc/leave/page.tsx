/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman HC Leave yang memuat HCLeaveWorkspace komponen
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
 * Komponen halaman HC Leave
 * Memuat komponen HCLeaveWorkspace dengan mode "hc"
 * @returns JSX element komponen HCLeaveWorkspace
 */
export default function HCLeavePage() {
    return <HCLeaveWorkspace mode="hc" />;
}
