import { NextRequest, NextResponse } from 'next/server';
import { mlClient } from '@/lib/ml-client';

// ml-service /retrain runs synchronously (~20-60s). Vercel functions are short-lived,
// so we kick it off, wait briefly, and return 202 — the ml-service keeps training and
// replaces the model server-side regardless of whether this connection stays open.
export const maxDuration = 60; // Vercel Hobby cap.
const SOFT_TIMEOUT_MS = 8000;

function isCronRequest(request: NextRequest): boolean {
    return request.headers.get('x-vercel-cron') === 'true' ||
        request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

async function handleCronRetrain(request: NextRequest) {
    if (!isCronRequest(request) && process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // force_detect=true so a renamed/added sheet column is picked up daily.
        const retrainPromise = mlClient.triggerRetrain(true);

        const result = await Promise.race([
            retrainPromise.then((metrics) => ({ done: true as const, metrics })),
            new Promise<{ timeout: true }>((resolve) =>
                setTimeout(() => resolve({ timeout: true }), SOFT_TIMEOUT_MS)
            ),
        ]);

        // Swallow late failures so an unhandled rejection doesn't crash the worker.
        retrainPromise.catch((err) =>
            console.error('[CRON-RETRAIN] retrain failed:', err)
        );

        if ('timeout' in result) {
            return NextResponse.json({
                success: true,
                status: 'in_progress',
                message: 'Retrain started; it continues on the ML service and replaces the model when done.',
            }, { status: 202 });
        }

        return NextResponse.json({ success: true, status: 'completed', ...result }, { status: 200 });
    } catch (error) {
        console.error('[CRON-RETRAIN] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    return handleCronRetrain(request);
}

export async function POST(request: NextRequest) {
    return handleCronRetrain(request);
}
