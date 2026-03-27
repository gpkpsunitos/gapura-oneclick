import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface FilterParams {
  airline?: string;
  category?: string;
  status?: string;
  severity?: string;
  area?: string;
  station?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 100);
    
    // Parse filters
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
    
    // Build query with filters - Complexity: O(1) query building
    let query = supabase
      .from('reports')
      .select(`
        id,
        title,
        status,
        severity,
        priority,
        airline,
        main_category,
        sub_category,
        area,
        target_division,
        station_code,
        incident_date,
        incident_time,
        created_at,
        sla_deadline
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Apply filters dynamically
    if (filters.airline) query = query.eq('airline', filters.airline);
    if (filters.category) query = query.eq('main_category', filters.category);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.severity) query = query.eq('severity', filters.severity);
    if (filters.area) query = query.eq('area', filters.area);
    if (filters.station) query = query.eq('station_code', filters.station);
    
    const { data: reports, error, count } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Compute summary stats
    const summary = {
      total: reports?.length || 0,
      byStatus: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };
    
    for (const r of reports || []) {
      const status = r.status || 'Unknown';
      const severity = r.severity || 'Unknown';
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
      summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;
    }
    
    return NextResponse.json({
      range,
      filters,
      summary,
      reports: reports || [],
      totalCount: count ?? reports?.length ?? 0
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
