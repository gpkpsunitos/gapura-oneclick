import { NextRequest, NextResponse } from 'next/server';
import { requireElevatedAISession } from '@/lib/ai-route-helpers';
import { getHfClient } from '@/lib/hf-client';
import { resolveCachedAI } from '@/lib/ai-route-cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const session = await requireElevatedAISession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queryString = new URL(req.url).searchParams.toString();
    const result = await resolveCachedAI({
      feature: 'gse-irregularities',
      scope: { queryString },
      resolver: async () => {
        const hfClient = getHfClient();
        const response = await hfClient.fetch(
          `/api/ai/gse/irregularities${queryString ? `?${queryString}` : ''}`,
          { headers: { Accept: 'application/json' } },
          { ttl: 300000 }
        );

        if (!response.ok) {
          throw new Error(`AI service returned ${response.status}`);
        }

        return response.json();
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
    console.error('[API Proxy] Error fetching GSE irregularities:', error);
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
