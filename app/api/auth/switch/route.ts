import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseAuthBundle, serializeAuthBundle } from '@/lib/auth-bundle';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();
        if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        const cookieStore = await cookies();
        const bundle = parseAuthBundle(cookieStore.get('auth_bundle')?.value);
        if (!bundle) return NextResponse.json({ error: 'No active bundle' }, { status: 401 });
        const targetToken = bundle.sessions[userId];
        
        if (!targetToken) return NextResponse.json({ error: 'Account not found in bundle' }, { status: 404 });

        // Update active pointer
        bundle.active_uid = userId;

        // Set cookies
        cookieStore.set('auth_bundle', serializeAuthBundle(bundle), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        cookieStore.set('session', targetToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
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
