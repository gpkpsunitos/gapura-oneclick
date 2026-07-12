/**
 * GET /api/ai/risk/summary — combined risk overview across all dimensions
 * (airline / branch / area), with the top entity per dimension surfaced.
 */
import { NextResponse } from 'next/server';
import { mlClient, type RiskEntry } from '@/lib/ml-client';
import { resolveCachedAI } from '@/lib/ai-route-cache';
import {
  requireElevatedAISession,
  unauthorizedResponse,
  aiUnavailableResponse,
} from '@/lib/ai-route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function entityName(entry: RiskEntry | undefined): string | null {
  if (!entry) return null;
  const nameField = Object.entries(entry).find(([, value]) => typeof value === 'string');
  return nameField ? String(nameField[1]) : null;
}

export async function GET() {
  const session = await requireElevatedAISession();
  if (!session) return unauthorizedResponse();

  try {
    const result = await resolveCachedAI({
      feature: 'risk-summary-v2',
      scope: {},
      resolver: async () => {
        const res = await mlClient.riskScore();
        const rankings = res.rankings ?? {};
        return {
          status: res.status,
          rankings,
          highlights: {
            topAirline: entityName(rankings.airline?.[0]),
            topBranch: entityName(rankings.branch?.[0]),
            topArea: entityName(rankings.area?.[0]),
          },
        };
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
