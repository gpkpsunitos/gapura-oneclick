
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { reportsService } from '@/lib/services/reports-service';

export async function GET() {
  try {

    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(session);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = String(payload.role).trim().toUpperCase();

    let canViewAll = role === 'SUPER_ADMIN';
    let userStationCode: string | null = null;

    if (!canViewAll) {
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('id, role, stations(code)')
            .eq('id', payload.id)
            .single();

        if (user && user.stations) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            userStationCode = user.stations.code;

            if (userStationCode === 'KPS' || userStationCode === 'GPS' || userStationCode === 'PUSAT') {
                canViewAll = true;
            }
        }
    }

    const reports = await reportsService.getReports();

    let accessibleReports = reports;
    if (!canViewAll) {
      if (userStationCode) {
        accessibleReports = reports.filter(r => r.branch === userStationCode);
      } else {
        accessibleReports = [];
      }
    }

    return NextResponse.json({
      timestamp: Date.now(),
      count: accessibleReports.length,
      reports: accessibleReports
    }, {
      headers: {

        'Cache-Control': 'private, no-store, max-age=0',
      }
    });

  } catch (err) {
    console.error('Sync API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
