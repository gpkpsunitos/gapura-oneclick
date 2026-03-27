import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { getHfClient } from '@/lib/hf-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Proxy for AI Root Cause Statistics
 * GET /api/ai/root-cause/stats
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const esklasiRegex = searchParams.get('esklasi_regex') || '';
    const targetPath = `/api/ai/root-cause/stats?esklasi_regex=${encodeURIComponent(esklasiRegex)}`;

    console.log(`[Proxy] Fetching root cause stats from: ${targetPath}`);

    const hfClient = getHfClient();
    const response = await hfClient.fetch(
      targetPath,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
      { ttl: 300000 }
    );

    if (!response.ok) {
      console.error(`[Proxy] AI Service failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `AI Service Error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Proxy] Error fetching root cause stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch analysis from AI service',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
