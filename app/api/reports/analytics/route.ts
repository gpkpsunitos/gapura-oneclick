import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    
    // Parse filters from query string
    const filters = {
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      hub: searchParams.get('hub') || undefined,
      branch: searchParams.get('branch') || undefined,
      area: searchParams.get('area') || undefined,
      airlines: searchParams.get('airlines') || undefined,
      sourceSheet: searchParams.get('sourceSheet') || undefined,
    };

    // Parse fields if provided (expects comma-separated string)
    const fieldsParam = searchParams.get('fields');
    const fields = fieldsParam ? fieldsParam.split(',') : undefined;
    
    // Fetch reports with server-side optimization
    const reports = await reportsService.getReports({ 
      refresh, 
      filters,
      fields 
    });
    
    // Return with caching headers
    return NextResponse.json({
      timestamp: Date.now(),
      count: reports.length,
      reports
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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
