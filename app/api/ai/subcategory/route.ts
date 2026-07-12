/**
 * POST /api/ai/subcategory — classify a report narrative into an area
 * subcategory. Body: { text, airline?, branch?, area?, category?, report_type? }
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
    const res = await mlClient.classifySubcategory(text, ctx);
    return NextResponse.json({
      status: res.status,
      subcategory: presentClassification(res.subcategory),
    });
  } catch (error) {
    return aiUnavailableResponse(error);
  }
}
