import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSessionPayload } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Revoke session in DB then nuke cookies — single responsibility, no branching
// Complexity: Time O(1) | Space O(1)
async function destroySession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (token) {
        const payload = await readSessionPayload(token).catch(() => null);

        if (payload?.sid) {
            // Fire-and-forget revocation — don't block logout on DB latency
            supabaseAdmin
                .from('security_sessions')
                .update({ is_revoked: true })
                .eq('session_id', payload.sid)
                .then();
        }
    }

    const opts = {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
    };

    cookieStore.set('session', '', opts);
    cookieStore.set('auth_bundle', '', opts);
}

export async function GET(request: Request) {
    await destroySession();

    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.headers.set('Clear-Site-Data', '"cache", "storage"');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
}

export async function POST() {
    await destroySession();

    const response = NextResponse.json({ success: true });
    response.headers.set('Clear-Site-Data', '"cache", "storage"');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
}
