/**
 * @file
 * 
 * File ini berisi API route untuk mengambil data laporan dengan dukungan filter dan caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { normalizeDivisionCode, reportsService, type ReportQueryFilters } from '@/lib/services/reports-service';

/**
 * GET /api/reports/analytics
 * 
 * Mengambil data laporan untuk analitik dengan dukungan filter berbagai parameter
 * Mendukung refresh data dari sumber eksternal dan caching
 * 
 * @param request - Objek request HTTP dengan query parameters
 * @returns Promise<NextResponse> - Response JSON berisi daftar laporan yang difilter atau error
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
    const refresh = searchParams.get('refresh') === 'true';
    
    // Parse filters from query string
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

    // Parse fields if provided (expects comma-separated string)
    const fieldsParam = searchParams.get('fields');
    const fields = fieldsParam ? fieldsParam.split(',') : undefined;
    
    const sourceParam = searchParams.get('source');
    const source: 'sheets' | 'sync' = sourceParam === 'sync' ? 'sync' : 'sheets';

    // Fetch reports with server-side optimization
    const reports = await reportsService.getReports({ 
      refresh, 
      filters,
      fields,
      source,
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
