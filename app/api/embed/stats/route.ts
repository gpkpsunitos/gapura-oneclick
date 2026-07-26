
import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

interface ReportRow {

  id: string;

  airline: string | null;

  main_category: string | null;

  status: string | null;

  severity: string | null;

  area: string | null;

  priority: string | null;

  station_code: string | null;

  incident_date: string | null;

  created_at: string;
}

interface AggregatedItem {

  name: string;

  count: number;

  percentage: number;
}

interface StatsResponse {

  type: string;

  range: string;

  totalCount: number;

  distribution: AggregatedItem[];

  trendData: { date: string; count: number }[];
}

function aggregateByField(reports: ReportRow[], field: keyof ReportRow): AggregatedItem[] {
  const counts = new Map<string, number>();

  for (const report of reports) {
    const value = report[field] as string | null;
    const key = value || 'Unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const total = reports.length || 1;
  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100 * 10) / 10
    }))
    .sort((a, b) => b.count - a.count);
}

function buildTrendData(reports: ReportRow[], rangeDays: number): { date: string; count: number }[] {
  const dateMap = new Map<string, number>();
  const today = new Date();

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dateMap.set(d.toISOString().split('T')[0], 0);
  }

  for (const report of reports) {
    const dateStr = report.created_at.split('T')[0];
    if (dateMap.has(dateStr)) {
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    }
  }

  return Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'airline';
    const range = searchParams.get('range') || '7d';

    const rangeDays = range === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rangeDays);

    const fieldMap: Record<string, keyof ReportRow> = {
      airline: 'airline',
      category: 'main_category',
      status: 'status',
      severity: 'severity',
      area: 'area',
      station: 'station_code'
    };

    const field = fieldMap[type] || 'airline';

    const reports = await reportsService.getProjectedReports('analytics', {
      filters: {
        dateFrom: startDate.toISOString()
      },
    });

    const typedReports: ReportRow[] = reports.map(r => ({
        id: r.id,
        airline: r.airline || r.airlines || null,
        main_category: r.main_category || r.general_category || null,
        status: r.status,
        severity: r.severity || null,
        area: r.area || null,
        priority: r.priority || null,
        station_code: r.station_code || r.branch || null,
        incident_date: r.incident_date || r.date_of_event || null,
        created_at: r.created_at
    }));

    const response: StatsResponse = {
      type,
      range,
      totalCount: typedReports.length,
      distribution: aggregateByField(typedReports, field),
      trendData: buildTrendData(typedReports, rangeDays)
    };

    return NextResponse.json(response, {
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
