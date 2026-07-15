/**
 * GET /api/ai/forecast/trends — statistically significant rising/falling
 * incident trends per entity.
 * Query: ?dimension=branch|airline|area|subcategory|category&weeks=12
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

const DIMENSIONS = ['airline', 'branch', 'area', 'subcategory', 'category'] as const;
type Dimension = (typeof DIMENSIONS)[number];

export async function GET(req: NextRequest) {
  const session = await requireElevatedAISession();
  if (!session) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const rawDimension = searchParams.get('dimension') ?? 'branch';
  const dimension: Dimension = (DIMENSIONS as readonly string[]).includes(rawDimension)
    ? (rawDimension as Dimension)
    : 'branch';
  const weeks = Math.min(52, Math.max(2, Number(searchParams.get('weeks')) || 12));

  try {
    const result = await resolveCachedAI({
      feature: 'forecast-trends-v2',
      scope: { dimension, weeks },
      resolver: () => mlClient.trends(dimension, weeks),
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
