import { NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

export async function POST(request: Request) {
    try {
        // Auth Check
        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const payload = await verifySession(session);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only allow Analyst/Admin/Cabang to refresh? Or anyone logged in?
        // Let's stick to valid session for now.

        // Invalidate Cache
        reportsService.invalidateCache();
        
        // Optionally, we could immediately fetch new data to warm the cache,
        // but let's just let the next request do it (or client will request immediately).
        
        return NextResponse.json({ message: 'Cache invalidated successfully' });
    } catch (error) {
        console.error('Refresh API Error:', error);
        return NextResponse.json({ error: 'Failed to refresh data' }, { status: 500 });
    }
}
