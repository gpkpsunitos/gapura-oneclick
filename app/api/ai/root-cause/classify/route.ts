/**
 * POST /api/ai/root-cause/classify — classify a report narrative's likely
 * root cause. Body: { text, airline?, branch?, area?, category?, report_type? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { mlClient, type ClassifyContext } from '@/lib/ml-client';
import {
  requireAISession,
  unauthorizedResponse,
  aiUnavailableResponse,
  presentClassification,
} from '@/lib/ai-route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await requireAISession();
  if (!session) return unauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'Teks laporan diperlukan (field "text")' }, { status: 400 });
  }

  const ctx: ClassifyContext = {};
  for (const key of ['airline', 'branch', 'area', 'category', 'report_type'] as const) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) ctx[key] = value.trim();
  }

  try {
    const res = await mlClient.classifyRootCause(text, ctx);
    return NextResponse.json({
      status: res.status,
      root_cause: presentClassification(res.root_cause),
    });
  } catch (error) {
    return aiUnavailableResponse(error);
  }
}
