'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UQReportsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/uq?view=reports');
    }, [router]);
    return null;
}
