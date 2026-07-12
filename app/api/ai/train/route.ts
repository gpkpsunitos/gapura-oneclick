/**
 * POST /api/ai/train — trigger a background retrain on the ML service.
 * Returns 202; poll /api/ai/health for completion. Admin only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { mlClient } from '@/lib/ml-client';
import {
  requireAISession,
  unauthorizedResponse,
  aiUnavailableResponse,
} from '@/lib/ai-route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await requireAISession();
  if (!session) return unauthorizedResponse();
  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Hanya admin yang dapat memicu pelatihan ulang' }, { status: 403 });
  }

  const force = new URL(req.url).searchParams.get('force') === 'true';

  try {
    const res = await mlClient.triggerRetrain(force);
    return NextResponse.json(
      { status: res.status, message: 'Pelatihan ulang dimulai — pantau /api/ai/health' },
      { status: 202 },
    );
  } catch (error) {
    return aiUnavailableResponse(error);
  }
}
