/**
 * @file
 * 
 * File ini berisi API route untuk mengambil data laporan yang telah diagregasi untuk berbagai view dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { normalizeDivisionCode, reportsService, type ReportQueryFilters } from '@/lib/services/reports-service';
import { AnalyticsProcessor } from '@/lib/services/analytics-processor';

/**
 * GET /api/reports/analytics/aggregated
 * 
 * Endpoint yang dioptimalkan untuk Intelligence Dashboards
 * Melakukan agregasi di sisi server untuk meminimalkan transfer data jaringan (KB vs MB)
 * Mendukung berbagai view: case-category, monthly, area-report, airline-report, branch-report, hub-report
 * 
 * @param request - Objek request HTTP dengan query parameters:
 *   - view (required): Tipe agregasi yang diinginkan
 *   - refresh: Force refresh dari sumber data
 *   - dateFrom, dateTo, hub, branch, area, airlines, sourceSheet: Filter data
 * @returns Promise<NextResponse> - Response JSON berisi data yang diagregasi atau error
 * @throws Mengembalikan 400 jika parameter view tidak valid atau tidak disediakan
 * @throws Mengembalikan 500 jika terjadi error server
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view'); // e.g., 'case-category', 'monthly'
    const refresh = searchParams.get('refresh') === 'true';
    
    if (!view) {
      return NextResponse.json({ error: 'Missing "view" parameter' }, { status: 400 });
    }

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

    // Fast-path: only fetch reports if needed
    // For specialized views, we can even restrict fields further on the server fetch
    const reports = await reportsService.getReports({ 
      refresh, 
      filters,
      source: 'sheets',
    });

    let aggregatedData: unknown = {};

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
