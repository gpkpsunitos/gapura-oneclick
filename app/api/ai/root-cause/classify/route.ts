import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { getHfClient } from '@/lib/hf-client';

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rootCause = searchParams.get('root_cause') || '';
    const report = searchParams.get('report') || '';
    const area = searchParams.get('area') || '';
    const category = searchParams.get('category') || '';
    const esklasiRegex = searchParams.get('esklasi_regex') || '';

    if (!rootCause) {
      return NextResponse.json({ error: 'Root cause text is required' }, { status: 400 });
    }

    let targetPath = `/api/ai/root-cause/classify?root_cause=${encodeURIComponent(rootCause)}`;
    if (report) targetPath += `&report=${encodeURIComponent(report)}`;
    if (area) targetPath += `&area=${encodeURIComponent(area)}`;
    if (category) targetPath += `&category=${encodeURIComponent(category)}`;
    targetPath += `&esklasi_regex=${encodeURIComponent(esklasiRegex)}`;

    const hfClient = getHfClient();
    const aiResponse = await hfClient.fetch(
      targetPath,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );

    if (!aiResponse.ok) {
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Root Cause Classification Error:', error);
    return NextResponse.json(
      { error: 'Failed to classify root cause', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
