import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { getHfClient } from '@/lib/hf-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const esklasiRegex = searchParams.get('esklasi_regex') || '';
    
    let path = '/api/ai/summarize';
    
    if (category === 'cgo') {
      path = '/api/ai/summarize/cgo';
    } else if (category) {
      path = `/api/ai/summarize?category=${category}`;
    }

    const sep = path.includes('?') ? '&' : '?';
    const hfClient = getHfClient();
    const aiResponse = await hfClient.fetch(
      `${path}${sep}esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
      { ttl: 300000 }
    );

    if (!aiResponse.ok) {
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Summarization Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
