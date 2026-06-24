import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { callOpenRouterAI } from '@/lib/ai/openrouter';
import { enforceBotProtection } from '@/lib/security/botid';

export async function POST(request: NextRequest) {
  try {
    const botProtectionResponse = await enforceBotProtection();
    if (botProtectionResponse) {
      return botProtectionResponse;
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, context } = await request.json();

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Data is required' }, { status: 400 });
    }

    const sampleSize = 30;
    const sampledData = data.slice(0, sampleSize).map(row => {

      const { id, evidence_url, ...rest } = row;
      return rest;
    });

    const systemPrompt = `
      IDENTITY:
      You are an Expert Investigative Analyst at PT Gapura Angkasa (Airport Ground Handling).
      You specialize in detecting operational patterns, safety risks, and service gaps.

      CONTEXT:
      Table Title: "${context?.title || 'Operational Reports'}"
      Columns: ${context?.columns?.join(', ') || 'Various'}
      Total Rows in View: ${data.length}

      OBJECTIVE:
      Analyze the provided data sample and provide 3-4 HIGH-IMPACT, CONCISE bullet points.
      Focus on:
      1. Top contributing factors (Station, Airline, or Category).
      2. Hidden correlations or anomalies.
      3. Actionable operational recommendations.

      STYLE:
      - Use professional, direct tone.
      - Keep each point under 15 words.
      - Be specific (use numbers/names from the data).
      - Language: Bahasa Indonesia.
    `;

    const userPrompt = `
      DATA SAMPLE (Top ${sampleSize} rows):
      ${JSON.stringify(sampledData, null, 2)}

      Provide investigative insights based on this specific sample.
    `;

    const response = await callOpenRouterAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const insights = response
      .split('\n')
      .map(line => line.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter(line => line.length > 10)
      .slice(0, 4);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('[InvestigativeAI] Route Error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
