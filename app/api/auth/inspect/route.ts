import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

export async function GET() {
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
            // Only allow SUPER_ADMIN and ANALYST to inspect sessions
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
        // Never expose stack traces or internal error details
        return NextResponse.json({ 
            success: false, 
            error: 'Session verification failed.' 
        }, { status: 500 });
    }
}
