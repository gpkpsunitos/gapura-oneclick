import { NextRequest, NextResponse } from 'next/server';
import { requireElevatedAISession } from '@/lib/ai-route-helpers';
import { resolveCachedAI } from '@/lib/ai-route-cache';
import type { RiskEntry, RiskScoreResult } from '@/lib/ml-client';

function entityName(entry: RiskEntry | undefined): string | null {
  if (!entry) return null;
  const nameField = Object.entries(entry).find(([, value]) => typeof value === 'string');
  return nameField ? String(nameField[1]) : null;
}

// risk.rankings.category carries a single mean severity (0..1), not a
// per-record distribution. Bucketing the category's whole count under the
// nearest severity tier is an approximation — the ML service no longer
// exposes the flat per-record classification the old /analyze-all did.
function severityBucket(mean: number | undefined): 'TOP RISK' | 'HIGH RISK' | 'MEDIUM' | 'LOW' {
  const v = typeof mean === 'number' ? mean : 0;
  if (v >= 0.75) return 'TOP RISK';
  if (v >= 0.5) return 'HIGH RISK';
  if (v >= 0.25) return 'MEDIUM';
  return 'LOW';
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await requireElevatedAISession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const search = new URL(req.url).searchParams;
    const division = search.get('division') || '';
    const branch = search.get('branch') || '';
    const esklasiRegex = search.get('esklasi_regex') || '';

    // NOTE: /api/ai/overview has no per-request division/branch/esklasi_regex
    // filtering (unlike the old /analyze-all), so these params no longer scope
    // the upstream fetch. Kept in the cache scope key to avoid collisions with
    // any future filtered variant.
    const internalUrl = new URL('/api/ai/overview', req.url);

    type SeverityDistribution = { 'TOP RISK': number; 'HIGH RISK': number; MEDIUM: number; LOW: number };

    const result = await resolveCachedAI({
      feature: 'action-summary',
      scope: { division, branch, esklasiRegex },
      resolver: async () => {
        let risk: RiskScoreResult | null = null;
        try {
          const internalRes = await fetch(internalUrl.toString(), {
            headers: {
              cookie: req.headers.get('cookie') || ''
            }
          });
          if (internalRes.ok) {
            const overview = await internalRes.json();
            risk = overview?.risk ?? null;
          }
        } catch {

        }

        const categoryEntries: RiskEntry[] = risk?.rankings?.category ?? [];
        const overallDist = { 'TOP RISK': 0, 'HIGH RISK': 0, MEDIUM: 0, LOW: 0 };

        type TopAction = { action: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; source?: string; rationale?: string; confidence: number };
        type CategoryDatum = {
          count: number;
          severityDistribution: SeverityDistribution;
          topActions: TopAction[];
          avgResolutionDays: number;
          topHubs: string[];
          topAirlines: string[];
          effectivenessScore: number;
          openCount: number;
          closedCount: number;
          highPriorityCount: number;
        };
        const categories: Record<string, CategoryDatum> = {};

        for (const entry of categoryEntries) {
          const cat = entityName(entry) || 'Unknown';
          const count = Number(entry.incident_count) || 0;
          const sev = severityBucket(entry.severity);
          overallDist[sev] += count;

          const severityDistribution: SeverityDistribution = { 'TOP RISK': 0, 'HIGH RISK': 0, MEDIUM: 0, LOW: 0 };
          severityDistribution[sev] = count;
          const highPriorityCount = sev === 'TOP RISK' || sev === 'HIGH RISK' ? count : 0;

          categories[cat] = {
            count,
            severityDistribution,
            topActions: [],
            // Per-record predicted-resolution-days isn't exposed by the risk-ranking
            // endpoint (only available from the retired per-record /analyze-all).
            avgResolutionDays: 0,
            topHubs: [],
            topAirlines: [],
            effectivenessScore: Math.min(1, highPriorityCount / Math.max(1, count)),
            openCount: count,
            closedCount: 0,
            highPriorityCount
          };
        }

        const totalRecords = categoryEntries.reduce((sum, entry) => sum + (Number(entry.incident_count) || 0), 0);
        const highPriorityTotal = overallDist['HIGH RISK'] + overallDist['TOP RISK'];
        const categoriesCount = Object.keys(categories).length;

        const categoriesEntries = Object.entries(categories) as Array<[string, CategoryDatum]>;
        const topCategoriesByCount = categoriesEntries
          .map(([category, cd]) => ({
            category,
            count: cd.count,
            highPriority: cd.highPriorityCount
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const topCategoriesByRisk = categoryEntries
          .map((entry) => ({
            category: entityName(entry) || 'Unknown',
            riskScore: Number(entry.risk_score) || 0,
            count: Number(entry.incident_count) || 0
          }))
          .sort((a, b) => b.riskScore - a.riskScore)
          .slice(0, 5);

        const globalRecommendations = topCategoriesByRisk.slice(0, 3).map(c => ({
          action: `Prioritaskan tindakan pada kategori ${c.category}`,
          priority: 'HIGH' as const,
          category: c.category,
          rationale: 'Kategori dengan skor risiko tertinggi dari distribusi severity',
          confidence: 0.7
        }));

        return {
          status: 'ok',
          totalRecords,
          categories,
          overallSummary: {
            totalRecords,
            openCount: totalRecords,
            closedCount: 0,
            highPriorityCount: highPriorityTotal,
            severityDistribution: overallDist,
            avgResolutionDays: 0,
            categoriesCount,
            avgDaysSource: 'unavailable'
          },
          topCategoriesByCount,
          topCategoriesByRisk,
          globalRecommendations
        };
      },
    });

    return NextResponse.json({
      ...(result.payload as Record<string, unknown>),
      cached: result.cached,
      generatedAt: result.generatedAt,
      sourceSyncAt: result.sourceSyncAt,
      stale: result.stale,
    }, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Action Summary API Error:', error);

    const payload = {
      status: 'degraded',
      totalRecords: 0,
      categories: {},
      overallSummary: {
        totalRecords: 0,
        openCount: 0,
        closedCount: 0,
        highPriorityCount: 0,
        severityDistribution: { 'TOP RISK': 0, 'HIGH RISK': 0, MEDIUM: 0, LOW: 0 },
        avgResolutionDays: 0,
        categoriesCount: 0
      },
      topCategoriesByCount: [],
      topCategoriesByRisk: [],
      globalRecommendations: []
    };
    return NextResponse.json({
      ...payload,
      cached: false,
      generatedAt: new Date().toISOString(),
      sourceSyncAt: null,
      stale: true,
    }, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
}
