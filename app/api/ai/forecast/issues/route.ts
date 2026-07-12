/**
 * GET /api/ai/forecast/issues — daily incident-count forecast.
 * Query: ?days=30 (1–90, default 30).
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

export async function GET(req: NextRequest) {
  const session = await requireElevatedAISession();
  if (!session) return unauthorizedResponse();

  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 30));

  try {
    const result = await resolveCachedAI({
      feature: 'forecast-issues-v2',
      scope: { days },
      resolver: () => mlClient.forecast(days),
    });

    return NextResponse.json(
      {
        ...result.payload,
        cached: result.cached,
        generatedAt: result.generatedAt,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (error) {
    return aiUnavailableResponse(error);
  }
}
