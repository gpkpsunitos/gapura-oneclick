import { NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { purgeDashboardSnapshots, purgeExpiredDashboardSnapshots } from '@/lib/dashboard-cache';

export async function POST(request: Request) {
    try {

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifySession(session);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        reportsService.invalidateCache();
        await purgeDashboardSnapshots();
        await purgeExpiredDashboardSnapshots();

        return NextResponse.json({ message: 'Dashboard snapshots invalidated successfully' });
    } catch (error) {
        console.error('Refresh API Error:', error);
        return NextResponse.json({ error: 'Failed to refresh data' }, { status: 500 });
    }
}
