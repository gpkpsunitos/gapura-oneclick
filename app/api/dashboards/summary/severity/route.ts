import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const dateFrom = url.searchParams.get('dateFrom') || undefined;
    const dateTo = url.searchParams.get('dateTo') || undefined;
    const hub = url.searchParams.get('hub') || undefined;
    const branch = url.searchParams.get('branch') || undefined;
    const airlines = url.searchParams.get('airlines') || undefined;
    const area = url.searchParams.get('area') || undefined;

    const distribution = await reportsService.getSeverityDistribution({
      dateFrom,
      dateTo,
      hub,
      branch,
      airlines,
      area,
    });

    return NextResponse.json({ distribution }, {
      headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
