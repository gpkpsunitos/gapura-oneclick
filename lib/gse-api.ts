const BASE_URL = 'https://gapura-dev-gapura-ai.hf.space';

export interface GseDistributionEntry {
  count: number;
  percentage: number;
}

export interface GseExample {
  row_id: string;
  report?: string;
  root_cause?: string;
  action_taken?: string;
  area?: string;
  branch?: string;
  airlines?: string;
}

export interface GseIssuesTopResponse {
  status: string;
  filters: { esklasi_regex: string };
  total_gse_records: number;
  top?: {
    category: string;
    count: number;
    percentage: number;
  };
  distribution?: Record<string, GseDistributionEntry>;
  top_subcategory?: {
    subcategory: string;
    count: number;
    percentage: number;
  };
  distribution_subcategory?: Record<string, GseDistributionEntry>;
  top_root_cause?: {
    category: string;
    count: number;
    percentage: number;
  };
  distribution_root_cause?: Record<string, GseDistributionEntry>;
  top_samples?: Record<string, GseExample[]>;
}

export interface GseServiceabilityResponse {
  status: string;
  filters: {
    esklasi_regex: string;
    confidence_threshold: number;
  };
  total_gse_records: number;
  serviceability_distribution: Record<string, GseDistributionEntry>;
  equipment_status: Array<{
    equipment: string;
    counts: Record<string, number>;
    total: number;
  }>;
  top_samples?: Record<string, GseExample[]>;
}

export interface GseIrregularityCase {
  sheet: string;
  branch: string;
  airline: string;
  area: string;
  rc_category: string;
  tag: string;
  report_preview: string;
  root_cause_preview: string;
}

export interface GseIrregularitiesResponse {
  status: string;
  filters: {
    esklasi_regex: string;
    confidence_threshold: number;
  };
  total_gse_irregularity_cases: number;
  distribution_by_tag: Record<string, GseDistributionEntry>;
  cases: GseIrregularityCase[];
}

export interface GseRankingItem {
  name: string;
  count: number;
  percentage: number;
}

export interface GseRankingResponse {
  status: string;
  entity: 'branch' | 'airline' | 'area';
  filters: {
    esklasi_regex: string;
    confidence_threshold: number;
  };
  total_gse_records: number;
  top: GseRankingItem[];
  distribution_high_level: Record<string, GseDistributionEntry>;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchGseIssuesTop(
  esklasiRegex: string = 'OT'
): Promise<GseIssuesTopResponse> {
  const url = `${BASE_URL}/api/ai/gse/issues/top?esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
  return fetchJson<GseIssuesTopResponse>(url);
}

export async function fetchGseServiceability(
  esklasiRegex: string = 'OT'
): Promise<GseServiceabilityResponse> {
  const url = `${BASE_URL}/api/ai/gse/serviceability?esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
  return fetchJson<GseServiceabilityResponse>(url);
}

export async function fetchGseIrregularities(
  esklasiRegex: string = 'OT'
): Promise<GseIrregularitiesResponse> {
  const url = `${BASE_URL}/api/ai/gse/irregularities?esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
  return fetchJson<GseIrregularitiesResponse>(url);
}

export async function fetchGseRanking(
  entity: 'branch' | 'airline' | 'area',
  esklasiRegex: string = 'OT'
): Promise<GseRankingResponse> {
  const url = `${BASE_URL}/api/ai/gse/ranking?entity=${entity}&esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
  return fetchJson<GseRankingResponse>(url);
}

export function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function sumMap(record?: Record<string, number>): number {
  if (!record) return 0;
  return Object.values(record).reduce((sum, value) => sum + toNumber(value), 0);
}

export function toSortedEntries(
  record?: Record<string, number>,
  take = 5
): Array<[string, number]> {
  return Object.entries(record || {})
    .map(([key, value]) => [key, toNumber(value)] as [string, number])
    .filter(([key, value]) => key.trim().length > 0 && value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, take);
}

export function normalizeDistribution(
  map?: Record<string, GseDistributionEntry>
): Array<{ name: string; count: number; percentage: number }> {
  return Object.entries(map || {})
    .map(([name, entry]) => ({
      name,
      count: toNumber(entry?.count),
      percentage: toNumber(entry?.percentage),
    }))
    .filter((item) => item.name && item.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function toDonutData(
  items: Array<{ name: string; count: number }>
): Array<{ name: string; value: number }> {
  return items.map((item) => ({ name: item.name, value: item.count }));
}
