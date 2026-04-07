import {
  formatMonthKey,
  formatMonthLabel,
  getReportDate,
  normalizeStatus,
  pickAirline,
  pickBranch,
} from '@/lib/op-shortcut-analytics';

export interface RootCauseReportRow {
  [key: string]: unknown;
  id: string;
  title?: string;
  report?: string;
  description?: string;
  date_of_event?: string;
  created_at?: string;
  source_sheet?: string;
  status?: string;
  branch?: string;
  reporting_branch?: string;
  airlines?: string;
  airline?: string;
  hub?: string;
  area?: string;
  category?: string;
  main_category?: string;
  irregularity_complain_category?: string;
  case_classification?: string;
  root_cause?: string;
  root_caused?: string;
  action_taken?: string;
  preventive_action?: string;
}

export interface RootCauseScopedReport {
  [key: string]: unknown;
  id: string;
  date_of_event?: string;
  created_at?: string;
  status?: string;
  branch?: string;
  reporting_branch?: string;
  hub?: string;
  area?: string;
  airlines?: string;
  airline?: string;
  action_taken?: string;
  preventive_action?: string;
  resolvedRootCause: string;
  normalizedStatus: 'OPEN' | 'PROGRESS' | 'CLOSED';
  reportDate: Date | null;
  reportDateLabel: string;
  branchLabel: string;
  hubLabel: string;
  airlineLabel: string;
  areaLabel: string;
  sourceSheetLabel: string;
  issueCategoryLabel: string;
  reportTitle: string;
  rootCauseFilled: boolean;
}

export interface RootCauseRankingRow {
  name: string;
  count: number;
  sharePct: number;
  cumulativePct: number;
  rank: number;
  openCount: number;
  progressCount: number;
  closedCount: number;
}

export interface RootCauseParetoChartRow {
  name: string;
  value: number;
  sharePct: number;
  cumulativePct: number;
  isOthers?: boolean;
}

export interface RootCauseSheetComparisonCard {
  name: string;
  count: number;
  sharePct: number;
  coveragePct: number;
  topRootCause: string;
  dominantArea: string;
  activeCount: number;
}

export interface RootCauseHeatmapRow {
  branch: string;
  total: number;
  cells: Record<string, number>;
}

export interface RootCauseHeatmap {
  branches: string[];
  causes: string[];
  rows: RootCauseHeatmapRow[];
  max: number;
}

export interface MissingRootWatchlistRow {
  name: string;
  missingCount: number;
  activeCount: number;
  sharePct: number;
  topArea: string;
  topAirline: string;
}

export interface MissingRootWatchlistSummary {
  totalCount: number;
  sharePct: number;
  topBranch: string;
  topArea: string;
  rows: MissingRootWatchlistRow[];
}

export interface SelectedRootCauseBreakdownRow {
  name: string;
  count: number;
  sharePct: number;
}

export interface SelectedRootCauseAnalysis {
  name: string;
  rank: number;
  count: number;
  sharePct: number;
  openCount: number;
  progressCount: number;
  closedCount: number;
  activeCount: number;
  distinctBranches: number;
  distinctAreas: number;
  topBranch: string;
  topArea: string;
  topAirline: string;
  topIssueCategory: string;
  latestDateLabel: string;
  thresholdContext: string;
  branchBreakdown: SelectedRootCauseBreakdownRow[];
  areaBreakdown: SelectedRootCauseBreakdownRow[];
  airlineBreakdown: SelectedRootCauseBreakdownRow[];
  statusBreakdown: SelectedRootCauseBreakdownRow[];
}

export interface RootCauseAnalyticsResult {
  scopedReports: RootCauseScopedReport[];
  reportsWithRootCause: RootCauseScopedReport[];
  totalReports: number;
  withRootCount: number;
  missingRootCount: number;
  rootCoveragePct: number;
  dominantCause: RootCauseRankingRow | null;
  defaultSelectedRootCause: string;
  causesTo80Count: number;
  highestHotspot: {
    branch: string;
    rootCause: string;
    count: number;
  } | null;
  ranking: RootCauseRankingRow[];
  paretoChartRows: RootCauseParetoChartRow[];
  sourceMix: Array<{ name: string; value: number }>;
  sheetComparison: RootCauseSheetComparisonCard[];
  monthlyTrendRows: Array<Record<string, string | number>>;
  monthlyTrendKeys: string[];
  heatmap: RootCauseHeatmap;
  missingWatchlist: MissingRootWatchlistSummary;
}

const EMPTY_ROOT_CAUSE_VALUES = new Set([
  '',
  '-',
  '#n/a',
  'n/a',
  'na',
  'unknown',
  'null',
  'none',
  'belum diketahui',
]);

const SOURCE_SHEET_ORDER = ['NON CARGO', 'CGO', 'Unknown'] as const;
const STATUS_ORDER: Array<'OPEN' | 'PROGRESS' | 'CLOSED'> = ['OPEN', 'PROGRESS', 'CLOSED'];

function normalizeText(value?: string | null) {
  return String(value || '').trim();
}

export function normalizeRootCause(value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  if (EMPTY_ROOT_CAUSE_VALUES.has(normalized.toLowerCase())) return '';
  return normalized.replace(/\s+/g, ' ');
}

function formatDateLabel(date: Date | null) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
}

function normalizeSheetLabel(value?: string | null) {
  const normalized = normalizeText(value).toUpperCase();
  if (!normalized) return 'Unknown';
  if (normalized === 'NON CARGO' || normalized === 'CGO') return normalized;
  return normalized;
}

function normalizeAreaLabel(value?: string | null) {
  return normalizeText(value) || 'Unknown';
}

function normalizeIssueCategory(report: RootCauseReportRow) {
  return (
    normalizeText(report.irregularity_complain_category) ||
    normalizeText(report.case_classification) ||
    normalizeText(report.category) ||
    normalizeText(report.main_category) ||
    'Unknown'
  );
}

function toDistribution(
  map: Map<string, number>,
  preferredOrder: readonly string[] = [],
): Array<{ name: string; value: number }> {
  const ordered = preferredOrder
    .map((name) => ({ name, value: map.get(name) || 0 }))
    .filter((entry) => entry.value > 0);

  const extras = Array.from(map.entries())
    .filter(([name]) => !preferredOrder.includes(name))
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);

  return [...ordered, ...extras];
}

function topLabel<T>(items: T[], selector: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = selector(item) || 'Unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return toDistribution(counts)[0]?.name || '-';
}

function buildBreakdown<T>(
  items: T[],
  selector: (item: T) => string,
  limit = 6,
): SelectedRootCauseBreakdownRow[] {
  const total = items.length;
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = selector(item) || 'Unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      count,
      sharePct: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

function buildRootCauseRanking(reports: RootCauseScopedReport[]) {
  const total = reports.length;
  const counts = new Map<
    string,
    {
      count: number;
      openCount: number;
      progressCount: number;
      closedCount: number;
    }
  >();

  reports.forEach((report) => {
    const key = report.resolvedRootCause;
    if (!counts.has(key)) {
      counts.set(key, {
        count: 0,
        openCount: 0,
        progressCount: 0,
        closedCount: 0,
      });
    }
    const entry = counts.get(key)!;
    entry.count += 1;
    if (report.normalizedStatus === 'OPEN') entry.openCount += 1;
    if (report.normalizedStatus === 'PROGRESS') entry.progressCount += 1;
    if (report.normalizedStatus === 'CLOSED') entry.closedCount += 1;
  });

  let runningTotal = 0;

  return Array.from(counts.entries())
    .map(([name, info]) => ({ name, ...info }))
    .sort((left, right) => right.count - left.count)
    .map((entry, index) => {
      runningTotal += entry.count;
      return {
        name: entry.name,
        count: entry.count,
        sharePct: total > 0 ? Number(((entry.count / total) * 100).toFixed(1)) : 0,
        cumulativePct: total > 0 ? Number(((runningTotal / total) * 100).toFixed(1)) : 0,
        rank: index + 1,
        openCount: entry.openCount,
        progressCount: entry.progressCount,
        closedCount: entry.closedCount,
      };
    });
}

function buildParetoChartRows(ranking: RootCauseRankingRow[], visibleLimit = 8) {
  if (ranking.length <= visibleLimit) {
    return ranking.map((entry) => ({
      name: entry.name,
      value: entry.count,
      sharePct: entry.sharePct,
      cumulativePct: entry.cumulativePct,
    }));
  }

  const visible = ranking.slice(0, visibleLimit);
  const others = ranking.slice(visibleLimit);
  const othersCount = others.reduce((sum, item) => sum + item.count, 0);
  const othersShare = others.reduce((sum, item) => sum + item.sharePct, 0);

  return [
    ...visible.map((entry) => ({
      name: entry.name,
      value: entry.count,
      sharePct: entry.sharePct,
      cumulativePct: entry.cumulativePct,
    })),
    {
      name: 'Others',
      value: othersCount,
      sharePct: Number(othersShare.toFixed(1)),
      cumulativePct: 100,
      isOthers: true,
    },
  ];
}

function buildSheetComparison(
  reports: RootCauseScopedReport[],
  reportsWithRootCause: RootCauseScopedReport[],
) {
  const total = reports.length;
  const cards: RootCauseSheetComparisonCard[] = [];

  SOURCE_SHEET_ORDER.forEach((sheetName) => {
    const sheetRows = reports.filter((report) => report.sourceSheetLabel === sheetName);
    if (sheetRows.length === 0) return;
    const sheetWithRoot = reportsWithRootCause.filter((report) => report.sourceSheetLabel === sheetName);

    cards.push({
      name: sheetName,
      count: sheetRows.length,
      sharePct: total > 0 ? Number(((sheetRows.length / total) * 100).toFixed(1)) : 0,
      coveragePct: sheetRows.length > 0 ? Number(((sheetWithRoot.length / sheetRows.length) * 100).toFixed(1)) : 0,
      topRootCause: sheetWithRoot[0] ? topLabel(sheetWithRoot, (report) => report.resolvedRootCause) : '-',
      dominantArea: sheetWithRoot[0] ? topLabel(sheetWithRoot, (report) => report.areaLabel) : '-',
      activeCount: sheetRows.filter((report) => report.normalizedStatus !== 'CLOSED').length,
    });
  });

  return cards;
}

function buildMonthlyTrend(
  reports: RootCauseScopedReport[],
  ranking: RootCauseRankingRow[],
) {
  const topCauses = ranking.slice(0, 4).map((entry) => entry.name);
  if (topCauses.length === 0) {
    return {
      rows: [] as Array<Record<string, string | number>>,
      keys: [] as string[],
    };
  }

  const monthMap = new Map<string, Record<string, number>>();
  reports.forEach((report) => {
    if (!report.reportDate || !topCauses.includes(report.resolvedRootCause)) return;
    const monthKey = formatMonthKey(report.reportDate);
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {});
    }
    const values = monthMap.get(monthKey)!;
    values[report.resolvedRootCause] = (values[report.resolvedRootCause] || 0) + 1;
  });

  const rows = Array.from(monthMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, values]) => ({
      month: formatMonthLabel(monthKey),
      ...Object.fromEntries(topCauses.map((cause) => [cause, values[cause] || 0])),
    }));

  return { rows, keys: topCauses };
}

function buildHeatmap(
  reports: RootCauseScopedReport[],
  ranking: RootCauseRankingRow[],
  branchLimit = 8,
  causeLimit = 6,
): RootCauseHeatmap {
  const causes = ranking.slice(0, causeLimit).map((entry) => entry.name);
  if (causes.length === 0) {
    return { branches: [], causes: [], rows: [], max: 0 };
  }

  const branchTotals = buildBreakdown(reports, (report) => report.branchLabel, branchLimit);
  const branches = branchTotals.map((entry) => entry.name);

  const cellCounts = new Map<string, number>();
  let max = 0;

  reports.forEach((report) => {
    if (!causes.includes(report.resolvedRootCause)) return;
    if (!branches.includes(report.branchLabel)) return;
    const key = `${report.branchLabel}::${report.resolvedRootCause}`;
    const nextValue = (cellCounts.get(key) || 0) + 1;
    cellCounts.set(key, nextValue);
    if (nextValue > max) max = nextValue;
  });

  const rows = branches.map((branch) => {
    const cells = Object.fromEntries(
      causes.map((cause) => [cause, cellCounts.get(`${branch}::${cause}`) || 0]),
    );
    const total = causes.reduce((sum, cause) => sum + (cells[cause] || 0), 0);

    return {
      branch,
      total,
      cells,
    };
  });

  return {
    branches,
    causes,
    rows,
    max,
  };
}

function buildHighestHotspot(reports: RootCauseScopedReport[]) {
  const counts = new Map<string, number>();
  reports.forEach((report) => {
    const key = `${report.branchLabel}::${report.resolvedRootCause}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const [winner, count] =
    Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0] || [];

  if (!winner || !count) return null;

  const [branch, rootCause] = winner.split('::');
  return { branch, rootCause, count };
}

function buildMissingWatchlist(
  reports: RootCauseScopedReport[],
  totalScopedCount: number,
): MissingRootWatchlistSummary {
  const total = reports.length;
  const grouped = new Map<
    string,
    {
      missingCount: number;
      activeCount: number;
      areaCounts: Map<string, number>;
      airlineCounts: Map<string, number>;
    }
  >();

  reports.forEach((report) => {
    const key = report.branchLabel;
    if (!grouped.has(key)) {
      grouped.set(key, {
        missingCount: 0,
        activeCount: 0,
        areaCounts: new Map<string, number>(),
        airlineCounts: new Map<string, number>(),
      });
    }
    const entry = grouped.get(key)!;
    entry.missingCount += 1;
    if (report.normalizedStatus !== 'CLOSED') entry.activeCount += 1;
    entry.areaCounts.set(report.areaLabel, (entry.areaCounts.get(report.areaLabel) || 0) + 1);
    entry.airlineCounts.set(report.airlineLabel, (entry.airlineCounts.get(report.airlineLabel) || 0) + 1);
  });

  const rows = Array.from(grouped.entries())
    .map(([name, entry]) => ({
      name,
      missingCount: entry.missingCount,
      activeCount: entry.activeCount,
      sharePct: total > 0 ? Number(((entry.missingCount / total) * 100).toFixed(1)) : 0,
      topArea: toDistribution(entry.areaCounts)[0]?.name || '-',
      topAirline: toDistribution(entry.airlineCounts)[0]?.name || '-',
    }))
    .sort((left, right) => right.missingCount - left.missingCount)
    .slice(0, 10);

  return {
    totalCount: total,
    sharePct: totalScopedCount > 0 ? Number(((total / totalScopedCount) * 100).toFixed(1)) : 0,
    topBranch: rows[0]?.name || '-',
    topArea: topLabel(reports, (report) => report.areaLabel),
    rows,
  };
}

export function normalizeRootCauseReports(reports: RootCauseReportRow[]): RootCauseScopedReport[] {
  return reports
    .map<RootCauseScopedReport>((report) => {
      const reportDate = getReportDate(report.date_of_event || report.created_at);
      const resolvedRootCause = normalizeRootCause(report.root_cause || report.root_caused);
      const branchLabel = pickBranch(report);
      const hubLabel = normalizeText(report.hub) || 'Unknown';
      const airlineLabel = pickAirline(report);
      const areaLabel = normalizeAreaLabel(report.area);

      return {
        id: report.id,
        date_of_event: report.date_of_event,
        created_at: report.created_at,
        status: report.status,
        branch: branchLabel,
        reporting_branch: branchLabel,
        hub: hubLabel,
        area: areaLabel,
        airlines: airlineLabel,
        airline: airlineLabel,
        action_taken: report.action_taken,
        preventive_action: report.preventive_action,
        resolvedRootCause,
        normalizedStatus: normalizeStatus(report.status),
        reportDate,
        reportDateLabel: formatDateLabel(reportDate),
        branchLabel,
        hubLabel,
        airlineLabel,
        areaLabel,
        sourceSheetLabel: normalizeSheetLabel(report.source_sheet),
        issueCategoryLabel: normalizeIssueCategory(report),
        reportTitle:
          normalizeText(report.title) ||
          normalizeText(report.report) ||
          normalizeText(report.description) ||
          '(Tanpa Judul)',
        rootCauseFilled: Boolean(resolvedRootCause),
      };
    })
    .sort((left, right) => (right.reportDate?.getTime() || 0) - (left.reportDate?.getTime() || 0));
}

export function buildRootCauseAnalytics(reports: RootCauseScopedReport[]): RootCauseAnalyticsResult {
  const scopedReports = reports;

  const reportsWithRootCause = scopedReports.filter((report) => report.rootCauseFilled);
  const missingRootReports = scopedReports.filter((report) => !report.rootCauseFilled);
  const ranking = buildRootCauseRanking(reportsWithRootCause);
  const dominantCause = ranking[0] || null;
  const causesTo80Count = ranking.findIndex((entry) => entry.cumulativePct >= 80) + 1;
  const paretoChartRows = buildParetoChartRows(ranking);
  const sourceMix = toDistribution(
    scopedReports.reduce((map, report) => {
      map.set(report.sourceSheetLabel, (map.get(report.sourceSheetLabel) || 0) + 1);
      return map;
    }, new Map<string, number>()),
    SOURCE_SHEET_ORDER,
  );
  const sheetComparison = buildSheetComparison(scopedReports, reportsWithRootCause);
  const monthlyTrend = buildMonthlyTrend(reportsWithRootCause, ranking);
  const heatmap = buildHeatmap(reportsWithRootCause, ranking);
  const missingWatchlist = buildMissingWatchlist(missingRootReports, scopedReports.length);

  return {
    scopedReports,
    reportsWithRootCause,
    totalReports: scopedReports.length,
    withRootCount: reportsWithRootCause.length,
    missingRootCount: missingRootReports.length,
    rootCoveragePct: scopedReports.length > 0
      ? Number(((reportsWithRootCause.length / scopedReports.length) * 100).toFixed(1))
      : 0,
    dominantCause,
    defaultSelectedRootCause: dominantCause?.name || '',
    causesTo80Count: causesTo80Count > 0 ? causesTo80Count : 0,
    highestHotspot: buildHighestHotspot(reportsWithRootCause),
    ranking,
    paretoChartRows,
    sourceMix,
    sheetComparison,
    monthlyTrendRows: monthlyTrend.rows,
    monthlyTrendKeys: monthlyTrend.keys,
    heatmap,
    missingWatchlist,
  };
}

export function buildSelectedRootCauseAnalysis(
  analytics: RootCauseAnalyticsResult,
  selectedRootCause: string,
): SelectedRootCauseAnalysis | null {
  if (!selectedRootCause) return null;

  const subset = analytics.reportsWithRootCause.filter(
    (report) => report.resolvedRootCause === selectedRootCause,
  );
  if (subset.length === 0) return null;

  const rankingEntry = analytics.ranking.find((entry) => entry.name === selectedRootCause);
  const thresholdRank = analytics.causesTo80Count || analytics.ranking.length;
  const thresholdContext =
    rankingEntry && rankingEntry.rank <= thresholdRank
      ? `Included in the ${thresholdRank} causes that drive 80% of known cases.`
      : `Sits below the top ${thresholdRank} causes needed to reach 80% of known cases.`;

  const openCount = subset.filter((report) => report.normalizedStatus === 'OPEN').length;
  const progressCount = subset.filter((report) => report.normalizedStatus === 'PROGRESS').length;
  const closedCount = subset.filter((report) => report.normalizedStatus === 'CLOSED').length;

  return {
    name: selectedRootCause,
    rank: rankingEntry?.rank || 0,
    count: subset.length,
    sharePct: analytics.withRootCount > 0
      ? Number(((subset.length / analytics.withRootCount) * 100).toFixed(1))
      : 0,
    openCount,
    progressCount,
    closedCount,
    activeCount: openCount + progressCount,
    distinctBranches: new Set(subset.map((report) => report.branchLabel)).size,
    distinctAreas: new Set(subset.map((report) => report.areaLabel)).size,
    topBranch: topLabel(subset, (report) => report.branchLabel),
    topArea: topLabel(subset, (report) => report.areaLabel),
    topAirline: topLabel(subset, (report) => report.airlineLabel),
    topIssueCategory: topLabel(subset, (report) => report.issueCategoryLabel),
    latestDateLabel: subset[0]?.reportDateLabel || '-',
    thresholdContext,
    branchBreakdown: buildBreakdown(subset, (report) => report.branchLabel, 6),
    areaBreakdown: buildBreakdown(subset, (report) => report.areaLabel, 6),
    airlineBreakdown: buildBreakdown(subset, (report) => report.airlineLabel, 6),
    statusBreakdown: STATUS_ORDER.map((status) => {
      const count = subset.filter((report) => report.normalizedStatus === status).length;
      return {
        name: status,
        count,
        sharePct: subset.length > 0 ? Number(((count / subset.length) * 100).toFixed(1)) : 0,
      };
    }),
  };
}
