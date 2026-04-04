/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi API route untuk logout pengguna dan membersihkan session
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Menangani request GET untuk logout pengguna
 * Menghapus cookies session dan auth_bundle, kemudian redirect ke halaman login
 * @param request - Request object
 * @returns Response redirect ke halaman login dengan headers untuk membersihkan data browser
 */
export async function GET(request: Request) {
    const cookieStore = await cookies();
    
    // Explicitly delete cookies by setting maxAge to 0 with exact same options as login
    cookieStore.set('session', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    cookieStore.set('auth_bundle', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });

    // Force a server-side redirect to flush state
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.headers.set('Clear-Site-Data', '"cache", "storage"');
    return response;
}

/**
 * Menangani request POST untuk logout pengguna
 * Menghapus cookies session dan auth_bundle
 * @returns Response JSON sukses dengan headers untuk membersihkan data browser
 */
export async function POST() {
    const cookieStore = await cookies();
    cookieStore.set('session', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    cookieStore.set('auth_bundle', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    const response = NextResponse.json({ success: true });
    response.headers.set('Clear-Site-Data', '"cache", "storage"');
    return response;
}
