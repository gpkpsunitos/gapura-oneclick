'use client';

import { redirect } from 'next/navigation';

export default function OPReportsPage() {
    (async () => {
        try {
            await fetch('/api/reports/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            await fetch('/api/admin/sync-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        } catch {}
        redirect('/dashboard/op?view=reports');
    })();
}
