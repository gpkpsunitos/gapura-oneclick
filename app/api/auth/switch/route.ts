import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseAuthBundle, serializeAuthBundle } from '@/lib/auth-bundle';
import { verifySession } from '@/lib/auth-utils';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();
        if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        const cookieStore = await cookies();
        const currentSessionToken = cookieStore.get('session')?.value;
        const currentSession = currentSessionToken ? await verifySession(currentSessionToken) : null;
        if (!currentSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const bundle = parseAuthBundle(cookieStore.get('auth_bundle')?.value);
        if (!bundle) return NextResponse.json({ error: 'No active bundle' }, { status: 401 });
        if (bundle.active_uid !== String(currentSession.id) || !bundle.sessions[String(currentSession.id)]) {
            return NextResponse.json({ error: 'Direct account switch is not allowed from this session' }, { status: 403 });
        }

        const targetToken = bundle.sessions[userId];
        
        if (!targetToken) return NextResponse.json({ error: 'Account not found in bundle' }, { status: 404 });

        const targetSession = await verifySession(targetToken);
        if (!targetSession || String(targetSession.id) !== String(userId)) {
            return NextResponse.json({ error: 'Target account session is invalid' }, { status: 403 });
        }

        // Update active pointer
        bundle.active_uid = userId;

        // Set cookies
        cookieStore.set('auth_bundle', serializeAuthBundle(bundle), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        cookieStore.set('session', targetToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        const response = NextResponse.json({ success: true });
        response.headers.set('Clear-Site-Data', '"cache", "storage"');
        return response;
    } catch (err) {
        console.error('Switch error:', err);
        return NextResponse.json({ error: 'Switch failed' }, { status: 500 });
    }
}
