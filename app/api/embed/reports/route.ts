
import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

interface FilterParams {
  airline?: string;
  category?: string;
  status?: string;
  severity?: string;
  area?: string;
  station?: string;
}

function sameValue(actual: unknown, expected: string) {
  return String(actual || '').trim() === expected;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedRange = searchParams.get('range');
    const range = requestedRange === '30d' ? '30d' : '7d';
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '500', 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 5000)
      : 500;

    const filters: FilterParams = {
      airline: searchParams.get('airline') || undefined,
      category: searchParams.get('category') || undefined,
      status: searchParams.get('status') || undefined,
      severity: searchParams.get('severity') || undefined,
      area: searchParams.get('area') || undefined,
      station: searchParams.get('station') || undefined
    };

    const rangeDays = range === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rangeDays);
    const sheetsReports = await reportsService.getProjectedReports('embed', {
      source: 'sync',
      filters: {
        dateFrom: startDate.toISOString(),
        airlines: filters.airline,
        area: filters.area,
        branch: filters.station,
      },
    });

    const filteredReports = sheetsReports.filter((report) => {
      const category = report.main_category || report.category || report.irregularity_complain_category;
      const airline = report.airlines || report.airline;
      const station = report.station_code || report.branch || report.reporting_branch;

      if (filters.airline && !sameValue(airline, filters.airline)) return false;
      if (filters.category && !sameValue(category, filters.category)) return false;
      if (filters.status && !sameValue(report.status, filters.status)) return false;
      if (filters.severity && !sameValue(report.severity, filters.severity)) return false;
      if (filters.area && !sameValue(report.area, filters.area)) return false;
      if (filters.station && !sameValue(station, filters.station)) return false;
      return true;
    });

    const reports = filteredReports.slice(0, limit);

    const summary = {
      total: reports.length,
      byStatus: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };

    for (const r of reports) {
      const status = r.status || 'Unknown';
      const severity = r.severity || 'Unknown';
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
      summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;
    }

    return NextResponse.json({
      range,
      filters,
      summary,
      reports,
      totalCount: filteredReports.length
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
