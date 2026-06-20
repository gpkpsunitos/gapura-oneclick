'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Report } from '@/types';
import { useDrilldown } from '@/components/chart-detail/useDrilldown';
import { ChartAiAnalysisButton, type ChartAiContext } from '@/components/dashboard/ai/ChartAiAnalysisButton';
import { SectionAiSummaryInsightButton } from '@/components/dashboard/ai/SectionAiSummaryInsightButton';
import {
  resolveCaseClassification,
  resolveReportAirline,
  resolveReportBranch,
  resolveReportCategory,
  resolveRootCause,
} from '@/lib/report-normalization';

interface SummaryReportTabProps {
  reports: Report[];
}

type MonthColumn = {
  key: string;
  label: string;
  monthIndex: number;
  year: number;
};

type PivotRow = {
  id: string;
  primary: string;
  secondary?: string;
  values: Record<string, number>;
  total: number;
};

type YearlyCategoryMonthRow = {
  id: string;
  monthIndex: number;
  monthLabel: string;
  irregularity: number;
  complaint: number;
  compliment: number;
  occurrence: number;
  accidentIncident: number;
  total: number;
};

type YearComparisonRow = {
  id: SummaryMetricId;
  label: string;
  current: number;
  previous: number;
  deltaPct: number;
  direction: 'improvement' | 'decline' | 'flat' | 'no-baseline';
};

type SummaryMetricId =
  | 'irregularity'
  | 'complaint'
  | 'compliment'
  | 'occurrence'
  | 'accidentIncident'
  | 'total';

type SummaryCategoryMetric = {
  id: Exclude<SummaryMetricId, 'total'>;
  label: string;
  chartLabel: string;
  color: string;
  positiveTrend: TrendDirection;
};

type TrendPoint = {
  payload?: {
    monthIndex?: unknown;
  };
};

type TrendDotProps = TrendPoint & {
  cx?: unknown;
  cy?: unknown;
};

type TrendTooltipPayload = {
  payload?: Record<string, unknown>;
};

type TrendTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: readonly TrendTooltipPayload[];
};

type AiFeatureHint =
  | 'forecasting'
  | 'seasonality'
  | 'subcategory'
  | 'rootCause'
  | 'riskScoring'
  | 'summarization'
  | 'similaritySearch'
  | 'actionRecommendation';

function summaryReportFeatureHints(title: string): AiFeatureHint[] {
  const normalized = title.toLowerCase();
  if (normalized.includes('summary category') || normalized.includes('mom') || normalized.includes('yoy')) {
    return ['forecasting', 'seasonality', 'summarization'];
  }
  if (normalized.includes('summary station') || normalized.includes('summary airlines')) {
    return ['riskScoring', 'seasonality', 'summarization'];
  }
  if (normalized.includes('case classification')) {
    return ['subcategory', 'riskScoring', 'similaritySearch', 'actionRecommendation'];
  }
  if (normalized.includes('identification of root')) {
    return ['rootCause', 'riskScoring', 'similaritySearch', 'actionRecommendation'];
  }
  return ['summarization'];
}

function compactRows<T>(rows: Array<T | null | undefined>): T[] {
  return rows.filter((row): row is T => Boolean(row));
}

const CATEGORY_ORDER: string[] = [];

function normalizeText(value: unknown, fallback = '-') {
  const normalized = String(value || '').trim();
  return normalized ? normalized : fallback;
}

function resolveBranchLabel(report: Report) {
  return normalizeText(resolveReportBranch(report), 'Unknown').toUpperCase();
}

function resolveAirlineLabel(report: Report) {
  return normalizeText(resolveReportAirline(report), 'Non Airline Case');
}

type DrilldownSingleContext =
  | 'landside-category'
  | 'airside-category'
  | 'general-category'
  | 'case-classification'
  | 'root-cause';

type DrilldownHierarchyContext =
  | 'summary-station'
  | 'summary-airlines'
  | 'landside-airlines'
  | 'airside-airlines'
  | 'general-airlines';

function hasMeaningfulValue(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized !== '' &&
    normalized !== '-' &&
    normalized !== '#n/a' &&
    normalized !== 'null' &&
    normalized !== 'undefined' &&
    normalized !== 'nil';
}

function resolveCategory(report: Report) {
  return normalizeText(resolveReportCategory(report), 'Uncategorized');
}

function extractMonthColumn(report: Report): MonthColumn | null {
  const source = report.date_of_event || report.created_at;
  if (!source) return null;

  let parsed: Date;
  if (typeof source === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source)) {
    const [year, month, day] = source.split('-').map(Number);
    parsed = new Date(year, month - 1, day);
  } else {
    parsed = new Date(source);
  }

  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const monthIndex = parsed.getMonth();

  return {
    key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    label: parsed.toLocaleString('en-US', { month: 'long' }),
    monthIndex,
    year,
  };
}

function buildMonthColumns(reports: Report[]) {
  const buckets = new Map<string, MonthColumn>();

  reports.forEach((report) => {
    const month = extractMonthColumn(report);
    if (!month) return;
    buckets.set(month.key, month);
  });

  return Array.from(buckets.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.monthIndex - b.monthIndex;
  });
}

function buildCategorySummaryRows(reports: Report[], monthColumns: MonthColumn[]) {
  const categorySet = new Set<string>();
  const monthCategoryCounts = new Map<string, Record<string, number>>();
  const monthTotals = new Map<string, number>();
  const validMonthKeys = new Set(monthColumns.map((m) => m.key));

  reports.forEach((report) => {
    const month = extractMonthColumn(report);
    if (!month || !validMonthKeys.has(month.key)) return;

    const category = resolveCategory(report);
    categorySet.add(category);

    if (!monthCategoryCounts.has(month.key)) monthCategoryCounts.set(month.key, {});
    const bucket = monthCategoryCounts.get(month.key)!;
    bucket[category] = (bucket[category] || 0) + 1;
    monthTotals.set(month.key, (monthTotals.get(month.key) || 0) + 1);
  });

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((item) => categorySet.has(item)),
    ...Array.from(categorySet).filter((item) => !CATEGORY_ORDER.includes(item)).sort(),
  ];

  const rows = monthColumns.map((month) => {
    const values: Record<string, number> = {};
    orderedCategories.forEach((category) => {
      values[category] = monthCategoryCounts.get(month.key)?.[category] || 0;
    });

    return {
      id: month.key,
      label: month.label,
      values,
      total: monthTotals.get(month.key) || 0,
    };
  });

  const columnTotals = orderedCategories.reduce<Record<string, number>>((acc, category) => {
    acc[category] = rows.reduce((sum, row) => sum + (row.values[category] || 0), 0);
    return acc;
  }, {});

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return {
    categories: orderedCategories,
    rows,
    columnTotals,
    grandTotal,
  };
}

function buildHierarchicalRows(
  reports: Report[],
  monthColumns: MonthColumn[],
  primaryLabel: (report: Report) => string,
  secondaryLabel: (report: Report) => string
) {
  const buckets = new Map<string, PivotRow>();
  const validMonthKeys = new Set(monthColumns.map((m) => m.key));

  reports.forEach((report) => {
    const month = extractMonthColumn(report);
    if (!month || !validMonthKeys.has(month.key)) return;

    const primary = normalizeText(primaryLabel(report), '-');
    const secondary = normalizeText(secondaryLabel(report), '-');
    const key = `${primary}::${secondary}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        id: key,
        primary,
        secondary,
        values: {},
        total: 0,
      });
    }

    const row = buckets.get(key)!;
    row.values[month.key] = (row.values[month.key] || 0) + 1;
    row.total += 1;
  });

  const rows = Array.from(buckets.values()).sort((a, b) => {
    if (a.primary !== b.primary) return a.primary.localeCompare(b.primary);
    if (b.total !== a.total) return b.total - a.total;
    return (a.secondary || '').localeCompare(b.secondary || '');
  });

  const monthTotals = monthColumns.reduce<Record<string, number>>((acc, month) => {
    acc[month.key] = rows.reduce((sum, row) => sum + (row.values[month.key] || 0), 0);
    return acc;
  }, {});

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return { rows, monthTotals, grandTotal };
}

function buildSingleDimensionRows(
  reports: Report[],
  monthColumns: MonthColumn[],
  label: (report: Report) => string
) {
  const buckets = new Map<string, PivotRow>();
  const validMonthKeys = new Set(monthColumns.map((m) => m.key));

  reports.forEach((report) => {
    const month = extractMonthColumn(report);
    if (!month || !validMonthKeys.has(month.key)) return;

    const primary = normalizeText(label(report), '-');
    if (!hasMeaningfulValue(primary)) return;

    if (!buckets.has(primary)) {
      buckets.set(primary, {
        id: primary,
        primary,
        values: {},
        total: 0,
      });
    }

    const row = buckets.get(primary)!;
    row.values[month.key] = (row.values[month.key] || 0) + 1;
    row.total += 1;
  });

  const rows = Array.from(buckets.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.primary.localeCompare(b.primary);
  });

  const monthTotals = monthColumns.reduce<Record<string, number>>((acc, month) => {
    acc[month.key] = rows.reduce((sum, row) => sum + (row.values[month.key] || 0), 0);
    return acc;
  }, {});

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return { rows, monthTotals, grandTotal };
}

function heatBucket(value: number, maxValue: number): number {
  if (!value || !maxValue) return 0;
  const ratio = value / maxValue;
  if (ratio >= 0.90) return 5;
  if (ratio >= 0.70) return 4;
  if (ratio >= 0.45) return 3;
  if (ratio >= 0.22) return 2;
  if (ratio >= 0.06) return 1;
  return 0;
}
function heatClass(value: number, maxValue: number): string {
  const b = heatBucket(value, maxValue);
  return b === 0 ? '' : `sr-heat-${b}`;
}

type TrendDirection = 'down' | 'up' | 'auto';

const SUMMARY_CATEGORY_METRICS: SummaryCategoryMetric[] = [
  {
    id: 'irregularity',
    label: 'Irregularity',
    chartLabel: 'Irregularity',
    color: '#00796B',
    positiveTrend: 'down',
  },
  {
    id: 'complaint',
    label: 'Complaint',
    chartLabel: 'Complaint',
    color: '#3367D6',
    positiveTrend: 'down',
  },
  {
    id: 'compliment',
    label: 'Compliment',
    chartLabel: 'Compliment',
    color: '#F9AB00',
    positiveTrend: 'up',
  },
  {
    id: 'occurrence',
    label: 'Occurrence',
    chartLabel: 'Occurrence',
    color: '#E8710A',
    positiveTrend: 'down',
  },
  {
    id: 'accidentIncident',
    label: 'Accident / Incident',
    chartLabel: 'Accident/Incident',
    color: '#C5221F',
    positiveTrend: 'down',
  },
];

const SUMMARY_METRIC_BY_ID = SUMMARY_CATEGORY_METRICS.reduce<Record<string, SummaryCategoryMetric>>((acc, metric) => {
  acc[metric.id] = metric;
  return acc;
}, {});

function resolveSummaryMetricId(report: Report): Exclude<SummaryMetricId, 'total'> | null {
  const raw = normalizeText(resolveReportCategory(report), '');
  const normalized = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return null;
  if (normalized.includes('accident') || normalized.includes('incident')) return 'accidentIncident';
  if (normalized.includes('occurrence') || normalized.includes('occurence')) return 'occurrence';
  if (normalized.includes('compliment')) return 'compliment';
  if (normalized.includes('complaint') || normalized.includes('complain')) return 'complaint';
  if (normalized.includes('irregular')) return 'irregularity';
  return null;
}

function matchesSummaryMetric(report: Report, metricId: SummaryMetricId) {
  if (metricId === 'total') return true;
  return resolveSummaryMetricId(report) === metricId;
}

function renderMonthlyTrendTooltip(
  { active, label, payload }: TrendTooltipProps,
  visibleMetrics: SummaryCategoryMetric[],
  previousYear: number,
  currentYear: number
) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};

  return (
    <div className="min-w-[260px] rounded-xl border border-[color:var(--sr-border)] bg-white p-3 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.45)]">
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
        <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[color:var(--sr-accent-dark)]">{label}</p>
        <p className="text-[11px] font-bold text-slate-500">{previousYear} vs {currentYear}</p>
      </div>
      <div className="space-y-1.5">
        {visibleMetrics.map((metric) => {
          const previousValue = Number(row[`${metric.id}-${previousYear}`] || 0);
          const currentValue = Number(row[`${metric.id}-${currentYear}`] || 0);
          const delta = currentValue - previousValue;
          const favorableDelta = metric.positiveTrend === 'up' ? delta > 0 : delta < 0;
          const unfavorableDelta = metric.positiveTrend === 'up' ? delta < 0 : delta > 0;

          return (
            <div key={metric.id} className="grid grid-cols-[minmax(90px,1fr)_56px_56px_52px] items-center gap-2 text-[11px]">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: metric.color }} />
                <span className="truncate font-bold text-slate-700">{metric.chartLabel}</span>
              </div>
              <span className="text-right font-semibold tabular-nums text-slate-500">{previousValue}</span>
              <span className="text-right font-black tabular-nums text-slate-900">{currentValue}</span>
              <span
                className={`text-right font-black tabular-nums ${
                  unfavorableDelta ? 'text-red-600' : favorableDelta ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {delta > 0 ? '+' : ''}{delta}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-[minmax(90px,1fr)_56px_56px_52px] gap-2 border-t border-slate-100 pt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        <span>Category</span>
        <span className="text-right">{previousYear}</span>
        <span className="text-right">{currentYear}</span>
        <span className="text-right">Delta</span>
      </div>
    </div>
  );
}

function computeDeltaPct(current: number, previous: number) {
  if (current === 0 && previous === 0) return null;
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round((Math.abs(current - previous) / previous) * 100);
}

function computeRowTrend(
  row: { values: Record<string, number> },
  monthColumns: MonthColumn[]
): { current: number; previous: number; deltaPct: number } | null {
  if (monthColumns.length < 2) return null;

  const lastMonth = monthColumns[monthColumns.length - 1];
  const prevMonth = monthColumns[monthColumns.length - 2];
  const current = row.values[lastMonth.key] || 0;
  const previous = row.values[prevMonth.key] || 0;
  const deltaPct = computeDeltaPct(current, previous);

  if (deltaPct === null) return null;
  return { current, previous, deltaPct };
}

function isPositiveTrendForLabel(label: string): boolean | null {
  const lower = label.toLowerCase();
  if (lower.includes('compliment')) return true;
  if (lower.includes('irregular') || lower.includes('complaint') || lower.includes('complain')) return false;
  return null;
}

function TrendBadge({
  trend,
  positiveTrend,
  rowLabel,
}: {
  trend: { current: number; previous: number; deltaPct: number } | null;
  positiveTrend: TrendDirection;
  rowLabel?: string;
}) {
  if (!trend) return <span className="text-[13px] font-medium text-[color:var(--sr-text-3)]">–</span>;

  const { current, previous, deltaPct } = trend;
  if (current === previous) return <span className="text-[13px] font-medium text-[color:var(--sr-text-3)]">→ 0%</span>;

  const isDown = current < previous;
  const isUp = current > previous;
  let isGood: boolean;

  if (positiveTrend === 'down') {
    isGood = isDown;
  } else if (positiveTrend === 'up') {
    isGood = isUp;
  } else {
    const labelResult = rowLabel ? isPositiveTrendForLabel(rowLabel) : null;
    if (labelResult === true) isGood = isUp;
    else if (labelResult === false) isGood = isDown;
    else isGood = isDown;
  }

  const pillClass = isGood ? 'sr-pill sr-pill-pos' : 'sr-pill sr-pill-neg';
  const arrow = isDown ? '↓' : '↑';

  return <span className={pillClass}><span aria-hidden="true">{arrow}</span>{deltaPct}%</span>;
}

function buildYearlyMonthRows(
  reports: Report[],
  year: number
) {
  const monthRows: YearlyCategoryMonthRow[] = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthLabel = new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const values = {
      irregularity: 0,
      complaint: 0,
      compliment: 0,
      occurrence: 0,
      accidentIncident: 0,
      total: 0,
    };

    reports.forEach((report) => {
      const month = extractMonthColumn(report);
      if (!month || month.year !== year || month.monthIndex !== monthIndex) return;

      const metricId = resolveSummaryMetricId(report);
      values.total += 1;
      if (metricId) values[metricId] += 1;
    });

    return {
      id: `${year}-${monthIndex}`,
      monthIndex,
      monthLabel,
      ...values,
    };
  });

  const totals = monthRows.reduce(
    (acc, row) => ({
      irregularity: acc.irregularity + row.irregularity,
      complaint: acc.complaint + row.complaint,
      compliment: acc.compliment + row.compliment,
      occurrence: acc.occurrence + row.occurrence,
      accidentIncident: acc.accidentIncident + row.accidentIncident,
      total: acc.total + row.total,
    }),
    { irregularity: 0, complaint: 0, compliment: 0, occurrence: 0, accidentIncident: 0, total: 0 }
  );

  return { rows: monthRows, totals };
}

function buildYearComparisonRows(
  previousYearTotals: {
    irregularity: number;
    complaint: number;
    compliment: number;
    occurrence: number;
    accidentIncident: number;
    total: number;
  },
  currentYearTotals: {
    irregularity: number;
    complaint: number;
    compliment: number;
    occurrence: number;
    accidentIncident: number;
    total: number;
  }
) {
  const metrics = [
    ...SUMMARY_CATEGORY_METRICS.map((metric) => ({ id: metric.id, label: metric.label })),
    { id: 'total', label: 'Total' },
  ] as const;

  return metrics.map((metric) => {
    const previous = previousYearTotals[metric.id];
    const current = currentYearTotals[metric.id];
    const deltaPct = previous === 0 ? 0 : (Math.abs(current - previous) / previous) * 100;

    let direction: YearComparisonRow['direction'] = 'flat';
    if (previous === 0) direction = 'no-baseline';
    else if (current === previous) direction = 'flat';
    else {
      direction = current > previous ? 'improvement' : 'decline';
    }

    return {
      id: metric.id,
      label: metric.label,
      current,
      previous,
      deltaPct,
      direction,
    };
  });
}

function matchesSingleContext(report: Report, context: DrilldownSingleContext, primaryValue: string) {
  switch (context) {
    case 'landside-category':
      return normalizeText(report.terminal_area_category, '-') === primaryValue;
    case 'airside-category':
      return normalizeText(report.apron_area_category, '-') === primaryValue;
    case 'general-category':
      return normalizeText(report.general_category, '-') === primaryValue;
    case 'case-classification':
      return normalizeText(resolveCaseClassification(report), '-') === primaryValue;
    case 'root-cause':
      return normalizeText(resolveRootCause(report), '-') === primaryValue;
    default:
      return false;
  }
}

function matchesHierarchyContext(
  report: Report,
  context: DrilldownHierarchyContext,
  primaryValue: string,
  secondaryValue: string
) {
  switch (context) {
    case 'summary-station':
      return (
        resolveBranchLabel(report) === primaryValue &&
        resolveCategory(report) === secondaryValue
      );
    case 'summary-airlines':
      return (
        resolveAirlineLabel(report) === primaryValue &&
        resolveCategory(report) === secondaryValue
      );
    case 'landside-airlines':
      return (
        resolveAirlineLabel(report) === primaryValue &&
        normalizeText(report.terminal_area_category, '-') === secondaryValue
      );
    case 'airside-airlines':
      return (
        resolveAirlineLabel(report) === primaryValue &&
        normalizeText(report.apron_area_category, '-') === secondaryValue
      );
    case 'general-airlines':
      return (
        resolveAirlineLabel(report) === primaryValue &&
        normalizeText(report.general_category, '-') === secondaryValue
      );
    default:
      return false;
  }
}

export function SummaryReportTab({ reports }: SummaryReportTabProps) {
  const [selectedSummaryBranch, setSelectedSummaryBranch] = useState('all');
  const [selectedSummaryAirline, setSelectedSummaryAirline] = useState('all');
  const [showLandsideAirlines, setShowLandsideAirlines] = useState(false);
  const [showAirsideAirlines, setShowAirsideAirlines] = useState(false);
  const [showGeneralAirlines, setShowGeneralAirlines] = useState(false);

  // Drilldown Hook
  const { openDrilldown, DrilldownRenderer } = useDrilldown();

  const currentYearReports = useMemo(
    () => reports.filter((report) => {
      const month = extractMonthColumn(report);
      const isCurrentYear = month && month.year === 2026;
      return isCurrentYear;
    }),
    [reports]
  );
  const currentYearMonthColumns = useMemo(
    () => buildMonthColumns(currentYearReports),
    [currentYearReports]
  );
  const summaryBranchOptions = useMemo(
    () =>
      Array.from(
        new Set(
          reports
            .map((report) => resolveBranchLabel(report))
            .filter((value) => hasMeaningfulValue(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [reports]
  );
  const summaryAirlineOptions = useMemo(
    () =>
      Array.from(
        new Set(
          reports
            .map((report) => resolveAirlineLabel(report))
            .filter((value) => hasMeaningfulValue(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [reports]
  );
  const filteredSummaryReports = useMemo(
    () =>
      reports.filter((report) => {
        const matchesBranch =
          selectedSummaryBranch === 'all' || resolveBranchLabel(report) === selectedSummaryBranch;
        const matchesAirline =
          selectedSummaryAirline === 'all' || resolveAirlineLabel(report) === selectedSummaryAirline;
        return matchesBranch && matchesAirline;
      }),
    [reports, selectedSummaryBranch, selectedSummaryAirline]
  );
  const filteredSummaryMonthColumns = useMemo(
    () => buildMonthColumns(filteredSummaryReports),
    [filteredSummaryReports]
  );
  const summaryYears = useMemo(() => {
    const years = Array.from(new Set(filteredSummaryMonthColumns.map((month) => month.year))).sort((a, b) => a - b);
    return years.slice(-2);
  }, [filteredSummaryMonthColumns]);
  const hasComparableSummaryYears = summaryYears.length >= 2;
  const previousYear = summaryYears[0] ?? null;
  const comparisonCurrentYear = summaryYears[summaryYears.length - 1] ?? null;

  const categorySummary = useMemo(
    () => buildCategorySummaryRows(currentYearReports, currentYearMonthColumns),
    [currentYearReports, currentYearMonthColumns]
  );

  const stationSummary = useMemo(
    () =>
      buildHierarchicalRows(
        currentYearReports,
        currentYearMonthColumns,
        (report) => resolveBranchLabel(report),
        (report) => resolveCategory(report)
      ),
    [currentYearReports, currentYearMonthColumns]
  );

  const airlineSummary = useMemo(
    () =>
      buildHierarchicalRows(
        currentYearReports,
        currentYearMonthColumns,
        (report) => resolveAirlineLabel(report),
        (report) => resolveCategory(report)
      ),
    [currentYearReports, currentYearMonthColumns]
  );

  const caseClassificationReports = useMemo(
    () =>
      currentYearReports.filter(
        (report) =>
          hasMeaningfulValue(resolveCaseClassification(report)) &&
          resolveCategory(report) !== 'Compliment'
      ),
    [currentYearReports]
  );

  const caseClassificationSummary = useMemo(
    () =>
      buildSingleDimensionRows(
        caseClassificationReports,
        currentYearMonthColumns,
        (report) => normalizeText(resolveCaseClassification(report))
      ),
    [caseClassificationReports, currentYearMonthColumns]
  );

  const previousYearSummary = useMemo(
    () => (previousYear !== null ? buildYearlyMonthRows(filteredSummaryReports, previousYear) : null),
    [filteredSummaryReports, previousYear]
  );

  const currentYearSummary = useMemo(
    () => (comparisonCurrentYear !== null ? buildYearlyMonthRows(filteredSummaryReports, comparisonCurrentYear) : null),
    [filteredSummaryReports, comparisonCurrentYear]
  );

  const yearComparisonRows = useMemo(
    () =>
      previousYearSummary && currentYearSummary
        ? buildYearComparisonRows(
            previousYearSummary.totals,
            currentYearSummary.totals
          )
        : [],
    [previousYearSummary, currentYearSummary]
  );

  const landsideReports = useMemo(
    () => currentYearReports.filter((report) => hasMeaningfulValue(report.terminal_area_category)),
    [currentYearReports]
  );

  const landsideCategorySummary = useMemo(
    () =>
      buildSingleDimensionRows(
        landsideReports,
        currentYearMonthColumns,
        (report) => normalizeText(report.terminal_area_category)
      ),
    [landsideReports, currentYearMonthColumns]
  );

  const landsideAirlineSummary = useMemo(
    () =>
      buildHierarchicalRows(
        landsideReports,
        currentYearMonthColumns,
        (report) => resolveAirlineLabel(report),
        (report) => normalizeText(report.terminal_area_category)
      ),
    [landsideReports, currentYearMonthColumns]
  );

  const airsideReports = useMemo(
    () => currentYearReports.filter((report) => hasMeaningfulValue(report.apron_area_category)),
    [currentYearReports]
  );

  const airsideCategorySummary = useMemo(
    () =>
      buildSingleDimensionRows(
        airsideReports,
        currentYearMonthColumns,
        (report) => normalizeText(report.apron_area_category)
      ),
    [airsideReports, currentYearMonthColumns]
  );

  const airsideAirlineSummary = useMemo(
    () =>
      buildHierarchicalRows(
        airsideReports,
        currentYearMonthColumns,
        (report) => resolveAirlineLabel(report),
        (report) => normalizeText(report.apron_area_category)
      ),
    [airsideReports, currentYearMonthColumns]
  );

  const generalServiceReports = useMemo(
    () => currentYearReports.filter((report) => hasMeaningfulValue(report.general_category)),
    [currentYearReports]
  );

  const generalServiceCategorySummary = useMemo(
    () =>
      buildSingleDimensionRows(
        generalServiceReports,
        currentYearMonthColumns,
        (report) => normalizeText(report.general_category)
      ),
    [generalServiceReports, currentYearMonthColumns]
  );

  const generalServiceAirlineSummary = useMemo(
    () =>
      buildHierarchicalRows(
        generalServiceReports,
        currentYearMonthColumns,
        (report) => resolveAirlineLabel(report),
        (report) => normalizeText(report.general_category)
      ),
    [generalServiceReports, currentYearMonthColumns]
  );

  const handleYearMonthCategoryClick = (
    year: number,
    monthIndex: number,
    metricId: SummaryMetricId
  ) => {
    const filteredReports = filteredSummaryReports.filter((report) => {
      const month = extractMonthColumn(report);
      return Boolean(
        month &&
        month.year === year &&
        month.monthIndex === monthIndex &&
        matchesSummaryMetric(report, metricId)
      );
    });

    if (filteredReports.length > 0) {
      const monthLabel = new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'long' });
      const metricLabel = metricId === 'total' ? 'Total Reports' : SUMMARY_METRIC_BY_ID[metricId]?.label || metricId;
      openDrilldown(filteredReports, `${monthLabel} ${year} - ${metricLabel}`);
    }
  };

  const handleYearComparisonClick = (metricId: SummaryMetricId) => {
    if (previousYear === null || comparisonCurrentYear === null) return;

    const filteredReports = filteredSummaryReports.filter((report) => {
      const month = extractMonthColumn(report);
      return Boolean(
        month &&
        (month.year === previousYear || month.year === comparisonCurrentYear) &&
        matchesSummaryMetric(report, metricId)
      );
    });

    if (filteredReports.length > 0) {
      const metricLabel = metricId === 'total' ? 'Total Reports' : SUMMARY_METRIC_BY_ID[metricId]?.label || metricId;
      openDrilldown(filteredReports, `${previousYear} vs ${comparisonCurrentYear} - ${metricLabel}`);
    }
  };

  /**
   * Handle cell click for single dimension pivot (e.g., landside, airside, general)
   */
  const handleSingleDimensionCellClick = (
    context: DrilldownSingleContext,
    monthKey: string,
    primaryValue: string
  ) => {
    const filteredReports = currentYearReports.filter((report) => {
      const month = extractMonthColumn(report);
      const monthMatch = month && month.key === monthKey;
      if (!monthMatch) return false;

      return matchesSingleContext(report, context, primaryValue);
    });

    if (filteredReports.length > 0) {
      const monthColumn = currentYearMonthColumns.find((m) => m.key === monthKey);
      const monthLabel = monthColumn ? `${monthColumn.label} ${monthColumn.year}` : monthKey;
      const title = `${monthLabel} - ${primaryValue}`;
      openDrilldown(filteredReports, title);
    }
  };

  /**
   * Handle cell click for hierarchical pivot (e.g., station, airlines)
   */
  const handleHierarchicalCellClick = (
    context: DrilldownHierarchyContext,
    monthKey: string,
    primaryValue: string,
    secondaryValue: string
  ) => {
    const filteredReports = currentYearReports.filter((report) => {
      const month = extractMonthColumn(report);
      const monthMatch = month && month.key === monthKey;
      if (!monthMatch) return false;

      return matchesHierarchyContext(report, context, primaryValue, secondaryValue);
    });

    if (filteredReports.length > 0) {
      const monthColumn = currentYearMonthColumns.find((m) => m.key === monthKey);
      const monthLabel = monthColumn ? `${monthColumn.label} ${monthColumn.year}` : monthKey;
      const title = `${monthLabel} - ${primaryValue} / ${secondaryValue}`;
      openDrilldown(filteredReports, title);
    }
  };

  const sectionAiContext = useMemo(() => ({
    section: 'Summary Report',
    title: 'Summary Report',
    chartType: 'section_summary_report',
    chartData: [
      ...categorySummary.rows.map((row) => ({ label: `Category ${row.label}`, value: row.total, values: row.values })),
      ...stationSummary.rows.slice(0, 12).map((row) => ({ label: `Station ${row.primary} / ${row.secondary || '-'}`, value: row.total, values: row.values })),
      ...airlineSummary.rows.slice(0, 12).map((row) => ({ label: `Airline ${row.primary} / ${row.secondary || '-'}`, value: row.total, values: row.values })),
      ...yearComparisonRows.map((row) => ({ label: `YoY ${row.label}`, value: row.current, secondary: `${Math.round(row.deltaPct)}% vs previous year` })),
    ],
    featureHints: ['forecasting', 'seasonality', 'riskScoring', 'summarization', 'actionRecommendation'],
  }), [airlineSummary.rows, categorySummary.rows, stationSummary.rows, yearComparisonRows]);

  return (
    <div className="sr-scope space-y-10 bg-[color:var(--sr-canvas)] px-4 py-6 text-[color:var(--sr-text)] sm:px-6 lg:px-8">
      <div className="sr-card relative flex flex-col gap-4 overflow-hidden px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="absolute inset-x-0 top-0 h-[5px] bg-[color:var(--sr-accent)]" aria-hidden="true" />
        <div className="flex min-w-0 items-center gap-4">
          <span className="inline-block h-12 w-[6px] shrink-0 rounded bg-[color:var(--sr-accent)] shadow-[5px_0_0_var(--sr-gold)]" aria-hidden="true" />
          <h1 className="font-display text-[clamp(26px,2.4vw,34px)] font-bold leading-tight tracking-[-0.02em] text-[color:var(--sr-text)]">
            Summary Report
          </h1>
        </div>
        <SectionAiSummaryInsightButton context={sectionAiContext} />
      </div>

      {hasComparableSummaryYears && previousYearSummary && currentYearSummary && previousYear !== null && comparisonCurrentYear !== null ? (
        <section>
          <AnnualReportSummary
            previousYear={previousYear}
            currentYear={comparisonCurrentYear}
            previousRows={previousYearSummary.rows}
            currentRows={currentYearSummary.rows}
            comparisonRows={yearComparisonRows}
            branchOptions={summaryBranchOptions}
            airlineOptions={summaryAirlineOptions}
            selectedBranch={selectedSummaryBranch}
            selectedAirline={selectedSummaryAirline}
            onBranchChange={setSelectedSummaryBranch}
            onAirlineChange={setSelectedSummaryAirline}
            onMonthCategoryClick={handleYearMonthCategoryClick}
            onYearComparisonClick={handleYearComparisonClick}
          />
        </section>
      ) : selectedSummaryBranch !== 'all' || selectedSummaryAirline !== 'all' ? (
        <section className="border border-[color:color-mix(in_oklch,var(--sr-border)_60%,transparent)] bg-white px-4 py-3 text-sm font-medium text-[color:var(--sr-text)]">
          Filter saat ini tidak memiliki data yang cukup untuk membandingkan dua tahun.
        </section>
      ) : null}

      <SummarySection title="Summary Report Overview by Station & Airlines">
        <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
          <HierarchicalMonthPivotTable
            title="Summary Station"
            primaryHeader="Station"
            secondaryHeader="Report Category"
            monthColumns={currentYearMonthColumns}
            rows={stationSummary.rows}
          monthTotals={stationSummary.monthTotals}
          grandTotal={stationSummary.grandTotal}
          scrollable
          freezeRightCols
          onCellClick={(monthKey, primaryValue, secondaryValue) =>
            handleHierarchicalCellClick('summary-station', monthKey, primaryValue, secondaryValue)
          }
          />
          <HierarchicalMonthPivotTable
            title="Summary Airlines"
            primaryHeader="Airlines"
            secondaryHeader="Report Category"
            monthColumns={currentYearMonthColumns}
            rows={airlineSummary.rows}
          monthTotals={airlineSummary.monthTotals}
          grandTotal={airlineSummary.grandTotal}
          scrollable
          freezeRightCols
          onCellClick={(monthKey, primaryValue, secondaryValue) =>
            handleHierarchicalCellClick('summary-airlines', monthKey, primaryValue, secondaryValue)
          }
          />
        </div>
      </SummarySection>

      <SummarySection title="Summary Report Case Classification">
        <div className="grid grid-cols-1 items-stretch gap-4">
          <SingleDimensionMonthPivotTable
            title="Report Case Classification"
            primaryHeader="Case Classification"
            monthColumns={currentYearMonthColumns}
            rows={caseClassificationSummary.rows}
            monthTotals={caseClassificationSummary.monthTotals}
            grandTotal={caseClassificationSummary.grandTotal}
            compact
            scrollable
            onCellClick={(monthKey, primaryValue) =>
              handleSingleDimensionCellClick('case-classification', monthKey, primaryValue)
            }
          />
        </div>
      </SummarySection>

      <SummarySection title="Summary Report Landside Area Category">
        <div className="grid grid-cols-1 items-stretch gap-4">
          <SingleDimensionMonthPivotTable
            title="Report Landside Category Area"
            primaryHeader="Terminal Area Category"
            monthColumns={currentYearMonthColumns}
            rows={landsideCategorySummary.rows}
            monthTotals={landsideCategorySummary.monthTotals}
            grandTotal={landsideCategorySummary.grandTotal}
            compact
            scrollable
            unbounded
            onCellClick={(monthKey, primaryValue) =>
              handleSingleDimensionCellClick('landside-category', monthKey, primaryValue)
            }
          />
          <ExpandableReportBlock
            open={showLandsideAirlines}
            onToggle={() => setShowLandsideAirlines((value) => !value)}
            buttonLabel="Tampilkan Landside Area By Airlines Report"
          >
            <HierarchicalMonthPivotTable
              title="Landside Area by Airlines Report"
              primaryHeader="Airlines"
              secondaryHeader="Terminal Area Category"
              monthColumns={currentYearMonthColumns}
              rows={landsideAirlineSummary.rows}
              monthTotals={landsideAirlineSummary.monthTotals}
              grandTotal={landsideAirlineSummary.grandTotal}
              compact
              scrollable
              unbounded
              freezeRightCols
              onCellClick={(monthKey, primaryValue, secondaryValue) =>
                handleHierarchicalCellClick('landside-airlines', monthKey, primaryValue, secondaryValue)
              }
            />
          </ExpandableReportBlock>
        </div>
      </SummarySection>

      <SummarySection title="Summary Report Airside/Apron Area Category">
        <div className="grid grid-cols-1 items-stretch gap-4">
          <SingleDimensionMonthPivotTable
            title="Report Airside Category Area"
            primaryHeader="Apron Area Category"
            monthColumns={currentYearMonthColumns}
            rows={airsideCategorySummary.rows}
            monthTotals={airsideCategorySummary.monthTotals}
            grandTotal={airsideCategorySummary.grandTotal}
            compact
            scrollable
            unbounded
            onCellClick={(monthKey, primaryValue) =>
              handleSingleDimensionCellClick('airside-category', monthKey, primaryValue)
            }
          />
          <ExpandableReportBlock
            open={showAirsideAirlines}
            onToggle={() => setShowAirsideAirlines((value) => !value)}
            buttonLabel="Tampilkan Airside Area By Airlines Report"
          >
            <HierarchicalMonthPivotTable
              title="Airside Area by Airlines Report"
              primaryHeader="Airlines"
              secondaryHeader="Apron Area Category"
              monthColumns={currentYearMonthColumns}
              rows={airsideAirlineSummary.rows}
              monthTotals={airsideAirlineSummary.monthTotals}
              grandTotal={airsideAirlineSummary.grandTotal}
              compact
              scrollable
              unbounded
              freezeRightCols
              onCellClick={(monthKey, primaryValue, secondaryValue) =>
                handleHierarchicalCellClick('airside-airlines', monthKey, primaryValue, secondaryValue)
              }
            />
          </ExpandableReportBlock>
        </div>
      </SummarySection>

      <SummarySection title="Summary Report General Service Category">
        <div className="grid grid-cols-1 items-stretch gap-4">
          <SingleDimensionMonthPivotTable
            title="Report General Service"
            primaryHeader="General Category"
            monthColumns={currentYearMonthColumns}
            rows={generalServiceCategorySummary.rows}
            monthTotals={generalServiceCategorySummary.monthTotals}
            grandTotal={generalServiceCategorySummary.grandTotal}
            compact
            scrollable
            unbounded
            onCellClick={(monthKey, primaryValue) =>
              handleSingleDimensionCellClick('general-category', monthKey, primaryValue)
            }
          />
          <ExpandableReportBlock
            open={showGeneralAirlines}
            onToggle={() => setShowGeneralAirlines((value) => !value)}
            buttonLabel="Tampilkan General Service By Airlines Report"
          >
            <HierarchicalMonthPivotTable
              title="General Service by Airlines Report"
              primaryHeader="Airlines"
              secondaryHeader="General Category"
              monthColumns={currentYearMonthColumns}
              rows={generalServiceAirlineSummary.rows}
              monthTotals={generalServiceAirlineSummary.monthTotals}
              grandTotal={generalServiceAirlineSummary.grandTotal}
              compact
              scrollable
              unbounded
              freezeRightCols
              onCellClick={(monthKey, primaryValue, secondaryValue) =>
                handleHierarchicalCellClick('general-airlines', monthKey, primaryValue, secondaryValue)
              }
            />
          </ExpandableReportBlock>
        </div>
      </SummarySection>

      {/* Drilldown Drawer */}
      <DrilldownRenderer />
    </div>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="sr-section-h">
        <span className="sr-section-rule" aria-hidden="true" />
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ExpandableReportBlock({
  open,
  onToggle,
  buttonLabel,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  buttonLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-150 active:translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
        style={{
          background: open
            ? 'linear-gradient(to bottom, #ef4444, #b91c1c)'
            : 'linear-gradient(to bottom, #10b981, #047857)',
          boxShadow: open
            ? '0 3px 0 #991b1b, 0 4px 12px rgba(185,28,28,0.32)'
            : '0 3px 0 #064e3b, 0 4px 12px rgba(4,120,87,0.32)',
        }}
        aria-expanded={open}
      >
        {open ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15" /></svg>
            Sembunyikan Report
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
            {buttonLabel}
          </>
        )}
      </button>
      {open ? children : null}
    </div>
  );
}

function AnnualMetricStrip({
  previousYear,
  currentYear,
  previousRows,
  currentRows,
  comparisonRows,
  onYearComparisonClick,
}: {
  previousYear: number;
  currentYear: number;
  previousRows: YearlyCategoryMonthRow[];
  currentRows: YearlyCategoryMonthRow[];
  comparisonRows: YearComparisonRow[];
  onYearComparisonClick?: (metricId: SummaryMetricId) => void;
}) {
  const previousTotal = previousRows.reduce((sum, row) => sum + row.total, 0);
  const currentTotal = currentRows.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <button
        type="button"
        className="sr-card-hero relative flex min-w-0 flex-col justify-between gap-6 p-8 sm:p-10 text-left cursor-pointer hover:brightness-[0.97] transition-all"
        onClick={() => onYearComparisonClick?.('total')}
        title={`View ${previousYear} reports`}
      >
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[color:var(--sr-accent-dark)]">Total Reports {previousYear}</span>
        <div className="sr-hero-value">{previousTotal.toLocaleString()}</div>
      </button>
      <button
        type="button"
        className="sr-card-hero sr-card-hero-primary relative flex min-w-0 flex-col justify-between gap-6 p-8 sm:p-10 text-left cursor-pointer hover:brightness-[0.97] transition-all"
        onClick={() => onYearComparisonClick?.('total')}
        title={`View all ${currentYear} reports`}
      >
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[color:var(--sr-accent-dark)]">Total Reports {currentYear}</span>
        <div className="sr-hero-value">{currentTotal.toLocaleString()}</div>
      </button>
    </div>
  );
}

function YearTrendChartPanel({
  previousYear,
  currentYear,
  previousRows,
  currentRows,
  onMonthCategoryClick,
}: {
  previousYear: number;
  currentYear: number;
  previousRows: YearlyCategoryMonthRow[];
  currentRows: YearlyCategoryMonthRow[];
  onMonthCategoryClick?: (year: number, monthIndex: number, metricId: SummaryMetricId) => void;
}) {
  const [visibleMetricIds, setVisibleMetricIds] = useState<Array<SummaryCategoryMetric['id']>>(
    () => SUMMARY_CATEGORY_METRICS.map((metric) => metric.id)
  );

  const chartData = currentRows.map((row, index) => ({
    month: row.monthLabel,
    monthIndex: row.monthIndex,
    ...SUMMARY_CATEGORY_METRICS.reduce<Record<string, number>>((acc, metric) => {
      acc[`${metric.id}-${previousYear}`] = previousRows[index]?.[metric.id] || 0;
      acc[`${metric.id}-${currentYear}`] = row[metric.id] || 0;
      return acc;
    }, {}),
  }));

  const visibleMetrics = SUMMARY_CATEGORY_METRICS.filter((metric) => visibleMetricIds.includes(metric.id));

  const toggleMetric = (metricId: SummaryCategoryMetric['id']) => {
    setVisibleMetricIds((current) => {
      if (current.includes(metricId)) {
        return current.length === 1 ? current : current.filter((item) => item !== metricId);
      }
      return [...current, metricId];
    });
  };

  const renderTrendDot = (
    year: number,
    metricId: SummaryCategoryMetric['id'],
    fill: string,
    radius: number,
    opacity = 1
  ) => {
    function TrendDotRenderer(props: TrendDotProps) {
      const { cx, cy, payload } = props;
      if (typeof cx !== 'number' || typeof cy !== 'number') return <g />;
      const monthIndex = payload?.monthIndex;
      const canOpen = typeof monthIndex === 'number' && Boolean(onMonthCategoryClick);

      return (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={fill}
          fillOpacity={opacity}
          stroke="#ffffff"
          strokeOpacity={opacity}
          strokeWidth={2}
          className={canOpen ? 'cursor-pointer' : undefined}
          onClick={() => {
            if (typeof monthIndex === 'number') onMonthCategoryClick?.(year, monthIndex, metricId);
          }}
        />
      );
    }

    return TrendDotRenderer;
  };

  return (
    <div className="sr-card relative flex min-h-[36rem] min-w-0 flex-col overflow-hidden p-6">
      <div className="absolute inset-x-0 top-0 h-[4px] bg-[color:var(--sr-accent)]" aria-hidden="true" />
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-block h-9 w-[5px] shrink-0 rounded bg-[color:var(--sr-gold)]" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-accent-dark)]">Monthly trend</span>
            <h3 className="font-display text-[18px] font-bold leading-tight tracking-[-0.015em] text-[color:var(--sr-text)]">{previousYear} vs {currentYear}</h3>
            <span className="text-[11px] font-semibold text-slate-500">Sqrt scale keeps low-volume categories visible while preserving zero.</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChartAiAnalysisButton
            context={{
              section: 'Summary Report',
              chartTitle: `Monthly Trend ${previousYear} vs ${currentYear}`,
              chartType: 'monthly_trend_combo_chart',
              chartData,
              featureHints: summaryReportFeatureHints(`Monthly Trend ${previousYear} vs ${currentYear}`),
            }}
          />
        </div>
      </div>
      <div className="mb-4 grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Categories</span>
            <span className="text-[10px] font-bold text-slate-400">{visibleMetricIds.length} of {SUMMARY_CATEGORY_METRICS.length} active</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SUMMARY_CATEGORY_METRICS.map((metric) => {
              const active = visibleMetricIds.includes(metric.id);
              return (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => toggleMetric(metric.id)}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    borderColor: active ? metric.color : '#d8d4c8',
                    backgroundColor: active ? `${metric.color}14` : '#ffffff',
                    color: active ? metric.color : '#667174',
                    boxShadow: active ? `0 8px 20px -18px ${metric.color}` : 'none',
                  }}
                  aria-pressed={active}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
                  {metric.chartLabel}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setVisibleMetricIds(SUMMARY_CATEGORY_METRICS.map((metric) => metric.id))}
              disabled={visibleMetricIds.length === SUMMARY_CATEGORY_METRICS.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--sr-accent-soft-2)] bg-white px-3 py-2 text-xs font-bold text-[color:var(--sr-accent-dark)] transition hover:bg-[color:var(--sr-accent-tint)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
            >
              Show All
            </button>
            <button
              type="button"
              onClick={() => setVisibleMetricIds([])}
              disabled={visibleMetricIds.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--sr-border)] bg-white px-3 py-2 text-xs font-bold text-[color:var(--sr-text-3)] transition hover:bg-[color:var(--sr-neg-soft)] hover:text-[color:var(--sr-neg)] hover:border-[color:var(--sr-neg-soft)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[color:var(--sr-text-3)]"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Year key</span>
          <span className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <span className="h-0 w-8 border-t-2 border-dashed border-slate-500 opacity-70" />
            {previousYear}
          </span>
          <span className="inline-flex items-center gap-2 text-[11px] font-black text-slate-800">
            <span className="h-0 w-8 border-t-[3px] border-slate-800" />
            {currentYear}
          </span>
        </div>
      </div>
      <div className="sr-only">
        Monthly category trend chart comparing {previousYear} and {currentYear}.
      </div>
      <div className="min-h-[300px] flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <ComposedChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 12, right: 16, bottom: 8, left: -4 }}
            role="img"
            aria-label={`Monthly category trend comparing ${previousYear} and ${currentYear}`}
          >
            <CartesianGrid stroke="#e6e0d2" strokeDasharray="2 8" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#38484b', fontSize: 12, fontWeight: 800 }}
              axisLine={{ stroke: '#d8d4c8' }}
              tickLine={false}
              tickMargin={12}
            />
            <YAxis
              allowDecimals={false}
              scale="sqrt"
              domain={[0, 'dataMax']}
              tick={{ fill: '#607174', fontSize: 12, fontWeight: 800 }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickMargin={8}
            />
            <Tooltip
              cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4', strokeWidth: 1 }}
              content={(props) => renderMonthlyTrendTooltip(props as TrendTooltipProps, visibleMetrics, previousYear, currentYear)}
            />
            {visibleMetrics.flatMap((metric) => [
              <Line
                key={`${metric.id}-${previousYear}`}
                type="monotone"
                dataKey={`${metric.id}-${previousYear}`}
                name={`${metric.chartLabel} ${previousYear}`}
                stroke={metric.color}
                strokeOpacity={0.48}
                strokeWidth={2.1}
                strokeDasharray="5 5"
                dot={renderTrendDot(previousYear, metric.id, metric.color, 2.5, 0.48)}
                activeDot={renderTrendDot(previousYear, metric.id, metric.color, 5.5, 0.85)}
                onClick={(point: unknown) => {
                  const monthIndex = (point as TrendPoint)?.payload?.monthIndex;
                  if (typeof monthIndex === 'number') onMonthCategoryClick?.(previousYear, monthIndex, metric.id);
                }}
              />,
              <Line
                key={`${metric.id}-${currentYear}`}
                type="monotone"
                dataKey={`${metric.id}-${currentYear}`}
                name={`${metric.chartLabel} ${currentYear}`}
                stroke={metric.color}
                strokeWidth={3.2}
                dot={renderTrendDot(currentYear, metric.id, metric.color, 3.8)}
                activeDot={renderTrendDot(currentYear, metric.id, metric.color, 7)}
                onClick={(point: unknown) => {
                  const monthIndex = (point as TrendPoint)?.payload?.monthIndex;
                  if (typeof monthIndex === 'number') onMonthCategoryClick?.(currentYear, monthIndex, metric.id);
                }}
              />,
            ])}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AnnualReportSummary({
  previousYear,
  currentYear,
  previousRows,
  currentRows,
  comparisonRows,
  branchOptions,
  airlineOptions,
  selectedBranch,
  selectedAirline,
  onBranchChange,
  onAirlineChange,
  onMonthCategoryClick,
  onYearComparisonClick,
}: {
  previousYear: number;
  currentYear: number;
  previousRows: YearlyCategoryMonthRow[];
  currentRows: YearlyCategoryMonthRow[];
  comparisonRows: YearComparisonRow[];
  branchOptions: string[];
  airlineOptions: string[];
  selectedBranch: string;
  selectedAirline: string;
  onBranchChange: (value: string) => void;
  onAirlineChange: (value: string) => void;
  onMonthCategoryClick?: (year: number, monthIndex: number, metricId: SummaryMetricId) => void;
  onYearComparisonClick?: (metricId: SummaryMetricId) => void;
}) {
  return (
    <div className="sr-card relative overflow-hidden p-6 sm:p-8">
      <div className="absolute inset-x-0 top-0 h-[5px] bg-[color:var(--sr-accent)]" aria-hidden="true" />
      <div className="space-y-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="inline-block h-11 w-[6px] shrink-0 rounded bg-[color:var(--sr-accent)] shadow-[5px_0_0_var(--sr-gold)]" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-accent-dark)]">
              Period · {previousYear} &amp; {currentYear}
            </span>
            <h2 className="font-display text-[clamp(22px,2vw,28px)] font-bold leading-tight tracking-[-0.02em] text-[color:var(--sr-text)]">
              Report Summary
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[180px] flex-col gap-1.5">
            <span className="sr-eyebrow">Branch</span>
            <select
              value={selectedBranch}
              onChange={(event) => onBranchChange(event.target.value)}
              className="sr-select"
            >
              <option value="all">All Branch</option>
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[220px] flex-col gap-1.5">
            <span className="sr-eyebrow">Airlines</span>
            <select
              value={selectedAirline}
              onChange={(event) => onAirlineChange(event.target.value)}
              className="sr-select"
            >
              <option value="all">All Airlines</option>
              {airlineOptions.map((airline) => (
                <option key={airline} value={airline}>
                  {airline}
                </option>
              ))}
            </select>
          </label>
          {(selectedBranch !== 'all' || selectedAirline !== 'all') ? (
            <button
              type="button"
              onClick={() => {
                onBranchChange('all');
                onAirlineChange('all');
              }}
              className="sr-btn sr-btn-ghost"
            >
              Reset filters
            </button>
          ) : null}
        </div>
      </div>

      <AnnualMetricStrip
        previousYear={previousYear}
        currentYear={currentYear}
        previousRows={previousRows}
        currentRows={currentRows}
        comparisonRows={comparisonRows}
        onYearComparisonClick={onYearComparisonClick}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <YearCategorySummaryTable
          year={previousYear}
          rows={previousRows}
          onCellClick={onMonthCategoryClick}
        />
        <YearCategorySummaryTable
          year={currentYear}
          rows={currentRows}
          onCellClick={onMonthCategoryClick}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <YearImprovementSummaryTable
          previousYear={previousYear}
          currentYear={currentYear}
          rows={comparisonRows}
          onRowClick={onYearComparisonClick}
        />
        <YearTrendChartPanel
          previousYear={previousYear}
          currentYear={currentYear}
          previousRows={previousRows}
          currentRows={currentRows}
          onMonthCategoryClick={onMonthCategoryClick}
        />
      </div>
      </div>
    </div>
  );
}

function YearCategorySummaryTable({
  year,
  rows,
  onCellClick,
}: {
  year: number;
  rows: YearlyCategoryMonthRow[];
  onCellClick?: (year: number, monthIndex: number, metricId: SummaryMetricId) => void;
}) {
  const yearTotal = rows.reduce((s, r) => s + r.total, 0);
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const now = new Date();
  const isCurrentCalendarYear = year === now.getFullYear();
  const lastOccurredMonthIndex = isCurrentCalendarYear ? now.getMonth() : 11;
  // Exclude months that haven't occurred yet, keep ascending order starting January
  const displayRows = [...rows]
    .filter((row) => row.monthIndex <= lastOccurredMonthIndex)
    .sort((a, b) => a.monthIndex - b.monthIndex);
  return (
    <div className="sr-table-card flex h-[28rem] min-w-0 flex-col">
      <div className="sr-table-caption">
        <div className="sr-table-caption-title">
          <span className="sr-marker" aria-hidden="true" />
          <h4>{year}</h4>
        </div>
        <ChartAiAnalysisButton
          context={{
            section: 'Summary Report',
            chartTitle: `${year}`,
            chartType: 'year_month_category_table',
            chartData: rows,
            featureHints: summaryReportFeatureHints(`MoM ${year}`),
          }}
        />
      </div>
      <div className="overflow-auto">
        <table className="sr-table sr-table-mom">
          <thead>
            <tr>
              <th className="sr-sticky-col-1" title="Month">Month</th>
              {SUMMARY_CATEGORY_METRICS.map((metric) => (
                <th key={metric.id} className="sr-num" style={{ minWidth: 56 }}>{metric.label}</th>
              ))}
              <th className="sr-num sr-sticky-col-right-2">Total</th>
              <th className="sr-center sr-sticky-col-right-1">vs prev mo</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const origIndex = rows.findIndex(r => r.id === row.id);
              const previous = origIndex > 0 ? rows[origIndex - 1].total : 0;
              const deltaPct = origIndex > 0 ? computeDeltaPct(row.total, previous) : null;
              const trend = deltaPct === null ? null : { current: row.total, previous, deltaPct };
              return (
                <tr key={row.id}>
                  <td className="sr-label sr-sticky-col-1">
                    <span className="font-bold">{row.monthLabel}</span>
                    <span className="ml-1 text-[color:var(--sr-text-3)] text-[10px]">{year}</span>
                  </td>
                  {SUMMARY_CATEGORY_METRICS.map((metric) => {
                    const value = row[metric.id];
                    const isClickable = Boolean(onCellClick && value > 0);
                    return (
                      <td
                        key={metric.id}
                        className={`sr-num ${isClickable ? 'sr-cell-click cursor-pointer' : ''}`}
                        onClick={() => isClickable && onCellClick(year, row.monthIndex, metric.id)}
                        role={isClickable ? 'button' : undefined}
                        tabIndex={isClickable ? 0 : undefined}
                        onKeyDown={(event) => {
                          if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            onCellClick?.(year, row.monthIndex, metric.id);
                          }
                        }}
                      >
                        {value > 0 ? <span className="sr-cell-value">{value}</span> : <span className="text-[color:var(--sr-text-3)]">–</span>}
                      </td>
                    );
                  })}
                  <td
                    className={`sr-num sr-sticky-col-right-2 ${heatClass(row.total, maxTotal)} ${onCellClick && row.total > 0 ? 'sr-cell-click cursor-pointer' : ''}`}
                    onClick={() => row.total > 0 && onCellClick?.(year, row.monthIndex, 'total')}
                    role={onCellClick && row.total > 0 ? 'button' : undefined}
                    tabIndex={onCellClick && row.total > 0 ? 0 : undefined}
                    onKeyDown={(event) => {
                      if (onCellClick && row.total > 0 && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        onCellClick(year, row.monthIndex, 'total');
                      }
                    }}
                  >
                    {row.total > 0 ? row.total : <span className="text-[color:var(--sr-text-3)]">–</span>}
                  </td>
                  <td className="sr-center sr-sticky-col-right-1">
                    <TrendBadge trend={trend} positiveTrend="down" rowLabel="total" />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="sr-label-foot sr-sticky-col-1">Total</td>
              {SUMMARY_CATEGORY_METRICS.map((metric) => (
                <td key={metric.id}>{rows.reduce((s, r) => s + r[metric.id], 0).toLocaleString()}</td>
              ))}
              <td className="sr-sticky-col-right-2">{yearTotal.toLocaleString()}</td>
              <td className="sr-sticky-col-right-1"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function YearImprovementSummaryTable({
  previousYear,
  currentYear,
  rows,
  onRowClick,
}: {
  previousYear: number;
  currentYear: number;
  rows: YearComparisonRow[];
  onRowClick?: (metricId: SummaryMetricId) => void;
}) {
  return (
    <div className="sr-table-card flex h-[28rem] min-w-0 flex-col">
      <div className="sr-table-caption">
        <div className="sr-table-caption-title">
          <span className="sr-marker" aria-hidden="true" />
          <h3>Full-Year Comparison</h3>
        </div>
        <ChartAiAnalysisButton
          context={{
            section: 'Summary Report',
            chartTitle: `YoY ${previousYear} vs ${currentYear}`,
            chartType: 'year_comparison_table',
            chartData: rows,
            featureHints: summaryReportFeatureHints(`YoY ${previousYear} vs ${currentYear}`),
          }}
        />
      </div>
      <div className="overflow-auto">
        <table className="sr-table">
          <thead>
            <tr>
              <th className="sr-sticky-col-1" title="Category">Category</th>
              <th className="sr-num">{previousYear}</th>
              <th className="sr-num">{currentYear}</th>
              <th className="sr-center">YoY</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isPositiveMetric = row.id === 'compliment';
              const isIncrease = row.current > row.previous;

              let pillKind: 'pos' | 'neg' | 'neutral';
              let icon: string;

              if (row.direction === 'flat' || row.direction === 'no-baseline') {
                pillKind = 'neutral';
                icon = '→';
              } else {
                // For all metrics except compliments, fewer reports = good (lower is better).
                const isGood = isPositiveMetric ? isIncrease : !isIncrease;
                pillKind = isGood ? 'pos' : 'neg';
                icon = isIncrease ? '↑' : '↓';
              }

              const isTotal = row.label.toLowerCase() === 'total';
              return (
                <tr
                  key={row.id}
                  className={`${isTotal ? 'font-semibold' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row.id)}
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      onRowClick(row.id);
                    }
                  }}
                >
                  <td className="sr-label sr-sticky-col-1" title={row.label}>{row.label}</td>
                  <td className="sr-num">{row.previous.toLocaleString()}</td>
                  <td className="sr-num">{row.current.toLocaleString()}</td>
                  <td className="sr-center">
                    <span className={`sr-pill sr-pill-${pillKind}`}>
                      <span aria-hidden="true">{icon}</span>
                      <span>{row.direction === 'no-baseline' ? 'N/A' : `${Math.round(row.deltaPct)}%`}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SingleDimensionMonthPivotTable({
  title,
  primaryHeader,
  monthColumns,
  rows,
  monthTotals,
  grandTotal,
  compact = false,
  onCellClick,
  scrollable = false,
  unbounded = false,
}: {
  title: string;
  primaryHeader: string;
  monthColumns: MonthColumn[];
  rows: PivotRow[];
  monthTotals: Record<string, number>;
  grandTotal: number;
  compact?: boolean;
  onCellClick?: (monthKey: string, primaryValue: string) => void;
  scrollable?: boolean;
  unbounded?: boolean;
}) {
  const safeRows = compactRows(rows).sort((a, b) => b.total - a.total);
  // Ascending: January first
  const displayMonths = [...monthColumns].sort((a, b) => (a.year - b.year) || (a.monthIndex - b.monthIndex));
  const maxValue = Math.max(1, ...safeRows.flatMap((row) => displayMonths.map((month) => row.values[month.key] || 0)));

  return (
    <TableShell
      title={title}
      scrollable={scrollable}
      unbounded={unbounded}
      aiContext={{
        section: 'Summary Report',
        chartTitle: title,
        chartType: 'month_pivot',
        chartData: safeRows.map((row) => ({ name: row.primary, value: row.total, values: row.values })),
        featureHints: summaryReportFeatureHints(title),
      }}
    >
      {safeRows.length === 0 ? (
        <EmptyTableState label={title} />
      ) : (
        <table className={`sr-table ${compact ? 'text-[14px]' : ''}`}>
          <thead>
            <tr>
              <th className="sr-sticky-col-1" title={primaryHeader}>{primaryHeader}</th>
              {displayMonths.map((month) => (
                <th key={month.key} className="sr-num" style={{ minWidth: 60 }}>
                  <span className="block">{month.label.slice(0, 3)}</span>
                  <span className="block text-[10px] font-normal opacity-80">{month.year}</span>
                </th>
              ))}
              <th className="sr-num sr-sticky-col-right-2">Total</th>
              <th className="sr-center sr-sticky-col-right-1">vs prev mo</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row) => {
              const trend = computeRowTrend(row, monthColumns);
              return (
                <tr key={row.id}>
                  <td className="sr-label sr-sticky-col-1" title={row.primary}>{row.primary}</td>
                  {displayMonths.map((month) => {
                    const value = row.values[month.key] || 0;
                    const isClickable = onCellClick && value > 0;
                    const heatCls = heatClass(value, maxValue);
                    return (
                      <td
                        key={`${row.id}-${month.key}`}
                        className={`sr-num ${heatCls} ${isClickable ? 'sr-cell-click cursor-pointer' : ''}`}
                        onClick={() => isClickable && onCellClick(month.key, row.primary)}
                        role={isClickable ? 'button' : undefined}
                        tabIndex={isClickable ? 0 : undefined}
                        onKeyDown={(e) => {
                          if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            onCellClick(month.key, row.primary);
                          }
                        }}
                        title={`${row.primary} – ${month.label} ${month.year}: ${value} records`}
                      >
                        {value > 0 ? <span className="sr-cell-value">{value}</span> : <span className="text-[color:var(--sr-text-3)]">–</span>}
                      </td>
                    );
                  })}
                  <td className="sr-num font-semibold sr-sticky-col-right-2">{row.total > 0 ? row.total.toLocaleString() : <span className="text-[color:var(--sr-text-3)]">–</span>}</td>
                  <td className="sr-center sr-sticky-col-right-1">
                    <TrendBadge trend={trend} positiveTrend="auto" rowLabel={row.primary} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="sr-label-foot sr-sticky-col-1">Grand total</td>
              {displayMonths.map((month) => (
                <td key={month.key}>{monthTotals[month.key] ? monthTotals[month.key].toLocaleString() : '–'}</td>
              ))}
              <td className="sr-sticky-col-right-2">{grandTotal.toLocaleString()}</td>
              <td className="sr-sticky-col-right-1"></td>
            </tr>
          </tfoot>
        </table>
      )}
    </TableShell>
  );
}

function TableShell({
  title,
  children,
  scrollable,
  unbounded,
  aiContext,
}: {
  title: string;
  children: ReactNode;
  scrollable?: boolean;
  unbounded?: boolean;
  aiContext?: ChartAiContext;
}) {
  return (
    <div className={`sr-table-card flex min-w-0 flex-col ${unbounded ? 'h-auto' : 'h-[28rem]'}`}>
      <div className="sr-table-caption">
        <div className="sr-table-caption-title">
          <span className="sr-marker" aria-hidden="true" />
          <h3>{title}</h3>
        </div>
        {aiContext ? <ChartAiAnalysisButton context={aiContext} /> : null}
      </div>
      <div
        className={
          unbounded
            ? 'relative min-h-0 overflow-x-auto overflow-y-visible'
            : scrollable
              ? 'relative min-h-0 flex-1 overflow-auto'
              : 'min-h-0 flex-1 overflow-auto'
        }
      >
        {children}
      </div>
    </div>
  );
}

function EmptyTableState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 border-t border-[color:var(--sr-border)] bg-[color:var(--sr-canvas)] px-6 text-center">
      <span className="sr-eyebrow text-[color:var(--sr-text-3)]">Empty</span>
      <p className="text-[15px] font-medium text-[color:var(--sr-text-2)]">No {label} data</p>
    </div>
  );
}

function HierarchicalMonthPivotTable({
  title,
  primaryHeader,
  secondaryHeader,
  monthColumns,
  rows,
  monthTotals,
  grandTotal,
  compact = false,
  onCellClick,
  scrollable = false,
  maxRows,
  freezeRightCols = false,
  unbounded = false,
}: {
  title: string;
  primaryHeader: string;
  secondaryHeader: string;
  monthColumns: MonthColumn[];
  rows: PivotRow[];
  monthTotals: Record<string, number>;
  grandTotal: number;
  compact?: boolean;
  onCellClick?: (monthKey: string, primaryValue: string, secondaryValue: string) => void;
  scrollable?: boolean;
  maxRows?: number;
  freezeRightCols?: boolean;
  unbounded?: boolean;
}) {
  const groupedRows = (() => {
    const groupTotals = new Map<string, number>();
    compactRows(rows).forEach((row) => {
      groupTotals.set(row.primary, (groupTotals.get(row.primary) || 0) + row.total);
    });
    return compactRows(rows).slice().sort((a, b) => {
      const groupDelta = (groupTotals.get(b.primary) || 0) - (groupTotals.get(a.primary) || 0);
      if (groupDelta !== 0) return groupDelta;
      if (a.primary !== b.primary) return a.primary.localeCompare(b.primary);
      return b.total - a.total;
    });
  })();
  const safeRows = groupedRows;
  const visibleRows = !unbounded && typeof maxRows === 'number' ? safeRows.slice(0, maxRows) : safeRows;
  // Ascending: January first
  const displayMonths = [...monthColumns].sort((a, b) => (a.year - b.year) || (a.monthIndex - b.monthIndex));
  const maxValue = Math.max(1, ...visibleRows.flatMap((row) => displayMonths.map((month) => row.values[month.key] || 0)));

  function getPrimaryRowSpan(rowIndex: number) {
    const primary = visibleRows[rowIndex]?.primary;
    if (!primary) return 1;

    let span = 1;
    for (let nextIndex = rowIndex + 1; nextIndex < visibleRows.length; nextIndex += 1) {
      if (visibleRows[nextIndex].primary !== primary) break;
      span += 1;
    }

    return span;
  }

  const rightTotal = freezeRightCols ? 'sr-sticky-col-right-2' : '';
  const rightPrev = freezeRightCols ? 'sr-sticky-col-right-1' : '';

  return (
    <TableShell
      title={title}
      scrollable={scrollable}
      unbounded={unbounded}
      aiContext={{
        section: 'Summary Report',
        chartTitle: title,
        chartType: 'hierarchical_month_pivot',
        chartData: safeRows.map((row) => ({
          name: `${row.primary} / ${row.secondary || '-'}`,
          value: row.total,
          primary: row.primary,
          secondary: row.secondary,
          values: row.values,
        })),
        featureHints: summaryReportFeatureHints(title),
      }}
    >
      {visibleRows.length === 0 ? (
        <EmptyTableState label={title} />
      ) : (
        <table className={`sr-table ${freezeRightCols ? 'sr-table-hierarchy-compact' : ''} ${compact ? 'text-[14px]' : ''}`}>
          <thead>
            <tr>
              <th className="sr-sticky-col-1" title={primaryHeader}>{primaryHeader}</th>
              <th className="sr-sticky-col-2" title={secondaryHeader}>{secondaryHeader}</th>
              {displayMonths.map((month) => (
                <th key={month.key} className="sr-num" style={{ minWidth: 60 }}>
                  <span className="block">{month.label.slice(0, 3)}</span>
                  <span className="block text-[10px] font-normal opacity-80">{month.year}</span>
                </th>
              ))}
              <th className={`sr-num ${rightTotal}`}>Total</th>
              <th className={`sr-center ${rightPrev}`}>vs prev mo</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const showPrimary = index === 0 || visibleRows[index - 1].primary !== row.primary;
              const primaryRowSpan = showPrimary ? getPrimaryRowSpan(index) : 0;
              const trend = computeRowTrend(row, monthColumns);
              return (
                <tr key={row.id}>
                  {showPrimary ? (
                    <td rowSpan={primaryRowSpan} className="sr-label sr-sticky-col-1 align-top" title={row.primary}>
                      {row.primary}
                    </td>
                  ) : null}
                  <td className="sr-sticky-col-2 align-top" title={row.secondary}>{row.secondary}</td>
                  {displayMonths.map((month) => {
                    const value = row.values[month.key] || 0;
                    const isClickable = onCellClick && value > 0;
                    const heatCls = heatClass(value, maxValue);
                    return (
                      <td
                        key={`${row.id}-${month.key}`}
                        className={`sr-num ${heatCls} ${isClickable ? 'sr-cell-click cursor-pointer' : ''}`}
                        onClick={() => isClickable && onCellClick(month.key, row.primary, row.secondary || '')}
                        role={isClickable ? 'button' : undefined}
                        tabIndex={isClickable ? 0 : undefined}
                        onKeyDown={(e) => {
                          if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            onCellClick(month.key, row.primary, row.secondary || '');
                          }
                        }}
                        title={`${row.primary} / ${row.secondary} – ${month.label} ${month.year}: ${value} records`}
                      >
                        {value > 0 ? <span className="sr-cell-value">{value}</span> : <span className="text-[color:var(--sr-text-3)]">–</span>}
                      </td>
                    );
                  })}
                  <td className={`sr-num font-semibold ${rightTotal}`}>{row.total > 0 ? row.total.toLocaleString() : <span className="text-[color:var(--sr-text-3)]">–</span>}</td>
                  <td className={`sr-center ${rightPrev}`}>
                    <TrendBadge trend={trend} positiveTrend="auto" rowLabel={row.secondary} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="sr-label-foot sr-sticky-col-1">Grand total</td>
              <td className="sr-label-foot sr-sticky-col-2"></td>
              {displayMonths.map((month) => (
                <td key={month.key}>{monthTotals[month.key] ? monthTotals[month.key].toLocaleString() : '–'}</td>
              ))}
              <td className={rightTotal}>{grandTotal.toLocaleString()}</td>
              <td className={rightPrev}></td>
            </tr>
          </tfoot>
        </table>
      )}
    </TableShell>
  );
}
