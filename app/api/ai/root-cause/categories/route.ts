import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { getHfClient } from '@/lib/hf-client';
import { resolveCachedAI } from '@/lib/ai-route-cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * Proxy for AI Root Cause Categories Metadata
 * GET /api/ai/root-cause/categories
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const esklasiRegex = searchParams.get('esklasi_regex') || '';
    const targetPath = `/api/ai/root-cause/categories?esklasi_regex=${encodeURIComponent(esklasiRegex)}`;

    const result = await resolveCachedAI({
      feature: 'root-cause-categories',
      scope: { esklasiRegex },
      resolver: async () => {
        const hfClient = getHfClient();
        const response = await hfClient.fetch(
          targetPath,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } },
          { ttl: 300000 }
        );

        if (!response.ok) {
          throw new Error(`AI Service Error: ${response.statusText}`);
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
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[Proxy] Error fetching root cause categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories from AI service' },
      { status: 500 }
    );
  }
}
