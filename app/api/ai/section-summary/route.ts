import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { callOpenRouterAI, OPENROUTER_MODEL, type OpenRouterMessage } from '@/lib/ai/openrouter';
import { buildAICacheKey, readAICache, writeAICache } from '@/lib/ai-cache';
import { verifySession } from '@/lib/auth-utils';
import { collectAllowedNumbers, filterGroundedBullets, stripUngroundedSentences } from '@/lib/ai/grounding';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type SummaryTableRow = {
  label: string;
  value: number | string;
  note?: string;
};

type SummaryChartRow = {
  label: string;
  value: number;
};

type SectionSummaryPayload = {
  executiveSummary: string;
  keyPoints: string[];
  table: SummaryTableRow[];
  chart: SummaryChartRow[];
  predictiveSummary: string;
  insights: string[];
};

const MODEL = OPENROUTER_MODEL;

function normalizeText(value: unknown, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function asNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function compactChartData(value: unknown, maxRows = 60) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .slice(0, maxRows)
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        label: normalizeText(row.name ?? row.label ?? row.month ?? row.category ?? row.branch ?? row.airline ?? row.title, 'Unknown'),
        value: asNumber(row.value ?? row.total ?? row.count ?? row.grandTotal ?? row.total_records),
        secondary: normalizeText(row.secondary ?? row.rawName ?? row.note),
        values: row.values && typeof row.values === 'object' ? row.values : undefined,
      };
    });
}

function fallbackSummary(section: string, title: string, chartData: Array<Record<string, unknown>>): SectionSummaryPayload {
  const rows = chartData
    .map((row) => ({
      label: normalizeText(row.label, 'Unknown'),
      value: asNumber(row.value),
      note: normalizeText(row.secondary, 'Section signal'),
    }))
    .filter((row) => row.label && row.value > 0)
    .sort((a, b) => asNumber(b.value) - asNumber(a.value))
    .slice(0, 6);

  const total = rows.reduce((sum, row) => sum + asNumber(row.value), 0);
  const top = rows[0];

  return {
    executiveSummary: `${section} berisi ${total} sinyal terukur pada ${title}. Fokus terbesar berada pada ${top?.label || 'data utama'}${top ? ` dengan ${top.value} kasus` : ''}.`,
    keyPoints: rows.slice(0, 4).map((row) => `${row.label}: ${row.value} kasus.`),
    table: rows,
    chart: rows.map((row) => ({ label: row.label, value: asNumber(row.value) })),
    predictiveSummary: top
      ? `Jika pola saat ini berlanjut, ${top.label} perlu dipantau sebagai kontributor utama dalam periode berikutnya.`
      : 'Data belum cukup untuk membaca arah prediktif.',
    insights: rows.slice(0, 4).map((row) => `Prioritaskan validasi dan tindak lanjut untuk ${row.label}.`),
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : trimmed;
}

function cleanStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => normalizeText(item)).filter(Boolean);
  return items.length > 0 ? items.slice(0, 8) : fallback;
}

function cleanTable(value: unknown, fallback: SummaryTableRow[]) {
  if (!Array.isArray(value)) return fallback;
  const rows = value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        label: normalizeText(row.label ?? row.signal ?? row.name),
        value: typeof row.value === 'number' ? row.value : normalizeText(row.value ?? row.count ?? row.total, '-'),
        note: normalizeText(row.note ?? row.interpretation ?? row.reason),
      };
    })
    .filter((row) => row.label);
  return rows.length > 0 ? rows.slice(0, 8) : fallback;
}

function cleanChart(value: unknown, fallback: SummaryChartRow[]) {
  if (!Array.isArray(value)) return fallback;
  const rows = value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        label: normalizeText(row.label ?? row.name ?? row.signal),
        value: asNumber(row.value ?? row.count ?? row.total),
      };
    })
    .filter((row) => row.label && Number.isFinite(row.value));
  return rows.length > 0 ? rows.slice(0, 8) : fallback;
}

async function readCached(cacheKey: string) {
  try {
    return await readAICache<SectionSummaryPayload>(cacheKey);
  } catch (error) {
    console.warn('[section-summary] cache read skipped:', error);
    return null;
  }
}

async function writeCached(cacheKey: string, payload: SectionSummaryPayload) {
  try {
    await writeAICache({
      cacheKey,
      feature: 'section-summary',
      payload,
      sourceSyncAt: null,
      syncVersion: 0,
      extraMetadata: { model: MODEL },
    });
  } catch (error) {
    console.warn('[section-summary] cache write skipped:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const section = normalizeText(body.section, 'Dashboard Section');
    const title = normalizeText(body.title, section);
    const chartType = normalizeText(body.chartType, 'section');
    const chartData = compactChartData(body.chartData);
    const scope = {
      section,
      title,
      chartType,
      chartData,
      featureHints: Array.isArray(body.featureHints) ? body.featureHints : [],
      filters: body.filters && typeof body.filters === 'object' ? body.filters : {},
      model: MODEL,
    };
    const cacheKey = buildAICacheKey('section-summary', scope, 0);
    const cached = await readCached(cacheKey);

    if (cached?.payload) {
      return NextResponse.json({
        status: 'ok',
        cached: true,
        generatedAt: cached.generatedAt,
        model: MODEL,
        section,
        ...cached.payload,
      });
    }

    const fallback = fallbackSummary(section, title, chartData);

    const totalsByLabel = chartData.reduce<Record<string, number>>((acc, row) => {
      const label = String(row.label || 'Unknown');
      acc[label] = (acc[label] || 0) + asNumber(row.value);
      return acc;
    }, {});
    const grandTotal = Object.values(totalsByLabel).reduce((a, b) => a + b, 0);
    const topRow = Object.entries(totalsByLabel).sort((a, b) => b[1] - a[1])[0];
    const knownNumbers = {
      grand_total: grandTotal,
      distinct_labels: Object.keys(totalsByLabel).length,
      top_label_value: topRow?.[1] ?? 0,
      values_by_label: totalsByLabel,
    };

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: [
          'You are an aviation operations analyst for Gapura, writing for C-level readers.',
          'Return compact JSON only. No markdown, no preamble.',
          'Write in Indonesian business language. One insight per sentence, no filler.',
          'HARD RULE: every numeric figure you cite MUST appear inside `known_totals` or `data`.',
          'If the data does not support an insight, OMIT the field rather than fabricate. Empty arrays are valid.',
          'Schema: {"executiveSummary":string,"keyPoints":string[],"table":[{"label":string,"value":number|string,"note":string}],"chart":[{"label":string,"value":number}],"predictiveSummary":string,"insights":string[]}',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: 'Create AI Summary for dashboard section.',
          section,
          title,
          chartType,
          known_totals: knownNumbers,
          data: chartData,
          requirements: [
            'Ringkas apa yang terjadi di section ini dalam satu kalimat eksekutif.',
            'Tabel 4-8 baris dari sinyal terpenting; setiap value harus berasal dari known_totals.values_by_label.',
            'Chart 4-8 baris numerik dengan urutan menurun.',
            'Insight operasional fokus pada label terbesar dan kemungkinan eskalasi.',
            'Jangan menyebut "1110" atau angka apapun yang tidak ada di known_totals.',
          ],
        }),
      },
    ];

    const aiText = await callOpenRouterAI(messages, MODEL);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(extractJson(aiText));
    } catch (error) {
      console.warn('[section-summary] failed to parse LLM JSON:', error);
    }

    const allowedNumbers = collectAllowedNumbers({ knownNumbers, chartData });
    const groundedKeyPoints = filterGroundedBullets(
      cleanStringArray(parsed.keyPoints, fallback.keyPoints),
      allowedNumbers,
    );
    const groundedInsights = filterGroundedBullets(
      cleanStringArray(parsed.insights, fallback.insights),
      allowedNumbers,
    );

    const payload: SectionSummaryPayload = {
      executiveSummary: stripUngroundedSentences(
        normalizeText(parsed.executiveSummary, fallback.executiveSummary),
        allowedNumbers,
      ) || fallback.executiveSummary,
      keyPoints: groundedKeyPoints.length > 0 ? groundedKeyPoints : fallback.keyPoints,
      table: cleanTable(parsed.table, fallback.table),
      chart: cleanChart(parsed.chart, fallback.chart),
      predictiveSummary: stripUngroundedSentences(
        normalizeText(parsed.predictiveSummary, fallback.predictiveSummary),
        allowedNumbers,
      ) || fallback.predictiveSummary,
      insights: groundedInsights.length > 0 ? groundedInsights : fallback.insights,
    };

    await writeCached(cacheKey, payload);

    return NextResponse.json({
      status: 'ok',
      cached: false,
      generatedAt: new Date().toISOString(),
      model: MODEL,
      section,
      ...payload,
    });
  } catch (error) {
    console.error('[section-summary] failed:', error);
    return NextResponse.json({
      error: 'Failed to build AI summary',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
