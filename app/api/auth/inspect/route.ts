import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    try {
        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const role = String(payload.role).trim().toUpperCase();
        if (role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, payload }, {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    } catch {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
}
