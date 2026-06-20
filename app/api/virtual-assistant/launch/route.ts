import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

function redirectToLogin(request: Request) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', '/virtual-assistant');
    return NextResponse.redirect(loginUrl, {
        status: 302,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
}

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        if (!token) {
            return redirectToLogin(request);
        }

        const session = await verifySession(token);
        if (!session) {
            return redirectToLogin(request);
        }

        return NextResponse.redirect(new URL('/virtual-assistant', request.url), {
            status: 302,
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    } catch (error) {
        console.error('[VA_LAUNCH] Failed to create launch token:', error);
        return NextResponse.json(
            { error: 'Failed to open virtual assistant' },
            { status: 500 },
        );
    }
}
