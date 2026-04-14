'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, ExternalLink, Loader2, QrCode, X } from 'lucide-react';
import type { Report } from '@/types';
import { SummarySectionCard } from './summary/SummarySectionCard';
import { SummaryDenseTable, type SummaryDenseColumn } from './summary/SummaryDenseTable';
import { normalizeText } from './summary/summary-utils';
import {
  ChartCard,
  HeatmapTableCard,
  CustomTooltip,
  WrappedYAxisTick,
  ResponsiveContainer,
  heatColor,
  CategoryBarList,
  renderPieLabel,
  PIE_LABEL_LINE_PROPS,
} from './shared/chart-ui';
import { useExternalLinks } from '@/lib/hooks/useExternalLinks';
import { getLinkUrl } from '@/lib/external-links';

interface JoumpaServiceTabProps {
  allReports: Report[];
  reports: Report[];
}

interface JoumpaRecord {
  timestamp: string;
  email: string;
  date: string;
  airlines: string;
  flightNumber: string;
  branch: string;
  serviceType: string;
  category: string;
  evidence: string;
  report: string;
  reportBy: string;
  reportType: string;
  satisfactionRating: string;
  averageRating: string;
}

interface MetricRow {
  id: string;
  label: string;
  value: number;
}

interface PieSlice {
  name: string;
  value: number;
  fill: string;
}

interface MatrixRow {
  id: string;
  primary: string;
  secondary?: string;
  values: Record<string, number>;
  total: number;
}

interface MatrixData {
  columns: string[];
  rows: MatrixRow[];
  columnTotals: Record<string, number>;
  grandTotal: number;
  maxValue: number;
}

interface BreakdownTableRow {
  id: string;
  serviceType: string;
  branch: string;
  airline: string;
  values: Record<string, number>;
  total: number;
}

interface RootCauseDetailRow {
  id: string;
  branch: string;
  airline: string;
  category: string;
  area: string;
  issueCaused: string;
  rootCaused: string;
  total: number;
}

interface VoiceDetailRow {
  id: string;
  date: string;
  rawDate: number;
  reportType: string;
  category: string;
  branch: string;
  airline: string;
  flight: string;
  serviceType: string;
  report: string;
  categoryReport: string;
  rating: string;
  satisfaction: string;
}

interface VoiceTypeRow {
  id: string;
  label: string;
  value: number;
}

const CHART_COLORS = {
  emerald: 'oklch(0.65 0.18 160)',
  teal: 'oklch(0.55 0.14 240)',
  amber: 'oklch(0.8 0.15 80)',
  orange: 'oklch(0.6 0.2 25)',
  rose: 'oklch(0.7 0.2 330)',
  indigo: 'oklch(0.75 0.1 190)',
};

const SATISFACTION_LABELS: Record<string, string> = {
  '5': 'Sangat Baik',
  '4': 'Baik',
  '3': 'Cukup',
  '2': 'Kurang',
  '1': 'Sangat Kurang',
};

function isExactJoumpaService(report: Report) {
  return normalizeLower(report.service_business_type) === 'joumpa service';
}

function hasLegacyJoumpaSignal(report: Report) {
  const remarksCase = normalizeLower(report.remarks_case);
  const classification = normalizeLower(report.case_classification);
  const root = normalizeLower(report.identification_of_root);
  return (
    remarksCase.includes('joumpa') ||
    classification.includes('joumpa') ||
    root.includes('joumpa') ||
    remarksCase === 'compliment best of service'
  );
}

function isJoumpaSourceReport(report: Report) {
  if (report.service_business_type) return isExactJoumpaService(report);
  return hasLegacyJoumpaSignal(report);
}

function normalize(value: unknown) {
  return String(value || '').trim();
}

function normalizeLower(value: unknown) {
  return normalize(value).toLowerCase();
}

function parseCalendarDate(value?: string) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

function formatDateLabel(value?: string) {
  const parsed = parseCalendarDate(value);
  if (!parsed) return normalizeText(value, '-');
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString('en-US', { month: 'long' });
}

function buildCountRows<T>(items: T[], getKey: (item: T) => string, preferredOrder?: string[]): MetricRow[] {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const key = normalize(getKey(item));
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  if (preferredOrder?.length) {
    return preferredOrder
      .map((label) => ({ id: label, label, value: counts.get(label) || 0 }))
      .filter((row) => row.value > 0);
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({ id: label, label, value }))
    .sort((left, right) => (right.value === left.value ? left.label.localeCompare(right.label) : right.value - left.value));
}

function buildMonthlyRows<T>(items: T[], getDate: (item: T) => string | undefined) {
  const counts = new Map<string, { label: string; value: number; order: number }>();

  items.forEach((item) => {
    const parsed = parseCalendarDate(getDate(item));
    if (!parsed) return;

    const key = monthKey(parsed);
    const label = monthLabel(parsed);
    const existing = counts.get(key);

    counts.set(key, {
      label,
      value: (existing?.value || 0) + 1,
      order: parsed.getFullYear() * 100 + parsed.getMonth(),
    });
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1].order - left[1].order)
    .map(([id, row]) => ({ id, label: row.label, value: row.value }));
}

function buildPieSlices<T>(
  items: T[],
  getKey: (item: T) => string,
  palette: string[]
) {
  const counts = buildCountRows(items, getKey);
  return counts.map((row, index) => ({
    name: row.label,
    value: row.value,
    fill: palette[index % palette.length],
  }));
}

function buildMatrixData<T>(
  items: T[],
  getRowKeys: (item: T) => { primary: string; secondary?: string },
  getColumnKey: (item: T) => string,
  preferredColumns?: string[]
) {
  const rowMap = new Map<string, MatrixRow>();
  const columnSet = new Set<string>();
  const columnTotals: Record<string, number> = {};

  items.forEach((item) => {
    const rowKeys = getRowKeys(item);
    const primary = normalizeText(rowKeys.primary, '-');
    const secondary = rowKeys.secondary ? normalizeText(rowKeys.secondary, '-') : undefined;
    const column = normalize(getColumnKey(item));
    if (!column) return;

    const id = secondary ? `${primary}::${secondary}` : primary;
    const existing = rowMap.get(id) || {
      id,
      primary,
      secondary,
      values: {},
      total: 0,
    };

    existing.values[column] = (existing.values[column] || 0) + 1;
    existing.total += 1;
    rowMap.set(id, existing);

    columnSet.add(column);
    columnTotals[column] = (columnTotals[column] || 0) + 1;
  });

  const detectedColumns = Array.from(columnSet);
  const columns = preferredColumns?.length
    ? preferredColumns.filter((column) => columnSet.has(column))
    : detectedColumns.sort((left, right) => (columnTotals[right] || 0) - (columnTotals[left] || 0) || left.localeCompare(right));

  const rows = Array.from(rowMap.values()).sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total;
    return `${left.primary} ${left.secondary || ''}`.localeCompare(`${right.primary} ${right.secondary || ''}`);
  });

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const maxValue = Math.max(0, ...rows.flatMap((row) => columns.map((column) => row.values[column] || 0)));

  return { columns, rows, columnTotals, grandTotal, maxValue };
}

function metricColumns<T extends { label: string; value: number }>(
  valueHeader = 'Total \u25BC',
  labelHeader = 'Category'
): SummaryDenseColumn<T>[] {
  return [
    {
      id: 'label',
      header: labelHeader,
      accessor: (row) => row.label,
      sortValue: (row) => row.label.toLowerCase(),
      minWidth: '220px',
    },
    {
      id: 'value',
      header: valueHeader,
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <span className="min-w-[1.5rem] font-mono text-[0.8rem] font-bold text-[var(--text-primary)]">
            {row.value}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--brand-emerald-500)]"
              style={{ width: `${Math.min(100, row.value ? row.value * 14 : 0)}%` }}
            />
          </div>
        </div>
      ),
      sortValue: (row) => row.value,
      minWidth: '200px',
    },
  ];
}

function renderStackedBarLabel(category: string) {
  const StackedBarLabel = (props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    value?: number | string;
  }) => {
    const { x = 0, y = 0, width = 0, height = 0, value } = props;
    const numericValue = Number(value || 0);

    if (!numericValue || width < 22 || height < 14) return null;

    const compactLabel = category.length > 10 ? `${category.slice(0, 10)}\u2026` : category;
    const showTextAndValue = width >= 120;
    const label = showTextAndValue ? `${compactLabel} ${numericValue}` : `${numericValue}`;
    const textX = showTextAndValue ? x + 10 : x + width / 2;
    const textAnchor = showTextAndValue ? 'start' : 'middle';

    return (
      <text
        x={textX}
        y={y + height / 2}
        fill="white"
        textAnchor={textAnchor}
        dominantBaseline="middle"
        style={{ fontSize: 10, fontWeight: 800, pointerEvents: 'none' }}
      >
        {label}
      </text>
    );
  };
  StackedBarLabel.displayName = `StackedBarLabel(${category})`;
  return StackedBarLabel;
}

function EmptyPanel({ message = 'No data available for the current filter.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
    </div>
  );
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)] mb-3" />
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertCircle className="h-5 w-5 text-red-500 mb-3" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}

export function JoumpaServiceTab({ allReports, reports }: JoumpaServiceTabProps) {
  const externalLinks = useExternalLinks();
  const joumpaLookerUrl = getLinkUrl(externalLinks, 'joumpa-dashboard');
  const joumpaLookerQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(joumpaLookerUrl)}`;

  const activeReportIds = useMemo(() => new Set(reports.map((report) => report.id)), [reports]);
  const activeMainReports = useMemo(
    () => allReports.filter((report) => activeReportIds.has(report.id)),
    [activeReportIds, allReports]
  );
  const scopedMainReports = useMemo(
    () => activeMainReports.filter((report) => isJoumpaSourceReport(report)),
    [activeMainReports]
  );

  const [voiceRecords, setVoiceRecords] = useState<JoumpaRecord[]>([]);
  const [voiceLoading, setVoiceLoading] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showLookerModal, setShowLookerModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadVoiceData() {
      setVoiceLoading(true);
      setVoiceError(null);

      try {
        const response = await fetch('/api/joumpa', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load Joumpa dataset (${response.status})`);
        }

        const payload = await response.json();
        if (!isMounted) return;
        setVoiceRecords(Array.isArray(payload.records) ? payload.records : []);
      } catch (error) {
        if (!isMounted) return;
        setVoiceError(error instanceof Error ? error.message : 'Failed to load Joumpa dataset');
      } finally {
        if (isMounted) setVoiceLoading(false);
      }
    }

    loadVoiceData();
    return () => {
      isMounted = false;
    };
  }, []);

  const operationalReports = useMemo(() => (
    scopedMainReports.filter((report) => {
      const category = normalizeLower(report.category);
      const serviceType = normalizeLower(report.service_business_type);
      return (
        category !== 'compliment' &&
        serviceType !== 'general operational service' &&
        serviceType !== 'gse service performance'
      );
    })
  ), [scopedMainReports]);

  const complimentReports = useMemo(() => (
    activeMainReports.filter((report) => {
      const category = normalizeLower(report.category);
      return category !== 'complaint' && category !== 'irregularity';
    })
  ), [activeMainReports]);

  const operationalMonthly = useMemo(
    () => buildMonthlyRows(operationalReports, (report) => report.date_of_event || report.created_at),
    [operationalReports]
  );

  const operationalRemarks = useMemo(
    () => buildCountRows(operationalReports, (report) => normalizeText(report.remarks_case, '-')),
    [operationalReports]
  );

  const operationalDistribution = useMemo(
    () => buildPieSlices(operationalReports, (report) => normalizeText(report.accident_incident, 'Unknown'), [
      CHART_COLORS.teal,
      CHART_COLORS.emerald,
      CHART_COLORS.amber,
      CHART_COLORS.orange,
    ]),
    [operationalReports]
  );

  const operationalAirlineMatrix = useMemo(
    () => buildMatrixData(
      operationalReports,
      (report) => ({
        primary: normalizeText(report.stations?.code || report.branch, '-').toUpperCase(),
        secondary: normalizeText(report.airlines || report.airline, '-'),
      }),
      (report) => normalizeText(report.remarks_case, '-')
    ),
    [operationalReports]
  );

  const complimentRemarks = useMemo(
    () => buildCountRows(
      complimentReports.filter((report) => {
        const remarks = normalize(report.remarks_case);
        const lowered = remarks.toLowerCase();
        return remarks.length > 0 && lowered !== 'compliment' && lowered !== '-';
      }),
      (report) => normalizeText(report.remarks_case, '-')
    ),
    [complimentReports]
  );

  const complimentRoots = useMemo(
    () => buildCountRows(
      complimentReports.filter((report) => normalize(report.identification_of_root).length > 0),
      (report) => normalizeText(report.identification_of_root, '-')
    ),
    [complimentReports]
  );

  const complimentRootDetails = useMemo<RootCauseDetailRow[]>(() => {
    const counts = new Map<string, RootCauseDetailRow>();

    complimentReports.forEach((report) => {
      const rawIssueCaused = normalize(report.remarks_case);
      const rawRootCaused = normalize(report.identification_of_root);
      if (!rawIssueCaused || !rawRootCaused) return;

      const branch = normalizeText(report.stations?.code || report.branch, '-').toUpperCase();
      const airline = normalizeText(report.airlines || report.airline, '-');
      const category = normalizeText(report.category, '-');
      const area = normalizeText(report.area, '-');
      const issueCaused = rawIssueCaused;
      const rootCaused = rawRootCaused;
      const id = [branch, airline, category, area, issueCaused, rootCaused].join('::');

      const existing = counts.get(id) || {
        id,
        branch,
        airline,
        category,
        area,
        issueCaused,
        rootCaused,
        total: 0,
      };
      existing.total += 1;
      counts.set(id, existing);
    });

    return Array.from(counts.values()).sort((left, right) => {
      if (right.total !== left.total) return right.total - left.total;
      return left.rootCaused.localeCompare(right.rootCaused);
    });
  }, [complimentReports]);

  const filteredVoiceRecords = useMemo(
    () => voiceRecords.filter((record) => (
      normalize(record.reportType).length > 0 &&
      normalize(record.serviceType).length > 0 &&
      normalize(record.category).length > 0
    )),
    [voiceRecords]
  );

  const voiceMonthly = useMemo(
    () => buildMonthlyRows(filteredVoiceRecords, (record) => record.date || record.timestamp),
    [filteredVoiceRecords]
  );

  const voiceReportTypes = useMemo(
    () => buildCountRows(filteredVoiceRecords, (record) => normalizeText(record.reportType, '-')),
    [filteredVoiceRecords]
  );

  const voiceServiceTypeRows = useMemo<VoiceTypeRow[]>(
    () => buildCountRows(filteredVoiceRecords, (record) => normalizeText(record.serviceType, '-')),
    [filteredVoiceRecords]
  );

  const voiceCategoryDistribution = useMemo(
    () => buildPieSlices(
      filteredVoiceRecords,
      (record) => normalizeText(record.category, '-'),
      [CHART_COLORS.emerald, CHART_COLORS.teal, CHART_COLORS.amber, CHART_COLORS.orange]
    ),
    [filteredVoiceRecords]
  );

  const voiceBreakdownMatrix = useMemo(
    () => buildMatrixData(
      filteredVoiceRecords,
      (record) => ({
        primary: normalizeText(record.serviceType, '-'),
        secondary: `${normalizeText(record.branch, '-').toUpperCase()} / ${normalizeText(record.airlines, '-')}`,
      }),
      (record) => normalizeText(record.category, '-')
    ),
    [filteredVoiceRecords]
  );

  const voiceServiceTypeCategory = useMemo(() => {
    const rowMap = new Map<string, Record<string, number>>();
    const categories = new Set<string>();

    filteredVoiceRecords.forEach((record) => {
      const serviceType = normalizeText(record.serviceType, '-');
      const category = normalizeText(record.category, '-');
      const row = rowMap.get(serviceType) || {};
      row[category] = (row[category] || 0) + 1;
      rowMap.set(serviceType, row);
      categories.add(category);
    });

    const sortedCategories = Array.from(categories).sort();
    const rows = Array.from(rowMap.entries())
      .map(([serviceType, values]) => ({
        serviceType,
        total: sortedCategories.reduce((sum, category) => sum + (values[category] || 0), 0),
        ...values,
      }))
      .sort((left, right) => right.total - left.total);

    return { rows, categories: sortedCategories };
  }, [filteredVoiceRecords]);

  const voiceDetails = useMemo<VoiceDetailRow[]>(() => {
    return filteredVoiceRecords
      .map((record, index) => {
        const parsed = parseCalendarDate(record.date || record.timestamp);
        const rating = normalizeText(record.averageRating, normalizeText(record.satisfactionRating, '-'));
        return {
          id: `${record.timestamp}-${record.email}-${index}`,
          date: formatDateLabel(record.date || record.timestamp),
          rawDate: parsed?.getTime() || 0,
          reportType: normalizeText(record.reportType, '-'),
          category: normalizeText(record.category, '-'),
          branch: normalizeText(record.branch, '-').toUpperCase(),
          airline: normalizeText(record.airlines, '-'),
          flight: normalizeText(record.flightNumber, '-'),
          serviceType: normalizeText(record.serviceType, '-'),
          report: normalizeText(record.report, '-'),
          categoryReport: normalizeText(record.category, '-'),
          rating,
          satisfaction: SATISFACTION_LABELS[rating] || SATISFACTION_LABELS[normalize(record.satisfactionRating)] || '-',
        };
      })
      .sort((left, right) => right.rawDate - left.rawDate);
  }, [filteredVoiceRecords]);

  const complimentRootColumns = useMemo<SummaryDenseColumn<RootCauseDetailRow>[]>(() => [
    { id: 'branch', header: 'Branch', accessor: (row) => row.branch, sortValue: (row) => row.branch, minWidth: '90px' },
    { id: 'airline', header: 'Airlines', accessor: (row) => row.airline, sortValue: (row) => row.airline, minWidth: '150px' },
    { id: 'category', header: 'Category', accessor: (row) => row.category, sortValue: (row) => row.category, minWidth: '110px' },
    { id: 'area', header: 'Area', accessor: (row) => row.area, sortValue: (row) => row.area, minWidth: '120px' },
    { id: 'issue', header: 'Issue Caused', accessor: (row) => row.issueCaused, sortValue: (row) => row.issueCaused, minWidth: '200px' },
    { id: 'root', header: 'Root Caused', accessor: (row) => row.rootCaused, sortValue: (row) => row.rootCaused, minWidth: '240px' },
    { id: 'total', header: 'Total \u25BC', accessor: (row) => row.total, sortValue: (row) => row.total, align: 'right', minWidth: '80px' },
  ], []);

  const voiceDetailColumns = useMemo<SummaryDenseColumn<VoiceDetailRow>[]>(() => [
    { id: 'date', header: 'Date of Event', accessor: (row) => row.date, sortValue: (row) => row.rawDate, minWidth: '120px' },
    { id: 'type', header: 'Report Type', accessor: (row) => row.reportType, sortValue: (row) => row.reportType, minWidth: '120px' },
    { id: 'category', header: 'Category', accessor: (row) => row.category, sortValue: (row) => row.category, minWidth: '110px' },
    { id: 'branch', header: 'Branch', accessor: (row) => row.branch, sortValue: (row) => row.branch, minWidth: '90px' },
    { id: 'airline', header: 'Airlines', accessor: (row) => row.airline, sortValue: (row) => row.airline, minWidth: '150px' },
    { id: 'flight', header: 'Flight', accessor: (row) => row.flight, sortValue: (row) => row.flight, minWidth: '110px' },
    { id: 'service', header: 'Joumpa Service Type', accessor: (row) => <div className="max-w-[14rem] whitespace-normal">{row.serviceType}</div>, sortValue: (row) => row.serviceType, minWidth: '220px' },
    { id: 'report', header: 'Report', accessor: (row) => <div className="max-w-[20rem] whitespace-normal line-clamp-3">{row.report}</div>, sortValue: (row) => row.report, minWidth: '320px' },
    { id: 'categoryReport', header: 'Category Report', accessor: (row) => row.categoryReport, sortValue: (row) => row.categoryReport, minWidth: '140px' },
    { id: 'rating', header: 'Rating', accessor: (row) => row.rating, sortValue: (row) => row.rating, align: 'center', minWidth: '80px' },
    { id: 'satisfaction', header: 'Satisfaction', accessor: (row) => row.satisfaction, sortValue: (row) => row.satisfaction, minWidth: '120px' },
  ], []);

  // ── Matrix max helpers for heatmap coloring ──────────────────────────────────
  const operationalAirlineMaxTotal = useMemo(
    () => Math.max(...operationalAirlineMatrix.rows.map((r) => r.total), 1),
    [operationalAirlineMatrix]
  );

  const voiceBreakdownMaxTotal = useMemo(
    () => Math.max(...voiceBreakdownMatrix.rows.map((r) => r.total), 1),
    [voiceBreakdownMatrix]
  );

  const voiceBreakdownRows = useMemo(() => {
    if (!voiceBreakdownMatrix.rows.length) return [];
    return voiceBreakdownMatrix.rows.map((row) => {
      const [branch = '-', airline = '-'] = String(row.secondary || '').split(' / ');
      return {
        id: row.id,
        serviceType: row.primary,
        branch,
        airline,
        values: row.values,
        total: row.total,
      } as BreakdownTableRow;
    });
  }, [voiceBreakdownMatrix]);

  return (
    <div className="space-y-8 pb-10">

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 — Operational Feedback Report
          ═══════════════════════════════════════════════════════════════════ */}
      <SummarySectionCard
        title="Operational Feedback Report"
        subtitle="Rekap laporan operasional bersumber dari staf internal maupun eksternal serta laporan operasional airline sebagai customer."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {/* Total Report per Month — Bar Chart */}
          <ChartCard title="Total Report per Month" accent="oklch(0.65 0.18 160)">
            {operationalMonthly.length === 0 ? (
              <EmptyPanel />
            ) : (
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                <div style={{ height: Math.max(200, operationalMonthly.length * 50) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={operationalMonthly} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                      <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Count" fill={CHART_COLORS.emerald} radius={[0, 4, 4, 0]} maxBarSize={28}>
                        <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </ChartCard>

          {/* Report by Category — Bar Chart */}
          <ChartCard title="Report by Category" accent="oklch(0.55 0.14 240)">
            {operationalRemarks.length === 0 ? (
              <EmptyPanel />
            ) : (
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                <div style={{ height: Math.max(200, operationalRemarks.length * 50) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={operationalRemarks} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                      <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Count" fill={CHART_COLORS.teal} radius={[0, 4, 4, 0]} maxBarSize={28}>
                        <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </ChartCard>

          {/* Category Distribution of Report — Pie Chart */}
          <ChartCard title="Category Distribution of Report" accent="oklch(0.7 0.2 330)">
            {operationalDistribution.length === 0 ? (
              <EmptyPanel />
            ) : (
              <>
                <div className="h-[220px] sm:h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={operationalDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} strokeWidth={0} paddingAngle={2} label={renderPieLabel} labelLine={PIE_LABEL_LINE_PROPS}>
                        {operationalDistribution.map((e) => <Cell key={e.name} fill={e.fill} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 mt-4">
                  {operationalDistribution.map((item) => {
                    const total = operationalDistribution.reduce((s, i) => s + i.value, 0);
                    const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={item.name} className="rounded-2xl border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/80 px-3 py-2.5">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                          <span className="min-w-0 break-words text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{item.name}</span>
                        </div>
                        <div className="mt-2 flex items-end justify-between">
                          <span className="font-mono text-lg font-black text-[var(--text-primary)]">{item.value}</span>
                          <span className="text-[0.72rem] font-semibold text-[var(--text-muted)]">{share}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </ChartCard>
        </div>

        {/* Report Category by Airlines — Heatmap Table */}
        <div className="mt-4">
          <HeatmapTableCard
            title="Report Category by Airlines"
            subtitle="Distribusi laporan berdasarkan maskapai dan jenis temuan pada operasional dalam periode pelaporan."
            accent="oklch(0.55 0.14 240)"
          >
            {operationalAirlineMatrix.rows.length === 0 ? (
              <EmptyPanel />
            ) : (
              <div className="overflow-x-auto">
                <div className="max-h-[240px] overflow-y-auto">
                  <table className="w-full text-xs min-w-[360px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-100 text-black border-b border-gray-300">
                        <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Branch</th>
                        <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Airlines</th>
                        {operationalAirlineMatrix.columns.map((column) => (
                          <th key={column} className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">{column}</th>
                        ))}
                        <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operationalAirlineMatrix.rows.map((row) => {
                        const totalColor = heatColor(row.total, operationalAirlineMaxTotal);
                        return (
                          <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-1.5 px-2 font-medium text-gray-800 whitespace-nowrap">{row.primary}</td>
                            <td className="py-1.5 px-2 text-gray-800 whitespace-nowrap">{row.secondary || '-'}</td>
                            {operationalAirlineMatrix.columns.map((column) => {
                              const value = row.values[column] || 0;
                              const color = heatColor(value, operationalAirlineMatrix.maxValue);
                              return (
                                <td
                                  key={`${row.id}-${column}`}
                                  className="py-1.5 px-2 text-center font-medium"
                                  style={{ backgroundColor: color.bg, color: color.fg }}
                                >
                                  {value || '-'}
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-2 text-center font-bold" style={{ backgroundColor: totalColor.bg, color: totalColor.fg }}>{row.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <table className="w-full text-xs min-w-[360px] border-t-2 border-gray-300">
                  <tbody>
                    <tr className="bg-gray-100 font-bold">
                      <td className="py-1.5 px-2 text-gray-800" colSpan={2}>Grand total</td>
                      {operationalAirlineMatrix.columns.map((column) => (
                        <td key={`total-${column}`} className="py-1.5 px-2 text-center text-gray-800">
                          {operationalAirlineMatrix.columnTotals[column] || 0}
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-center text-gray-800">{operationalAirlineMatrix.grandTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </HeatmapTableCard>
        </div>
      </SummarySectionCard>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 — Compliment From Operational Feedback Report
          ═══════════════════════════════════════════════════════════════════ */}
      <SummarySectionCard
        title="Compliment From Operational Feedback Report"
        subtitle="Apresiasi terhadap kualitas pelaksanaan prosedur operasional dan efektivitas service handling sebagai dasar identifikasi elemen kinerja yang perlu dipertahankan"
      >
        <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
          {/* Report by Category — Bar Chart */}
          <ChartCard title="Report by Category" accent="oklch(0.65 0.18 160)">
            {complimentRemarks.length === 0 ? (
              <EmptyPanel />
            ) : (
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                <div style={{ height: Math.max(200, complimentRemarks.length * 50) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={complimentRemarks} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                      <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Count" fill={CHART_COLORS.emerald} radius={[0, 4, 4, 0]} maxBarSize={28}>
                        <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </ChartCard>

          {/* Landside Area — CategoryBarList */}
          <ChartCard title="Landside Area" accent="oklch(0.8 0.15 80)">
            <CategoryBarList
              data={complimentRoots.map((d) => ({ name: d.label, value: d.value }))}
              color="oklch(0.8 0.15 80)"
            />
          </ChartCard>
        </div>

        {/* Landside Area Detail — SummaryDenseTable */}
        <div className="mt-4">
          <HeatmapTableCard
            title="Landside Area - Detail Root Cause Identification"
            accent="oklch(0.8 0.15 80)"
          >
            <SummaryDenseTable
              data={complimentRootDetails}
              columns={complimentRootColumns}
              rowKey={(row) => row.id}
              itemsPerPage={8}
              initialSort={{ columnId: 'total', direction: 'desc' }}
              emptyMessage="No compliment detail rows found."
            />
          </HeatmapTableCard>
        </div>
      </SummarySectionCard>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3 — Voice of Passenger Report
          ═══════════════════════════════════════════════════════════════════ */}
      <SummarySectionCard
        title="Voice of Passenger Report"
        subtitle="Rekap Laporan operasional yang disampaikan bersumber langsung dari penumpang dalam periode pelaporan."
      >
        {voiceLoading ? (
          <LoadingPanel message="Loading Joumpa voice-of-passenger data..." />
        ) : voiceError ? (
          <ErrorPanel message={voiceError} />
        ) : (
          <>
            {/* Monthly + Report Type — Bar Charts */}
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard title="Total Report per Month" accent="oklch(0.65 0.18 160)">
                {voiceMonthly.length === 0 ? (
                  <EmptyPanel />
                ) : (
                  <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                    <div style={{ height: Math.max(200, voiceMonthly.length * 50) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={voiceMonthly} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                          <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" name="Count" fill={CHART_COLORS.emerald} radius={[0, 4, 4, 0]} maxBarSize={28}>
                            <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Total Report by Report Type" accent="oklch(0.55 0.14 240)">
                {voiceReportTypes.length === 0 ? (
                  <EmptyPanel />
                ) : (
                  <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                    <div style={{ height: Math.max(200, voiceReportTypes.length * 50) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={voiceReportTypes} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                          <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" name="Count" fill={CHART_COLORS.teal} radius={[0, 4, 4, 0]} maxBarSize={28}>
                            <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Breakdown of Identified Causes — Heatmap Table */}
            <div className="mt-4">
              <HeatmapTableCard
                title="Breakdown of Identified Causes"
                subtitle="Rows follow Joumpa service type with branch and airline context; columns show category report counts."
                accent="oklch(0.6 0.2 25)"
              >
                {voiceBreakdownRows.length === 0 ? (
                  <EmptyPanel />
                ) : (
                  <div className="overflow-x-auto">
                    <div className="max-h-[240px] overflow-y-auto">
                      <table className="w-full text-xs min-w-[360px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-100 text-black border-b border-gray-300">
                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Joumpa Service Type</th>
                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Branch</th>
                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Airlines</th>
                            {voiceBreakdownMatrix.columns.map((column) => (
                              <th key={column} className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">{column}</th>
                            ))}
                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Grand total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {voiceBreakdownRows.map((row, index) => {
                            const previous = voiceBreakdownRows[index - 1];
                            const showServiceType = !previous || previous.serviceType !== row.serviceType;
                            const showBranch = showServiceType || previous.branch !== row.branch;
                            const totalColor = heatColor(row.total, voiceBreakdownMaxTotal);
                            return (
                              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-1.5 px-2 font-medium text-gray-800 whitespace-nowrap">
                                  {showServiceType ? row.serviceType : ''}
                                </td>
                                <td className="py-1.5 px-2 text-gray-800 whitespace-nowrap">
                                  {showBranch ? row.branch : ''}
                                </td>
                                <td className="py-1.5 px-2 text-gray-800 whitespace-nowrap">{row.airline}</td>
                                {voiceBreakdownMatrix.columns.map((column) => {
                                  const value = row.values[column] || 0;
                                  const color = heatColor(value, voiceBreakdownMatrix.maxValue);
                                  return (
                                    <td
                                      key={`${row.id}-${column}`}
                                      className="py-1.5 px-2 text-center font-medium"
                                      style={{ backgroundColor: color.bg, color: color.fg }}
                                    >
                                      {value || '-'}
                                    </td>
                                  );
                                })}
                                <td className="py-1.5 px-2 text-center font-bold" style={{ backgroundColor: totalColor.bg, color: totalColor.fg }}>{row.total}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <table className="w-full text-xs min-w-[360px] border-t-2 border-gray-300">
                      <tbody>
                        <tr className="bg-gray-100 font-bold">
                          <td className="py-1.5 px-2 text-gray-800" colSpan={3}>Grand total</td>
                          {voiceBreakdownMatrix.columns.map((column) => (
                            <td key={`grand-${column}`} className="py-1.5 px-2 text-center text-gray-800">
                              {voiceBreakdownMatrix.columnTotals[column] || 0}
                            </td>
                          ))}
                          <td className="py-1.5 px-2 text-center text-gray-800">{voiceBreakdownMatrix.grandTotal}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </HeatmapTableCard>
            </div>

            {/* Service Type + Category Distribution */}
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {/* Report by Service Type — CategoryBarList */}
              <ChartCard title="Report by Service Type" accent="oklch(0.65 0.18 160)">
                <CategoryBarList
                  data={voiceServiceTypeRows.map((d) => ({ name: d.label, value: d.value }))}
                  color="oklch(0.65 0.18 160)"
                />
              </ChartCard>

              {/* Category Distribution of Report — Pie Chart */}
              <ChartCard title="Category Distribution of Report" accent="oklch(0.7 0.2 330)">
                {voiceCategoryDistribution.length === 0 ? (
                  <EmptyPanel />
                ) : (
                  <>
                    <div className="h-[220px] sm:h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={voiceCategoryDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} strokeWidth={0} paddingAngle={2} label={renderPieLabel} labelLine={PIE_LABEL_LINE_PROPS}>
                            {voiceCategoryDistribution.map((e) => <Cell key={e.name} fill={e.fill} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 mt-4">
                      {voiceCategoryDistribution.map((item) => {
                        const total = voiceCategoryDistribution.reduce((s, i) => s + i.value, 0);
                        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        return (
                          <div key={item.name} className="rounded-2xl border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/80 px-3 py-2.5">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                              <span className="min-w-0 break-words text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{item.name}</span>
                            </div>
                            <div className="mt-2 flex items-end justify-between">
                              <span className="font-mono text-lg font-black text-[var(--text-primary)]">{item.value}</span>
                              <span className="text-[0.72rem] font-semibold text-[var(--text-muted)]">{share}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </ChartCard>
            </div>

            {/* Service Type Report by Category — Stacked Bar Chart */}
            <div className="mt-4">
              <ChartCard title="Service Type Report by Category" accent="oklch(0.75 0.1 190)">
                {voiceServiceTypeCategory.rows.length === 0 ? (
                  <EmptyPanel />
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                      <div style={{ height: Math.max(200, voiceServiceTypeCategory.rows.length * 50) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={voiceServiceTypeCategory.rows}
                            layout="vertical"
                            margin={{ top: 4, right: 40, left: 40, bottom: 4 }}
                            barCategoryGap="30%"
                          >
                            <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="serviceType" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={130} interval={0} />
                            <Tooltip content={<CustomTooltip />} />
                            {voiceServiceTypeCategory.categories.map((category, index) => (
                              <Bar
                                key={category}
                                dataKey={category}
                                stackId="voice"
                                fill={[CHART_COLORS.emerald, CHART_COLORS.teal, CHART_COLORS.amber, CHART_COLORS.orange, CHART_COLORS.rose][index % 5]}
                                radius={index === voiceServiceTypeCategory.categories.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                                maxBarSize={28}
                              >
                                <LabelList content={renderStackedBarLabel(category)} />
                              </Bar>
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
                      {voiceServiceTypeCategory.categories.map((category, index) => (
                        <div key={category} className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: [CHART_COLORS.emerald, CHART_COLORS.teal, CHART_COLORS.amber, CHART_COLORS.orange, CHART_COLORS.rose][index % 5] }}
                          />
                          <span>{category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Detail Report */}
            <div className="mt-4">
              <HeatmapTableCard
                title="Detail Report"
                subtitle="Arsip laporan detail voice of passenger Joumpa Service, diurutkan berdasarkan tanggal terbaru."
                accent="oklch(0.55 0.14 240)"
              >
                <SummaryDenseTable
                  data={voiceDetails}
                  columns={voiceDetailColumns}
                  rowKey={(row) => row.id}
                  itemsPerPage={7}
                  initialSort={{ columnId: 'date', direction: 'desc' }}
                  emptyMessage="No Joumpa detail rows found."
                />
              </HeatmapTableCard>
            </div>

            {/* Looker Dashboard Link */}
            <div className="mt-4">
              <ChartCard
                title="Lihat versi dashboard Looker"
                subtitle="Buka versi dashboard Looker Studio untuk tampilan eksternal dan akses cepat via QR code."
                accent="oklch(0.55 0.14 240)"
              >
                <div className="flex flex-col gap-4 rounded-[24px] border border-[oklch(0.88_0.01_90_/_0.85)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm leading-6 text-[var(--text-secondary)]">
                      Scan QR code atau buka link dashboard Looker Studio untuk melihat versi presentasi Joumpa Service.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowLookerModal(true)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[var(--text-primary)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    >
                      <QrCode size={18} />
                      <span>Tampilkan QR & Link</span>
                    </button>
                  </div>

                  <a
                    href={joumpaLookerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--surface-4)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-2)]"
                  >
                    <ExternalLink size={18} />
                    <span>Buka Looker</span>
                  </a>
                </div>
              </ChartCard>
            </div>
          </>
        )}
      </SummarySectionCard>

      {/* Looker QR Modal */}
      {showLookerModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] border border-[oklch(0.88_0.01_90_/_0.85)] bg-white p-6 shadow-[0_32px_80px_-28px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--text-primary)]">
                  Versi Dashboard Looker
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Scan QR code di bawah ini atau buka langsung dashboard Looker Studio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLookerModal(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                aria-label="Tutup popup Looker"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex justify-center">
              <div className="rounded-[28px] border border-[var(--surface-4)] bg-white p-4 shadow-sm">
                <img
                  src={joumpaLookerQrUrl}
                  alt="QR code dashboard Looker Joumpa Service"
                  className="h-64 w-64 rounded-2xl"
                />
              </div>
            </div>

            <a
              href={joumpaLookerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-between gap-3 rounded-[22px] border border-[var(--surface-4)] bg-[var(--surface-1)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-2)]"
            >
              <span className="truncate">{joumpaLookerUrl}</span>
              <ExternalLink size={18} className="shrink-0" />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
