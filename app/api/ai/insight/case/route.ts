import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { enforceBotProtection } from '@/lib/security/botid';
import { CaseInsightResponse } from '@/lib/schemas/insight';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const HF_BASE = process.env.AI_SERVICE_URL
  || process.env.NEXT_PUBLIC_AI_SERVICE_URL
  || 'https://gapura-dev-gapura-ai.hf.space';

export async function POST(req: NextRequest) {
  const botBlock = await enforceBotProtection();
  if (botBlock) return botBlock;

  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // Forward to hf-space orchestrator. The orchestrator does the dl-space
  // fan-out + Pydantic validation. We re-validate with Zod before returning.
  let upstream: Response;
  try {
    upstream = await fetch(`${HF_BASE}/api/ai/insight/case`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_text: body.report_text ?? body.report ?? '',
        issue_type: body.issue_type ?? body.category ?? null,
        area: body.area ?? null,
        airline: body.airline ?? null,
        hub: body.hub ?? null,
        severity_observed: body.severity_observed ?? body.severity ?? null,
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'AI service unreachable', detail: String(e) },
      { status: 503 },
    );
  }

  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok || !payload) {
    return NextResponse.json(
      { error: 'AI service error', status: upstream.status, detail: payload },
      { status: upstream.status || 502 },
    );
  }

  // Strict client-side guard. Anything off-schema is rejected here, NOT rendered.
  const parsed = CaseInsightResponse.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Schema validation failed',
        detail: parsed.error.issues.slice(0, 5),
      },
      { status: 502 },
    );
  }
  return NextResponse.json(parsed.data);
}
