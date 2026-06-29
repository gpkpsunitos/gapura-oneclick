import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { verifySession } from '@/lib/auth-utils';
import { getHfClient } from '@/lib/hf-client';
import { resolveCachedAI } from '@/lib/ai-route-cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = new URL(req.url).searchParams;
    const esklasiRegex = searchParams.get('esklasi_regex') || '';
    const bypassCache = searchParams.get('bypass_cache') === 'true';
    const resolver = async () => {
      const hfClient = getHfClient();
      const response = await hfClient.fetch(
        `/api/ai/dashboard/summary?esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
        { headers: { Accept: 'application/json' } },
        { ttl: 300000, bypassCache }
      );

      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }

      return response.json();
    };

    const result = bypassCache
      ? {
          payload: await resolver(),
          cached: false,
          generatedAt: new Date().toISOString(),
          sourceSyncAt: null,
          stale: false,
        }
      : await resolveCachedAI({
          feature: 'dashboard-summary',
          scope: { esklasiRegex },
          resolver,
        });

    return NextResponse.json({
      ...(result.payload as Record<string, unknown>),
      cached: result.cached,
      generatedAt: result.generatedAt,
      sourceSyncAt: result.sourceSyncAt,
      stale: result.stale,
    }, {
      headers: {
        'Cache-Control': bypassCache ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[API Proxy] Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
