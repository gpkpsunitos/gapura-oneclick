/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman UQ Reports yang redirect ke dashboard UQ dengan view reports
 */

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Komponen halaman UQ Reports
 * Redirect ke dashboard UQ dengan parameter view=reports
 * @returns null (karena redirect)
 */
export default function UQReportsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/uq?view=reports');
    }, [router]);
    return null;
}
