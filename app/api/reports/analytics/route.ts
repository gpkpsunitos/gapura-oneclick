
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { normalizeDivisionCode, reportsService, type ReportQueryFilters } from '@/lib/services/reports-service';
import { applyReportsRbacFilter } from '@/lib/reports-rbac';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    const divisionParam = searchParams.get('esklasiDivision') || searchParams.get('targetDivision');
    const normalizedDivision = divisionParam ? normalizeDivisionCode(divisionParam) : undefined;
    if (divisionParam && !normalizedDivision) {
      return NextResponse.json(
        { error: 'Invalid "esklasiDivision/targetDivision" parameter. Use one of: OP, OS, HT, HC.' },
        { status: 400 }
      );
    }
    const filters: ReportQueryFilters = {
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      hub: searchParams.get('hub') || undefined,
      branch: searchParams.get('branch') || undefined,
      area: searchParams.get('area') || undefined,
      airlines: searchParams.get('airlines') || undefined,
      sourceSheet: searchParams.get('sourceSheet') || undefined,
      esklasiRegex: searchParams.get('esklasiRegex') || searchParams.get('esklasi_regex') || undefined,
      targetDivision: normalizedDivision,
      gseOnly: searchParams.get('gseOnly') === 'true',
    };

    const fieldsParam = searchParams.get('fields');
    const fields = fieldsParam ? fieldsParam.split(',') : undefined;

    const sourceParam = searchParams.get('source');
    const source: 'sheets' | 'sync' = sourceParam === 'sheets' ? 'sheets' : 'sync';

    const allReports = await reportsService.getReports({
      refresh,
      filters,
      fields,
      source,
    });

    const role = String(session.role || '').trim().toUpperCase();
    const stationId = (session.station_id as string | null) ?? null;
    const email = String(session.email || '').trim().toLowerCase();
    const reports = applyReportsRbacFilter(allReports, role, session.id as string, stationId, email);

    return NextResponse.json({
      timestamp: Date.now(),
      count: reports.length,
      reports
    }, {
      headers: {
        // Per-session RBAC-filtered data must never be cached in a shared/CDN cache.
        'Cache-Control': 'private, no-store',
      }
    });

  } catch (err) {
    console.error('Analytics API error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch reports',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
