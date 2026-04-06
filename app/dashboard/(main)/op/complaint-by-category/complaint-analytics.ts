import type { QueryResult } from '@/types/builder';
import {
  formatMonthKey,
  formatMonthLabel,
  getReportDate,
  normalizeStatus,
  pickAirline,
  pickBranch,
} from '@/lib/op-shortcut-analytics';

export type ComplaintArea = 'Apron Area' | 'Terminal Area' | 'General' | 'Unknown';
export type ComplaintTrendMode = 'sheet' | 'area';
export type ComplaintHotspotDimension = 'branch' | 'hub' | 'airline';

export interface ComplaintReportRow {
  [key: string]: unknown;
  id: string;
  title?: string;
  report?: string;
  description?: string;
  created_at?: string;
  date_of_event?: string;
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
  terminal_area_category?: string;
  apron_area_category?: string;
  general_category?: string;
  root_caused?: string;
  root_cause?: string;
  action_taken?: string;
  preventive_action?: string;
}

export interface EnrichedComplaintReport extends ComplaintReportRow {
  normalizedArea: ComplaintArea;
  resolvedCategory: string;
  normalizedStatus: 'OPEN' | 'PROGRESS' | 'CLOSED';
  reportDate: Date | null;
  reportDateLabel: string;
  branchLabel: string;
  hubLabel: string;
  airlineLabel: string;
  sourceSheetLabel: string;
  reportTitle: string;
  rootCauseFilled: boolean;
  actionTakenFilled: boolean;
}

export interface ComplaintCategoryRank {
  name: string;
  count: number;
  sharePct: number;
  openCount: number;
}

export interface ComplaintCategorySummary {
  totalCount: number;
  sharePct: number;
  openCount: number;
  closedCount: number;
  rootCauseCoveragePct: number;
  actionTakenCoveragePct: number;
  topBranch: string;
  topAirline: string;
  latestDateLabel: string;
}

export interface ComplaintHotspotChartRow {
  [key: string]: string | number;
  name: string;
  count: number;
}

export interface ComplaintAnalyticsResult {
  complaints: EnrichedComplaintReport[];
  latestDateLabel: string;
  totalComplaints: number;
  openComplaints: number;
  closedComplaints: number;
  closureRatePct: number;
  rootCauseCoveragePct: number;
  rootCauseFilledCount: number;
  actionTakenCoveragePct: number;
  actionTakenFilledCount: number;
  cgoCount: number;
  cgoSharePct: number;
  nonCargoCount: number;
  nonCargoSharePct: number;
  topCategory: ComplaintCategoryRank | null;
  categoryRanking: ComplaintCategoryRank[];
  sheetMix: Array<{ name: string; value: number }>;
  areaMix: Array<{ name: string; value: number }>;
  statusMix: Array<{ name: string; value: number }>;
  trendBySheet: Array<Record<string, string | number>>;
  trendByArea: Array<Record<string, string | number>>;
  paretoResult: QueryResult;
  areaCategoryMatrix: QueryResult;
}

export const COMPLAINT_AREA_ORDER: ComplaintArea[] = ['Apron Area', 'Terminal Area', 'General', 'Unknown'];
export const SHEET_ORDER = ['CGO', 'NON CARGO', 'Unknown'] as const;
export const STATUS_ORDER = ['OPEN', 'PROGRESS', 'CLOSED'] as const;
export const HOTSPOT_DIMENSION_LABELS: Record<ComplaintHotspotDimension, string> = {
  branch: 'Cabang',
  hub: 'Hub',
  airline: 'Maskapai',
};

const EMPTY_CAUSE_VALUES = new Set(['', '-', '#n/a', 'n/a', 'na', 'null', 'unknown', 'none']);
const EMPTY_ACTION_VALUES = new Set(['', '-', '#n/a', 'n/a', 'na', 'null', 'unknown', 'none']);

function hasMeaningfulValue(value?: string | null, emptyValues?: Set<string>) {
  const normalized = String(value || '').trim();
  if (!normalized) return false;
  return !(emptyValues || EMPTY_CAUSE_VALUES).has(normalized.toLowerCase());
}

export function isComplaintReport(report: ComplaintReportRow): boolean {
  const blob = [
    report.case_classification,
    report.main_category,
    report.category,
    report.irregularity_complain_category,
    report.terminal_area_category,
    report.apron_area_category,
    report.general_category,
    report.title,
    report.report,
    report.description,
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();

  return /complain|keluhan|komplain/.test(blob);
}

export function normalizeComplaintArea(value?: string | null): ComplaintArea {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Unknown';
  if (normalized.includes('apron')) return 'Apron Area';
  if (normalized.includes('terminal')) return 'Terminal Area';
  if (normalized.includes('general')) return 'General';
  return 'Unknown';
}

function resolveComplaintCategoryByArea(report: ComplaintReportRow, area: ComplaintArea): string {
  if (area === 'Apron Area') {
    return String(report.apron_area_category || '').trim();
  }
  if (area === 'Terminal Area') {
    return String(report.terminal_area_category || '').trim();
  }
  if (area === 'General') {
    return String(report.general_category || '').trim();
  }

  return String(
    report.terminal_area_category ||
      report.apron_area_category ||
      report.general_category ||
      report.irregularity_complain_category ||
      report.case_classification ||
      '',
  ).trim();
}

export function canonicalizeComplaintCategory(rawCategory: string, area: ComplaintArea): string {
  const cleaned = rawCategory.replace(/\s+/g, ' ').replace(/\.+$/g, '').trim();
  if (!cleaned) return 'Unclassified Complaint';

  if (/^lack communication skills$/i.test(cleaned)) {
    return 'Lack communication skills';
  }

  if (/(accura\w+)\s*&\s*completeness of service/i.test(cleaned)) {
    return area === 'Apron Area' || /\(apron\)/i.test(cleaned)
      ? 'Accuracy & Completeness of Service (Apron)'
      : 'Accuracy & Completeness of Service';
  }

  return cleaned;
}

function formatDateLabel(date: Date | null) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
}

function buildOrderedDistribution(
  map: Map<string, number>,
  preferredOrder: readonly string[] = [],
): Array<{ name: string; value: number }> {
  const preferred = preferredOrder
    .map((name) => ({ name, value: map.get(name) || 0 }))
    .filter((entry) => entry.value > 0);

  const extras = Array.from(map.entries())
    .filter(([name]) => !preferredOrder.includes(name))
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);

  return [...preferred, ...extras];
}

function buildTrendSeries(
  reports: EnrichedComplaintReport[],
  bucketSelector: (report: EnrichedComplaintReport) => string,
  preferredSeriesOrder: readonly string[],
) {
  const monthMap = new Map<string, Map<string, number>>();
  const presentSeries = new Set<string>();

  reports.forEach((report) => {
    if (!report.reportDate) return;
    const monthKey = formatMonthKey(report.reportDate);
    const seriesName = bucketSelector(report) || 'Unknown';
    presentSeries.add(seriesName);
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, new Map());
    }
    const seriesMap = monthMap.get(monthKey)!;
    seriesMap.set(seriesName, (seriesMap.get(seriesName) || 0) + 1);
  });

  const seriesOrder = [
    ...preferredSeriesOrder.filter((name) => presentSeries.has(name)),
    ...Array.from(presentSeries).filter((name) => !preferredSeriesOrder.includes(name)).sort(),
  ];

  return Array.from(monthMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, seriesMap]) => {
      const row: Record<string, string | number> = {
        month: formatMonthLabel(monthKey),
      };

      seriesOrder.forEach((seriesName) => {
        row[seriesName] = seriesMap.get(seriesName) || 0;
      });

      return row;
    });
}

function countBy<T>(items: T[], getter: (item: T) => string) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = getter(item) || 'Unknown';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function buildParetoResult(ranking: ComplaintCategoryRank[]): QueryResult {
  return {
    columns: ['Category', 'Count'],
    rows: ranking.map((entry) => ({
      Category: entry.name,
      Count: entry.count,
    })),
    rowCount: ranking.length,
    executionTimeMs: 0,
  };
}

function buildAreaCategoryMatrix(reports: EnrichedComplaintReport[], ranking: ComplaintCategoryRank[]): QueryResult {
  const topCategories = ranking.slice(0, 10).map((entry) => entry.name);
  const areaOrder = COMPLAINT_AREA_ORDER.filter((area) =>
    reports.some((report) => report.normalizedArea === area),
  );

  const rows: Record<string, unknown>[] = [];
  areaOrder.forEach((area) => {
    topCategories.forEach((category) => {
      const count = reports.filter(
        (report) => report.normalizedArea === area && report.resolvedCategory === category,
      ).length;
      if (count === 0) return;
      rows.push({
        area,
        category,
        count,
      });
    });
  });

  return {
    columns: ['area', 'category', 'count'],
    rows,
    rowCount: rows.length,
    executionTimeMs: 0,
  };
}

function computeMonthlyDelta(
  reports: EnrichedComplaintReport[],
  predicate: (report: EnrichedComplaintReport) => boolean,
) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let current = 0;
  let previous = 0;

  reports.forEach((report) => {
    if (!report.reportDate || !predicate(report)) return;
    if (report.reportDate >= thisMonthStart) current += 1;
    else if (report.reportDate >= lastMonthStart) previous += 1;
  });

  return { current, previous };
}

function findTopLabel(items: EnrichedComplaintReport[], keySelector: (item: EnrichedComplaintReport) => string) {
  const counts = countBy(items, keySelector);
  return buildOrderedDistribution(counts)[0]?.name || '-';
}

export function buildComplaintAnalytics(reports: ComplaintReportRow[]): ComplaintAnalyticsResult {
  const complaints = reports
    .filter(isComplaintReport)
    .map<EnrichedComplaintReport>((report) => {
      const normalizedArea = normalizeComplaintArea(report.area);
      const rawCategory = resolveComplaintCategoryByArea(report, normalizedArea);
      const resolvedCategory = canonicalizeComplaintCategory(rawCategory, normalizedArea);
      const reportDate = getReportDate(report.date_of_event || report.created_at);

      return {
        ...report,
        normalizedArea,
        resolvedCategory,
        normalizedStatus: normalizeStatus(report.status),
        reportDate,
        reportDateLabel: formatDateLabel(reportDate),
        branchLabel: pickBranch(report),
        hubLabel: String(report.hub || '').trim() || 'Unknown',
        airlineLabel: pickAirline(report),
        sourceSheetLabel: String(report.source_sheet || '').trim() || 'Unknown',
        reportTitle: String(report.title || report.report || report.description || '(Tanpa Judul)').trim(),
        rootCauseFilled: hasMeaningfulValue(report.root_caused || report.root_cause, EMPTY_CAUSE_VALUES),
        actionTakenFilled: hasMeaningfulValue(report.action_taken || report.preventive_action, EMPTY_ACTION_VALUES),
      };
    })
    .sort((left, right) => {
      const leftTime = left.reportDate?.getTime() || 0;
      const rightTime = right.reportDate?.getTime() || 0;
      return rightTime - leftTime;
    });

  const totalComplaints = complaints.length;
  const openComplaints = complaints.filter((report) => report.normalizedStatus === 'OPEN').length;
  const closedComplaints = complaints.filter((report) => report.normalizedStatus === 'CLOSED').length;
  const closureRatePct = totalComplaints > 0 ? (closedComplaints / totalComplaints) * 100 : 0;
  const rootCauseFilledCount = complaints.filter((report) => report.rootCauseFilled).length;
  const actionTakenFilledCount = complaints.filter((report) => report.actionTakenFilled).length;
  const rootCauseCoveragePct = totalComplaints > 0 ? (rootCauseFilledCount / totalComplaints) * 100 : 0;
  const actionTakenCoveragePct = totalComplaints > 0 ? (actionTakenFilledCount / totalComplaints) * 100 : 0;
  const latestDateLabel = complaints[0]?.reportDateLabel || '-';

  const sheetMap = countBy(complaints, (report) => report.sourceSheetLabel);
  const areaMap = countBy(complaints, (report) => report.normalizedArea);
  const statusMap = countBy(complaints, (report) => report.normalizedStatus);
  const categoryMap = countBy(complaints, (report) => report.resolvedCategory);

  const cgoCount = sheetMap.get('CGO') || 0;
  const nonCargoCount = sheetMap.get('NON CARGO') || 0;
  const cgoSharePct = totalComplaints > 0 ? (cgoCount / totalComplaints) * 100 : 0;
  const nonCargoSharePct = totalComplaints > 0 ? (nonCargoCount / totalComplaints) * 100 : 0;

  const categoryRanking = buildOrderedDistribution(categoryMap)
    .map((entry) => ({
      name: entry.name,
      count: entry.value,
      sharePct: totalComplaints > 0 ? (entry.value / totalComplaints) * 100 : 0,
      openCount: complaints.filter(
        (report) => report.resolvedCategory === entry.name && report.normalizedStatus === 'OPEN',
      ).length,
    }))
    .sort((left, right) => right.count - left.count);

  return {
    complaints,
    latestDateLabel,
    totalComplaints,
    openComplaints,
    closedComplaints,
    closureRatePct,
    rootCauseCoveragePct,
    rootCauseFilledCount,
    actionTakenCoveragePct,
    actionTakenFilledCount,
    cgoCount,
    cgoSharePct,
    nonCargoCount,
    nonCargoSharePct,
    topCategory: categoryRanking[0] || null,
    categoryRanking,
    sheetMix: buildOrderedDistribution(sheetMap, SHEET_ORDER),
    areaMix: buildOrderedDistribution(areaMap, COMPLAINT_AREA_ORDER),
    statusMix: buildOrderedDistribution(statusMap, STATUS_ORDER),
    trendBySheet: buildTrendSeries(complaints, (report) => report.sourceSheetLabel, SHEET_ORDER),
    trendByArea: buildTrendSeries(complaints, (report) => report.normalizedArea, COMPLAINT_AREA_ORDER),
    paretoResult: buildParetoResult(categoryRanking),
    areaCategoryMatrix: buildAreaCategoryMatrix(complaints, categoryRanking),
  };
}

export function buildComplaintHotspotTable(
  reports: EnrichedComplaintReport[],
  dimension: ComplaintHotspotDimension,
): QueryResult {
  const map = new Map<
    string,
    {
      count: number;
      openCount: number;
      categoryCounts: Map<string, number>;
      latestDate: Date | null;
    }
  >();

  const labelForDimension = (report: EnrichedComplaintReport) => {
    if (dimension === 'hub') return report.hubLabel;
    if (dimension === 'airline') return report.airlineLabel;
    return report.branchLabel;
  };

  reports.forEach((report) => {
    const key = labelForDimension(report) || 'Unknown';
    if (!map.has(key)) {
      map.set(key, {
        count: 0,
        openCount: 0,
        categoryCounts: new Map(),
        latestDate: null,
      });
    }

    const entry = map.get(key)!;
    entry.count += 1;
    if (report.normalizedStatus === 'OPEN') {
      entry.openCount += 1;
    }
    entry.categoryCounts.set(
      report.resolvedCategory,
      (entry.categoryCounts.get(report.resolvedCategory) || 0) + 1,
    );
    if (!entry.latestDate || ((report.reportDate?.getTime() || 0) > entry.latestDate.getTime())) {
      entry.latestDate = report.reportDate;
    }
  });

  const total = reports.length;
  const labelKey = HOTSPOT_DIMENSION_LABELS[dimension];
  const rows = Array.from(map.entries())
    .map(([name, entry]) => {
      const dominantCategory =
        buildOrderedDistribution(entry.categoryCounts)[0]?.name || 'Unclassified Complaint';
      const openRatePct = entry.count > 0 ? (entry.openCount / entry.count) * 100 : 0;
      const sharePct = total > 0 ? (entry.count / total) * 100 : 0;

      return {
        [labelKey]: name,
        count: entry.count,
        share_pct: Number(sharePct.toFixed(1)),
        open_count: entry.openCount,
        open_rate_pct: Number(openRatePct.toFixed(1)),
        dominant_category: dominantCategory,
        latest_report: formatDateLabel(entry.latestDate),
      };
    })
    .sort((left, right) => Number(right.count) - Number(left.count));

  return {
    columns: [labelKey, 'count', 'share_pct', 'open_count', 'open_rate_pct', 'dominant_category', 'latest_report'],
    rows,
    rowCount: rows.length,
    executionTimeMs: 0,
  };
}

export function buildComplaintHotspotChart(
  reports: EnrichedComplaintReport[],
  dimension: ComplaintHotspotDimension,
): ComplaintHotspotChartRow[] {
  const table = buildComplaintHotspotTable(reports, dimension);
  const labelKey = HOTSPOT_DIMENSION_LABELS[dimension];

  return table.rows.slice(0, 8).map((row) => ({
    name: String(row[labelKey] || 'Unknown'),
    count: Number(row.count || 0),
  }));
}

export function buildComplaintCategorySummary(
  reports: EnrichedComplaintReport[],
  category: string,
): ComplaintCategorySummary {
  const subset = reports.filter((report) => report.resolvedCategory === category);
  const totalCount = subset.length;
  const openCount = subset.filter((report) => report.normalizedStatus === 'OPEN').length;
  const closedCount = subset.filter((report) => report.normalizedStatus === 'CLOSED').length;
  const rootCauseCoveragePct = totalCount > 0
    ? (subset.filter((report) => report.rootCauseFilled).length / totalCount) * 100
    : 0;
  const actionTakenCoveragePct = totalCount > 0
    ? (subset.filter((report) => report.actionTakenFilled).length / totalCount) * 100
    : 0;

  return {
    totalCount,
    sharePct: reports.length > 0 ? (totalCount / reports.length) * 100 : 0,
    openCount,
    closedCount,
    rootCauseCoveragePct,
    actionTakenCoveragePct,
    topBranch: findTopLabel(subset, (report) => report.branchLabel),
    topAirline: findTopLabel(subset, (report) => report.airlineLabel),
    latestDateLabel: subset[0]?.reportDateLabel || '-',
  };
}

export function computeComplaintMonthlyDeltas(reports: EnrichedComplaintReport[]) {
  return {
    total: computeMonthlyDelta(reports, () => true),
    open: computeMonthlyDelta(reports, (report) => report.normalizedStatus === 'OPEN'),
    cgo: computeMonthlyDelta(reports, (report) => report.sourceSheetLabel === 'CGO'),
  };
}
