import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { SyncService } from '@/lib/services/sync-service';

type SessionLike = { role?: unknown } | null | undefined;

function isAuthorized(payload: SessionLike): boolean {
  if (!payload) return false;
  const role = String(payload.role).trim().toUpperCase();
  return role === 'SUPER_ADMIN' || role === 'ANALYST';
}

export async function POST(request: NextRequest) {
  try {
    // Debug logging
    const nodeEnv = process.env.NODE_ENV;
    console.log('[SYNC API] NODE_ENV:', nodeEnv);
    
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    
    // Check for service role authorization (for cron jobs/internal scripts)
    const authHeader = request.headers.get('authorization');
    const isServiceRole = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
    
    // Check for Vercel Cron authorization
    const isVercelCron = request.headers.get('x-vercel-cron') === 'true' || 
                         authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    // Allow in development mode without auth
    const isDevelopment = nodeEnv === 'development';
    
    console.log('[SYNC API] isDevelopment:', isDevelopment, 'hasSession:', !!session, 'isServiceRole:', isServiceRole, 'isVercelCron:', isVercelCron);
    
    let payload = null;
    
    if (session) {
      payload = await verifySession(session);
    }
    
    // Allow if: service role, Vercel cron, authorized user, or in development mode
    if (!isServiceRole && !isVercelCron && !isAuthorized(payload) && !isDevelopment) {
      console.log('[SYNC API] Access denied');
      return NextResponse.json({ 
        error: 'Forbidden: Only admins and analysts can trigger sync' 
      }, { status: 403 });
    }

    console.log('[SYNC API] Access granted, starting sync...');

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'status') {
      const status = await SyncService.getSyncStatus();
      return NextResponse.json(status);
    }

    if (action === 'clear') {
      const result = await SyncService.clearSyncedData();
      return NextResponse.json(result);
    }

    const result = await SyncService.syncReportsFromSheets('admin-sync-api');
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });

  } catch (error) {
    console.error('[API] Sync reports error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    
    // Check for service role authorization
    const authHeader = request.headers.get('authorization');
    const isServiceRole = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
    
    // Allow in development mode without auth
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    let payload = null;
    
    if (session) {
      payload = await verifySession(session);
    }
    
    // Allow if: service role, authenticated user, or in development mode
    if (!isServiceRole && !payload && !isDevelopment) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await SyncService.getSyncStatus();
    
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });

  } catch (error) {
    console.error('[API] Get sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
