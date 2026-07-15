import { NextRequest, NextResponse } from 'next/server';
import { requireElevatedAISession } from '@/lib/ai-route-helpers';
import { resolveCachedAI } from '@/lib/ai-route-cache';

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

    const internalUrl = new URL('/api/ai/analyze-all', req.url);
    if (division) internalUrl.searchParams.set('division', division);
    if (branch) internalUrl.searchParams.set('branch', branch);
    internalUrl.searchParams.set('esklasi_regex', esklasiRegex);

    type SeverityDistribution = { 'TOP RISK': number; 'HIGH RISK': number; MEDIUM: number; LOW: number };
    type ResultItem = {
      classification?: { severity?: string; issueType?: string };
      prediction?: { predictedDays?: number };
      originalData?: { airline?: string; Airlines?: string; hub?: string; HUB?: string };
    };
    interface AnalyzeData {
      results: ResultItem[];
      summary?: { totalRecords: number; severityDistribution?: Partial<SeverityDistribution>; predictionStats?: { min: number; max: number; mean: number } };
    }
    const normSeverity = (s?: string): 'TOP RISK' | 'HIGH RISK' | 'MEDIUM' | 'LOW' => {
      const v = String(s || 'Low').toLowerCase();
      if (/crit|top.?risk|urgent/.test(v)) return 'TOP RISK';
      if (/high/.test(v)) return 'HIGH RISK';
      if (/med/.test(v)) return 'MEDIUM';
      return 'LOW';
    };

    const result = await resolveCachedAI({
      feature: 'action-summary',
      scope: { division, branch, esklasiRegex },
      resolver: async () => {
        let analyzeData: AnalyzeData = { results: [], summary: { totalRecords: 0 } };
        try {
          const internalRes = await fetch(internalUrl.toString(), {
            headers: {
              cookie: req.headers.get('cookie') || ''
            }
          });
          if (internalRes.ok) {
            analyzeData = await internalRes.json();
          }
        } catch {

        }

        const results: ResultItem[] = Array.isArray(analyzeData?.results) ? analyzeData.results : [];
        const overallDist = { 'TOP RISK': 0, 'HIGH RISK': 0, MEDIUM: 0, LOW: 0 };
        let totalDays = 0;
        let daysCount = 0;
        const categoriesMap: Record<string, {
          count: number;
          severity: typeof overallDist;
          totalDays: number;
          daysCount: number;
          airlines: Record<string, number>;
          hubs: Record<string, number>;
        }> = {};

        for (const r of results) {
          const sev = normSeverity(r.classification?.severity);
          overallDist[sev] += 1;
          const d = Number(r.prediction?.predictedDays ?? NaN);
          if (!Number.isNaN(d) && Number.isFinite(d)) {
            totalDays += d;
            daysCount += 1;
          }
          const cat = (r.classification?.issueType || 'Unknown') as string;
          if (!categoriesMap[cat]) {
            categoriesMap[cat] = {
              count: 0,
              severity: { 'TOP RISK': 0, 'HIGH RISK': 0, MEDIUM: 0, LOW: 0 },
              totalDays: 0,
              daysCount: 0,
              airlines: {},
              hubs: {}
            };
          }
          categoriesMap[cat].count += 1;
          categoriesMap[cat].severity[sev] += 1;
          if (!Number.isNaN(d) && Number.isFinite(d)) {
            categoriesMap[cat].totalDays += d;
            categoriesMap[cat].daysCount += 1;
          }
          const airline = String(r.originalData?.airline ?? r.originalData?.Airlines ?? '').trim();
          const hub = String(r.originalData?.hub ?? r.originalData?.HUB ?? '').trim();
          if (airline) categoriesMap[cat].airlines[airline] = (categoriesMap[cat].airlines[airline] || 0) + 1;
          if (hub) categoriesMap[cat].hubs[hub] = (categoriesMap[cat].hubs[hub] || 0) + 1;
        }

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
        for (const [cat, info] of Object.entries(categoriesMap)) {
          const topAirlines = Object.entries(info.airlines).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
          const topHubs = Object.entries(info.hubs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
          const highPriorityCount = (info.severity['HIGH RISK'] || 0) + (info.severity['TOP RISK'] || 0);
          categories[cat] = {
            count: info.count,
            severityDistribution: info.severity,
            topActions: [],
            avgResolutionDays: info.daysCount > 0 ? info.totalDays / info.daysCount : 0,
            topHubs,
            topAirlines,
            effectivenessScore: Math.min(1, highPriorityCount / Math.max(1, info.count)),
            openCount: info.count,
            closedCount: 0,
            highPriorityCount
          };
        }

        const totalRecords = results.length;
        const highPriorityTotal = overallDist['HIGH RISK'] + overallDist['TOP RISK'];
        const avgResolutionDays = daysCount > 0 ? totalDays / daysCount : 0;
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

        const riskScore = (sev: SeverityDistribution) =>
          sev['TOP RISK'] * 4 + sev['HIGH RISK'] * 3 + sev.MEDIUM * 2 + sev.LOW * 1;

        const topCategoriesByRisk = categoriesEntries
          .map(([category, cd]) => ({
            category,
            riskScore: riskScore(cd.severityDistribution),
            count: cd.count
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
            avgResolutionDays,
            categoriesCount,
            avgDaysSource: 'predictedDays'
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
