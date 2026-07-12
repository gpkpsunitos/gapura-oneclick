/**
 * GET /api/ai/model-info — friendly summary of the ML service's trained
 * models, drawn from its /health metrics.
 */
import { NextResponse } from 'next/server';
import { mlClient } from '@/lib/ml-client';
import {
  requireAISession,
  unauthorizedResponse,
  aiUnavailableResponse,
} from '@/lib/ai-route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const session = await requireAISession();
  if (!session) return unauthorizedResponse();

  try {
    const health = await mlClient.health();
    return NextResponse.json({
      status: health.status,
      lastRetrain: health.last_retrain,
      rowCount: health.row_count,
      models: health.models ?? {},
    });
  } catch (error) {
    return aiUnavailableResponse(error);
  }
}
