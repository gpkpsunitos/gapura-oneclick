import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { sendTestEmail } from '@/lib/notifications';

function isAuthorized(role: string | undefined): boolean {
    const normalizedRole = String(role || '').trim().toUpperCase();
    return normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ANALYST';
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Supports admin session auth and service-role internal calls.
export async function POST(request: NextRequest) {
    try {
        const session = request.cookies.get('session')?.value;
        const authHeader = request.headers.get('authorization');
        const isServiceRole = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;

        if (!session && !isServiceRole) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = session ? await verifySession(session) : null;
        if (!isServiceRole && (!payload || !isAuthorized(payload.role))) {
            return NextResponse.json(
                { error: 'Forbidden: Only admins and analysts can send test emails' },
                { status: 403 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const requestedBy =
            payload?.email ||
            (isServiceRole ? 'service-role' : 'unknown');
        const to = String(body.to || payload?.email || '').trim();
        const subject = body.subject ? String(body.subject).trim() : undefined;
        const text = body.text ? String(body.text) : undefined;

        if (!to || !isValidEmail(to)) {
            return NextResponse.json({ error: 'Recipient email tidak valid' }, { status: 400 });
        }

        await sendTestEmail({
            to,
            subject,
            text,
            requestedBy,
        });

        return NextResponse.json({
            success: true,
            message: `Email test dikirim ke ${to}`,
        });
    } catch (error) {
        console.error('[TEST EMAIL API] Failed to send test email:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send test email',
            },
            { status: 500 }
        );
    }
}
