import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getHfClient } from '@/lib/hf-client';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/analyze-all
 * 
 * Analyze all reports from Google Sheets using the AI service
 * This is a proxy endpoint that calls the Python AI service
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const role = String(payload.role).trim().toUpperCase();

    const { searchParams } = new URL(request.url);
    const maxRows = searchParams.get('max_rows_per_sheet') || '10000';
    const bypassCache = searchParams.get('bypass_cache') || 'false';
    const includeRegression = searchParams.get('include_regression') || 'true';
    const includeNlp = searchParams.get('include_nlp') || 'true';
    const includeTrends = searchParams.get('include_trends') || 'true';
    const branchParam = searchParams.get('branch');
    const divisionParam = searchParams.get('division');
    const esklasiRegex = searchParams.get('esklasi_regex') || '';

    const branchFilter: string | null = branchParam;
    let branchCode: string | null = null;
    if (role === 'MANAGER_CABANG') {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('station_id')
        .eq('id', payload.id)
        .single();

      if (userData?.station_id) {
        branchCode = String(userData.station_id);
        console.log(`[AI API] Applying branch code for MANAGER_CABANG: ${branchCode}`);
      }
    }

    type OriginalData = {
      station_code?: string;
      branch?: string;
      Station?: string;
      station?: string;
      STATION?: string;
      status?: string;
      Status?: string;
      STATUS?: string;
    };
    type AnalysisItem = { originalData?: OriginalData };

    const hfClient = getHfClient();

    console.log(`[AI API] Calling analyze-all with max_rows=${maxRows}, division=${divisionParam}, branch=${branchParam || branchCode || '-'}`);

    const baseQuery = `max_rows_per_sheet=${maxRows}&bypass_cache=${bypassCache}&include_regression=${includeRegression}&include_nlp=${includeNlp}&include_trends=${includeTrends}&esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
    const primaryPath = `/api/ai/analyze-all?${baseQuery}`;
    const fallbackPath = `/api/ai/analyze-all/fast?${baseQuery}`;
    
    let aiResponse: Response | null = null;
    try {
      aiResponse = await hfClient.fetch(
        primaryPath,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
        { bypassCache: bypassCache.toLowerCase() === 'true' }
      );
      if (!aiResponse.ok) {
        const alt = await hfClient.fetch(
          fallbackPath,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } },
          { bypassCache: bypassCache.toLowerCase() === 'true' }
        ).catch(() => null);
        if (alt && alt.ok) {
          aiResponse = alt;
          console.log('[AI API] Fallback to /fast succeeded');
        }
      }
    } catch {
      try {
        const alt = await hfClient.fetch(
          fallbackPath,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } },
          { bypassCache: bypassCache.toLowerCase() === 'true' }
        ).catch(() => null);
        if (alt && alt.ok) {
          aiResponse = alt;
          console.log('[AI API] Primary failed, /fast succeeded');
        }
      } catch {
        // ignore here; handled below
      }
    }

    if (!aiResponse || !aiResponse.ok) {
      const statusText = aiResponse ? String(aiResponse.status) : 'no_response';
      const errorText = aiResponse ? await aiResponse.text().catch(() => '') : 'network error';
      console.error('[AI API] Both /analyze-all and /fast failed:', statusText, errorText);
      const empty = {
        status: 'success',
        metadata: {
          totalRecords: 0,
          processingTimeSeconds: 0,
          recordsPerSecond: 0,
          modelVersions: { regression: 'n/a', nlp: 'n/a' }
        },
        summary: {
          totalRecords: 0,
          severityDistribution: { Critical: 0, High: 0, Medium: 0, Low: 0 },
          predictionStats: { min: 0, max: 0, mean: 0 }
        },
        results: [],
        _proxy: {
          timestamp: new Date().toISOString(),
          source: 'unavailable-fallback',
          branch_filter: branchCode || branchFilter,
          service_unavailable: true,
          error: errorText || statusText,
          rateLimitStats: hfClient.getStats()
        },
        _pagination: null
      };
      return NextResponse.json(empty, {
        headers: {
          'Cache-Control': 'no-store'
        }
      });
    }

    const data = await aiResponse.json();
    
    if (data.results) {
      const originalCount = data.results.length;
      data.results = data.results.filter((item: AnalysisItem) => {
        const code = item.originalData?.station_code || item.originalData?.branch;
        const station = item.originalData?.Station || item.originalData?.station || item.originalData?.STATION;
        const branchOk = branchCode
          ? (code ? String(code).trim().toLowerCase() === branchCode?.toLowerCase() : true)
          : (branchFilter
              ? (station ? String(station).trim().toLowerCase() === branchFilter?.toLowerCase() : true)
              : true);
        return branchOk;
      });
      console.log(`[AI API] Filtered results from ${originalCount} to ${data.results.length} for branch code ${branchCode || '-'} name ${branchFilter || '-'}`);

      if (!data.summary) {
        data.summary = {};
      }
      data.summary.totalRecords = data.results.length;

      const sd = data.summary.severityDistribution || data.summary.severity_distribution || {};
      const hasAnySD = sd && Object.keys(sd).length > 0;
      if (!hasAnySD && Array.isArray(data.results)) {
        const dist: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
        for (const r of data.results) {
          const sev = String(r?.classification?.severity || 'Low');
          const key = /crit/i.test(sev) ? 'Critical' : /high/i.test(sev) ? 'High' : /med/i.test(sev) ? 'Medium' : 'Low';
          dist[key] = (dist[key] || 0) + 1;
        }
        data.summary.severityDistribution = dist;
      }

      const ps = data.summary.predictionStats || data.summary.prediction_stats;
      if (!ps && data.results.length > 0) {
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        let count = 0;
        for (const r of data.results) {
          const d = r?.prediction?.predictedDays;
          if (typeof d === 'number' && Number.isFinite(d)) {
            if (d < min) min = d;
            if (d > max) max = d;
            sum += d;
            count++;
          }
        }
        data.summary.predictionStats = {
          min: count > 0 ? min : 0,
          max: count > 0 ? max : 0,
          mean: count > 0 ? sum / count : 0,
        };
      }
    }
    
    const response = {
      ...data,
      _proxy: {
        timestamp: new Date().toISOString(),
        source: 'nextjs-api-proxy',
        branch_filter: branchCode || branchFilter,
        rateLimitStats: hfClient.getStats()
      },
      _pagination: null
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': (bypassCache.toLowerCase() === 'true') ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=300',
      }
    });

  } catch (error) {
    console.error('[AI API] Error in analyze-all route:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
