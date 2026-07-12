/**
 * GET /api/ai/overview — one-call aggregate for the AI insights dashboard.
 *
 * Fans out to the Gapura ML Service (daily forecast, per-entity trends,
 * risk rankings, per-subcategory weekly forecast, model health) with
 * Promise.allSettled so one slow/failed section never blanks the page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { mlClient } from '@/lib/ml-client';
import { resolveCachedAI } from '@/lib/ai-route-cache';
import {
  requireElevatedAISession,
  unauthorizedResponse,
  aiUnavailableResponse,
} from '@/lib/ai-route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function settled<T>(result: PromiseSettledResult<T>): T | null {
  if (result.status === 'fulfilled') return result.value;
  console.error('[AI Overview] section failed:', result.reason);
  return null;
}

export async function GET(req: NextRequest) {
  const session = await requireElevatedAISession();
  if (!session) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const bypassCache = searchParams.get('bypass_cache') === 'true';

  try {
    const result = await resolveCachedAI({
      feature: 'ml-overview',
      scope: { v: 1, bust: bypassCache ? Date.now() : 0 },
      resolver: async () => {
        const [forecast, branchTrends, subcatTrends, risk, subcatForecast, health] =
          await Promise.allSettled([
            mlClient.forecast(14),
            mlClient.trends('branch', 12),
            mlClient.trends('subcategory', 12),
            mlClient.riskScore(),
            mlClient.forecastByDimension('subcategory', 4),
            mlClient.health(),
          ]);

        return {
          status: 'ok' as const,
          forecast: settled(forecast),
          trends: { branch: settled(branchTrends), subcategory: settled(subcatTrends) },
          risk: settled(risk),
          subcategoryForecast: settled(subcatForecast),
          health: settled(health),
        };
      },
    });

    return NextResponse.json(
      {
        ...(result.payload as Record<string, unknown>),
        cached: result.cached,
        generatedAt: result.generatedAt,
        stale: result.stale,
      },
      // private: response is behind session auth, so shared/CDN caches must not
      // store it and serve it to unauthenticated clients.
      { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' } },
    );
  } catch (error) {
    return aiUnavailableResponse(error);
  }
}
