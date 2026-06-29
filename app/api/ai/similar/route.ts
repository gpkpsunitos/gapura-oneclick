import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { getHfClient } from '@/lib/hf-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text')
      || (typeof body.text === 'string' ? body.text : '')
      || (typeof body.report === 'string' ? body.report : '')
      || (typeof body.description === 'string' ? body.description : '')
      || (typeof body.title === 'string' ? body.title : '');
    const topK = searchParams.get('top_k') || '5';
    const threshold = searchParams.get('threshold') || '0.3';
    const esklasiRegex = searchParams.get('esklasi_regex') || '';

    if (!text) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
    }

    const hfClient = getHfClient();
    const targetPath = `/api/ai/similar?text=${encodeURIComponent(text)}&top_k=${topK}&threshold=${threshold}&esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
    const aiResponse = await hfClient.fetch(
      targetPath,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!aiResponse.ok) {
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Similarity Search Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch similar reports', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
