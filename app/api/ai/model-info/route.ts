import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';
import { getHfClient } from '@/lib/hf-client';
import { resolveCachedAI } from '@/lib/ai-route-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

    let reportsCount = 0;
    try {
      const reports = await reportsService.getReports();
      reportsCount = reports.length;
    } catch (err) {
      console.error('[AI Model Info] Failed to fetch reports:', err);
    }

    const { searchParams } = new URL(request.url);
    const esklasiRegex = searchParams.get('esklasi_regex') || '';

    try {
      const result = await resolveCachedAI({
        feature: 'model-info',
        scope: { esklasiRegex, reportsCount },
        resolver: async () => {
          const hfClient = getHfClient();
          const aiResponse = await hfClient.fetch(
            `/api/ai/model-info?esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } },
            { ttl: 60000 }
          );

          if (!aiResponse.ok) {
            throw new Error(`AI service returned ${aiResponse.status}`);
          }

          const data = await aiResponse.json();
          if (data.regression?.metrics) {
            data.regression.metrics.n_samples = reportsCount || data.regression.metrics.n_samples;
          }
          return data;
        },
      });

      return NextResponse.json({
        ...(result.payload as Record<string, unknown>),
        cached: result.cached,
        generatedAt: result.generatedAt,
        sourceSyncAt: result.sourceSyncAt,
        stale: result.stale,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    } catch (error) {
      console.error('[AI Model Info] AI service unavailable:', error);

      return NextResponse.json(
        { 
          error: 'AI service tidak tersedia. Pastikan service AI berjalan di localhost:8000',
          reports_count: reportsCount,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('[AI Model Info] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
