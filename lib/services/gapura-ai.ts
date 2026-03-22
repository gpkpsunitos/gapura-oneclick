import { getHfClient } from '@/lib/hf-client';

const GAPURA_AI_BASE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';

const hfClient = getHfClient({ baseUrl: GAPURA_AI_BASE_URL });

export interface SeverityDistributionAi {
  name: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface SeverityDistributionsAiResponse {
  area: SeverityDistributionAi[];
  category: SeverityDistributionAi[];
  branch: SeverityDistributionAi[];
  airline: SeverityDistributionAi[];
}

export interface AirlineRiskDetail {
  name: string;
  risk_score: number;
  risk_level: string;
  severity_distribution: Record<string, number>;
  issue_categories: string[];
}

export interface BranchRiskDetail {
  name: string;
  risk_score: number;
  risk_level: string;
  severity_distribution: Record<string, number>;
  issue_categories: string[];
}

export interface AiRiskSummary {
  last_updated: string;
  top_risky_airlines: string[];
  top_risky_branches: string[];
  total_airlines: number;
  total_branches: number;
  total_hubs: number;
  airline_risks: Record<string, number>;
  branch_risks: Record<string, number>;
  hub_risks: Record<string, number>;
  airline_details: AirlineRiskDetail[];
  branch_details: BranchRiskDetail[];
}

export interface BranchCategorySummary {
  category_type: string;
  total_branches: number;
  total_issues: number;
  avg_risk_score: number;
  risk_level_distribution: Record<string, number>;
  trend_distribution: Record<string, number>;
  last_updated: string;
}

export interface AiBranchSummaryResponse {
  landside_airside: BranchCategorySummary;
  cgo: BranchCategorySummary;
  comparison: {
    ls_total_issues: number;
    cgo_total_issues: number;
    ls_avg_risk: number;
    cgo_avg_risk: number;
  };
  last_updated: string;
}

export interface AiReportSummaryResponse {
  status: string;
  category_type: string;
  summary: {
    sheet_name: string;
    total_records: number;
    severity_distribution: Record<string, number>;
    critical_high_percentage: number;
    open_issues_percentage: number;
    top_categories: Record<string, number>;
    top_airlines: Record<string, number>;
    top_hubs: Record<string, number>;
    top_branches: Record<string, number>;
    area_distribution: Record<string, number>;
    status_distribution: Record<string, number>;
    root_cause_categories: Record<string, number>;
    monthly_trend: Record<string, number>;
    key_insights: string[];
    common_issues: Array<{ issue: string; count: number }>;
    recommendations: string[];
    last_updated: string;
  };
  timestamp: string;
}

export interface DashboardSummaryAi {
  severity_distribution: Record<string, number>;
}

export interface BranchRiskAnalysis {
  risk_score: number;
  risk_level: string;
  total_issues: number;
  severity_distribution: {
    High?: number;
    Medium?: number;
    Low?: number;
    Critical?: number;
  };
  issue_categories: string[];
  category_count: number;
  data_quality_score: number;
  frequency_score: number;
  severity_score: number;
}

export interface SeasonalForecastResponse {
  monthly_averages: Record<string, number>;
  peak_months: string[];
  low_months: string[];
}

export interface SeasonalityForecastPoint {
  period: number;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
}

export interface SeasonalityCategoryForecast {
  category_type: string;
  category_name: string;
  granularity: string;
  baseline: number;
  trend: string;
  volatility: number;
  forecasts: SeasonalityForecastPoint[];
}

export interface SeasonalityForecastResponse {
  landside_airside: SeasonalityCategoryForecast;
  cgo: SeasonalityCategoryForecast;
}

export async function fetchSeasonalityForecast(signal?: AbortSignal): Promise<SeasonalityForecastResponse | null> {
  try {
    const url = `${GAPURA_AI_BASE_URL}/api/ai/seasonality/forecast`;
    const response = await fetchWithTimeout(url, { signal }, 30000);
    if (!response.ok) {
      console.error('[gapura-ai] Failed to fetch seasonality forecast:', response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.error('[gapura-ai] Error fetching seasonality forecast:', error);
    return null;
  }
}

export async function fetchSeasonalForecast(signal?: AbortSignal): Promise<SeasonalForecastResponse | null> {
  try {
    const url = `${GAPURA_AI_BASE_URL}/api/ai/forecast/seasonal`;
    const response = await fetchWithTimeout(url, { signal }, 30000);
    if (!response.ok) {
      console.error('[gapura-ai] Failed to fetch seasonal forecast:', response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.error('[gapura-ai] Error fetching seasonal forecast:', error);
    return null;
  }
}

export type BranchRiskSummaryResponse = Record<string, BranchRiskAnalysis>;

export interface RootCauseCategory {
  name: string;
  count: number;
}

export interface RootCauseStatsAi {
  total_records: number;
  classified: number;
  unknown: number;
  classification_rate: string;
  by_category: Record<string, {
    count: number;
    percentage: number;
    top_issue_categories: Record<string, number>;
    top_areas: Record<string, number>;
    top_airlines: Record<string, number>;
    description: string;
  }>;
  top_categories: [string, number][];
}

export interface RootCauseSummary {
  total_records: number;
  with_root_cause: number;
  without_root_cause: number;
  root_cause_coverage: string;
  categories_summary: Record<string, number>;
  top_categories: [string, number][];
  category_distribution: Record<string, {
    count: number;
    percentage: string;
    severity_multiplier: number;
    description: string;
    records: Array<{
      record_id: string;
      airline: string;
      branch: string;
      report: string;
      root_cause: string;
      category: string;
      confidence: number;
    }>;
  }>;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 60000): Promise<Response> {
  const client = getHfClient({ baseUrl: GAPURA_AI_BASE_URL });
  const { signal, ...restOptions } = options;
  return client.fetch(url, restOptions, { bypassCache: false, ttl: timeout * 2 }, signal);
}

function normalizeSeverity(key: string): string {
  const k = key.toLowerCase();
  if (k === 'critical') return 'critical';
  if (k === 'high') return 'high';
  if (k === 'medium') return 'medium';
  if (k === 'low') return 'low';
  return key;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function calculateTopRisky(
  items: Record<string, { count: number; severity: Record<string, number> }>,
  limit = 5
): string[] {
  const scored = Object.entries(items).map(([name, data]) => {
    const score =
      (data.severity['Critical'] || 0) * 4 +
      (data.severity['High'] || 0) * 3 +
      (data.severity['Medium'] || 0) * 2 +
      (data.severity['Low'] || 0) * 1;
    return { name, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.name);
}
/* eslint-enable @typescript-eslint/no-unused-vars */

export async function fetchSeverityDistributionsAi(signal?: AbortSignal): Promise<SeverityDistributionsAiResponse | null> {
  try {
    const response = await fetchWithTimeout(`${GAPURA_AI_BASE_URL}/api/ai/risk/summary?esklasi_regex=`, { signal }, 120000);
    if (!response.ok) {
      console.error('[gapura-ai] Failed to fetch severity distributions:', response.status);
      return null;
    }

    const data = await response.json();
    const results = data.results || [];
    
    const severityByArea: Record<string, Record<string, number>> = {};
    const severityByCategory: Record<string, Record<string, number>> = {};
    const severityByBranch: Record<string, Record<string, number>> = {};
    const severityByAirline: Record<string, Record<string, number>> = {};

    for (const record of results) {
      const classification = record.classification;
      const severity = classification?.severity || 'Low';
      const normalizedSeverity = normalizeSeverity(severity);

      const area = record.originalData?.area || record.originalData?.Area || 'Unknown';
      const category = record.originalData?.issueType || record.originalData?.category || record.originalData?.Irregularity_Complain_Category || 'Unknown';
      const branch = record.originalData?.branch || record.originalData?.Branch || 'Unknown';
      const airline = record.originalData?.airline || record.originalData?.Airlines || 'Unknown';

      if (!severityByArea[area]) severityByArea[area] = { critical: 0, high: 0, medium: 0, low: 0 };
      severityByArea[area][normalizedSeverity] = (severityByArea[area][normalizedSeverity] || 0) + 1;

      if (!severityByCategory[category]) severityByCategory[category] = { critical: 0, high: 0, medium: 0, low: 0 };
      severityByCategory[category][normalizedSeverity] = (severityByCategory[category][normalizedSeverity] || 0) + 1;

      if (!severityByBranch[branch]) severityByBranch[branch] = { critical: 0, high: 0, medium: 0, low: 0 };
      severityByBranch[branch][normalizedSeverity] = (severityByBranch[branch][normalizedSeverity] || 0) + 1;

      if (!severityByAirline[airline]) severityByAirline[airline] = { critical: 0, high: 0, medium: 0, low: 0 };
      severityByAirline[airline][normalizedSeverity] = (severityByAirline[airline][normalizedSeverity] || 0) + 1;
    }

    const toArray = (obj: Record<string, Record<string, number>>): SeverityDistributionAi[] => {
      return Object.entries(obj).map(([name, counts]) => ({
        name,
        critical: counts.critical || 0,
        high: counts.high || 0,
        medium: counts.medium || 0,
        low: counts.low || 0,
      }));
    };

    return {
      area: toArray(severityByArea),
      category: toArray(severityByCategory),
      branch: toArray(severityByBranch),
      airline: toArray(severityByAirline),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.error('[gapura-ai] Error fetching severity distributions:', error);
    return null;
  }
}

export async function fetchRiskSummaryAi(signal?: AbortSignal): Promise<AiRiskSummary | null> {
  try {
    const url = `${GAPURA_AI_BASE_URL}/api/ai/risk/summary?esklasi_regex=`;
    console.log('[gapura-ai] Fetching risk summary from:', url);
    const response = await fetchWithTimeout(url, { signal }, 120000);
    if (!response.ok) {
      console.error('[gapura-ai] Failed to fetch risk summary:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      last_updated: data.last_updated || new Date().toISOString(),
      top_risky_airlines: data.top_risky_airlines || [],
      top_risky_branches: data.top_risky_branches || [],
      total_airlines: data.total_airlines || 0,
      total_branches: data.total_branches || 0,
      total_hubs: data.total_hubs || 0,
      airline_risks: data.airline_risks || { Critical: 0, High: 0, Medium: 0, Low: 0 },
      branch_risks: data.branch_risks || { Critical: 0, High: 0, Medium: 0, Low: 0 },
      hub_risks: data.hub_risks || { Critical: 0, High: 0, Medium: 0, Low: 0 },
      airline_details: data.airline_details || [],
      branch_details: data.branch_details || [],
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.error('[gapura-ai] Error fetching risk summary:', error);
    return null;
  }
}

export async function fetchDashboardSummaryAi(bypassCache = false, signal?: AbortSignal): Promise<DashboardSummaryAi | null> {
  try {
    const url = bypassCache ? `${GAPURA_AI_BASE_URL}/api/ai/dashboard/summary?bypass_cache=true&esklasi_regex=` : `${GAPURA_AI_BASE_URL}/api/ai/dashboard/summary?esklasi_regex=`;
    const response = await fetchWithTimeout(url, { signal }, 120000);
    if (!response.ok) {
      console.error('[gapura-ai] Failed to fetch dashboard summary:', response.status);
      return null;
    }

    const data = await response.json();
    const summary = data.summary || {};
    const severityDist = summary.severityDistribution || {};

    const normalized: Record<string, number> = {
      Critical: severityDist['Critical'] || 0,
      High: severityDist['High'] || 0,
      Medium: severityDist['Medium'] || 0,
      Low: severityDist['Low'] || 0,
    };

    return {
      severity_distribution: normalized,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.error('[gapura-ai] Error fetching dashboard summary:', error);
    return null;
  }
}

export async function fetchRootCauseCategoriesAi(signal?: AbortSignal): Promise<RootCauseCategory[]> {
  try {
    const response = await fetchWithTimeout(`${GAPURA_AI_BASE_URL}/api/ai/root-cause/categories?esklasi_regex=`, { signal }, 60000);
    if (!response.ok) {
      console.error('[gapura-ai] Failed to fetch root cause categories:', response.status);
      return [];
    }

    const data = await response.json();
    const results = data.results || [];

    const rootCauseCounts: Record<string, number> = {};
    for (const record of results) {
      const rootCause = record.originalData?.rootCause || record.originalData?.Root_Caused || record.originalData?.root_caused || 'Unknown';
      const key = String(rootCause).trim();
      if (key && key.toLowerCase() !== 'unknown' && key !== '') {
        rootCauseCounts[key] = (rootCauseCounts[key] || 0) + 1;
      }
    }

    return Object.entries(rootCauseCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return [];
    console.error('[gapura-ai] Error fetching root cause categories:', error);
    return [];
  }
}

export async function fetchRootCauseCategories(signal?: AbortSignal): Promise<Record<string, {
  name: string;
  description: string;
  keyword_count: number;
  severity_multiplier: number;
}> | null> {
  try {
    const response = await fetchWithTimeout(`${GAPURA_AI_BASE_URL}/api/ai/root-cause/categories?esklasi_regex=`, { signal }, 120000);
    if (!response.ok) {
      console.error('[gapura-ai] Failed to fetch root cause categories:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.error('[gapura-ai] Error fetching root cause categories:', error);
    return null;
  }
}

export async function fetchRootCauseStatsAi(source?: string, signal?: AbortSignal): Promise<RootCauseStatsAi | null> {
  try {
    const query = source ? `?source=${encodeURIComponent(source)}` : '';
    const sep = query ? '&' : '?';
    const response = await fetchWithTimeout(`${GAPURA_AI_BASE_URL}/api/ai/root-cause/stats${query}${sep}esklasi_regex=`, { signal }, 120000);
    if (!response.ok) {
      console.error('[gapura-ai] Failed to fetch root cause stats:', response.status);
      return null;
    }

    const data = await response.json();
    return data as RootCauseStatsAi;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.error('[gapura-ai] Error fetching root cause stats:', error);
    return null;
  }
}

export async function fetchBranchSummaryAi(signal?: AbortSignal): Promise<AiBranchSummaryResponse | null> {
  try {
    const response = await fetchWithTimeout(`${GAPURA_AI_BASE_URL}/api/ai/branch/summary?esklasi_regex=`, { signal }, 120000);
    if (!response.ok) {
      console.error('[gapura-ai] Failed to fetch branch summary:', response.status);
      return null;
    }

    const data = await response.json();
    return data as AiBranchSummaryResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.error('[gapura-ai] Error fetching branch summary:', error);
    return null;
  }
}

export async function fetchReportSummaryAi(source: 'non-cargo' | 'cgo'): Promise<AiReportSummaryResponse | null> {
  try {
    const slug = source === 'cgo' ? 'cgo' : 'non-cargo';
    const response = await fetchWithTimeout(`${GAPURA_AI_BASE_URL}/api/ai/summarize/${slug}?esklasi_regex=`, {}, 120000);
    if (!response.ok) {
      console.error(`[gapura-ai] Failed to fetch report summary for ${source}:`, response.status);
      return null;
    }

    const data = await response.json();
    return data as AiReportSummaryResponse;
  } catch (error) {
    console.error(`[gapura-ai] Error fetching report summary for ${source}:`, error);
    return null;
  }
}

export interface HubRiskAnalysis {
  risk_score: number;
  risk_level: string;
  total_issues: number;
  severity_distribution: {
    High?: number;
    Medium?: number;
    Low?: number;
    Critical?: number;
  };
  issue_categories: string[];
  category_count: number;
  data_quality_score: number;
  frequency_score: number;
  severity_score: number;
}

export type HubRiskSummaryResponse = Record<string, HubRiskAnalysis>;

export async function fetchHubRiskAnalysis(signal?: AbortSignal): Promise<HubRiskSummaryResponse | null> {
  try {
    // Use local proxy to avoid CORS and hide upstream URL
    const url = '/api/ai/risk/hubs?esklasi_regex=';
    console.log('[gapura-ai] Fetching hub risk analysis from:', url);
    const response = await fetchWithTimeout(url, { signal }, 120000);
    if (!response.ok) {
      console.error('[gapura-ai] Failed to fetch hub risk analysis:', response.status);
      return null;
    }

    const data = await response.json();
    if (Object.keys(data).length === 0) {
      console.warn('[gapura-ai] API returned empty data');
      return null;
    }
    return data as HubRiskSummaryResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.error('[gapura-ai] Error fetching hub risk analysis:', error);
    return null;
  }
}


export async function fetchBranchRiskAnalysisAi(signal?: AbortSignal): Promise<BranchRiskSummaryResponse | null> {
  try {
    // Use local proxy to avoid CORS and align with server-side config
    const url = `/api/ai/risk/branches?esklasi_regex=`;
    console.log('[gapura-ai] Fetching branch risk analysis from:', url);
    let response = await fetchWithTimeout(url, { signal }, 120000);
    if (!response.ok) {
      console.warn('[gapura-ai] Local proxy returned', response.status, '- attempting direct fallback');
      const fallback = 'https://gapura-dev-gapura-ai.hf.space/api/ai/risk/branches?bypass_cache=true&esklasi_regex=';
      try {
        response = await fetchWithTimeout(fallback, { signal }, 120000);
      } catch {
        // ignore, will handle below
      }
      if (!response || !response.ok) {
        console.error('[gapura-ai] Failed to fetch branch risk analysis:', response ? response.status : 'no_response');
        return null;
      }
    }

    const data = await response.json();
    if (Object.keys(data).length === 0) {
      console.warn('[gapura-ai] API returned empty data');
      return null;
    }
    return data as BranchRiskSummaryResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.error('[gapura-ai] Error fetching branch risk analysis:', error);
    return null;
  }
}
