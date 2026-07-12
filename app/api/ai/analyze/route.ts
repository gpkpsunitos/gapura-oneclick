/**
 * POST /api/ai/analyze — AI analysis of a single report narrative.
 *
 * Proxies the Gapura ML Service `/analyze` endpoint (all classifiers +
 * 14-day forecast + risk rankings) and returns a presentation-ready shape:
 * plain-language confidence levels, ranked alternatives when the model
 * abstains, and a compact forecast summary.
 *
 * Body: { text: string, airline?, branch?, area?, category?, report_type? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { mlClient, type ClassifyContext } from '@/lib/ml-client';
import { resolveCachedAI } from '@/lib/ai-route-cache';
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
    return NextResponse.json(
      { error: 'Teks laporan diperlukan (field "text")' },
      { status: 400 },
    );
  }

  const ctx: ClassifyContext = {};
  for (const key of ['airline', 'branch', 'area', 'category', 'report_type'] as const) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) ctx[key] = value.trim();
  }

  try {
    const result = await resolveCachedAI({
      feature: 'analyze-v2',
      scope: { text, ctx },
      resolver: async () => {
        const raw = await mlClient.analyze(text, ctx);

        const forecastPoints = raw.forecast?.forecast ?? [];
        const totalNext14 = forecastPoints.reduce((sum, p) => sum + (p.predicted_count || 0), 0);

        return {
          status: 'ok' as const,
          classifications: {
            category: presentClassification(raw.category),
            subcategory: presentClassification(raw.subcategory),
            root_cause: presentClassification(raw.root_cause),
          },
          forecast: raw.forecast
            ? {
                daily: forecastPoints,
                totalNext14: Math.round(totalNext14),
                avgPerDay: forecastPoints.length
                  ? totalNext14 / forecastPoints.length
                  : null,
                interval: raw.forecast.interval ?? null,
                trainedThrough: raw.forecast.trained_through ?? null,
              }
            : null,
          risk: raw.risk_rankings ?? null,
        };
      },
    });

    return NextResponse.json(
      {
        ...(result.payload as Record<string, unknown>),
        cached: result.cached,
        generatedAt: result.generatedAt,
      },
      { headers: { 'Cache-Control': 'private, max-age=0' } },
    );
  } catch (error) {
    return aiUnavailableResponse(error);
  }
}
