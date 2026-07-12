import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';
import { getSyncState } from '@/lib/sync-state';
import { applyReportsRbacFilter } from '@/lib/reports-rbac';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = String(session.role).trim().toUpperCase();
  const userStationId = session.station_id as string | null;
  const userEmail = String(session.email || '').trim().toLowerCase();

  const reports = await reportsService.getReports({ source: 'sync' });

  const accessibleReports = applyReportsRbacFilter(reports, role, session.id as string, userStationId, userEmail);

  const syncState = await getSyncState('reports');
  const cacheVersion = syncState.sync_version || 0;

  const serialized = JSON.stringify(accessibleReports);
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
  const integrity = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return NextResponse.json({
    reports: accessibleReports,
    cacheVersion,
    integrity,
    userId: session.id,
    timestamp: Date.now(),
  }, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Vary': 'Cookie',
    },
  });
}
