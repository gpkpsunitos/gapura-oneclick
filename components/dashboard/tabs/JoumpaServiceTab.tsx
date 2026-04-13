'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, ExternalLink, Loader2, QrCode, X } from 'lucide-react';
import type { Report } from '@/types';
import { SummarySectionCard } from './summary/SummarySectionCard';
import { SummaryDenseTable, type SummaryDenseColumn } from './summary/SummaryDenseTable';
import { heatColor, normalizeText } from './summary/summary-utils';

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
  emerald: 'oklch(0.67 0.16 150)',
  teal: 'oklch(0.68 0.14 205)',
  amber: 'oklch(0.79 0.16 88)',
  orange: 'oklch(0.7 0.18 45)',
  rose: 'oklch(0.69 0.18 20)',
  indigo: 'oklch(0.58 0.12 255)',
};

const SATISFACTION_LABELS: Record<string, string> = {
  '5': 'Sangat Baik',
  '4': 'Baik',
  '3': 'Cukup',
  '2': 'Kurang',
  '1': 'Sangat Kurang',
};

const JOUMPA_LOOKER_URL = 'https://lookerstudio.google.com/reporting/6a7aba44-6bd1-439f-a5d2-8bed4af56448';
const JOUMPA_LOOKER_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(JOUMPA_LOOKER_URL)}`;

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
  valueHeader = 'Total ▼',
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

function WrappedYAxisTick(props: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string | number };
}) {
  const x = typeof props.x === 'number' ? props.x : Number(props.x || 0);
  const y = typeof props.y === 'number' ? props.y : Number(props.y || 0);
  const label = String(props.payload?.value || '');
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  const maxLineLength = 24;

  words.forEach((word) => {
    if (`${currentLine} ${word}`.trim().length > maxLineLength) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
      return;
    }
    currentLine = `${currentLine} ${word}`.trim();
  });

  if (currentLine) lines.push(currentLine);

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.slice(0, 3).map((line, index) => (
        <text
          key={`${line}-${index}`}
          x={-10}
          y={index * 11}
          dy={-((Math.min(lines.length, 3) - 1) * 5.5)}
          textAnchor="end"
          fill="var(--text-secondary)"
          fontSize={10}
          fontWeight={600}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function SmallChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-[22px] border border-[oklch(0.9_0.01_90_/_0.7)] bg-white/55 ${className}`}>
      <div className="border-b border-[oklch(0.9_0.01_90_/_0.7)] px-5 py-4">
        <h3 className="font-display text-lg font-black tracking-[-0.03em] text-[var(--text-primary)]">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyPanel({ message = 'No data available for the current filter.' }: { message?: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[18px] border border-dashed border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-0)]/75 px-6 py-10 text-center text-sm text-[var(--text-muted)]">
      {message}
    </div>
  );
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center gap-3 rounded-[18px] border border-[oklch(0.9_0.01_90_/_0.7)] bg-[var(--surface-0)]/75 px-6 py-10 text-sm text-[var(--text-secondary)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{message}</span>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center gap-3 rounded-[18px] border border-red-200 bg-red-50 px-6 py-10 text-sm text-red-700">
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

function HorizontalBarPanel({
  rows,
  color,
  emptyMessage,
  height = 280,
  yAxisWidth = 130,
  leftMargin = 60,
}: {
  rows: MetricRow[];
  color: string;
  emptyMessage?: string;
  height?: number;
  yAxisWidth?: number;
  leftMargin?: number;
}) {
  if (!rows.length) return <EmptyPanel message={emptyMessage} />;

  return (
    <div style={{ height: Math.max(height, rows.length * 52 + 44) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 20, left: leftMargin, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.9 0.01 90 / 0.85)" />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
          <YAxis
            dataKey="label"
            type="category"
            axisLine={false}
            tickLine={false}
            width={yAxisWidth}
            tick={WrappedYAxisTick}
          />
          <Tooltip
            cursor={{ fill: 'oklch(0.96 0.01 90 / 0.75)' }}
            contentStyle={{
              borderRadius: 18,
              border: '1px solid oklch(0.88 0.01 90 / 0.85)',
              background: 'rgba(255,255,255,0.96)',
              boxShadow: '0 16px 38px -22px rgba(15, 23, 42, 0.28)',
            }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 14, 14, 0]} barSize={26}>
            <LabelList dataKey="value" position="right" fill="var(--text-primary)" fontSize={11} fontWeight={700} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PiePanel({ slices, emptyMessage }: { slices: PieSlice[]; emptyMessage?: string }) {
  if (!slices.length) return <EmptyPanel message={emptyMessage} />;

  return (
    <div className="space-y-4">
      <div className="h-[220px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="48%"
              outerRadius={94}
              stroke="none"
              labelLine={{ stroke: 'oklch(0.68 0.12 180 / 0.9)', strokeWidth: 1.5 }}
              label={({ cx, cy, midAngle, outerRadius, name, value }) => {
                const RADIAN = Math.PI / 180;
                const radius = (outerRadius || 0) + 10;
                const rawX = (cx || 0) + radius * Math.cos(-midAngle * RADIAN);
                const y = (cy || 0) + radius * Math.sin(-midAngle * RADIAN);
                const isRightSide = rawX > (cx || 0);
                const anchor = isRightSide ? 'end' : 'start';
                const x = isRightSide
                  ? Math.min(rawX + 10, (cx || 0) + 150)
                  : Math.max(rawX - 10, (cx || 0) - 150);
                const shortName = String(name).length > 14 ? `${String(name).slice(0, 14)}…` : name;

                return (
                  <text
                    x={x}
                    y={y}
                    fill="var(--text-primary)"
                    textAnchor={anchor}
                    dominantBaseline="central"
                    style={{ fontSize: 10, fontWeight: 800 }}
                  >
                    {`${shortName}: ${value}`}
                  </text>
                );
              }}
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 18,
                border: '1px solid oklch(0.88 0.01 90 / 0.85)',
                background: 'rgba(255,255,255,0.96)',
                boxShadow: '0 16px 38px -22px rgba(15, 23, 42, 0.28)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
        {slices.map((slice) => (
          <div key={slice.name} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: slice.fill }} />
            <span>{slice.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
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

    const compactLabel = category.length > 10 ? `${category.slice(0, 10)}…` : category;
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

function MatrixTable({
  data,
  rowLabel,
  secondaryLabel,
  columnMinWidth = 120,
  primaryWidth = 100,
  secondaryWidth = 180,
}: {
  data: MatrixData;
  rowLabel: string;
  secondaryLabel?: string;
  columnMinWidth?: number;
  primaryWidth?: number;
  secondaryWidth?: number;
}) {
  if (!data.rows.length) return <EmptyPanel />;

  return (
    <div className="overflow-hidden rounded-[22px] border border-[oklch(0.9_0.01_90_/_0.7)] bg-white/50">
      <div className="max-h-[400px] sm:max-h-[560px] overflow-auto">
        <table className="border-separate border-spacing-0 text-sm" style={{ minWidth: secondaryLabel ? primaryWidth + secondaryWidth + data.columns.length * columnMinWidth + 120 : primaryWidth + data.columns.length * columnMinWidth + 120 }}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th
                className="sticky left-0 z-30 border-b border-r border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-1)] px-4 py-3 text-left text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]"
                style={{ minWidth: primaryWidth }}
              >
                {rowLabel}
              </th>
              {secondaryLabel ? (
                <th
                  className="sticky z-30 border-b border-r border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-1)] px-4 py-3 text-left text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]"
                  style={{ left: primaryWidth, minWidth: secondaryWidth }}
                >
                  {secondaryLabel}
                </th>
              ) : null}
              {data.columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-1)] px-3 py-3 text-center text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]"
                  style={{ minWidth: columnMinWidth }}
                >
                  {column}
                </th>
              ))}
              <th className="sticky right-0 z-30 min-w-[92px] border-b border-l border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-1)] px-4 py-3 text-right text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--surface-2)]/60">
                <td
                  className="sticky left-0 z-[5] border-b border-r border-[oklch(0.9_0.01_90_/_0.55)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)]"
                  style={{ minWidth: primaryWidth }}
                >
                  {row.primary}
                </td>
                {secondaryLabel ? (
                  <td
                    className="sticky z-[5] border-b border-r border-[oklch(0.9_0.01_90_/_0.55)] bg-white px-4 py-3 text-sm text-[var(--text-primary)]"
                    style={{ left: primaryWidth, minWidth: secondaryWidth }}
                  >
                    {row.secondary || '–'}
                  </td>
                ) : null}
                {data.columns.map((column) => {
                  const value = row.values[column] || 0;
                  return (
                    <td
                      key={`${row.id}-${column}`}
                      className="border-b border-[oklch(0.9_0.01_90_/_0.5)] px-3 py-3 text-center font-mono text-[0.82rem] font-semibold text-[var(--text-primary)]"
                      style={{ background: value > 0 ? heatColor(value, Math.max(data.maxValue, 1)) : 'oklch(0.98 0.005 90)' }}
                    >
                      {value > 0 ? value : '–'}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-[5] border-b border-l border-[oklch(0.9_0.01_90_/_0.55)] bg-white px-4 py-3 text-right font-mono text-[0.82rem] font-black text-[var(--brand-emerald-700)]">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[var(--surface-0)]/90">
              <td
                colSpan={secondaryLabel ? 2 : 1}
                className="border-t border-[oklch(0.9_0.01_90_/_0.85)] px-4 py-3 text-left text-[0.72rem] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]"
              >
                Grand Total
              </td>
              {data.columns.map((column) => (
                <td
                  key={`total-${column}`}
                  className="border-t border-[oklch(0.9_0.01_90_/_0.85)] px-3 py-3 text-center font-mono text-[0.82rem] font-black text-[var(--text-primary)]"
                >
                  {data.columnTotals[column] || 0}
                </td>
              ))}
              <td className="border-t border-[oklch(0.9_0.01_90_/_0.85)] px-4 py-3 text-right font-mono text-[0.82rem] font-black text-[var(--brand-emerald-700)]">
                {data.grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function BreakdownIdentifiedCausesTable({ data }: { data: MatrixData }) {
  if (!data.rows.length) return <EmptyPanel />;

  const rows: BreakdownTableRow[] = data.rows.map((row) => {
    const [branch = '-', airline = '-'] = String(row.secondary || '').split(' / ');
    return {
      id: row.id,
      serviceType: row.primary,
      branch,
      airline,
      values: row.values,
      total: row.total,
    };
  });

  return (
    <div className="overflow-hidden rounded-[22px] border border-[oklch(0.9_0.01_90_/_0.7)] bg-white/50">
      <div className="max-h-[420px] sm:max-h-[620px] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th colSpan={3} className="border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-white px-4 py-3" />
              <th
                colSpan={data.columns.length + 1}
                className="border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-1)] px-4 py-3 text-right text-[0.72rem] font-black uppercase tracking-[0.16em] text-[var(--text-primary)]"
              >
                Category Report / Record Count
              </th>
            </tr>
            <tr>
              <th className="min-w-[210px] border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-white px-4 py-3 text-left text-[0.72rem] font-black uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Joumpa Service Type
              </th>
              <th className="min-w-[110px] border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-white px-4 py-3 text-left text-[0.72rem] font-black uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Branch
              </th>
              <th className="min-w-[170px] border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-white px-4 py-3 text-left text-[0.72rem] font-black uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Airlines
              </th>
              {data.columns.map((column) => (
                <th
                  key={column}
                  className="min-w-[116px] border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-white px-3 py-3 text-center text-[0.72rem] font-black text-[var(--text-secondary)]"
                >
                  {column}
                </th>
              ))}
              <th className="min-w-[96px] border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-white px-4 py-3 text-right text-[0.72rem] font-black text-[var(--text-secondary)]">
                Grand total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const previous = rows[index - 1];
              const showServiceType = !previous || previous.serviceType !== row.serviceType;
              const showBranch = showServiceType || previous.branch !== row.branch;

              return (
                <tr key={row.id} className="hover:bg-[var(--surface-2)]/40">
                  <td className="border-b border-[oklch(0.9_0.01_90_/_0.45)] px-4 py-3 align-top text-[0.95rem] font-medium text-[var(--text-primary)]">
                    {showServiceType ? row.serviceType : ''}
                  </td>
                  <td className="border-b border-[oklch(0.9_0.01_90_/_0.45)] px-4 py-3 align-top text-[0.95rem] text-[var(--text-primary)]">
                    {showBranch ? row.branch : ''}
                  </td>
                  <td className="border-b border-[oklch(0.9_0.01_90_/_0.45)] px-4 py-3 align-top text-[0.95rem] text-[var(--text-primary)]">
                    {row.airline}
                  </td>
                  {data.columns.map((column) => {
                    const value = row.values[column] || 0;
                    return (
                      <td
                        key={`${row.id}-${column}`}
                        className="border-b border-[oklch(0.9_0.01_90_/_0.45)] px-3 py-3 text-center font-mono text-[0.82rem] font-semibold text-[var(--text-primary)]"
                        style={{ background: value > 0 ? heatColor(value, Math.max(data.maxValue, 1)) : 'transparent' }}
                      >
                        {value > 0 ? value : '-'}
                      </td>
                    );
                  })}
                  <td className="border-b border-[oklch(0.9_0.01_90_/_0.45)] px-4 py-3 text-right font-mono text-[0.9rem] font-black text-[var(--text-primary)]">
                    {row.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-white">
              <td
                colSpan={3}
                className="border-t border-[oklch(0.9_0.01_90_/_0.85)] px-4 py-3 text-left text-[0.72rem] font-black text-[var(--text-secondary)]"
              >
                Grand total
              </td>
              {data.columns.map((column) => (
                <td
                  key={`grand-${column}`}
                  className="border-t border-[oklch(0.9_0.01_90_/_0.85)] px-3 py-3 text-center font-mono text-[0.82rem] font-black text-[var(--text-primary)]"
                >
                  {data.columnTotals[column] || 0}
                </td>
              ))}
              <td className="border-t border-[oklch(0.9_0.01_90_/_0.85)] px-4 py-3 text-right font-mono text-[0.9rem] font-black text-[var(--brand-emerald-700)]">
                {data.grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function JoumpaServiceTab({ allReports, reports }: JoumpaServiceTabProps) {
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
    { id: 'total', header: 'Total ▼', accessor: (row) => row.total, sortValue: (row) => row.total, align: 'right', minWidth: '80px' },
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

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-3 px-1">
        <h1 className="font-display text-3xl font-black tracking-[-0.04em] text-[var(--text-primary)] sm:text-[2.5rem]">
          Joumpa Service
        </h1>
      </div>

      <SummarySectionCard
        title="Operational Feedback Report"
        subtitle="Rekap laporan operasional bersumber dari staf internal maupun eksternal serta laporan operasional airline sebagai customer."
      >
        <div className="grid gap-5 xl:grid-cols-3">
          <SmallChartCard
            title="Total Report per Month"
            subtitle="Frekuensi jumlah laporan yang tercatat pada masing-masing bulan dalam periode pelaporan."
          >
            <HorizontalBarPanel rows={operationalMonthly} color={CHART_COLORS.emerald} />
          </SmallChartCard>
          <SmallChartCard
            title="Reportby Category"
            subtitle="Jumlah laporan berdasarkan kategori temuan dalam periode pelaporan."
          >
            <HorizontalBarPanel rows={operationalRemarks} color={CHART_COLORS.teal} />
          </SmallChartCard>
          <SmallChartCard
            title="Category Distribution of Report"
            subtitle="Distribusi laporan berdasarkan klasifikasi kejadian operasional dalam periode pelaporan."
          >
            <PiePanel slices={operationalDistribution} />
          </SmallChartCard>
        </div>

        <div className="mt-5">
          <SmallChartCard
            title="Report Category by Airlines"
            subtitle="Distribusi laporan berdasarkan maskapai dan jenis temuan pada operasional dalam periode pelaporan."
          >
            <MatrixTable data={operationalAirlineMatrix} rowLabel="Branch" secondaryLabel="Airlines" />
          </SmallChartCard>
        </div>
      </SummarySectionCard>

      <SummarySectionCard
        title="Compliment From Operational Feedback Report"
        subtitle="Apresiasi terhadap kualitas pelaksanaan prosedur operasional dan efektivitas service handling sebagai dasar identifikasi elemen kinerja yang perlu dipertahankan"
      >
        <div className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
          <SmallChartCard title="Report by Category">
            <HorizontalBarPanel rows={complimentRemarks} color={CHART_COLORS.emerald} />
          </SmallChartCard>
          <SmallChartCard title="Landside Area">
            <SummaryDenseTable
              data={complimentRoots}
              columns={metricColumns()}
              rowKey={(row) => row.label}
              itemsPerPage={7}
              initialSort={{ columnId: 'value', direction: 'desc' }}
              emptyMessage="No compliment root identification found."
            />
          </SmallChartCard>
        </div>

        <div className="mt-5">
          <SmallChartCard title="Landside Area - Detail Root Cause Identification">
            <SummaryDenseTable
              data={complimentRootDetails}
              columns={complimentRootColumns}
              rowKey={(row) => row.id}
              itemsPerPage={8}
              initialSort={{ columnId: 'total', direction: 'desc' }}
              emptyMessage="No compliment detail rows found."
            />
          </SmallChartCard>
        </div>
      </SummarySectionCard>

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
            <div className="grid gap-5 xl:grid-cols-2">
              <SmallChartCard title="Total Report per Month">
                <HorizontalBarPanel rows={voiceMonthly} color={CHART_COLORS.emerald} height={240} yAxisWidth={92} leftMargin={24} />
              </SmallChartCard>
              <SmallChartCard title="Total Report by Report Type">
                <HorizontalBarPanel rows={voiceReportTypes} color={CHART_COLORS.teal} height={220} yAxisWidth={132} leftMargin={24} />
              </SmallChartCard>
            </div>

            <div className="mt-5">
              <SmallChartCard
                title="Breakdown of Identified Causes"
                subtitle="Rows follow Joumpa service type with branch and airline context; columns show category report counts."
              >
                <BreakdownIdentifiedCausesTable data={voiceBreakdownMatrix} />
              </SmallChartCard>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <SmallChartCard title="Report by Service Type">
                <SummaryDenseTable
                  data={voiceServiceTypeRows}
                  columns={metricColumns('Total ▼', 'Joumpa Service Type')}
                  rowKey={(row) => row.label}
                  itemsPerPage={4}
                  initialSort={{ columnId: 'value', direction: 'desc' }}
                  emptyMessage="No Joumpa service type rows found."
                />
              </SmallChartCard>

              <SmallChartCard title="Category Distribution of Report">
                <PiePanel slices={voiceCategoryDistribution} />
              </SmallChartCard>
            </div>

            <div className="mt-5">
              <SmallChartCard title="Service Type Report by Category">
                {voiceServiceTypeCategory.rows.length ? (
                  <div className="space-y-4">
                    <div className="h-[240px] sm:h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={voiceServiceTypeCategory.rows}
                          layout="vertical"
                          margin={{ top: 4, right: 20, left: 120, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.9 0.01 90 / 0.85)" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                          <YAxis
                            dataKey="serviceType"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            width={190}
                            tick={WrappedYAxisTick}
                          />
                          <Tooltip
                            cursor={{ fill: 'oklch(0.96 0.01 90 / 0.75)' }}
                            contentStyle={{
                              borderRadius: 18,
                              border: '1px solid oklch(0.88 0.01 90 / 0.85)',
                              background: 'rgba(255,255,255,0.96)',
                              boxShadow: '0 16px 38px -22px rgba(15, 23, 42, 0.28)',
                            }}
                          />
                          {voiceServiceTypeCategory.categories.map((category, index) => (
                            <Bar
                              key={category}
                              dataKey={category}
                              stackId="voice"
                              fill={[CHART_COLORS.emerald, CHART_COLORS.teal, CHART_COLORS.amber, CHART_COLORS.orange, CHART_COLORS.rose][index % 5]}
                              radius={index === voiceServiceTypeCategory.categories.length - 1 ? [0, 12, 12, 0] : [0, 0, 0, 0]}
                            >
                              <LabelList content={renderStackedBarLabel(category)} />
                            </Bar>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
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
                ) : (
                  <EmptyPanel />
                )}
              </SmallChartCard>
            </div>

            <div className="mt-5">
              <SmallChartCard title="Detail Report">
                <SummaryDenseTable
                  data={voiceDetails}
                  columns={voiceDetailColumns}
                  rowKey={(row) => row.id}
                  itemsPerPage={7}
                  initialSort={{ columnId: 'date', direction: 'desc' }}
                  emptyMessage="No Joumpa detail rows found."
                />
              </SmallChartCard>
            </div>

            <div className="mt-5">
              <SmallChartCard
                title="Lihat versi dashboard Looker"
                subtitle="Buka versi dashboard Looker Studio untuk tampilan eksternal dan akses cepat via QR code."
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
                    href={JOUMPA_LOOKER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--surface-4)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-2)]"
                  >
                    <ExternalLink size={18} />
                    <span>Buka Looker</span>
                  </a>
                </div>
              </SmallChartCard>
            </div>
          </>
        )}
      </SummarySectionCard>

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
                  src={JOUMPA_LOOKER_QR_URL}
                  alt="QR code dashboard Looker Joumpa Service"
                  className="h-64 w-64 rounded-2xl"
                />
              </div>
            </div>

            <a
              href={JOUMPA_LOOKER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-between gap-3 rounded-[22px] border border-[var(--surface-4)] bg-[var(--surface-1)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-2)]"
            >
              <span className="truncate">{JOUMPA_LOOKER_URL}</span>
              <ExternalLink size={18} className="shrink-0" />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
