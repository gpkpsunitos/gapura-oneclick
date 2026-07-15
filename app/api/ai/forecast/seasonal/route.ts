/**
 * GET /api/ai/forecast/seasonal — STL seasonality decomposition of the
 * historical incident time series (trend + weekly seasonal + residual).
 */
import { NextResponse } from 'next/server';
import { mlClient } from '@/lib/ml-client';
import { resolveCachedAI } from '@/lib/ai-route-cache';
import {
  requireElevatedAISession,
  unauthorizedResponse,
  aiUnavailableResponse,
} from '@/lib/ai-route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const session = await requireElevatedAISession();
  if (!session) return unauthorizedResponse();

  try {
    const result = await resolveCachedAI({
      feature: 'seasonality-v2',
      scope: {},
      resolver: () => mlClient.seasonality(),
    });

    return NextResponse.json(
      {
        ...result.payload,
        cached: result.cached,
        generatedAt: result.generatedAt,
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch (error) {
    return aiUnavailableResponse(error);
  }
}
