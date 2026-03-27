import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';
import { AnalyticsProcessor } from '@/lib/services/analytics-processor';

/**
 * GET /api/reports/analytics/aggregated
 * 
 * Performance-optimized endpoint for Intelligence Dashboards.
 * Performs server-side aggregation to minimize network transfer (KB vs MB).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view'); // e.g., 'case-category', 'monthly'
    const refresh = searchParams.get('refresh') === 'true';
    
    if (!view) {
      return NextResponse.json({ error: 'Missing "view" parameter' }, { status: 400 });
    }

    const filters = {
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      hub: searchParams.get('hub') || undefined,
      branch: searchParams.get('branch') || undefined,
      area: searchParams.get('area') || undefined,
      airlines: searchParams.get('airlines') || undefined,
      sourceSheet: searchParams.get('sourceSheet') || undefined,
    };

    // Fast-path: only fetch reports if needed
    // For specialized views, we can even restrict fields further on the server fetch
    const reports = await reportsService.getReports({ 
      refresh, 
      filters 
    });

    let aggregatedData: any = {};

    switch (view) {
      case 'case-category':
        aggregatedData = AnalyticsProcessor.processCaseCategory(reports);
        break;
      case 'monthly':
        aggregatedData = AnalyticsProcessor.processMonthlyReport(reports);
        break;
      case 'area-report':
        aggregatedData = AnalyticsProcessor.processAreaReport(reports);
        break;
      case 'airline-report':
        aggregatedData = AnalyticsProcessor.processAirlineReport(reports);
        break;
      case 'branch-report':
        aggregatedData = AnalyticsProcessor.processBranchReport(reports);
        break;
      case 'hub-report':
        aggregatedData = AnalyticsProcessor.processHubReport(reports);
        break;
      default:
        return NextResponse.json({ error: `Unsupported view: ${view}` }, { status: 400 });
    }

    return NextResponse.json({
      timestamp: Date.now(),
      view,
      count: reports.length,
      data: aggregatedData
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    });

  } catch (err) {
    console.error('Aggregated Analytics API error:', err);
    return NextResponse.json({ 
      error: 'Failed to aggregate reports',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
