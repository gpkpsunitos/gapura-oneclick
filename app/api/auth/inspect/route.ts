import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

export async function GET() {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!isDevelopment) {

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

            return NextResponse.json({
                success: true,
                payload
            }, {
                headers: { 'Cache-Control': 'no-store, max-age=0' },
            });
        } catch {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const authBundle = cookieStore.get('auth_bundle')?.value;

    if (!token) {
        return NextResponse.json({
            success: false,
            error: 'No session token found in cookies',
            hasBundle: !!authBundle
        });
    }

    try {
        const payload = await verifySession(token);
        if (payload) {
            const role = String(payload.role).trim().toUpperCase();
            if (role !== 'SUPER_ADMIN' && role !== 'ANALYST') {
                return NextResponse.json({
                    success: true,
                    payload: {
                        id: payload.id,
                        role: payload.role,
                        email: payload.email
                    }
                }, {
                    headers: { 'Cache-Control': 'no-store, max-age=0' },
                });
            }
            return NextResponse.json({
                success: true,
                payload
            }, {
                headers: { 'Cache-Control': 'no-store, max-age=0' },
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Session invalid or expired.'
            });
        }
    } catch {
        return NextResponse.json({
            success: false,
            error: 'Session verification failed.'
        }, { status: 500 });
    }
}
