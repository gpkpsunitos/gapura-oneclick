import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { verifySession } from '@/lib/auth-utils';
import { getHfClient } from '@/lib/hf-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const searchParams = new URL(req.url).searchParams;
    const report = searchParams.get('report') || body.report || body.text || '';
    const area = searchParams.get('area') || body.area || '';
    const issueType = searchParams.get('issue_type') || body.issue_type || body.issueType || '';
    const rootCause = searchParams.get('root_cause') || body.root_cause || body.rootCause || '';

    if (!report) {
      return NextResponse.json({ error: 'report is required' }, { status: 400 });
    }

    const params = new URLSearchParams({ report });
    if (area) params.set('area', area);
    if (issueType) params.set('issue_type', issueType);
    if (rootCause) params.set('root_cause', rootCause);

    const hfClient = getHfClient();
    const response = await hfClient.fetch(
      `/api/ai/subcategory?${params.toString()}`,
      { method: 'POST', headers: { Accept: 'application/json' } },
      { ttl: 300000 }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(payload || { error: 'AI service unavailable' }, { status: response.status });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[API Proxy] Error classifying subcategory:', error);
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
