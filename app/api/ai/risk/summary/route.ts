import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { getHfClient } from '@/lib/hf-client';

export const dynamic = 'force-dynamic';

/**
 * API endpoint untuk mendapatkan ringkasan risiko
 * Proxies request to Python AI service
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

    try {
      const hfClient = getHfClient();
      const aiResponse = await hfClient.fetch(
        `/api/ai/risk/summary?esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
        { ttl: 300000 }
      );

      if (!aiResponse.ok) {
        throw new Error(`AI service error: ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();

      return NextResponse.json(aiResult);
    } catch (aiError) {
      console.error('AI Service Error:', aiError);
      
      return NextResponse.json(
        { 
          error: 'AI service tidak tersedia',
          details: aiError instanceof Error ? aiError.message : 'Unknown error'
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Risk Summary API Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil ringkasan risiko' },
      { status: 500 }
    );
  }
}
