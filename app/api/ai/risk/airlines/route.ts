/**
 * GET /api/ai/risk/airlines — airline risk rankings from the ML service.
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
      feature: 'risk-airlines-v2',
      scope: {},
      resolver: async () => {
        const res = await mlClient.riskScore();
        return { status: res.status, rankings: res.rankings?.airline ?? [] };
      },
    });

    return NextResponse.json(
      {
        ...(result.payload as Record<string, unknown>),
        cached: result.cached,
        generatedAt: result.generatedAt,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (error) {
    return aiUnavailableResponse(error);
  }
}
