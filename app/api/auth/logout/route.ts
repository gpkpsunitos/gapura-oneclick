import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const cookieStore = await cookies();
    
    // Explicitly delete cookies by setting maxAge to 0 with exact same options as login
    cookieStore.set('session', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    cookieStore.set('auth_bundle', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    // Force a server-side redirect to flush state
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.headers.set('Clear-Site-Data', '"cache", "storage"');
    return response;
}

export async function POST() {
    const cookieStore = await cookies();
    cookieStore.set('session', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    cookieStore.set('auth_bundle', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    const response = NextResponse.json({ success: true });
    response.headers.set('Clear-Site-Data', '"cache", "storage"');
    return response;
}
