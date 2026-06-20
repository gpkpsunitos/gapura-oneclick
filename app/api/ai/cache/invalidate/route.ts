import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { getHfClient } from '@/lib/hf-client';

/**
 * POST /api/ai/cache/invalidate
 * 
 * Invalidate the AI service cache
 */
export async function POST(request: Request) {
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

    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Analyst or Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheet_name');
    const esklasiRegex = searchParams.get('esklasi_regex') || '';

    try {
      const hfClient = getHfClient();
      const path = sheetName 
        ? `/api/ai/cache/invalidate?sheet_name=${encodeURIComponent(sheetName)}&esklasi_regex=${encodeURIComponent(esklasiRegex)}`
        : `/api/ai/cache/invalidate?esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
          
      const aiResponse = await hfClient.fetch(
        path,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { bypassCache: true }
      );

      hfClient.invalidateCache();

      if (!aiResponse.ok) {
        throw new Error(`AI service returned ${aiResponse.status}`);
      }

      const data = await aiResponse.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('[AI Cache] AI service unavailable:', error);
      
      return NextResponse.json(
        { 
          error: 'AI service tidak tersedia',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('[AI Cache] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
