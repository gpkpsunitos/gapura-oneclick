import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { verifySession } from '@/lib/auth-utils';
import { getHfClient } from '@/lib/hf-client';
import { resolveCachedAI } from '@/lib/ai-route-cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queryString = new URL(req.url).searchParams.toString();
    const result = await resolveCachedAI({
      feature: 'forecast-issues',
      scope: { queryString },
      resolver: async () => {
        const hfClient = getHfClient();
        const response = await hfClient.fetch(
          `/api/ai/forecast/issues${queryString ? `?${queryString}` : ''}`,
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
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('[API Proxy] Error fetching issue forecast:', error);
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
