import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';
import { getSyncState } from '@/lib/sync-state';
import type { Report } from '@/types';

// Complexity: Time O(N) | Space O(N) where N = report count
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

  // RBAC filtering — server enforces access boundaries before client receives data
  const accessibleReports = applyRbacFilter(reports, role, session.id as string, userStationId, userEmail);

  const syncState = await getSyncState('reports');
  const cacheVersion = syncState.sync_version || 0;

  // SHA-256 integrity hash for client-side corruption detection
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

// Complexity: Time O(N) | Space O(N)
function applyRbacFilter(
  reports: Report[],
  role: string,
  userId: string,
  stationId: string | null,
  email: string
): Report[] {
  if (role === 'SUPER_ADMIN' || role === 'ANALYST') {
    return reports;
  }

  if (role === 'STAFF_CABANG' || role === 'CABANG' || role === 'EMPLOYEE') {
    return reports.filter(r =>
      r.user_id === userId ||
      (email && String(r.reporter_email || '').toLowerCase() === email)
    );
  }

  if (role === 'MANAGER_CABANG' && stationId) {
    return reports.filter(r => r.station_id === stationId || r.branch === stationId);
  }

  if (role.startsWith('DIVISI_') || role.startsWith('PARTNER_')) {
    const division = role.split('_').slice(1).join('_');
    return reports.filter(r => r.target_division === division);
  }

  return [];
}
