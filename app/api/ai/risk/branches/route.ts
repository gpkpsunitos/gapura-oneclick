import { NextResponse, NextRequest } from 'next/server';
import { getHfClient } from '@/lib/hf-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const esklasiRegex = new URL(req.url).searchParams.get('esklasi_regex') || '';
    const hfClient = getHfClient();
    const response = await hfClient.fetch(
      `/api/ai/risk/branches?bypass_cache=true&esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
      { headers: { 'Accept': 'application/json' } },
      { bypassCache: true }
    );

    if (!response.ok) {
      console.error(`[API Proxy] Failed to fetch branch risk data: ${response.status}`);
      return NextResponse.json({}, { status: 200 });
    }

    const data = await response.json();
    if (!data || typeof data !== 'object') {
      return NextResponse.json({}, { status: 200 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy] Error fetching branch risk data:', error);
    return NextResponse.json({}, { status: 200 });
  }
}
