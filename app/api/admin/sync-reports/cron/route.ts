import { NextRequest, NextResponse } from 'next/server';
import { SyncService } from '@/lib/services/sync-service';
import { logSecurityAudit } from '@/lib/security/audit-logger';

/**
 * Cron-safe sync endpoint designed for Vercel Hobby's 10-second function timeout.
 *
 * Instead of running the full sync in one request, this endpoint:
 * 1. Delegates to SyncService which has its own deduplication (activeSyncPromise)
 * 2. Sets a soft time-budget (8s) and returns early if sync is still in progress
 * 3. Returns a `continuation` flag the caller can use to re-trigger
 *
 * The Vercel cron should point here instead of `/api/admin/sync-reports`.
 * If sync doesn't complete within one invocation, the Vercel cron schedule
 * (daily at 3 AM) or a manual admin trigger can pick it up.
 */

const SOFT_TIMEOUT_MS = 8000;

function isCronRequest(request: NextRequest): boolean {
    return request.headers.get('x-vercel-cron') === 'true' ||
        request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

async function handleCronSync(request: NextRequest) {
    if (!isCronRequest(request) && process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const syncPromise = SyncService.syncReportsFromSheets('vercel-cron');

        const result = await Promise.race([
            syncPromise,
            new Promise<{ timeout: true }>((resolve) =>
                setTimeout(() => resolve({ timeout: true }), SOFT_TIMEOUT_MS)
            ),
        ]);

        if ('timeout' in result && result.timeout) {
            console.log('[CRON-SYNC] Soft timeout reached, sync continuing in background');

            await logSecurityAudit({
                actorId: 'vercel-cron',
                action: 'SYNC_REPORTS_STARTED',
                entityType: 'Report',
                newValue: { status: 'in_progress', note: 'Soft timeout, sync continuing in background' },
                ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
                userAgent: request.headers.get('user-agent'),
            }).catch(() => {});

            return NextResponse.json({
                success: true,
                status: 'in_progress',
                message: 'Sync started but not yet complete within time budget. It continues in the background.',
                continuation: true,
            }, { status: 202 });
        }

        const syncResult = result as Awaited<typeof syncPromise>;

        await logSecurityAudit({
            actorId: 'vercel-cron',
            action: 'SYNC_REPORTS',
            entityType: 'Report',
            newValue: {
                success: syncResult.success,
                inserted: syncResult.inserted,
                updated: syncResult.updated,
                deleted: syncResult.deleted,
                duration: syncResult.duration,
            },
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
            userAgent: request.headers.get('user-agent'),
        }).catch(() => {});

        return NextResponse.json(syncResult, {
            status: syncResult.success ? 200 : 500,
        });
    } catch (error) {
        console.error('[CRON-SYNC] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    return handleCronSync(request);
}

export async function POST(request: NextRequest) {
    return handleCronSync(request);
}
