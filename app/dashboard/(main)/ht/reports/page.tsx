'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HTReportsPage() {
    const router = useRouter();
    useEffect(() => {
        const controller = new AbortController();
        const run = async () => {
            try {
                await fetch('/api/admin/sync-reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal
                });
            } catch {}
            router.replace('/dashboard/ht?view=reports');
        };
        run();
        return () => controller.abort();
    }, [router]);
    return null;
}
