import { after, NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { SyncService } from '@/lib/services/sync-service';

export const runtime = 'nodejs';

const TARGET_REPORT_SHEETS = new Set(['NON CARGO', 'CGO']);

type SessionLike = { role?: unknown } | null | undefined;

function isAuthorized(payload: SessionLike): boolean {
  if (!payload) return false;
  const role = String(payload.role || '').trim().toUpperCase();
  return role === 'SUPER_ADMIN' || role === 'ANALYST';
}

function hasServiceRoleAccess(request: NextRequest): boolean {
  return request.headers.get('authorization') === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
}

function hasWebhookSecretAccess(request: NextRequest): boolean {
  const configuredSecret = String(process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || '').trim();
  if (!configuredSecret) return false;
  return request.headers.get('x-irrs-webhook-secret') === configuredSecret;
}

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value;
    const payload = session ? await verifySession(session) : null;
    const isServiceRole = hasServiceRoleAccess(request);
    const isWebhookSecret = hasWebhookSecretAccess(request);
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!isServiceRole && !isWebhookSecret && !isAuthorized(payload) && !isDevelopment) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>;
    const triggerType = String(body.triggerType || body.changeType || 'unknown');
    const sheetName = typeof body.sheetName === 'string' ? body.sheetName.trim() : '';
    const rowNumber = Number(body.rowNumber || 0);
    const rowSignature = typeof body.rowSignature === 'string' ? body.rowSignature : '';

    if (sheetName && !TARGET_REPORT_SHEETS.has(sheetName)) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Sheet ${sheetName} is outside the report-source allowlist`,
      });
    }

    console.log('[GOOGLE_SHEETS_WEBHOOK] Incoming trigger', {
      triggerType,
      sheetName: sheetName || null,
      rowNumber: Number.isFinite(rowNumber) && rowNumber > 0 ? rowNumber : null,
      rowSignature: rowSignature ? `${rowSignature.slice(0, 12)}...` : null,
    });

    after(async () => {
      try {
        const result = await SyncService.syncReportsFromSheets('google-sheets-webhook');
        console.log('[GOOGLE_SHEETS_WEBHOOK] Background sync finished', {
          success: result.success,
          joined: !!result.joined,
          inserted: result.inserted,
          updated: result.updated,
          deleted: result.deleted,
          errors: result.errors,
          duration: result.duration,
        });
      } catch (error) {
        console.error('[GOOGLE_SHEETS_WEBHOOK] Background sync failed:', error);
      }
    });

    return NextResponse.json(
      {
        success: true,
        accepted: true,
        trigger: {
          triggerType,
          sheetName: sheetName || null,
          rowNumber: Number.isFinite(rowNumber) && rowNumber > 0 ? rowNumber : null,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[GOOGLE_SHEETS_WEBHOOK] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
