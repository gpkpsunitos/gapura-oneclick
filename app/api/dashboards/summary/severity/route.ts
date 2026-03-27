import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({ distribution });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
