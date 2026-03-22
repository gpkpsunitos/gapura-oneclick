import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
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
            return NextResponse.json({ 
                success: true, 
                payload 
            });
        } else {
            return NextResponse.json({ 
                success: false, 
                error: 'verifySession returned null. Check server logs for details (JWT mismatch, expired, or revoked/missing in DB).' 
            });
        }
    } catch (err: any) {
        return NextResponse.json({ 
            success: false, 
            error: err.message,
            stack: err.stack
        }, { status: 500 });
    }
}
