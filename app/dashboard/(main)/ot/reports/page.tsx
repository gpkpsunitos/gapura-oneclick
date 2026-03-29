'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OTReportsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/ot?view=reports');
    }, [router]);
    return null;
}
