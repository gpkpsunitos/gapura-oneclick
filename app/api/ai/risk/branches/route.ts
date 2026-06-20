import { NextResponse, NextRequest } from 'next/server';
import { getHfClient } from '@/lib/hf-client';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { resolveCachedAI } from '@/lib/ai-route-cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const esklasiRegex = new URL(req.url).searchParams.get('esklasi_regex') || '';

    const result = await resolveCachedAI({
      feature: 'risk-branches',
      scope: { esklasiRegex },
      resolver: async () => {
        const hfClient = getHfClient();
        const response = await hfClient.fetch(
          `/api/ai/risk/branches?esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
          { headers: { 'Accept': 'application/json' } },
          { ttl: 300000 }
        );

        if (!response.ok) {
          throw new Error(`AI service returned ${response.status}`);
        }

        return response.json();
      },
    });

    if (!result.payload || typeof result.payload !== 'object') {
      return NextResponse.json(
        { cached: result.cached, generatedAt: result.generatedAt, sourceSyncAt: result.sourceSyncAt, stale: result.stale },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

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
    console.error('[API Proxy] Error fetching branch risk data:', error);
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
