/**
 * POST /api/ai/risk/calculate — recompute risk rankings fresh from the
 * ML service (bypasses the shared response cache).
 */
import { NextResponse } from 'next/server';
import { mlClient } from '@/lib/ml-client';
import {
  requireElevatedAISession,
  unauthorizedResponse,
  aiUnavailableResponse,
} from '@/lib/ai-route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const session = await requireElevatedAISession();
  if (!session) return unauthorizedResponse();

  try {
    const res = await mlClient.riskScore();
    return NextResponse.json({
      status: res.status,
      rankings: res.rankings ?? {},
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return aiUnavailableResponse(error);
  }
}
