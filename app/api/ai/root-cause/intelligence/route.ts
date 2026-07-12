import { NextRequest, NextResponse } from 'next/server';

import { requireElevatedAISession } from '@/lib/ai-route-helpers';
import { mlServiceHeaders } from '@/lib/ml-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const AI_BASE_URL =
  process.env.AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
  'https://gapura-dev-gapura-ai.hf.space';
const DL_BASE_URL =
  process.env.DL_SERVICE_URL ||
  process.env.NEXT_PUBLIC_DL_SERVICE_URL ||
  'https://gapura-dev-gapura-deep-learning.hf.space';

const FAST_TIMEOUT_MS = 5600;
const BATCH_TIMEOUT_MS = 6800;
const MAX_RECORDS = 56;

type SourceKind = 'orchestrator' | 'deep-learning';

type RequestRecord = {
  id?: string;
  reportTitle?: string;
  report?: string;
  description?: string;
  rootCause?: string;
  resolvedRootCause?: string;
  area?: string;
  category?: string;
  issueCategory?: string;
  branch?: string;
  airline?: string;
  status?: string;
  sourceSheet?: string;
};

type EndpointCall = {
  id: string;
  name: string;
  source: SourceKind;
  path: string;
  ok: boolean;
  status?: number;
  latencyMs: number;
  error?: string;
  data?: unknown;
};

type RootCandidate = {
  name: string;
  endpointId: string;
  endpointName: string;
  confidence?: number;
  count?: number;
};

type TaxonomyRow = {
  name: string;
  description: string;
  severityMultiplier?: number;
  keywordCount?: number;
};

function normalizeText(value: unknown, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeRootCause(value: unknown) {
  const text = normalizeText(value).replace(/\s+/g, ' ');
  if (!text) return '';
  if (/^(unknown|n\/a|na|null|none|-|#n\/a)$/i.test(text)) return '';
  return text;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function confidenceFrom(value: unknown) {
  const num = asNumber(value);
  if (num <= 0) return undefined;
  return num > 1 ? Math.min(num / 100, 1) : Math.min(num, 1);
}

function titleOf(record: RequestRecord) {
  return normalizeText(record.reportTitle || record.report || record.description, 'Untitled report');
}

function rootCauseOf(record: RequestRecord) {
  return normalizeRootCause(record.resolvedRootCause || record.rootCause);
}

function topCounts(records: RequestRecord[], selector: (record: RequestRecord) => string, limit = 6) {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const key = normalizeText(selector(record), 'Unknown');
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, limit);
}

function buildContextText(records: RequestRecord[], selectedRootCause: string) {
  const rootRows = topCounts(records, rootCauseOf, 8)
    .map((row) => `${row.name}: ${row.count}`)
    .join('; ');
  const branchRows = topCounts(records, (record) => normalizeText(record.branch, 'Unknown'), 5)
    .map((row) => `${row.name}: ${row.count}`)
    .join('; ');
  const issueRows = topCounts(records, (record) => normalizeText(record.issueCategory || record.category, 'Unknown'), 5)
    .map((row) => `${row.name}: ${row.count}`)
    .join('; ');
  const samples = records
    .slice(0, 12)
    .map((record, index) => {
      const parts = [
        `case ${index + 1}`,
        `title=${titleOf(record)}`,
        `root=${rootCauseOf(record) || 'missing'}`,
        `area=${normalizeText(record.area, 'Unknown')}`,
        `category=${normalizeText(record.issueCategory || record.category, 'Unknown')}`,
        `branch=${normalizeText(record.branch, 'Unknown')}`,
      ];
      return parts.join(', ');
    })
    .join('\n');

  return [
    'Root cause dominant analytics from live Google Sheets.',
    selectedRootCause ? `Selected root cause: ${selectedRootCause}` : '',
    rootRows ? `Root cause counts: ${rootRows}` : '',
    branchRows ? `Branch counts: ${branchRows}` : '',
    issueRows ? `Issue category counts: ${issueRows}` : '',
    samples ? `Recent scoped rows:\n${samples}` : '',
  ].filter(Boolean).join('\n');
}

async function callEndpoint({
  id,
  name,
  source,
  baseUrl,
  path,
  init,
  timeoutMs,
}: {
  id: string;
  name: string;
  source: SourceKind;
  baseUrl: string;
  path: string;
  init?: RequestInit;
  timeoutMs: number;
}): Promise<EndpointCall> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const orchestratorHeaders = source === 'orchestrator'
      ? mlServiceHeaders({ Accept: 'application/json' })
      : { Accept: 'application/json' };
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...orchestratorHeaders,
        ...(init?.headers || {}),
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return {
      id,
      name,
      source,
      path,
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      data,
    };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return {
      id,
      name,
      source,
      path,
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: aborted ? 'Timed out' : error instanceof Error ? error.message : 'Request failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function candidate(name: unknown, endpoint: EndpointCall, confidence?: unknown, count?: unknown): RootCandidate | null {
  const normalized = normalizeRootCause(name);
  if (!normalized) return null;
  return {
    name: normalized,
    endpointId: endpoint.id,
    endpointName: endpoint.name,
    confidence: confidenceFrom(confidence),
    count: count === undefined ? undefined : asNumber(count),
  };
}

function extractStatsCandidates(endpoint: EndpointCall): RootCandidate[] {
  const data = asRecord(endpoint.data);
  const topCategories = Array.isArray(data.top_categories) ? data.top_categories : [];

  if (topCategories.length > 0) {
    return topCategories.slice(0, 8).flatMap((item) => {
      if (!Array.isArray(item)) return [];
      const [name, rawInfo] = item;
      const info = asRecord(rawInfo);
      const row = candidate(
        name,
        endpoint,
        info.percentage,
        typeof rawInfo === 'number' ? rawInfo : info.count,
      );
      return row ? [row] : [];
    });
  }

  const byCategory = asRecord(data.by_category);
  return Object.entries(byCategory).slice(0, 8).flatMap(([name, rawInfo]) => {
    const info = asRecord(rawInfo);
    const row = candidate(name, endpoint, info.percentage, info.count);
    return row ? [row] : [];
  });
}

function extractClassificationCandidates(endpoint: EndpointCall): RootCandidate[] {
  const data = asRecord(endpoint.data);
  const rows: RootCandidate[] = [];

  const direct = candidate(
    data.label || data.root_cause || data.category || data.prediction || data.predicted_category,
    endpoint,
    data.confidence || data.score || data.probability,
  );
  if (direct) rows.push(direct);

  const classification = asRecord(data.classification);
  const classified = candidate(
    classification.root_cause || classification.label || classification.category,
    endpoint,
    classification.confidence || classification.score,
  );
  if (classified) rows.push(classified);

  const results = asRecord(data.results);
  const rootCauseResults = Array.isArray(results.root_cause) ? results.root_cause : [];
  rootCauseResults.forEach((item) => {
    const result = asRecord(item);
    const row = candidate(result.label || result.root_cause || result.category, endpoint, result.confidence);
    if (row) rows.push(row);
  });

  const batchResults = Array.isArray(data.results) ? data.results : [];
  batchResults.forEach((record) => {
    const recordData = asRecord(record);
    const tasks = Array.isArray(recordData.tasks) ? recordData.tasks : [];
    tasks.forEach((task) => {
      const taskData = asRecord(task);
      if (normalizeText(taskData.task).toLowerCase() !== 'root_cause') return;
      const taskResults = asRecord(taskData.results);
      const row = candidate(
        taskResults.label || taskResults.root_cause || taskResults.category,
        endpoint,
        taskResults.confidence || taskData.confidence,
      );
      if (row) rows.push(row);
    });
  });

  return rows;
}

function extractTaxonomy(endpoint: EndpointCall): TaxonomyRow[] {
  const data = asRecord(endpoint.data);
  return Object.values(data)
    .filter((value) => {
      const row = asRecord(value);
      return typeof row.name === 'string';
    })
    .map((value) => {
      const row = asRecord(value);
      return {
        name: normalizeText(row.name),
        description: normalizeText(row.description),
        severityMultiplier:
          typeof row.severity_multiplier === 'number' ? row.severity_multiplier : undefined,
        keywordCount: typeof row.keyword_count === 'number' ? row.keyword_count : undefined,
      };
    })
    .filter((row) => row.name)
    .sort((left, right) => (right.severityMultiplier || 0) - (left.severityMultiplier || 0));
}

function endpointSummary(endpoint: EndpointCall, candidates: RootCandidate[]) {
  if (!endpoint.ok) {
    return {
      id: endpoint.id,
      name: endpoint.name,
      source: endpoint.source,
      ok: false,
      latencyMs: endpoint.latencyMs,
      status: endpoint.status,
      label: 'No response',
      confidence: 0,
      returnedLabels: 0,
    };
  }

  const first = candidates[0];
  return {
    id: endpoint.id,
    name: endpoint.name,
    source: endpoint.source,
    ok: true,
    latencyMs: endpoint.latencyMs,
    status: endpoint.status,
    label: first?.name || 'Metadata only',
    confidence: first?.confidence || 0,
    returnedLabels: candidates.length,
  };
}

function groupCandidates(candidates: RootCandidate[], records: RequestRecord[]) {
  const groups = new Map<
    string,
    {
      name: string;
      candidates: RootCandidate[];
      endpointNames: Set<string>;
      endpointIds: Set<string>;
      confidenceValues: number[];
      endpointCount: number;
      sheetCount: number;
    }
  >();

  candidates.forEach((item) => {
    const key = item.name.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        name: item.name,
        candidates: [],
        endpointNames: new Set(),
        endpointIds: new Set(),
        confidenceValues: [],
        endpointCount: 0,
        sheetCount: 0,
      });
    }

    const group = groups.get(key)!;
    group.candidates.push(item);
    group.endpointNames.add(item.endpointName);
    group.endpointIds.add(item.endpointId);
    if (typeof item.confidence === 'number') group.confidenceValues.push(item.confidence);
    if (typeof item.count === 'number') group.endpointCount += item.count;
  });

  groups.forEach((group) => {
    group.sheetCount = records.filter((record) => rootCauseOf(record).toLowerCase() === group.name.toLowerCase()).length;
  });

  return Array.from(groups.values())
    .map((group) => {
      const avgConfidence =
        group.confidenceValues.length > 0
          ? group.confidenceValues.reduce((sum, value) => sum + value, 0) / group.confidenceValues.length
          : 0;
      return {
        name: group.name,
        endpointVotes: group.endpointIds.size,
        endpointCount: group.endpointCount,
        sheetCount: group.sheetCount,
        avgConfidence: Number(avgConfidence.toFixed(3)),
        endpointNames: Array.from(group.endpointNames),
      };
    })
    .sort((left, right) => (
      right.endpointVotes - left.endpointVotes ||
      right.endpointCount - left.endpointCount ||
      right.sheetCount - left.sheetCount ||
      right.avgConfidence - left.avgConfidence ||
      left.name.localeCompare(right.name)
    ))
    .slice(0, 10);
}

function buildRecommendations(rootCauses: ReturnType<typeof groupCandidates>, okCount: number, totalEndpoints: number) {
  const top = rootCauses[0];
  if (!top) {
    return [
      'Root-cause endpoints did not return a usable label. Keep decisions on the live sheet ranking until the endpoints respond.',
    ];
  }

  const recommendations = [
    `Review "${top.name}" first. It appears in ${top.endpointVotes} AI endpoint${top.endpointVotes === 1 ? '' : 's'} and ${top.sheetCount} scoped sheet row${top.sheetCount === 1 ? '' : 's'}.`,
  ];

  if (top.avgConfidence > 0 && top.avgConfidence < 0.55) {
    recommendations.push(`Treat "${top.name}" as a lead, not a final answer. Average AI confidence is ${(top.avgConfidence * 100).toFixed(0)}%.`);
  }

  if (okCount < Math.ceil(totalEndpoints / 2)) {
    recommendations.push(`Only ${okCount} of ${totalEndpoints} root-cause endpoints responded within the page limit. Recheck before using AI as final evidence.`);
  }

  return recommendations;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireElevatedAISession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const esklasiRegex = normalizeText(body.esklasiRegex || body.esklasi_regex);
    const incomingRecords = Array.isArray(body.records) ? body.records as RequestRecord[] : [];
    const records = incomingRecords.slice(0, MAX_RECORDS);
    const selectedRootCause =
      normalizeRootCause(body.selectedRootCause) ||
      topCounts(records, rootCauseOf, 1)[0]?.name ||
      '';
    const selectedRows = selectedRootCause
      ? records.filter((record) => rootCauseOf(record).toLowerCase() === selectedRootCause.toLowerCase())
      : [];
    const focusRows = (selectedRows.length > 0 ? selectedRows : records).slice(0, 24);
    const contextText = buildContextText(focusRows, selectedRootCause);
    const selectedArea = topCounts(focusRows, (record) => normalizeText(record.area, 'Unknown'), 1)[0]?.name || '';
    const selectedCategory =
      topCounts(focusRows, (record) => normalizeText(record.issueCategory || record.category, 'Unknown'), 1)[0]?.name || '';
    const query = `esklasi_regex=${encodeURIComponent(esklasiRegex)}`;

    const calls = await Promise.all([
      callEndpoint({
        id: 'ai-root-stats',
        name: 'AI root-cause stats',
        source: 'orchestrator',
        baseUrl: AI_BASE_URL,
        path: `/api/ai/root-cause/stats?${query}&bypass_cache=false`,
        timeoutMs: FAST_TIMEOUT_MS,
      }),
      callEndpoint({
        id: 'ai-root-taxonomy',
        name: 'AI root-cause taxonomy',
        source: 'orchestrator',
        baseUrl: AI_BASE_URL,
        path: `/api/ai/root-cause/categories?${query}`,
        timeoutMs: FAST_TIMEOUT_MS,
      }),
      callEndpoint({
        id: 'ai-root-classify',
        name: 'AI root-cause classifier',
        source: 'orchestrator',
        baseUrl: AI_BASE_URL,
        path: `/api/ai/root-cause/classify?root_cause=${encodeURIComponent(selectedRootCause)}&report=${encodeURIComponent(contextText)}&area=${encodeURIComponent(selectedArea)}&category=${encodeURIComponent(selectedCategory)}&${query}`,
        init: { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        timeoutMs: FAST_TIMEOUT_MS,
      }),
      callEndpoint({
        id: 'dl-root-legacy',
        name: 'DL root-cause NLP',
        source: 'deep-learning',
        baseUrl: DL_BASE_URL,
        path: '/nlp/root-cause',
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: [contextText] }),
        },
        timeoutMs: FAST_TIMEOUT_MS,
      }),
      callEndpoint({
        id: 'dl-root-classify',
        name: 'DL root-cause classifier',
        source: 'deep-learning',
        baseUrl: DL_BASE_URL,
        path: '/classify',
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: [contextText], tasks: ['root_cause'] }),
        },
        timeoutMs: FAST_TIMEOUT_MS,
      }),
      callEndpoint({
        id: 'dl-root-batch',
        name: 'DL root-cause batch',
        source: 'deep-learning',
        baseUrl: DL_BASE_URL,
        path: '/analyze/batch',
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tasks: ['root_cause'],
            records: focusRows.slice(0, 16).map((record, index) => ({
              id: record.id || `row-${index + 1}`,
              report: titleOf(record),
              root_cause: rootCauseOf(record),
              area: normalizeText(record.area),
              category: normalizeText(record.issueCategory || record.category),
              branch: normalizeText(record.branch),
              airline: normalizeText(record.airline),
              status: normalizeText(record.status),
            })),
          }),
        },
        timeoutMs: BATCH_TIMEOUT_MS,
      }),
    ]);

    const candidates = calls.flatMap((endpoint) => {
      if (!endpoint.ok) return [];
      if (endpoint.id === 'ai-root-stats') return extractStatsCandidates(endpoint);
      return extractClassificationCandidates(endpoint);
    });
    const taxonomyEndpoint = calls.find((endpoint) => endpoint.id === 'ai-root-taxonomy');
    const taxonomy = taxonomyEndpoint?.ok ? extractTaxonomy(taxonomyEndpoint).slice(0, 12) : [];
    const rootCauses = groupCandidates(candidates, records);
    const endpoints = calls.map((endpoint) => {
      const endpointCandidates = candidates.filter((item) => item.endpointId === endpoint.id);
      return endpointSummary(endpoint, endpointCandidates);
    });
    const okCount = endpoints.filter((endpoint) => endpoint.ok).length;

    const statsEndpoint = calls.find((endpoint) => endpoint.id === 'ai-root-stats');

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      selectedRootCause,
      sampleSize: focusRows.length,
      sheetRootCauses: topCounts(records, rootCauseOf, 8),
      health: {
        totalEndpoints: endpoints.length,
        okEndpoints: okCount,
        okPct: endpoints.length > 0 ? Number(((okCount / endpoints.length) * 100).toFixed(1)) : 0,
      },
      endpoints,
      rootCauses,
      taxonomy,
      stats: statsEndpoint?.ok ? statsEndpoint.data : null,
      recommendations: buildRecommendations(rootCauses, okCount, endpoints.length),
    });
  } catch (error) {
    console.error('[root-cause-intelligence] failed', error);
    return NextResponse.json(
      { error: 'Failed to build root cause intelligence', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
