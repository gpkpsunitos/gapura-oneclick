import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { getHfClient } from '@/lib/hf-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/health
 * 
 * Get health status of the AI service
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const esklasiRegex = searchParams.get('esklasi_regex') || '';

    try {
      const hfClient = getHfClient();
      const aiResponse = await hfClient.fetch(
        `/health?esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
        { bypassCache: true }
      );

      if (!aiResponse.ok) {
        throw new Error(`AI service returned ${aiResponse.status}`);
      }

      const data = await aiResponse.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('[AI Health] AI service unavailable:', error);
      
      return NextResponse.json(
        { 
          error: 'AI service tidak tersedia',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('[AI Health] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
