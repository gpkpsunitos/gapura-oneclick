import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { reportsService } from '@/lib/services/reports-service';

export async function GET(request: NextRequest) {
  try {
    // Auth check
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
    // Allow ANALYST, SUPER_ADMIN, CABANG, etc.
    // Basically any authenticated user can sync their own data view
    
    // Determine access scope
    let canViewAll = role === 'SUPER_ADMIN';
    let userStationCode: string | null = null;
    
    // Fetch user details to get station_id/code if not Super Admin
    if (!canViewAll) {
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('id, role, stations(code)')
            .eq('id', payload.id)
            .single();
            
        if (user && user.stations) {
            // @ts-ignore
            userStationCode = user.stations.code;
            
            // Check if user is from HQ (GPS)
            if (userStationCode === 'GPS' || userStationCode === 'PUSAT') {
                canViewAll = true;
            }
        }
    }

    // Fetch all reports
    const reports = await reportsService.getReports();

    // Filter by RBAC
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
        // Cache for 5 minutes (stale-while-revalidate for 10 mins)
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
      }
    });

  } catch (err) {
    console.error('Sync API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
