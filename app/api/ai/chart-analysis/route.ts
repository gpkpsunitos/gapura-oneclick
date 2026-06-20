import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { verifySession } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DL_BASE_URL = process.env.DL_SERVICE_URL
  || process.env.NEXT_PUBLIC_DL_SERVICE_URL
  || 'https://gapura-dev-gapura-deep-learning.hf.space';
const AI_BASE_URL = process.env.AI_SERVICE_URL
  || process.env.NEXT_PUBLIC_AI_SERVICE_URL
  || 'https://gapura-dev-gapura-ai.hf.space';

type ChartPoint = Record<string, unknown>;

type FeatureKey =
  | 'forecasting'
  | 'seasonality'
  | 'subcategory'
  | 'rootCause'
  | 'riskScoring'
  | 'summarization'
  | 'similaritySearch'
  | 'actionRecommendation';

type EndpointResult = {
  name: string;
  path: string;
  ok: boolean;
  source: 'orchestrator' | 'deep-learning';
  status?: number;
  error?: string;
  data?: unknown;
};

type VisualRow = {
  label: string;
  value?: number;
  secondary?: string;
  score?: number;
};

const FAST_TIMEOUT_MS = 4200;
const DEEP_TIMEOUT_MS = 12000;
const FAST_CONTEXT_TIMEOUT_MS = 2600;
const AIRLINE_TIMEOUT_MS = 5000;
const DOMAIN_TIMEOUT_MS = 5000;
const GSE_TIMEOUT_MS = 5200;

const FEATURE_LABELS: Record<FeatureKey, string> = {
  forecasting: 'Issue forecast',
  seasonality: 'Seasonal pattern',
  subcategory: 'Issue grouping',
  rootCause: 'Likely cause',
  riskScoring: 'Risk focus',
  summarization: 'Short summary',
  similaritySearch: 'Related cases',
  actionRecommendation: 'Next actions',
};

function normalizeText(value: unknown, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function asNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function startOfIsoWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
}

function isoWeekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatShortDateRange(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  return sameMonth
    ? `${startMonth} ${start.getDate()}-${end.getDate()}`
    : `${startMonth} ${start.getDate()}-${endMonth} ${end.getDate()}`;
}

function formatPercent(value: unknown) {
  const num = asNumber(value);
  return `${Math.round(num * 100)}%`;
}

function forecastPeriodLabel(period: number) {
  const currentWeek = startOfIsoWeek(new Date());
  const start = new Date(currentWeek);
  start.setDate(currentWeek.getDate() + 7 * period);
  return `W${isoWeekNumber(start)} - ${formatShortDateRange(start)}`;
}

function compactData(data: unknown, maxItems = 12): ChartPoint[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item): item is ChartPoint => item !== null && typeof item === 'object' && !Array.isArray(item))
    .slice(0, maxItems);
}

function valueOf(point: ChartPoint) {
  return asNumber(
    point.value
    ?? point.val
    ?? point.total
    ?? point.count
    ?? point.total_records
    ?? point.total_gse_records
    ?? point.total_issues
    ?? point.total_incidents
    ?? point.risk_score
    ?? point.percentage
    ?? point.grandTotal
    ?? point.Report_Count
    ?? point['Report Count']
  );
}

function nameOf(point: ChartPoint) {
  return normalizeText(
    point.name
    ?? point.label
    ?? point.month
    ?? point.category
    ?? point.branch
    ?? point.airline
    ?? point.airlines
    ?? point.station
    ?? point.area
    ?? point.root
    ?? point.issue_type
    ?? point.rawName,
    'Unknown'
  );
}

function buildContextText(section: string, chartTitle: string, chartType: string, data: ChartPoint[]) {
  const rows = data.slice(0, 10).map((point) => `${nameOf(point)}=${valueOf(point)}`).join('; ');
  return [
    `Section: ${section}`,
    `Chart: ${chartTitle}`,
    `Type: ${chartType}`,
    `Data: ${rows || 'No chart data'}`,
  ].join('\n');
}

function isAirlineContext(section: string, chartTitle: string, chartType: string) {
  return /airline|airlines/.test(`${section} ${chartTitle} ${chartType}`.toLowerCase());
}

function isBranchContext(section: string, chartTitle: string, chartType: string) {
  return /branch|branches|station|stations/.test(`${section} ${chartTitle} ${chartType}`.toLowerCase());
}

function isGseContext(section: string, chartTitle: string, chartType: string) {
  return /\bgse\b|gse service|motorize|non-motorize/.test(`${section} ${chartTitle} ${chartType}`.toLowerCase());
}

function isGseRootChart(chartTitle: string) {
  return /root|cause|motorize|non-motorize|classification/i.test(chartTitle);
}

function isGseCategoryChart(chartTitle: string) {
  return /category|report category/i.test(chartTitle);
}

function isGseTitle(chartTitle: string) {
  return /\bgse\b|motorize|non-motorize/i.test(chartTitle);
}

function isCgoContext(section: string, chartTitle: string, chartType: string) {
  return /\bcgo\b|cargo/.test(`${section} ${chartTitle} ${chartType}`.toLowerCase());
}

function isCategoryContext(section: string, chartTitle: string, chartType: string) {
  return /category|classification|remarks|case|area|root/.test(`${section} ${chartTitle} ${chartType}`.toLowerCase());
}

function relevantFeatures(section: string, chartTitle: string, chartType: string): FeatureKey[] {
  const text = `${section} ${chartTitle} ${chartType}`.toLowerCase();
  const isTime = /month|monthly|date|week|trend|summary category|category_month/.test(text);
  const isCategory = /category|remarks|classification|root|area|airline|branch|station|case/.test(text);
  const isRoot = /root|classification|identified|remarks|case/.test(text);
  const isEntityRisk = /airline|branch|station|area|hub|route|category|case|remarks/.test(text);

  if (isTime && !isRoot) {
    return ['forecasting', 'seasonality', 'summarization'];
  }
  if (isRoot) {
    return ['rootCause', 'riskScoring', 'similaritySearch', 'actionRecommendation'];
  }
  if (isCategory) {
    return ['subcategory', 'riskScoring', 'summarization', 'actionRecommendation'];
  }
  if (isEntityRisk) {
    return ['riskScoring', 'summarization'];
  }
  return ['summarization'];
}

function parseFeatureHints(value: unknown): FeatureKey[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set<FeatureKey>([
    'forecasting',
    'seasonality',
    'subcategory',
    'rootCause',
    'riskScoring',
    'summarization',
    'similaritySearch',
    'actionRecommendation',
  ]);
  return value.filter((item): item is FeatureKey => valid.has(item as FeatureKey));
}

function firstOkData(endpoints: EndpointResult[], names: string[]) {
  return endpoints.find((endpoint) => names.includes(endpoint.name) && endpoint.ok)?.data;
}

function plainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function airlineRiskRows(endpoints: EndpointResult[], limit = 5): VisualRow[] {
  const data = firstOkData(endpoints, ['airline_risks']) as Record<string, unknown> | undefined;
  return Object.entries(data || {})
    .slice(0, limit)
    .map(([airline, raw]) => {
      const item = plainObject(raw);
      const riskScore = asNumber(item.risk_score);
      const totalIssues = asNumber(item.total_issues);
      const riskLevel = normalizeText(item.risk_level, 'Risk');
      return {
        label: airline,
        value: riskScore,
        secondary: `${riskLevel} risk | ${totalIssues} issues`,
        score: riskScore,
      };
    })
    .filter((row) => row.label);
}

function branchRiskRows(endpoints: EndpointResult[], limit = 5): VisualRow[] {
  const ranking = firstOkData(endpoints, ['branch_ranking']) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(ranking) && ranking.length > 0) {
    return ranking
      .slice(0, limit)
      .map((item) => {
        const branch = normalizeText(item.branch);
        const riskScore = asNumber(item.risk_score);
        const totalIssues = asNumber(item.total_issues ?? item.total_incidents);
        const riskLevel = normalizeText(item.risk_level, 'Risk');
        const trend = normalizeText(item.trend);
        const categoryType = normalizeText(item.category_type).replace(/_/g, '/');
        return {
          label: branch,
          value: riskScore,
          secondary: `${riskLevel} risk | ${totalIssues} issues${trend ? ` | ${trend}` : ''}${categoryType ? ` | ${categoryType}` : ''}`,
          score: riskScore,
        };
      })
      .filter((row) => row.label);
  }

  const comparison = firstOkData(endpoints, ['branch_comparison']) as { branches?: Array<Record<string, unknown>> } | undefined;
  if (Array.isArray(comparison?.branches) && comparison.branches.length > 0) {
    return comparison.branches
      .slice(0, limit)
      .map((item) => {
        const landside = plainObject(item.landside_airside);
        const cgo = plainObject(item.cgo);
        const landsideIssues = asNumber(landside.total_issues);
        const cgoIssues = asNumber(cgo.total_issues);
        return {
          label: normalizeText(item.branch),
          value: asNumber(item.total_combined),
          secondary: `Landside/Airside ${landsideIssues} | CGO ${cgoIssues}`,
          score: asNumber(item.total_combined),
        };
      })
      .filter((row) => row.label);
  }

  const riskData = firstOkData(endpoints, ['risk_summary']) as Record<string, unknown> | undefined;
  const branches = Array.isArray(riskData?.top_risky_branches) ? riskData.top_risky_branches : [];
  return branches
    .slice(0, limit)
    .map((branch) => ({ label: normalizeText(branch), secondary: 'Branch', score: 1 }))
    .filter((row) => row.label);
}

function rowsFromUnknownPayload(data: unknown, limit = 5): VisualRow[] {
  const blockedKeys = new Set([
    'status',
    'entity',
    'filters',
    'cached',
    'generatedAt',
    'sourceSyncAt',
    'stale',
    'method',
    'validation',
  ]);

  const rowFromObject = (item: Record<string, unknown>, labelHint?: string): VisualRow | null => {
    const label = normalizeText(
      item.name
      ?? item.label
      ?? item.branch
      ?? item.airline
      ?? item.airlines
      ?? item.category
      ?? item.issue_type
      ?? item.root_cause
      ?? item.root
      ?? item.equipment
      ?? item.issue
      ?? item.title
      ?? labelHint
    );
    if (!label) return null;

    const value = valueOf(item);
    const parts = [
      typeof item.percentage !== 'undefined' ? `${asNumber(item.percentage)}%` : '',
      item.risk_level ? `${normalizeText(item.risk_level)} risk` : '',
      item.trend ? normalizeText(item.trend) : '',
      item.total_issues ? `${asNumber(item.total_issues)} issues` : '',
      item.count ? `${asNumber(item.count)} cases` : '',
    ].filter(Boolean);

    return {
      label,
      value,
      secondary: parts.join(' | ') || undefined,
      score: value || asNumber(item.confidence),
    };
  };

  const parseArray = (items: unknown[]) => items
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object' && !Array.isArray(item))
    .map((item) => rowFromObject(item))
    .filter((row): row is VisualRow => Boolean(row?.label));

  if (Array.isArray(data)) return parseArray(data).slice(0, limit);

  const obj = plainObject(data);
  const arrayKeys = ['top', 'items', 'results', 'rows', 'branches', 'airlines', 'categories', 'issues', 'ranking', 'matches', 'recommendations', 'equipment_status', 'common_issues'];
  for (const key of arrayKeys) {
    if (Array.isArray(obj[key])) {
      const rows = parseArray(obj[key] as unknown[]);
      if (rows.length > 0) return rows.slice(0, limit);
    }
  }

  const distribution = plainObject(obj.distribution_high_level);
  if (Object.keys(distribution).length > 0) {
    return Object.entries(distribution)
      .map(([label, raw]) => rowFromObject(plainObject(raw), label))
      .filter((row): row is VisualRow => Boolean(row?.label))
      .slice(0, limit);
  }

  const mapKeys = [
    'distribution',
    'distribution_subcategory',
    'distribution_root_cause',
    'serviceability_distribution',
    'top_categories',
    'top_airlines',
    'top_branches',
    'top_hubs',
    'area_distribution',
    'status_distribution',
    'root_cause_categories',
    'monthly_trend',
  ];
  for (const key of mapKeys) {
    const map = plainObject(obj[key]);
    if (Object.keys(map).length > 0) {
      const rows = Object.entries(map)
        .map(([label, raw]) => {
          if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            return rowFromObject(plainObject(raw), label);
          }
          const value = asNumber(raw);
          return value > 0 ? { label: formatEndpointLabel(label), value, score: value } : null;
        })
        .filter((row): row is VisualRow => Boolean(row?.label));
      if (rows.length > 0) return rows.slice(0, limit);
    }
  }

  // ponytail: removed the "dump raw object keys" catch-all — it was producing executive-visible
  // cards like "TotalRecords / categories / overallSummary". If no recognized shape is found,
  // return empty so upstream callers fall through to "unavailable" copy instead of fabricated data.
  return [];
}

function rowsFromNamedEndpoints(endpoints: EndpointResult[], names: string[], limit = 5): VisualRow[] {
  const rows: VisualRow[] = [];
  const seen = new Set<string>();
  endpoints
    .filter((endpoint) => names.includes(endpoint.name) && endpoint.ok)
    .forEach((endpoint) => {
      rowsFromUnknownPayload(endpoint.data, limit).forEach((row) => {
        const key = `${row.label}:${row.value ?? row.secondary ?? ''}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        rows.push(row);
      });
    });
  return rows.slice(0, limit);
}

function gseRows(endpoints: EndpointResult[], limit = 5) {
  return rowsFromNamedEndpoints(
    endpoints,
    ['gse_ranking', 'gse_top_issues', 'gse_serviceability', 'gse_irregularities'],
    limit
  );
}

function categoryRiskRows(endpoints: EndpointResult[], limit = 5) {
  return rowsFromNamedEndpoints(endpoints, ['risk_categories'], limit);
}

function rowsFromMappedObject(map: Record<string, unknown>, secondary: string, limit = 5): VisualRow[] {
  return Object.entries(map)
    .map(([label, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const item = plainObject(value);
        return {
          label,
          value: asNumber(item.count ?? item.total ?? item.value),
          secondary: typeof item.percentage !== 'undefined' ? `${asNumber(item.percentage)}% | ${secondary}` : secondary,
          score: asNumber(item.count ?? item.total ?? item.value),
        };
      }
      return {
        label,
        value: asNumber(value),
        secondary,
        score: asNumber(value),
      };
    })
    .sort((a, b) => asNumber(b.value) - asNumber(a.value))
    .slice(0, limit);
}

function gseRootCauseRows(endpoints: EndpointResult[], limit = 5) {
  const data = firstOkData(endpoints, ['gse_top_issues']) as Record<string, unknown> | undefined;
  const map = plainObject(data?.distribution_root_cause);
  if (Object.keys(map).length > 0) return rowsFromMappedObject(map, 'GSE root cause', limit);
  return rowsFromNamedEndpoints(endpoints, ['root_cause_stats'], limit);
}

function gseSubcategoryRows(endpoints: EndpointResult[], limit = 5) {
  const data = firstOkData(endpoints, ['gse_top_issues']) as Record<string, unknown> | undefined;
  const map = plainObject(data?.distribution_subcategory);
  if (Object.keys(map).length > 0) return rowsFromMappedObject(map, 'GSE issue group', limit);
  return rowsFromNamedEndpoints(endpoints, ['risk_categories'], limit);
}

function gseCategoryRows(endpoints: EndpointResult[], limit = 5) {
  const data = firstOkData(endpoints, ['gse_top_issues']) as Record<string, unknown> | undefined;
  const distribution = plainObject(data?.distribution);
  if (Object.keys(distribution).length > 0) return rowsFromMappedObject(distribution, 'GSE category', limit);

  const top = plainObject(data?.top);
  if (Object.keys(top).length > 0) {
    return [{
      label: normalizeText(top.category, 'Top GSE category'),
      value: asNumber(top.count),
      secondary: `${asNumber(top.percentage)}% of GSE issue records`,
      score: asNumber(top.count),
    }];
  }

  return rowsFromNamedEndpoints(endpoints, ['gse_top_issues'], limit);
}

function gseServiceabilityRows(endpoints: EndpointResult[], limit = 5) {
  const data = firstOkData(endpoints, ['gse_serviceability']) as Record<string, unknown> | undefined;
  const equipment = Array.isArray(data?.equipment_status) ? data.equipment_status : [];
  const rows = equipment
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item) => {
      const counts = plainObject(item.counts);
      const notReady = asNumber(counts.Unserviceable) + asNumber(counts['Needs Maintenance']) + asNumber(counts.Unavailable);
      return {
        label: normalizeText(item.equipment, 'Unknown equipment'),
        value: notReady,
        secondary: `Total ${asNumber(item.total)} | not ready ${notReady}`,
        score: notReady,
      };
    })
    .filter((row) => row.label.toLowerCase() !== 'unknown' && asNumber(row.value) > 0)
    .sort((a, b) => asNumber(b.value) - asNumber(a.value));
  if (rows.length > 0) return rows.slice(0, limit);

  const distribution = plainObject(data?.serviceability_distribution);
  if (Object.keys(distribution).length > 0) return rowsFromMappedObject(distribution, 'GSE serviceability', limit);
  return [];
}

function gseRiskRows(endpoints: EndpointResult[], chartTitle: string, limit = 5) {
  if (isGseRootChart(chartTitle)) {
    const rootRows = gseRootCauseRows(endpoints, limit);
    if (rootRows.length > 0) return rootRows;
  }
  if (isGseCategoryChart(chartTitle)) {
    const categoryRows = gseCategoryRows(endpoints, limit);
    if (categoryRows.length > 0) return categoryRows;
  }

  const serviceabilityRows = gseServiceabilityRows(endpoints, limit);
  if (serviceabilityRows.length > 0) return serviceabilityRows;
  return gseRows(endpoints, limit);
}

function entityRiskRows(endpoints: EndpointResult[], limit = 5) {
  const branches = branchRiskRows(endpoints, limit);
  if (branches.length > 0) return { label: 'branch', rows: branches };
  const airlines = airlineRiskRows(endpoints, limit);
  if (airlines.length > 0) return { label: 'airline', rows: airlines };
  return { label: 'entity', rows: [] as VisualRow[] };
}

function forecastInsights(endpoints: EndpointResult[]) {
  const forecastData = firstOkData(endpoints, ['forecast_issues']) as { forecasts?: Array<Record<string, unknown>>; method?: string; validation?: Record<string, unknown> } | undefined;
  const forecasts = Array.isArray(forecastData?.forecasts) ? forecastData.forecasts : [];
  const rows = forecasts.slice(0, 4).map((item) => (
    `${forecastPeriodLabel(asNumber(item.period) || 1)}: ${asNumber(item.predicted)} cases, expected range ${asNumber(item.lower_bound)}-${asNumber(item.upper_bound)}, confidence ${formatPercent(item.confidence)}.`
  ));

  return rows.length > 0 ? rows : ['Live issue forecast unavailable.'];
}

function seasonalityInsights(endpoints: EndpointResult[]) {
  const insights: string[] = [];
  const data = firstOkData(endpoints, ['seasonality_forecast']) as Record<string, { forecasts?: Array<Record<string, unknown>> }> | undefined;
  Object.entries(data || {}).slice(0, 2).forEach(([group, value]) => {
    const first = value.forecasts?.[0];
    const second = value.forecasts?.[1];
    if (first) insights.push(`${formatEndpointLabel(group)} ${forecastPeriodLabel(asNumber(first.period) || 1)}: ${asNumber(first.predicted)} cases.`);
    if (second) insights.push(`${formatEndpointLabel(group)} ${forecastPeriodLabel(asNumber(second.period) || 2)}: ${asNumber(second.predicted)} cases.`);
  });

  return insights.length > 0 ? insights : ['Live seasonal pattern unavailable.'];
}

function classificationInsights(feature: FeatureKey, endpoints: EndpointResult[], fallback: string) {
  const insights: string[] = [];
  const okData = endpoints.filter((endpoint) => endpoint.ok).map((endpoint) => endpoint.data as Record<string, unknown>);

  for (const data of okData) {
    const label = normalizeText(data?.label ?? data?.category ?? data?.root_cause ?? data?.prediction ?? data?.issue_type);
    const confidence = asNumber(data?.confidence);
    if (label) {
      const strength = confidence >= 0.75 ? 'strong match' : confidence >= 0.5 ? 'possible match' : confidence > 0 ? 'weak match' : '';
      insights.push(`${feature === 'subcategory' ? 'Likely group' : 'Likely cause'}: ${label}${strength ? ` (${strength})` : ''}.`);
    }
  }

  return insights.length > 0 ? insights : [fallback];
}

function riskInsights(endpoints: EndpointResult[], chartTitle = '', chartData: ChartPoint[] = []) {
  const insights: string[] = [];
  const gseFocusedRows = gseRiskRows(endpoints, chartTitle, 3);
  if (gseFocusedRows.length > 0) {
    insights.push(`Top GSE focus: ${gseFocusedRows[0].label}${gseFocusedRows[0].value ? ` (${gseFocusedRows[0].value})` : ''}.`);
    if (gseFocusedRows[1]) insights.push(`Next GSE focus: ${gseFocusedRows[1].label}${gseFocusedRows[1].value ? ` (${gseFocusedRows[1].value})` : ''}.`);
    return insights;
  }

  const activeRows = isGseTitle(chartTitle) ? chartVisualRows(chartData, 3) : [];
  if (activeRows.length > 0) {
    insights.push(`Top active GSE row: ${activeRows[0].label}${activeRows[0].value ? ` (${activeRows[0].value} cases)` : ''}.`);
    if (activeRows[1]) insights.push(`Next active GSE row: ${activeRows[1].label}${activeRows[1].value ? ` (${activeRows[1].value} cases)` : ''}.`);
    return insights;
  }

  const entityRows = entityRiskRows(endpoints, 3);
  if (entityRows.rows.length > 0) {
    insights.push(`Top ${entityRows.label} risk: ${entityRows.rows[0].label} (${entityRows.rows[0].secondary}).`);
    if (entityRows.rows[1]) insights.push(`Next ${entityRows.label} to watch: ${entityRows.rows[1].label} (${entityRows.rows[1].secondary}).`);
    return insights;
  }

  const categoryRows = categoryRiskRows(endpoints, 3);
  if (categoryRows.length > 0) {
    insights.push(`Top category risk: ${categoryRows[0].label}${categoryRows[0].value ? ` (${categoryRows[0].value})` : ''}.`);
    if (categoryRows[1]) insights.push(`Next category to watch: ${categoryRows[1].label}${categoryRows[1].value ? ` (${categoryRows[1].value})` : ''}.`);
    return insights;
  }

  const risk = firstOkData(endpoints, ['risk_summary']) as Record<string, unknown> | undefined;
  const topBranches = Array.isArray(risk?.top_risky_branches) ? risk.top_risky_branches.slice(0, 3).join(', ') : '';
  const topAirlines = Array.isArray(risk?.top_risky_airlines) ? risk.top_risky_airlines.slice(0, 3).join(', ') : '';
  if (topBranches) insights.push(`Branches needing attention: ${topBranches}.`);
  if (topAirlines) insights.push(`Airlines needing attention: ${topAirlines}.`);
  return insights.length > 0 ? insights : ['Live risk focus unavailable.'];
}

function actionInsights(endpoints: EndpointResult[], chartTitle = '', chartData: ChartPoint[] = []) {
  const insights: string[] = [];
  gseActionRows(endpoints, chartTitle, 3).forEach((row, index) => {
    insights.push(`${index + 1}. ${row.label}`);
  });
  if (insights.length > 0) return insights;

  if (isGseTitle(chartTitle)) {
    chartActionRows(chartData, 3).forEach((row, index) => {
      insights.push(`${index + 1}. ${row.label}`);
    });
    if (insights.length > 0) return insights;
  }

  const actionData = firstOkData(endpoints, ['action_recommend', 'dl_action_recommend']) as { recommendations?: Array<Record<string, unknown>> } | undefined;
  actionData?.recommendations?.slice(0, 5).forEach((item) => {
    const action = normalizeText(item.action ?? item.recommendation);
    if (action && !/^document the incident$/i.test(action) && insights.length < 3) {
      insights.push(`${insights.length + 1}. ${action}`);
    }
  });
  if (insights.length === 0) {
    cgoActionRows(endpoints, 3).forEach((row, index) => {
      insights.push(`${index + 1}. ${row.label}`);
    });
  }
  if (insights.length === 0) {
    rowsFromNamedEndpoints(endpoints, ['action_summary'], 3).forEach((row, index) => {
      insights.push(`${index + 1}. ${row.label}${row.secondary ? ` (${row.secondary})` : ''}`);
    });
  }
  return insights.length > 0 ? insights : ['Live action recommendation unavailable.'];
}

function liveSimilarItems(endpoints: EndpointResult[]) {
  const payloads = endpoints
    .filter((endpoint) => ['similarity_search', 'dl_similarity_search'].includes(endpoint.name) && endpoint.ok)
    .map((endpoint) => endpoint.data);

  for (const payload of payloads) {
    const similar = plainObject(payload);
    const direct = [
      similar.matches,
      similar.similar_cases,
      similar.similar_reports,
    ].find(Array.isArray);
    if (Array.isArray(direct)) return direct;

    if (Array.isArray(similar.results)) return similar.results;
    const results = plainObject(similar.results);
    const nested = [
      results.matches,
      results.similar_cases,
      results.similar_reports,
    ].find(Array.isArray);
    if (Array.isArray(nested)) return nested;
  }

  return [];
}

function similarityInsights(endpoints: EndpointResult[]) {
  const count = liveSimilarItems(endpoints).length;
  if (count > 0) return [`Found ${count} related case candidates. Review the original reports before taking action.`];
  return ['Live related cases unavailable.'];
}

function featureInsights(feature: FeatureKey, endpoints: EndpointResult[], chartTitle = '', chartData: ChartPoint[] = []) {
  if (feature === 'forecasting') return forecastInsights(endpoints);
  if (feature === 'seasonality') return seasonalityInsights(endpoints);
  if (feature === 'subcategory') {
    const rows = isGseCategoryChart(chartTitle) ? gseCategoryRows(endpoints, 3) : gseSubcategoryRows(endpoints, 3);
    if (rows.length > 0) return rows.map((row) => `${row.label}${row.value ? `: ${row.value}` : ''}${row.secondary ? ` (${row.secondary})` : ''}.`);
    const activeRows = isGseTitle(chartTitle) ? chartVisualRows(chartData, 3) : [];
    if (activeRows.length > 0) return activeRows.map((row) => `${row.label}${row.value ? `: ${row.value} cases` : ''}.`);
    return classificationInsights(feature, endpoints, 'Live issue grouping unavailable.');
  }
  if (feature === 'rootCause') {
    const rows = gseRootCauseRows(endpoints, 3);
    if (rows.length > 0) return rows.map((row) => `${row.label}${row.value ? `: ${row.value}` : ''}${row.secondary ? ` (${row.secondary})` : ''}.`);
    const activeRows = isGseTitle(chartTitle) ? chartVisualRows(chartData, 3) : [];
    if (activeRows.length > 0) return activeRows.map((row) => `${row.label}${row.value ? `: ${row.value} cases` : ''}.`);
    return classificationInsights(feature, endpoints, 'Live likely cause unavailable.');
  }
  if (feature === 'riskScoring') return riskInsights(endpoints, chartTitle, chartData);
  if (feature === 'actionRecommendation') return actionInsights(endpoints, chartTitle, chartData);
  if (feature === 'similaritySearch') return similarityInsights(endpoints);
  if (feature === 'summarization') return summaryInsights(endpoints, chartTitle, chartData);
  return ['Live result unavailable.'];
}

function extractLabelConfidence(data: unknown) {
  const obj = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const label = normalizeText(obj.label ?? obj.category ?? obj.root_cause ?? obj.prediction ?? obj.issue_type);
  const confidence = asNumber(obj.confidence);
  return { label, confidence };
}

function formatEndpointLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cleanSummaryText(value: unknown) {
  let text = normalizeText(value).replace(/\s+/g, ' ').trim();
  const dataMatch = text.match(/\bData:\s*/i);
  if (dataMatch?.index !== undefined) {
    text = text.slice(dataMatch.index + dataMatch[0].length).trim();
  }
  return text
    .replace(/^Section:\s*/i, '')
    .replace(/^Chart:\s*/i, '')
    .replace(/^Type:\s*/i, '')
    .trim();
}

function parseSummaryRowsFromText(text: string, limit = 6): VisualRow[] {
  return text
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.lastIndexOf('=');
      if (separator < 1) return { label: part };
      return {
        label: part.slice(0, separator).trim(),
        value: asNumber(part.slice(separator + 1).trim()),
      };
    })
    .filter((row) => row.label)
    .slice(0, limit);
}

function categorySummaryPoints(endpoints: EndpointResult[]) {
  const data = firstOkData(endpoints, ['summary_by_category']) as { summary?: Record<string, unknown> } | undefined;
  const summary = plainObject(data?.summary);
  const points: string[] = [];
  for (const key of ['non_cargo', 'cgo']) {
    const bucket = plainObject(summary[key]);
    const keyInsights = Array.isArray(bucket.key_insights)
      ? bucket.key_insights.map((item) => normalizeText(item)).filter(Boolean)
      : [];
    points.push(...keyInsights.slice(0, 2));
  }
  return points.slice(0, 4);
}

function branchSummaryPoints(endpoints: EndpointResult[]) {
  const data = firstOkData(endpoints, ['branch_summary']) as Record<string, unknown> | undefined;
  if (!data) return [];

  const points: string[] = [];
  const landside = plainObject(data.landside_airside);
  const cgo = plainObject(data.cgo);
  const comparison = plainObject(data.comparison);
  if (Object.keys(landside).length > 0) {
    points.push(`Landside/Airside: ${asNumber(landside.total_branches)} branches, ${asNumber(landside.total_issues)} issues, average risk ${asNumber(landside.avg_risk_score)}.`);
  }
  if (Object.keys(cgo).length > 0) {
    points.push(`CGO: ${asNumber(cgo.total_branches)} branches, ${asNumber(cgo.total_issues)} issues, average risk ${asNumber(cgo.avg_risk_score)}.`);
  }
  if (Object.keys(comparison).length > 0) {
    points.push(`Combined volume: Landside/Airside ${asNumber(comparison.ls_total_issues)} issues, CGO ${asNumber(comparison.cgo_total_issues)} issues.`);
  }
  return points.slice(0, 4);
}

function gseSummaryPoints(endpoints: EndpointResult[]) {
  const rows = gseRows(endpoints, 4);
  if (rows.length === 0) return [];
  return rows.map((row) => {
    const value = typeof row.value === 'number' && row.value > 0 ? `${row.value} cases` : '';
    return [row.label, value, row.secondary].filter(Boolean).join(': ');
  });
}

function cgoSummaryPoints(endpoints: EndpointResult[]) {
  const data = firstOkData(endpoints, ['summary_cgo']) as Record<string, unknown> | undefined;
  const summary = plainObject(data?.summary);
  if (Object.keys(summary).length === 0) return [];

  const points: string[] = [];
  if (summary.total_records) {
    points.push(`Total cargo reports: ${asNumber(summary.total_records)}.`);
  }
  if (summary.critical_high_percentage) {
    points.push(`Critical or high severity: ${asNumber(summary.critical_high_percentage)}%.`);
  }

  const topCategories = plainObject(summary.top_categories);
  const topCategory = Object.entries(topCategories).sort((a, b) => asNumber(b[1]) - asNumber(a[1]))[0];
  if (topCategory) {
    points.push(`Largest issue: ${topCategory[0]} (${asNumber(topCategory[1])} reports).`);
  }

  const topAirlines = plainObject(summary.top_airlines);
  const topAirline = Object.entries(topAirlines).sort((a, b) => asNumber(b[1]) - asNumber(a[1]))[0];
  if (topAirline) {
    points.push(`Highest reporting airline: ${topAirline[0]} (${asNumber(topAirline[1])} reports).`);
  }

  const keyInsights = Array.isArray(summary.key_insights)
    ? summary.key_insights.map((item) => normalizeText(item)).filter(Boolean)
    : [];
  return [...points, ...keyInsights].slice(0, 4);
}

function cgoSummaryRows(endpoints: EndpointResult[], limit = 5) {
  const data = firstOkData(endpoints, ['summary_cgo']) as Record<string, unknown> | undefined;
  const summary = plainObject(data?.summary);
  if (Object.keys(summary).length === 0) return [];

  const topCategories = plainObject(summary.top_categories);
  const categoryRows = Object.entries(topCategories)
    .map(([label, value]) => ({ label, value: asNumber(value), secondary: 'Top cargo issue', score: asNumber(value) }))
    .sort((a, b) => asNumber(b.value) - asNumber(a.value));
  if (categoryRows.length > 0) return categoryRows.slice(0, limit);

  const topAirlines = plainObject(summary.top_airlines);
  return Object.entries(topAirlines)
    .map(([label, value]) => ({ label, value: asNumber(value), secondary: 'Top cargo airline', score: asNumber(value) }))
    .sort((a, b) => asNumber(b.value) - asNumber(a.value))
    .slice(0, limit);
}

function cgoActionRows(endpoints: EndpointResult[], limit = 5) {
  const data = firstOkData(endpoints, ['summary_cgo']) as Record<string, unknown> | undefined;
  const summary = plainObject(data?.summary);
  const recommendations = Array.isArray(summary.recommendations) ? summary.recommendations : [];
  return recommendations
    .map((item, index) => ({
      label: normalizeText(item, `Action ${index + 1}`),
      secondary: 'Cargo recommendation',
      score: 0.8,
    }))
    .filter((row) => row.label)
    .slice(0, limit);
}

function chartVisualRows(data: ChartPoint[], limit = 5): VisualRow[] {
  return data
    .map((point) => ({
      label: nameOf(point),
      value: valueOf(point),
      secondary: 'Active chart row',
      score: valueOf(point),
    }))
    .filter((row) => row.label && row.label.toLowerCase() !== 'unknown')
    .slice(0, limit);
}

function chartActionRows(data: ChartPoint[], limit = 3): VisualRow[] {
  const rows = chartVisualRows(data, limit);
  return rows.map((row) => ({
    label: `Review ${row.label} first and confirm owner, evidence, and closure target.`,
    secondary: row.value ? `${row.value} cases in active chart` : 'Active chart priority',
    score: 0.72,
  }));
}

function gseActionRows(endpoints: EndpointResult[], chartTitle: string, limit = 5): VisualRow[] {
  const rows: VisualRow[] = [];
  const topIssueData = firstOkData(endpoints, ['gse_top_issues']) as Record<string, unknown> | undefined;
  const ranking = firstOkData(endpoints, ['gse_ranking']) as Record<string, unknown> | undefined;

  const rootRows = gseRootCauseRows(endpoints, 2);
  rootRows.forEach((row) => {
    rows.push({
      label: `Review ${row.label} cases and confirm owner, evidence, and closure target.`,
      secondary: `GSE root cause | ${row.value ?? 0} cases`,
      score: 0.88,
    });
  });

  const equipmentRows = gseServiceabilityRows(endpoints, 3);
  equipmentRows.forEach((row) => {
    rows.push({
      label: `Prioritize ${row.label} readiness check and replacement plan.`,
      secondary: row.secondary,
      score: 0.84,
    });
  });

  const topBranches = rowsFromUnknownPayload(ranking, 2);
  topBranches.forEach((row) => {
    rows.push({
      label: `Check ${row.label} first because it carries the largest GSE case load.`,
      secondary: row.secondary || (row.value ? `${row.value} cases` : 'GSE branch load'),
      score: 0.78,
    });
  });

  const topSubcategory = plainObject(topIssueData?.top_subcategory);
  if (topSubcategory.subcategory) {
    rows.push({
      label: `Audit ${normalizeText(topSubcategory.subcategory)} workflow and recent repeat cases.`,
      secondary: `${asNumber(topSubcategory.count)} cases | ${asNumber(topSubcategory.percentage)}%`,
      score: 0.76,
    });
  }

  const seen = new Set<string>();
  return rows
    .filter((row) => {
      const key = row.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return !/document the incident/i.test(row.label);
    })
    .filter((row) => {
      const title = chartTitle.toLowerCase();
      if (title.includes('motorize')) return true;
      if (title.includes('category')) return !row.label.toLowerCase().includes('replacement plan') || rows.length <= 3;
      return true;
    })
    .slice(0, limit);
}

function summaryInsights(endpoints: EndpointResult[], chartTitle = '', chartData: ChartPoint[] = []) {
  const gseFocusedRows = isGseRootChart(chartTitle)
    ? gseRootCauseRows(endpoints, 4)
    : isGseCategoryChart(chartTitle)
      ? gseCategoryRows(endpoints, 4)
      : [];
  if (gseFocusedRows.length > 0) {
    return gseFocusedRows.map((row) => `${row.label}${row.value ? `: ${row.value}` : ''}${row.secondary ? ` (${row.secondary})` : ''}.`);
  }

  const gsePoints = gseSummaryPoints(endpoints);
  if (gsePoints.length > 0) return gsePoints;

  const activeRows = isGseTitle(chartTitle) ? chartVisualRows(chartData, 4) : [];
  if (activeRows.length > 0) {
    return activeRows.map((row) => `${row.label}${row.value ? `: ${row.value} cases` : ''}.`);
  }

  const branchPoints = branchSummaryPoints(endpoints);
  if (branchPoints.length > 0) return branchPoints;

  const entityRows = entityRiskRows(endpoints, 3);
  if (entityRows.rows.length > 0) {
    return entityRows.rows.map((row) => `${row.label}: ${row.secondary}.`);
  }

  const cgoPoints = cgoSummaryPoints(endpoints);
  if (cgoPoints.length > 0) return cgoPoints;

  const categoryPoints = categorySummaryPoints(endpoints);
  if (categoryPoints.length > 0) return categoryPoints;

  const data = firstOkData(endpoints, ['dl_summarize']) as { summaries?: Array<Record<string, unknown>> } | undefined;
  const summary = data?.summaries?.[0];
  const executive = cleanSummaryText(summary?.executive_summary);
  const points = Array.isArray(summary?.key_points)
    ? summary.key_points.map((point) => cleanSummaryText(point)).filter(Boolean)
    : [];
  return [executive, ...points].filter(Boolean).slice(0, 3).length > 0
    ? [executive, ...points].filter(Boolean).slice(0, 3)
    : ['Live summary unavailable.'];
}

function summaryVisualRows(endpoints: EndpointResult[], chartTitle = '', chartData: ChartPoint[] = []) {
  const gseFocusedRows = isGseRootChart(chartTitle)
    ? gseRootCauseRows(endpoints, 5)
    : isGseCategoryChart(chartTitle)
      ? gseCategoryRows(endpoints, 5)
      : [];
  if (gseFocusedRows.length > 0) return gseFocusedRows;

  const gseRowsResult = gseRows(endpoints, 5);
  if (gseRowsResult.length > 0) return gseRowsResult;

  const activeRows = isGseTitle(chartTitle) ? chartVisualRows(chartData, 5) : [];
  if (activeRows.length > 0) return activeRows;

  const branchPoints = branchSummaryPoints(endpoints);
  if (branchPoints.length > 0) {
    return branchPoints.map((label) => ({ label }));
  }

  const entityRows = entityRiskRows(endpoints, 5);
  if (entityRows.rows.length > 0) return entityRows.rows;

  const cgoRows = cgoSummaryRows(endpoints, 5);
  if (cgoRows.length > 0) return cgoRows;

  const categoryPoints = categorySummaryPoints(endpoints);
  if (categoryPoints.length > 0) {
    return categoryPoints.map((label) => ({ label }));
  }

  const data = firstOkData(endpoints, ['dl_summarize']) as { summaries?: Array<Record<string, unknown>> } | undefined;
  const summary = data?.summaries?.[0];
  const text = cleanSummaryText(summary?.executive_summary);
  const parsedRows = parseSummaryRowsFromText(text);
  if (parsedRows.length > 0) return parsedRows;
  return summaryInsights(endpoints, chartTitle, chartData).map((label) => ({ label }));
}

function featureVisual(feature: FeatureKey, endpoints: EndpointResult[], chartTitle = '', chartData: ChartPoint[] = []): { type: 'bar' | 'forecast' | 'table'; rows: VisualRow[] } {
  if (feature === 'forecasting') {
    const forecastData = firstOkData(endpoints, ['forecast_issues']) as { forecasts?: Array<Record<string, unknown>> } | undefined;
    const rows = forecastData?.forecasts?.slice(0, 4).map((item) => ({
      label: forecastPeriodLabel(asNumber(item.period)),
      value: asNumber(item.predicted),
      secondary: `Range ${asNumber(item.lower_bound)}-${asNumber(item.upper_bound)} | confidence ${formatPercent(item.confidence)}`,
      score: asNumber(item.confidence),
    }));
    if (rows?.length) return { type: 'forecast', rows };
    return { type: 'table', rows: [{ label: 'Live issue forecast unavailable', secondary: 'No live rows returned', score: 0 }] };
  }

  if (feature === 'seasonality') {
    const seasonality = firstOkData(endpoints, ['seasonality_forecast']) as Record<string, { forecasts?: Array<Record<string, unknown>> }> | undefined;
    const rows = Object.entries(seasonality || {}).flatMap(([group, value]) =>
      (value.forecasts || []).slice(0, 2).map((item) => ({
        label: `${formatEndpointLabel(group)} ${forecastPeriodLabel(asNumber(item.period))}`,
        value: asNumber(item.predicted),
        secondary: `Range ${asNumber(item.lower_bound)}-${asNumber(item.upper_bound)}`,
        score: asNumber(item.confidence),
      }))
    );
    if (rows.length) return { type: 'forecast', rows: rows.slice(0, 4) };
    return { type: 'table', rows: [{ label: 'Live seasonal pattern unavailable', secondary: 'No live rows returned', score: 0 }] };
  }

  if (feature === 'subcategory' || feature === 'rootCause') {
    const domainRows = feature === 'rootCause'
      ? gseRootCauseRows(endpoints, 4)
      : isGseCategoryChart(chartTitle)
        ? gseCategoryRows(endpoints, 4)
        : gseSubcategoryRows(endpoints, 4);
    if (domainRows.length > 0) return { type: 'table', rows: domainRows };

    const activeRows = isGseTitle(chartTitle) ? chartVisualRows(chartData, 4) : [];
    if (activeRows.length > 0) return { type: 'table', rows: activeRows };

    const rows = endpoints
      .filter((endpoint) => endpoint.ok)
      .map((endpoint) => extractLabelConfidence(endpoint.data))
      .filter((item) => item.label && item.label.toLowerCase() !== 'unknown')
      .slice(0, 4)
      .map((item) => {
        const strength = item.confidence >= 0.75
          ? 'Strong match'
          : item.confidence >= 0.5
            ? 'Possible match'
            : item.confidence > 0
              ? 'Weak match'
              : 'Likely match';
        return {
          label: item.label,
          secondary: strength,
          score: item.confidence || 0.5,
        };
      });
    return rows.length ? { type: 'table', rows } : { type: 'table', rows: [{ label: feature === 'subcategory' ? 'Live issue grouping unavailable' : 'Live likely cause unavailable', secondary: 'No live rows returned', score: 0 }] };
  }

  if (feature === 'riskScoring') {
    const gseFocusedRows = gseRiskRows(endpoints, chartTitle, 5);
    if (gseFocusedRows.length) return { type: 'bar', rows: gseFocusedRows };

    const activeRows = isGseTitle(chartTitle) ? chartVisualRows(chartData, 5) : [];
    if (activeRows.length) return { type: 'bar', rows: activeRows };

    const entityRows = entityRiskRows(endpoints, 5);
    if (entityRows.rows.length) return { type: 'bar', rows: entityRows.rows };

    const categoryRows = categoryRiskRows(endpoints, 5);
    if (categoryRows.length) return { type: 'bar', rows: categoryRows };

    const risk = firstOkData(endpoints, ['risk_summary']) as Record<string, unknown> | undefined;
    const branches = Array.isArray(risk?.top_risky_branches) ? risk.top_risky_branches : [];
    const airlines = Array.isArray(risk?.top_risky_airlines) ? risk.top_risky_airlines : [];
    const rows = [
      ...branches.slice(0, 3).map((label) => ({ label: normalizeText(label), secondary: 'Branch', score: 1 })),
      ...airlines.slice(0, 3).map((label) => ({ label: normalizeText(label), secondary: 'Airline', score: 1 })),
    ].filter((row) => row.label);
    return { type: 'table', rows: rows.length ? rows : [{ label: 'Live risk focus unavailable', secondary: 'No live rows returned', score: 0 }] };
  }

  if (feature === 'similaritySearch') {
    const rows = liveSimilarItems(endpoints)
      .slice(0, 4)
      .map((item, index) => {
        const obj = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        const metadata = obj.report_metadata && typeof obj.report_metadata === 'object' ? obj.report_metadata as Record<string, unknown> : {};
        return {
          label: normalizeText(metadata.report_preview ?? obj.title ?? obj.report ?? obj.id, `Candidate ${index + 1}`),
          value: asNumber(obj.score ?? obj.similarity),
          secondary: normalizeText(metadata.date ?? metadata.branch ?? metadata.airline, 'Similar report'),
          score: asNumber(obj.score ?? obj.similarity),
        };
      });
    return { type: 'table', rows: rows.length ? rows : [{ label: 'Live related cases unavailable', secondary: 'No live rows returned', score: 0 }] };
  }

  if (feature === 'actionRecommendation') {
    const gseActionSuggestions = gseActionRows(endpoints, chartTitle, 5);
    if (gseActionSuggestions.length) return { type: 'table', rows: gseActionSuggestions };

    const activeActions = isGseTitle(chartTitle) ? chartActionRows(chartData, 5) : [];
    if (activeActions.length) return { type: 'table', rows: activeActions };

    const actionData = firstOkData(endpoints, ['action_recommend', 'dl_action_recommend']) as { recommendations?: Array<Record<string, unknown>> } | undefined;
    const rows = actionData?.recommendations?.slice(0, 5).map((item, index) => ({
      label: normalizeText(item.action ?? item.recommendation, `Action ${index + 1}`),
      secondary: normalizeText(item.priority ?? item.source, 'recommended'),
      score: asNumber(item.confidence) || 0.7,
    })) || [];
    const usefulRows = rows.filter((row) => !/^document the incident$/i.test(row.label));
    if (usefulRows.length) return { type: 'table', rows: usefulRows };

    const cgoRows = cgoActionRows(endpoints, 5);
    if (cgoRows.length) return { type: 'table', rows: cgoRows };

    const summaryRows = rowsFromNamedEndpoints(endpoints, ['action_summary'], 5);
    if (summaryRows.length) return { type: 'table', rows: summaryRows };

    return { type: 'table', rows: [{ label: 'Live action recommendation unavailable', secondary: 'No specific action returned', score: 0 }] };
  }

  if (feature === 'summarization') {
    return { type: 'table', rows: summaryVisualRows(endpoints, chartTitle, chartData) };
  }

  return { type: 'table', rows: [{ label: 'Live result unavailable', secondary: 'No live rows returned', score: 0 }] };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function fetchJsonWithAbort(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callOrchestrator(name: string, path: string, init?: RequestInit, timeoutMs = FAST_TIMEOUT_MS): Promise<EndpointResult> {
  try {
    const response = await fetchJsonWithAbort(`${AI_BASE_URL}${path}`, {
      headers: { Accept: 'application/json', ...(init?.headers || {}) },
      ...init,
    }, timeoutMs);
    const data = await response.json().catch(() => null);
    return { name, path, ok: response.ok, status: response.status, source: 'orchestrator', data };
  } catch (error) {
    return {
      name,
      path,
      ok: false,
      source: 'orchestrator',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function callDl(name: string, path: string, body: unknown, timeoutMs = FAST_TIMEOUT_MS): Promise<EndpointResult> {
  try {
    const response = await withTimeout(
      fetchJsonWithAbort(`${DL_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      }, timeoutMs),
      timeoutMs
    );
    const data = await response.json().catch(() => null);
    return { name, path, ok: response.ok, status: response.status, source: 'deep-learning', data };
  } catch (error) {
    return {
      name,
      path,
      ok: false,
      source: 'deep-learning',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function featureSummary(_feature: FeatureKey, _chartTitle: string) {
  // ponytail: the per-card "Live X for Y" copy was boilerplate fluff above every section.
  // The card header already labels it; an empty subhead removes ~1 line of noise per card.
  return '';
}

function buildFeature(feature: FeatureKey, endpoints: EndpointResult[], chartTitle: string, chartData: ChartPoint[]) {
  return {
    key: feature,
    label: FEATURE_LABELS[feature],
    endpoints: [],
    summary: featureSummary(feature, chartTitle),
    chartSignal: featureInsights(feature, endpoints, chartTitle, chartData),
    visual: featureVisual(feature, endpoints, chartTitle, chartData),
    evidence: [],
    recommendations: feature === 'actionRecommendation' ? actionInsights(endpoints, chartTitle, chartData) : [],
    warnings: [],
  };
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
    const section = normalizeText(body.section, 'Dashboard OP');
    const chartTitle = normalizeText(body.chartTitle, 'Chart');
    const chartType = normalizeText(body.chartType, 'chart');
    const chartData = compactData(body.chartData, 20);
    const fast = body.fast !== false;
    const timeoutMs = fast ? FAST_TIMEOUT_MS : DEEP_TIMEOUT_MS;
    const contextText = buildContextText(section, chartTitle, chartType, chartData);
    const explicitFeatures = parseFeatureHints(body.featureHints);
    const selectedFeatures = explicitFeatures.length > 0
      ? explicitFeatures
      : relevantFeatures(section, chartTitle, chartType);
    const wants = (feature: FeatureKey) => selectedFeatures.includes(feature);
    const airlineContext = isAirlineContext(section, chartTitle, chartType);
    const branchContext = isBranchContext(section, chartTitle, chartType);
    const gseContext = isGseContext(section, chartTitle, chartType);
    const cgoContext = isCgoContext(section, chartTitle, chartType);
    const categoryContext = isCategoryContext(section, chartTitle, chartType);
    const entityContext = airlineContext || branchContext;
    const branchRankingPath = `/api/ai/branch/ranking?sort_by=risk_score&limit=20&esklasi_regex=&max_rows_per_sheet=5000${cgoContext ? '&category_type=cgo' : ''}`;
    const branchSummaryPath = `/api/ai/branch/summary?esklasi_regex=&max_rows_per_sheet=5000${cgoContext ? '&category_type=cgo' : ''}`;
    const branchComparisonPath = `/api/ai/branch/comparison?esklasi_regex=&max_rows_per_sheet=5000${cgoContext ? '&category_type=cgo' : ''}`;

    const fastCallPromises: Array<Promise<EndpointResult>> = [];
    let gseCoreQueued = false;
    const pushGseCore = () => {
      if (gseCoreQueued) return;
      gseCoreQueued = true;
      fastCallPromises.push(callOrchestrator(
        'gse_ranking',
        '/api/ai/gse/ranking?entity=branch&confidence_threshold=0&max_rows_per_sheet=5000',
        undefined,
        fast ? GSE_TIMEOUT_MS : timeoutMs
      ));
      fastCallPromises.push(callOrchestrator(
        'gse_top_issues',
        '/api/ai/gse/issues/top?limit=20&confidence_threshold=0&max_rows_per_sheet=5000',
        undefined,
        fast ? GSE_TIMEOUT_MS : timeoutMs
      ));
    };

    if (wants('forecasting')) {
      fastCallPromises.push(callOrchestrator('forecast_issues', '/api/ai/forecast/issues?periods=8&max_rows_per_sheet=5000', undefined, timeoutMs));
      if (gseContext) {
        fastCallPromises.push(callOrchestrator(
          'gse_irregularities',
          '/api/ai/gse/irregularities?limit=20&confidence_threshold=0&max_rows_per_sheet=5000',
          undefined,
          fast ? GSE_TIMEOUT_MS : timeoutMs
        ));
      }
    }
    if (wants('seasonality')) {
      fastCallPromises.push(callOrchestrator('seasonality_forecast', '/api/ai/seasonality/forecast?periods=8&max_rows_per_sheet=5000', undefined, timeoutMs));
      if (gseContext) {
        fastCallPromises.push(callOrchestrator(
          'gse_serviceability',
          '/api/ai/gse/serviceability?confidence_threshold=0&max_rows_per_sheet=5000',
          undefined,
          fast ? GSE_TIMEOUT_MS : timeoutMs
        ));
      }
      if (cgoContext) {
        fastCallPromises.push(callOrchestrator(
          'summary_cgo',
          '/api/ai/summarize/cgo?esklasi_regex=',
          undefined,
          fast ? DOMAIN_TIMEOUT_MS : timeoutMs
        ));
      }
    }
    if (wants('riskScoring')) {
      if (gseContext) {
        pushGseCore();
        fastCallPromises.push(callOrchestrator(
          'gse_serviceability',
          '/api/ai/gse/serviceability?confidence_threshold=0&max_rows_per_sheet=5000',
          undefined,
          fast ? GSE_TIMEOUT_MS : timeoutMs
        ));
      } else if (branchContext) {
        fastCallPromises.push(callOrchestrator(
          'branch_ranking',
          branchRankingPath,
          undefined,
          fast ? AIRLINE_TIMEOUT_MS : timeoutMs
        ));
      } else if (airlineContext) {
        fastCallPromises.push(callOrchestrator(
          'airline_risks',
          '/api/ai/risk/airlines?esklasi_regex=&bypass_cache=false',
          undefined,
          fast ? AIRLINE_TIMEOUT_MS : timeoutMs
        ));
      } else if (categoryContext) {
        fastCallPromises.push(callOrchestrator(
          'risk_categories',
          '/api/ai/risk/categories?esklasi_regex=&bypass_cache=false',
          undefined,
          fast ? DOMAIN_TIMEOUT_MS : timeoutMs
        ));
      } else {
        fastCallPromises.push(callOrchestrator(
          'risk_summary',
          '/api/ai/risk/summary?esklasi_regex=&fast=true&max_rows_per_sheet=5000',
          undefined,
          fast ? Math.min(timeoutMs, FAST_CONTEXT_TIMEOUT_MS) : timeoutMs
        ));
      }
    }
    if (wants('rootCause')) {
      fastCallPromises.push(callOrchestrator(
        'root_cause_classify',
        `/api/ai/root-cause/classify?root_cause=${encodeURIComponent(chartTitle)}&report=${encodeURIComponent(contextText)}&area=${encodeURIComponent(section)}&category=${encodeURIComponent(chartTitle)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        fast ? Math.min(timeoutMs, FAST_CONTEXT_TIMEOUT_MS) : timeoutMs
      ));
      fastCallPromises.push(callDl(
        'dl_root_cause',
        '/nlp/root-cause',
        { texts: [contextText] },
        fast ? Math.min(timeoutMs, FAST_CONTEXT_TIMEOUT_MS) : timeoutMs
      ));
      if (gseContext) {
        pushGseCore();
      }
    }
    if (wants('actionRecommendation')) {
      fastCallPromises.push(callOrchestrator(
        'action_summary',
        '/api/ai/action-summary?esklasi_regex=',
        undefined,
        fast ? DOMAIN_TIMEOUT_MS : timeoutMs
      ));
      fastCallPromises.push(callOrchestrator(
        'action_recommend',
        `/api/ai/action/recommend?report=${encodeURIComponent(contextText)}&issue_type=${encodeURIComponent(chartTitle)}&severity=Medium&area=${encodeURIComponent(section)}&top_n=5`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        fast ? Math.min(timeoutMs, FAST_CONTEXT_TIMEOUT_MS) : timeoutMs
      ));
      fastCallPromises.push(callDl(
        'dl_action_recommend',
        '/nlp/action/recommend',
        {
          report: contextText,
          issue_type: chartTitle,
          severity: 'Medium',
          area: section,
          top_n: 5,
        },
        fast ? Math.min(timeoutMs, FAST_CONTEXT_TIMEOUT_MS) : timeoutMs
      ));
      if (gseContext) {
        pushGseCore();
        fastCallPromises.push(callOrchestrator(
          'gse_serviceability',
          '/api/ai/gse/serviceability?confidence_threshold=0&max_rows_per_sheet=5000',
          undefined,
          fast ? GSE_TIMEOUT_MS : timeoutMs
        ));
      }
      if (cgoContext) {
        fastCallPromises.push(callOrchestrator(
          'summary_cgo',
          '/api/ai/summarize/cgo?esklasi_regex=',
          undefined,
          fast ? DOMAIN_TIMEOUT_MS : timeoutMs
        ));
      }
    }
    if (wants('subcategory')) {
      if (categoryContext) {
        fastCallPromises.push(callOrchestrator(
          'risk_categories',
          '/api/ai/risk/categories?esklasi_regex=&bypass_cache=false',
          undefined,
          fast ? DOMAIN_TIMEOUT_MS : timeoutMs
        ));
      }
      fastCallPromises.push(callOrchestrator(
        'subcategory_classify',
        `/api/ai/subcategory?report=${encodeURIComponent(contextText)}&area=${encodeURIComponent(section)}&issue_type=${encodeURIComponent(chartTitle)}&root_cause=${encodeURIComponent(chartTitle)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        fast ? Math.min(timeoutMs, FAST_CONTEXT_TIMEOUT_MS) : timeoutMs
      ));
      fastCallPromises.push(callDl(
        'dl_subcategory',
        '/nlp/subcategory',
        { texts: [contextText] },
        fast ? Math.min(timeoutMs, FAST_CONTEXT_TIMEOUT_MS) : timeoutMs
      ));
    }
    if (wants('similaritySearch')) {
      const similarityText = contextText.replace(/\s+/g, ' ').slice(0, 320);
      fastCallPromises.push(callOrchestrator(
        'similarity_search',
        `/api/ai/similar?text=${encodeURIComponent(similarityText)}&top_k=5&threshold=0.1&esklasi_regex=`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        fast ? Math.min(timeoutMs, FAST_CONTEXT_TIMEOUT_MS) : timeoutMs
      ));
      fastCallPromises.push(callDl(
        'dl_similarity_search',
        '/similarity/search',
        { text: similarityText, top_k: 5, threshold: 0.1 },
        fast ? Math.min(timeoutMs, FAST_CONTEXT_TIMEOUT_MS) : timeoutMs
      ));
    }
    if (wants('summarization')) {
      if (gseContext) {
        pushGseCore();
        fastCallPromises.push(callOrchestrator(
          'gse_serviceability',
          '/api/ai/gse/serviceability?confidence_threshold=0&max_rows_per_sheet=5000',
          undefined,
          fast ? GSE_TIMEOUT_MS : timeoutMs
        ));
      } else if (cgoContext && !entityContext) {
        fastCallPromises.push(callOrchestrator(
          'summary_cgo',
          '/api/ai/summarize/cgo?esklasi_regex=',
          undefined,
          fast ? DOMAIN_TIMEOUT_MS : timeoutMs
        ));
      } else if (entityContext) {
        if (branchContext) {
          fastCallPromises.push(callOrchestrator(
            'branch_summary',
            branchSummaryPath,
            undefined,
            fast ? AIRLINE_TIMEOUT_MS : timeoutMs
          ));
          fastCallPromises.push(callOrchestrator(
            'branch_comparison',
            branchComparisonPath,
            undefined,
            fast ? AIRLINE_TIMEOUT_MS : timeoutMs
          ));
        }
        if (!wants('riskScoring')) {
          fastCallPromises.push(callOrchestrator(
            branchContext ? 'branch_ranking' : 'airline_risks',
            branchContext
              ? branchRankingPath
              : '/api/ai/risk/airlines?esklasi_regex=&bypass_cache=false',
            undefined,
            fast ? AIRLINE_TIMEOUT_MS : timeoutMs
          ));
        }
      } else {
        fastCallPromises.push(callOrchestrator(
          'summary_by_category',
          '/api/ai/summarize?category=all&esklasi_regex=',
          undefined,
          fast ? Math.min(timeoutMs, FAST_CONTEXT_TIMEOUT_MS) : timeoutMs
        ));
        fastCallPromises.push(callDl(
          'dl_summarize',
          '/nlp/summarize',
          { texts: [contextText] },
          fast ? Math.min(timeoutMs, FAST_CONTEXT_TIMEOUT_MS) : timeoutMs
        ));
      }
    }

    const deepOnlyCallPromises = fast ? [] : [
      ...(wants('rootCause') ? [callOrchestrator('root_cause_stats', '/api/ai/root-cause/stats?esklasi_regex=&bypass_cache=false', undefined, timeoutMs)] : []),
      ...(wants('actionRecommendation') ? [callOrchestrator('action_summary', '/api/ai/action-summary?esklasi_regex=', undefined, timeoutMs)] : []),
      ...(wants('subcategory') ? [callDl('dl_subcategory', '/nlp/subcategory', { texts: [contextText] }, timeoutMs)] : []),
      ...(wants('rootCause') ? [callDl('dl_root_cause', '/nlp/root-cause', { texts: [contextText] }, timeoutMs)] : []),
      ...(wants('actionRecommendation') ? [callDl('dl_action_recommend', '/nlp/action/recommend', {
        report: contextText,
        issue_type: chartTitle,
        severity: 'Medium',
        area: section,
        top_n: 5,
      }, timeoutMs)] : []),
    ];
    const callPromises = [...fastCallPromises, ...deepOnlyCallPromises];

    const settled = await Promise.allSettled(callPromises);
    const calls = settled.map((item, index) => {
      if (item.status === 'fulfilled') return item.value;
      return {
        name: `endpoint_${index + 1}`,
        path: 'unknown',
        ok: false,
        source: 'orchestrator' as const,
        error: item.reason instanceof Error ? item.reason.message : 'Unknown error',
      };
    });

    const byName = (names: string[]) => calls.filter((call) => names.includes(call.name));
    const featureEndpointNames: Record<FeatureKey, string[]> = {
      forecasting: ['forecast_issues', 'gse_irregularities'],
      seasonality: ['seasonality_forecast', 'gse_serviceability', 'summary_cgo'],
      subcategory: ['subcategory_classify', 'dl_subcategory', 'risk_categories', 'gse_top_issues'],
      rootCause: ['root_cause_stats', 'root_cause_classify', 'dl_root_cause', 'gse_top_issues', 'gse_ranking'],
      riskScoring: ['risk_summary', 'risk_categories', 'airline_risks', 'branch_ranking', 'branch_comparison', 'gse_ranking', 'gse_top_issues', 'gse_serviceability'],
      summarization: ['summary_by_category', 'summary_cgo', 'airline_risks', 'branch_ranking', 'branch_summary', 'branch_comparison', 'gse_ranking', 'gse_top_issues', 'gse_serviceability', 'dl_summarize'],
      similaritySearch: ['similarity_search', 'dl_similarity_search'],
      actionRecommendation: ['action_summary', 'action_recommend', 'dl_action_recommend', 'summary_cgo', 'gse_ranking', 'gse_top_issues', 'gse_serviceability'],
    };
    const features = selectedFeatures.map((feature) =>
      buildFeature(feature, byName(featureEndpointNames[feature]), chartTitle, chartData)
    );

    return NextResponse.json({
      status: 'ok',
      generatedAt: new Date().toISOString(),
      context: { section, chartTitle, chartType },
      features,
      caveats: [],
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('[chart-analysis] failed:', error);
    return NextResponse.json({
      error: 'Failed to build chart AI analysis',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
