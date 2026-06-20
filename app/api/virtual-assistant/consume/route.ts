import { NextResponse } from 'next/server';
import {
    consumeVirtualAssistantQuota,
    hasValidVirtualAssistantInternalSecret,
    isVirtualAssistantSessionActive,
    verifyVirtualAssistantToken,
} from '@/lib/virtual-assistant';

function secondsUntil(date: Date): number {
    return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

export async function POST(request: Request) {
    try {
        if (!hasValidVirtualAssistantInternalSecret(request.headers.get('authorization'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const token = typeof body?.token === 'string' ? body.token.trim() : '';
        if (!token) {
            return NextResponse.json({ error: 'Virtual assistant token is required' }, { status: 400 });
        }

        const claims = await verifyVirtualAssistantToken(token);
        if (!claims || !(await isVirtualAssistantSessionActive(claims))) {
            return NextResponse.json({ error: 'Invalid virtual assistant token' }, { status: 401 });
        }

        const quota = await consumeVirtualAssistantQuota(claims.userId);
        const retryAfter = secondsUntil(quota.resetAt);
        const payload = {
            allowed: quota.allowed,
            remaining: quota.remaining,
            reset_at: quota.resetAt.toISOString(),
            retry_after_seconds: retryAfter,
        };

        if (!quota.allowed) {
            return NextResponse.json(
                {
                    ...payload,
                    error: 'Batas 5 pesan harian untuk Virtual Assistant sudah habis.',
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(retryAfter),
                        'Cache-Control': 'no-store, max-age=0',
                    },
                },
            );
        }

        return NextResponse.json(payload, {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    } catch (error) {
        console.error('[VA_CONSUME] Failed to consume quota:', error);
        return NextResponse.json(
            { error: 'Failed to consume virtual assistant quota' },
            { status: 500 },
        );
    }
}
