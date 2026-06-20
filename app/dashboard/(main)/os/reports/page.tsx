/**
 * @file
 * 
 * File ini berisi halaman OS Reports yang redirect ke dashboard OS dengan view reports
 */

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Komponen halaman OS Reports
 * Redirect ke dashboard OS dengan parameter view=reports
 * @returns null (karena redirect)
 */
export default function OSReportsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/os?view=reports');
    }, [router]);
    return null;
}
