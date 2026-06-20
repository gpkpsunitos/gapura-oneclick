import fs from 'fs';
import path from 'path';

// I will write the component into JoumpaServiceTab.tsx

const content = `'use client';

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
import { useDrilldown } from '@/components/chart-detail/useDrilldown';
import { useVoiceDrilldown } from '@/components/chart-detail/useVoiceDrilldown';

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
  evidence_urls?: string[];
  report: string;
  reportBy: string;
  reportType: string;
  satisfactionRating: string;
  averageRating: string;
  [key: string]: unknown;
}

interface MetricRow {
  id: string;
  label: string;
  value: number;
}

interface MatrixRow {
  id: string;
  primary: string;
  secondary?: string;
  values: Record<string, number>;
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

const CHART_COLORS = {
  emerald: 'oklch(0.65 0.18 160)',
  teal: 'oklch(0.55 0.14 240)',
  amber: 'oklch(0.8 0.15 80)',
  orange: 'oklch(0.6 0.2 25)',
  rose: 'oklch(0.7 0.2 330)',
  indigo: 'oklch(0.75 0.1 190)',
  staff: 'oklch(0.65 0.18 160)', // emerald
  customer: 'oklch(0.55 0.14 240)', // teal
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

function normalize(value: unknown) {
  return String(value || '').trim();
}

function normalizeLower(value: unknown) {
  return normalize(value).toLowerCase();
}

function parseCalendarDate(value?: string) {
  if (!value) return null;
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  if (/^\\d{1,2}\\/\\d{1,2}\\/\\d{4}$/.test(value)) {
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
  return \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}\`;
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

function buildPieSlices<T>(items: T[], getKey: (item: T) => string, palette: string[]) {
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

    const id = secondary ? \`\${primary}::\${secondary}\` : primary;
    const existing = rowMap.get(id) || { id, primary, secondary, values: {}, total: 0 };
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
    return \`\${left.primary} \${left.secondary || ''}\`.localeCompare(\`\${right.primary} \${right.secondary || ''}\`);
  });

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const maxValue = Math.max(0, ...rows.flatMap((row) => columns.map((column) => row.values[column] || 0)));

  return { columns, rows, columnTotals, grandTotal, maxValue };
}

function renderStackedBarLabel(category: string) {
  const StackedBarLabel = (props: { x?: number; y?: number; width?: number; height?: number; value?: number | string; }) => {
    const { x = 0, y = 0, width = 0, height = 0, value } = props;
    const numericValue = Number(value || 0);
    if (!numericValue || width < 22 || height < 14) return null;
    const compactLabel = category.length > 10 ? \`\${category.slice(0, 10)}\\u2026\` : category;
    const showTextAndValue = width >= 120;
    const label = showTextAndValue ? \`\${compactLabel} \${numericValue}\` : \`\${numericValue}\`;
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
  StackedBarLabel.displayName = \`StackedBarLabel(\${category})\`;
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
  const { openDrilldown, DrilldownRenderer } = useDrilldown();
  const { openDrilldown: openVoiceDrilldown, DrilldownRenderer: VoiceDrilldownRenderer } = useVoiceDrilldown();
  const externalLinks = useExternalLinks();
  const joumpaLookerUrl = getLinkUrl(externalLinks, 'joumpa-dashboard');
  const joumpaLookerQrUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=\${encodeURIComponent(joumpaLookerUrl)}\`;

  const activeReportIds = useMemo(() => new Set(reports.map((report) => report.id)), [reports]);
  const activeMainReports = useMemo(
    () => allReports.filter((report) => activeReportIds.has(report.id)),
    [activeReportIds, allReports]
  );
  const scopedMainReports = useMemo(
    () => activeMainReports.filter((report) => isExactJoumpaService(report)),
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
        if (!response.ok) throw new Error(\`Failed to load Joumpa dataset (\${response.status})\`);
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
    return () => { isMounted = false; };
  }, []);

  // SECTION 1: OPERATIONAL FEEDBACK
  const operationalReports = useMemo(() => scopedMainReports, [scopedMainReports]);

  const opMonthly = useMemo(
    () => buildMonthlyRows(operationalReports, (report) => report.date_of_event || report.created_at),
    [operationalReports]
  );

  const opCategory = useMemo(
    () => buildCountRows(operationalReports, (report) => normalizeText(report.remarks_case, '-')),
    [operationalReports]
  );

  const opDist = useMemo(
    () => buildPieSlices(operationalReports, (report) => normalizeText(report.accident_incident, 'Unknown'), [
      CHART_COLORS.teal, CHART_COLORS.emerald, CHART_COLORS.amber, CHART_COLORS.orange
    ]),
    [operationalReports]
  );

  const opStationAirlineMatrix = useMemo(
    () => buildMatrixData(
      operationalReports,
      (report) => ({
        primary: normalizeText(report.airlines || report.airline, '-'),
      }),
      (report) => normalizeText(report.stations?.code || report.branch, '-').toUpperCase()
    ),
    [operationalReports]
  );

  const opCauses = useMemo(
    () => buildCountRows(operationalReports, (report) => normalizeText(report.case_classification, '-')),
    [operationalReports]
  );

  const opRootCauses = useMemo(
    () => buildCountRows(operationalReports, (report) => normalizeText(report.identification_of_root, '-')),
    [operationalReports]
  );

  const opCauseDetails = useMemo(() => {
    return operationalReports.map((report) => ({
      id: report.id,
      classification: normalizeText(report.case_classification, '-'),
      airline: normalizeText(report.airlines || report.airline, '-'),
      category: normalizeText(report.remarks_case, '-'),
      root: normalizeText(report.identification_of_root, '-'),
      area: normalizeText(report.area, '-'),
    }));
  }, [operationalReports]);

  const opCauseCols: SummaryDenseColumn<any>[] = [
    { id: 'class', header: 'Case Classification', accessor: r => r.classification, sortValue: r => r.classification, minWidth: '180px' },
    { id: 'airline', header: 'Airlines', accessor: r => r.airline, sortValue: r => r.airline, minWidth: '120px' },
    { id: 'category', header: 'Category', accessor: r => r.category, sortValue: r => r.category, minWidth: '120px' },
    { id: 'root', header: 'Identification of Root', accessor: r => r.root, sortValue: r => r.root, minWidth: '220px' },
    { id: 'area', header: 'Area', accessor: r => r.area, sortValue: r => r.area, minWidth: '120px' },
    { id: 'details', header: 'See Detail', accessor: r => <button onClick={() => openDrilldown([operationalReports.find(x => x.id === r.id)!], 'Detail')} className="text-blue-600 hover:underline">See Detail</button>, sortValue: () => 0, minWidth: '100px' },
  ];

  // SECTION 2: COMPLIMENT FROM OPERATIONAL FEEDBACK
  const compReports = useMemo(() => operationalReports.filter(r => normalizeLower(r.category) === 'compliment'), [operationalReports]);

  const compLandside = useMemo(
    () => buildCountRows(compReports, (report) => normalizeText(report.identification_of_root, '-')),
    [compReports]
  );

  const compLandsideDetails = useMemo(() => {
    return compReports.map(r => ({
      id: r.id,
      branch: normalizeText(r.stations?.code || r.branch, '-').toUpperCase(),
      airline: normalizeText(r.airlines || r.airline, '-'),
      root: normalizeText(r.identification_of_root, '-'),
      evidence: normalizeText(r.evidence, 'null'),
    }));
  }, [compReports]);

  const compLandsideCols: SummaryDenseColumn<any>[] = [
    { id: 'branch', header: 'Branch', accessor: r => r.branch, sortValue: r => r.branch, minWidth: '80px' },
    { id: 'airline', header: 'Airlines', accessor: r => r.airline, sortValue: r => r.airline, minWidth: '120px' },
    { id: 'root', header: 'Identification of Root', accessor: r => r.root, sortValue: r => r.root, minWidth: '240px' },
    { id: 'evidence', header: 'Supporting Evidence', accessor: r => r.evidence, sortValue: r => r.evidence, minWidth: '150px' },
  ];

  // SECTION 3 & 4: VOICE OF PASSENGER
  const filteredVoice = useMemo(() => voiceRecords.filter((record) => normalize(record.reportType).length > 0 && normalize(record.serviceType).length > 0 && normalize(record.category).length > 0), [voiceRecords]);
  
  const voiceMonthlyStacked = useMemo(() => {
    const rowMap = new Map<string, { month: string, staff: number, customer: number, order: number }>();
    filteredVoice.forEach(r => {
      const parsed = parseCalendarDate(r.date || r.timestamp);
      if (!parsed) return;
      const key = monthKey(parsed);
      const label = monthLabel(parsed);
      const isStaff = normalizeLower(r.reportType).includes('staff');
      const existing = rowMap.get(key) || { month: label, staff: 0, customer: 0, order: parsed.getFullYear() * 100 + parsed.getMonth() };
      if (isStaff) existing.staff++; else existing.customer++;
      rowMap.set(key, existing);
    });
    return Array.from(rowMap.values()).sort((a,b) => b.order - a.order);
  }, [filteredVoice]);

  const voiceCategoryStacked = useMemo(() => {
    const rowMap = new Map<string, { category: string, staff: number, customer: number }>();
    filteredVoice.forEach(r => {
      const cat = normalizeText(r.category, 'Unknown');
      const isStaff = normalizeLower(r.reportType).includes('staff');
      const existing = rowMap.get(cat) || { category: cat, staff: 0, customer: 0 };
      if (isStaff) existing.staff++; else existing.customer++;
      rowMap.set(cat, existing);
    });
    return Array.from(rowMap.values()).sort((a,b) => (b.staff+b.customer) - (a.staff+a.customer));
  }, [filteredVoice]);

  const voiceSummaryMatrix = useMemo(() => {
    const rowMap = new Map<string, { type: string, service: string, comp: number, net: number, irreg: number, compl: number, total: number }>();
    filteredVoice.forEach(r => {
      const type = normalizeText(r.reportType, '-');
      const service = normalizeText(r.serviceType, '-');
      const cat = normalizeLower(r.category);
      const id = \`\${type}::\${service}\`;
      const existing = rowMap.get(id) || { type, service, comp: 0, net: 0, irreg: 0, compl: 0, total: 0 };
      if (cat.includes('compliment')) existing.comp++;
      else if (cat.includes('netral')) existing.net++;
      else if (cat.includes('irregularity')) existing.irreg++;
      else if (cat.includes('complain')) existing.compl++;
      existing.total++;
      rowMap.set(id, existing);
    });
    return Array.from(rowMap.values()).sort((a,b) => a.type.localeCompare(b.type) || a.service.localeCompare(b.service));
  }, [filteredVoice]);

  const mapVoiceDetails = (records: JoumpaRecord[]) => records.map((r, i) => ({
    id: \`\${r.timestamp}-\${i}\`,
    type: normalizeText(r.reportType, '-'),
    service: normalizeText(r.serviceType, '-'),
    category: normalizeText(r.category, '-'),
    branch: normalizeText(r.branch, '-').toUpperCase(),
    airline: normalizeText(r.airlines, '-'),
    report: normalizeText(r.report, '-'),
    raw: r
  }));

  const voiceIrregCompl = useMemo(() => mapVoiceDetails(filteredVoice.filter(r => {
    const c = normalizeLower(r.category);
    return c.includes('irregularity') || c.includes('complain');
  })), [filteredVoice]);

  const voiceCompNetral = useMemo(() => mapVoiceDetails(filteredVoice.filter(r => {
    const c = normalizeLower(r.category);
    return c.includes('compliment') || c.includes('netral');
  })), [filteredVoice]);

  const voiceDetailCols: SummaryDenseColumn<any>[] = [
    { id: 'type', header: 'Report Type', accessor: r => r.type, sortValue: r => r.type, minWidth: '100px' },
    { id: 'service', header: 'Joumpa Service Type', accessor: r => r.service, sortValue: r => r.service, minWidth: '150px' },
    { id: 'cat', header: 'Category Report', accessor: r => r.category, sortValue: r => r.category, minWidth: '100px' },
    { id: 'branch', header: 'Branch', accessor: r => r.branch, sortValue: r => r.branch, minWidth: '80px' },
    { id: 'airline', header: 'Airlines', accessor: r => r.airline, sortValue: r => r.airline, minWidth: '120px' },
    { id: 'report', header: 'Report', accessor: r => <div className="max-w-[20rem] whitespace-normal line-clamp-2">{r.report}</div>, sortValue: r => r.report, minWidth: '250px' },
    { id: 'detail', header: 'See Details', accessor: r => <button onClick={() => openVoiceDrilldown([r.raw], 'Detail')} className="text-blue-600 hover:underline">See Details</button>, sortValue: () => 0, minWidth: '100px', align: 'center' },
  ];

  return (
    <div className="space-y-8 pb-10">

      {/* SECTION 1 */}
      <SummarySectionCard
        title="OPERATIONAL FEEDBACK REPORT"
        subtitle="Rekap laporan operasional bersumber dari staf internal maupun eksternal serta laporan operasional airline sebagai customer."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <ChartCard title="Total Report per Month">
            {opMonthly.length === 0 ? <EmptyPanel /> : (
              <div className="max-h-[300px]">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={opMonthly} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={80} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill={CHART_COLORS.emerald} radius={[0, 4, 4, 0]} maxBarSize={28}>
                      <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Reportby Category">
            {opCategory.length === 0 ? <EmptyPanel /> : (
              <div className="max-h-[300px]">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={opCategory} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill={CHART_COLORS.emerald} radius={[0, 4, 4, 0]} maxBarSize={28}>
                      <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Category Distribution of Report">
            {opDist.length === 0 ? <EmptyPanel /> : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={opDist} dataKey="value" nameKey="name" innerRadius={0} outerRadius={72} strokeWidth={1} stroke="white" label={renderPieLabel} labelLine={PIE_LABEL_LINE_PROPS}>
                      {opDist.map((e) => <Cell key={e.name} fill={e.name.toLowerCase().includes('complaint') ? CHART_COLORS.teal : CHART_COLORS.amber} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,1.5fr]">
          <HeatmapTableCard title="Breakdown of Identified Causes">
            <CategoryBarList
              data={opCauses.map(d => ({ name: d.label, value: d.value }))}
              color={CHART_COLORS.emerald}
              onClick={() => {}}
            />
          </HeatmapTableCard>

          <HeatmapTableCard title="Root Cause Identification">
            <CategoryBarList
              data={opRootCauses.map(d => ({ name: d.label, value: d.value }))}
              color={CHART_COLORS.emerald}
              onClick={() => {}}
            />
          </HeatmapTableCard>
        </div>

        <div className="mt-4">
          <HeatmapTableCard title="Report by Station Airlines">
            {opStationAirlineMatrix.rows.length === 0 ? <EmptyPanel /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[360px]">
                  <thead className="bg-emerald-50 text-emerald-900 border-b border-emerald-200">
                    <tr>
                      <th className="text-left py-2 px-3">Airlines</th>
                      {opStationAirlineMatrix.columns.map(c => <th key={c} className="text-center py-2 px-2">{c}</th>)}
                      <th className="text-center py-2 px-2 bg-emerald-100">Grand total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opStationAirlineMatrix.rows.map(row => (
                      <tr key={row.id} className="border-b border-gray-100">
                        <td className="py-1.5 px-3 font-medium text-gray-800">{row.primary}</td>
                        {opStationAirlineMatrix.columns.map(c => {
                          const v = row.values[c] || 0;
                          return <td key={c} className={\`py-1.5 px-2 text-center \${v>0?'bg-emerald-500 text-white font-bold':''}\`}>{v || '-'}</td>;
                        })}
                        <td className="py-1.5 px-2 text-center font-bold">{row.total}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 border-t-2 border-emerald-200 font-bold">
                      <td className="py-2 px-3 text-gray-800">Grand total</td>
                      {opStationAirlineMatrix.columns.map(c => <td key={c} className="py-2 px-2 text-center text-gray-800">{opStationAirlineMatrix.columnTotals[c] || 0}</td>)}
                      <td className="py-2 px-2 text-center text-gray-800">{opStationAirlineMatrix.grandTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </HeatmapTableCard>
        </div>

        <div className="mt-4">
          <HeatmapTableCard title="Breakdown of Identified Causes (Detail)">
            <SummaryDenseTable data={opCauseDetails} columns={opCauseCols} rowKey={r => r.id} itemsPerPage={5} />
          </HeatmapTableCard>
        </div>
      </SummarySectionCard>


      {/* SECTION 2 */}
      <SummarySectionCard title="COMPLIMENT FROM OPERATIONAL FEEDBACK REPORT" subtitle="Apresiasi terhadap kualitas pelaksanaan prosedur operasional dan efektivitas service handling sebagai dasar identifikasi elemen kinerja yang perlu dipertahankan">
        <div className="grid gap-4 xl:grid-cols-[1fr,2fr]">
          <HeatmapTableCard title="Landside Area">
            <CategoryBarList data={compLandside.map(d => ({ name: d.label, value: d.value }))} color={CHART_COLORS.emerald} onClick={() => {}} />
          </HeatmapTableCard>
          <HeatmapTableCard title="Landside Area - Detail Root Cause Identification">
            <SummaryDenseTable data={compLandsideDetails} columns={compLandsideCols} rowKey={r => r.id} itemsPerPage={5} />
          </HeatmapTableCard>
        </div>
      </SummarySectionCard>


      {/* SECTION 3 */}
      <SummarySectionCard title="VOICE OF PASSENGER REPORT" subtitle="Rekap Laporan operasional yang disampaikan bersumber langsung dari penumpang dalam periode pelaporan.">
        {voiceLoading ? <LoadingPanel message="Loading Voice Data..." /> : voiceError ? <ErrorPanel message={voiceError} /> : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard title="Total Report per Month">
                {voiceMonthlyStacked.length === 0 ? <EmptyPanel /> : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={voiceMonthlyStacked} layout="vertical" margin={{ left: 30, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="month" axisLine={false} tickLine={false} width={80} />
                        <Tooltip />
                        <Bar dataKey="staff" stackId="a" name="Staff Report" fill={CHART_COLORS.emerald} />
                        <Bar dataKey="customer" stackId="a" name="Customer Report" fill={CHART_COLORS.teal}>
                          <LabelList dataKey="customer" position="right" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
              <ChartCard title="Total Report per Category">
                {voiceCategoryStacked.length === 0 ? <EmptyPanel /> : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={voiceCategoryStacked} layout="vertical" margin={{ left: 30, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} width={80} />
                        <Tooltip />
                        <Bar dataKey="staff" stackId="a" name="Staff Report" fill={CHART_COLORS.emerald} />
                        <Bar dataKey="customer" stackId="a" name="Customer Report" fill={CHART_COLORS.teal}>
                          <LabelList dataKey="customer" position="right" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>

            <div className="mt-4">
              <HeatmapTableCard title="Summary Station">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[500px]">
                    <thead className="bg-emerald-50 border-b border-emerald-200 text-left">
                      <tr>
                        <th className="py-2 px-3">Report Type</th>
                        <th className="py-2 px-3">Joumpa Service Type</th>
                        <th className="py-2 px-3 text-center">Compliment</th>
                        <th className="py-2 px-3 text-center">Netral</th>
                        <th className="py-2 px-3 text-center">Irregularity</th>
                        <th className="py-2 px-3 text-center">Complaint</th>
                        <th className="py-2 px-3 text-center font-bold">Grand total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voiceSummaryMatrix.map((row, idx) => {
                        const prev = voiceSummaryMatrix[idx - 1];
                        const showType = !prev || prev.type !== row.type;
                        return (
                          <tr key={\`\${row.type}-\${row.service}\`} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-1.5 px-3 font-semibold text-gray-800">{showType ? row.type : ''}</td>
                            <td className="py-1.5 px-3 text-gray-700">{row.service}</td>
                            <td className={\`py-1.5 px-3 text-center \${row.comp>0?'bg-emerald-400 text-white':''}\`}>{row.comp || '-'}</td>
                            <td className="py-1.5 px-3 text-center">{row.net || '-'}</td>
                            <td className="py-1.5 px-3 text-center">{row.irreg || '-'}</td>
                            <td className="py-1.5 px-3 text-center">{row.compl || '-'}</td>
                            <td className="py-1.5 px-3 text-center font-bold">{row.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </HeatmapTableCard>
            </div>

            <div className="mt-4">
              <HeatmapTableCard title="Detail Irregularity & Complaint from Customer Joumpa Feedback">
                <SummaryDenseTable data={voiceIrregCompl} columns={voiceDetailCols} rowKey={r => r.id} itemsPerPage={5} />
              </HeatmapTableCard>
            </div>
          </>
        )}
      </SummarySectionCard>


      {/* SECTION 4 */}
      <SummarySectionCard title="COMPLIMENT FROM VOICE OF PASSENGER REPORT" subtitle="Rekap Laporan operasional yang disampaikan bersumber langsung dari penumpang dalam periode pelaporan.">
        {voiceLoading ? <LoadingPanel message="Loading Voice Data..." /> : voiceError ? <ErrorPanel message={voiceError} /> : (
          <HeatmapTableCard title="Detail Compliment & Netral Customer Joumpa Feedback">
            <SummaryDenseTable data={voiceCompNetral} columns={voiceDetailCols} rowKey={r => r.id} itemsPerPage={5} />
          </HeatmapTableCard>
        )}
      </SummarySectionCard>

      {/* Looker QR Modal */}
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={() => setShowLookerModal(true)} className="flex items-center gap-2 rounded bg-[var(--text-primary)] px-4 py-2 text-sm text-white">
          <QrCode size={16} /> Buka Looker Dashboard
        </button>
      </div>
      {showLookerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-6 shadow-xl text-center">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Looker Dashboard</h3>
            <img src={joumpaLookerQrUrl} alt="QR" className="mx-auto h-48 w-48 mb-4" />
            <a href={joumpaLookerUrl} target="_blank" className="text-blue-600 hover:underline">{joumpaLookerUrl}</a>
            <button onClick={() => setShowLookerModal(false)} className="mt-4 block w-full rounded bg-gray-100 py-2 hover:bg-gray-200 text-gray-800">Tutup</button>
          </div>
        </div>
      )}

      {DrilldownRenderer()}
      {VoiceDrilldownRenderer()}
    </div>
  );
}
`;

fs.writeFileSync(path.resolve(process.cwd(), 'components/dashboard/tabs/JoumpaServiceTab.tsx'), content);
console.log('Successfully wrote JoumpaServiceTab.tsx');
