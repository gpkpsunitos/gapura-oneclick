/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman HT Reports yang redirect ke dashboard HT dengan view reports
 */

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Komponen halaman HT Reports
 * Redirect ke dashboard HT dengan parameter view=reports
 * @returns null (karena redirect)
 */
export default function HTReportsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/ht?view=reports');
    }, [router]);
    return null;
}
