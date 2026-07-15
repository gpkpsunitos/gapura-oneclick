/**
 * GET /api/ai/risk/branches — branch risk rankings from the ML service.
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
      feature: 'risk-branches-v2',
      scope: {},
      resolver: async () => {
        const res = await mlClient.riskScore();
        return { status: res.status, rankings: res.rankings?.branch ?? [] };
      },
    });

    return NextResponse.json(
      {
        ...(result.payload as Record<string, unknown>),
        cached: result.cached,
        generatedAt: result.generatedAt,
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch (error) {
    return aiUnavailableResponse(error);
  }
}
