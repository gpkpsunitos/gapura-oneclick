'use client';

import { useMemo, useState, type ComponentProps } from 'react';
import {
  BarChart, Bar, Cell, LabelList, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer as RechartsResponsiveContainer,
} from 'recharts';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  FileStack,
  BarChart3,
  Activity,
} from 'lucide-react';
import type { Report } from '@/types';
import { SummarySectionCard } from './summary/SummarySectionCard';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface StatusCountItem {
  closed: number;
  open: number;
  onProgress: number;
  total: number;
}

interface CaseReportByAreaAirlineItem {
  name: string;
  terminal: number;
  apron: number;
  general: number;
  total: number;
}

interface CaseReportByAreaBranchItem {
  branch: string;
  airlines: CaseReportByAreaAirlineItem[];
  totalTerminal: number;
  totalApron: number;
  totalGeneral: number;
  grandTotal: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    fill?: string;
    dataKey?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
}

// ── Shared Constants ──────────────────────────────────────────────────────────

const REFERENCE_COLORS = {
  irregularity: 'oklch(0.65 0.18 160)',
  complaint: 'oklch(0.6 0.14 240)',
  compliment: 'oklch(0.8 0.15 80)',
  trend: 'oklch(0.65 0.18 160)',
  neutral: 'oklch(0.55 0.02 250)',
};

const CHART_PALETTE = [
  'oklch(0.65 0.18 160)',
  'oklch(0.6 0.14 240)',
  'oklch(0.7 0.2 330)',
  'oklch(0.8 0.15 80)',
  'oklch(0.6 0.2 25)',
  'oklch(0.75 0.1 190)',
];

// ── Shared Helpers ────────────────────────────────────────────────────────────

function ResponsiveContainer(props: ComponentProps<typeof RechartsResponsiveContainer>) {
  return (
    <RechartsResponsiveContainer
      {...props}
      minWidth={props.minWidth ?? 1}
      minHeight={props.minHeight ?? 1}
    />
  );
}

const WrappedYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const words = String(payload.value).split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  const maxLineLength = 20;

  words.forEach((word: string) => {
    if ((currentLine + word).length > maxLineLength) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  if (currentLine) lines.push(currentLine.trim());

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={-12}
          y={i * 11}
          dy={-((lines.length - 1) * 5.5)}
          textAnchor="end"
          fill="var(--text-primary)"
          fontSize={10}
          fontWeight={700}
          className="tracking-tighter"
        >
          {line}
        </text>
      ))}
    </g>
  );
};

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[oklch(1_0_0_/_0.8)] backdrop-blur-xl p-4 border border-[oklch(1_0_0_/_0.1)] shadow-2xl rounded-2xl min-w-[140px] animate-scale-in">
      {label && <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 border-b border-[oklch(0_0_0_/_0.05)] pb-1.5">{label}</p>}
      <div className="space-y-2">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: entry.fill || entry.color || '#10b981' }}
              />
              <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                {entry.name || 'Value'}
              </span>
            </div>
            <span className="text-[11px] font-black text-[var(--text-primary)]">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function heatColor(value: number, max: number): { bg: string; fg: string } {
  if (value === 0 || max === 0) return { bg: 'transparent', fg: 'var(--text-muted)' };
  const ratio = Math.min(1, Math.max(0, value / max));
  const l = 0.95 - (0.45 * ratio);
  const c = 0.03 + (0.17 * ratio);
  const h = 160;
  return {
    bg: `oklch(${l} ${c} ${h})`,
    fg: l < 0.65 ? '#ffffff' : '#0f172a',
  };
}

function normalizeStatusKey(status: string | undefined | null): keyof StatusCountItem {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'CLOSED') return 'closed';
  if (normalized === 'OPEN') return 'open';
  return 'onProgress';
}

function formatStatusValue(value: number) {
  return value > 0 ? value.toLocaleString() : '-';
}

// ── Local Sub-Components ─────────────────────────────────────────────────────

const PAGE_SIZE = 5;

function CategoryBarList({ data, color = '#4ade80', title }: { data: readonly { name: string; value: number }[]; color?: string; title?: string }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pageItems = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxValue = data[0]?.value || 1;
  const startIdx = page * PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, data.length);

  return (
    <div>
      {title && <h3 className="font-semibold text-[13px] tracking-tight text-slate-900 mb-3">{title}</h3>}
      <div className="space-y-2">
        {pageItems.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-600 w-[140px] shrink-0 whitespace-normal break-words leading-tight" title={item.name}>
              {item.name}
            </span>
            <div className="flex-1 flex items-center gap-1.5">
              <div className="flex-1 bg-slate-100 rounded-sm h-3.5 overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-300"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 w-7 text-right shrink-0">
                {item.value}
              </span>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">Tidak ada data</p>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <span className="text-[10px] text-gray-500">
            {startIdx}-{endIdx} / {data.length}
          </span>
          <button
            className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

const DETAIL_PAGE_SIZE = 10;

function CGODetailReportTable({ data }: { data: Report[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(data.length / DETAIL_PAGE_SIZE);
  const pageItems = data.slice(page * DETAIL_PAGE_SIZE, (page + 1) * DETAIL_PAGE_SIZE);
  const startIdx = page * DETAIL_PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * DETAIL_PAGE_SIZE, data.length);

  if (data.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-4">Tidak ada data</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="max-h-[340px] overflow-y-auto">
          <table className="w-full text-xs min-w-[1200px]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Date</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Category</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Branch</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Airlines</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Flight</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Report</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Root Caused</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Action Taken</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Preventive Action</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r, idx) => {
                const date = r.date_of_event
                  ? new Date(r.date_of_event).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '-';
                const branch = r.stations?.code || r.branch || '-';
                return (
                  <tr key={`${r.id || idx}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                    <td className="py-1.5 px-2 whitespace-nowrap text-gray-700">{date}</td>
                    <td className="py-1.5 px-2 whitespace-nowrap text-gray-700">{r.category || r.main_category || '-'}</td>
                    <td className="py-1.5 px-2 whitespace-nowrap font-medium text-gray-800">{branch}</td>
                    <td className="py-1.5 px-2 whitespace-nowrap text-gray-700">{r.airlines || '-'}</td>
                    <td className="py-1.5 px-2 whitespace-nowrap text-gray-700">{(r as any).flight_number || (r as any).flight || '-'}</td>
                    <td className="py-1.5 px-2 text-gray-700 min-w-[260px]"><p className="whitespace-pre-wrap break-words leading-snug">{(r as any).description || (r as any).report || '-'}</p></td>
                    <td className="py-1.5 px-2 text-gray-700 min-w-[260px]"><p className="whitespace-pre-wrap break-words leading-snug">{(r as any).root_caused || (r as any).identification_of_root || (r as any).root_cause || '-'}</p></td>
                    <td className="py-1.5 px-2 text-gray-700 min-w-[220px]"><p className="whitespace-pre-wrap break-words leading-snug">{(r as any).action_taken || '-'}</p></td>
                    <td className="py-1.5 px-2 text-gray-700 min-w-[220px]"><p className="whitespace-pre-wrap break-words leading-snug">{(r as any).preventive_action || '-'}</p></td>
                    <td className="py-1.5 px-2 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-gray-500">
            {startIdx}&ndash;{endIdx} / {data.length} records
          </span>
          <div className="flex items-center gap-2">
            <button className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-[10px] font-semibold text-gray-600 tabular-nums">Page {page + 1} / {totalPages}</span>
            <button className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusHeatmapTable({
  title,
  firstColumnLabel,
  rows,
}: {
  title: string;
  firstColumnLabel: string;
  rows: Array<{ label: string } & StatusCountItem>;
}) {
  const maxClosed = Math.max(...rows.map((row) => row.closed), 1);
  const maxOpen = Math.max(...rows.map((row) => row.open), 1);
  const maxOnProgress = Math.max(...rows.map((row) => row.onProgress), 1);
  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  const totals = rows.reduce(
    (acc, row) => ({
      closed: acc.closed + row.closed,
      open: acc.open + row.open,
      onProgress: acc.onProgress + row.onProgress,
      total: acc.total + row.total,
    }),
    { closed: 0, open: 0, onProgress: 0, total: 0 } satisfies StatusCountItem
  );

  return (
    <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden">
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">{title}</h3>
      <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Status / Record Count</p>
      <div className="overflow-x-auto">
        <div className="max-h-[220px] overflow-y-auto">
          <table className="w-full text-xs min-w-[360px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-black border-b border-gray-300">
                <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">{firstColumnLabel}</th>
                <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Closed</th>
                <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Open</th>
                <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">On Progress</th>
                <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Grand total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const closedColor = heatColor(row.closed, maxClosed);
                const openColor = heatColor(row.open, maxOpen);
                const onProgressColor = heatColor(row.onProgress, maxOnProgress);
                const totalColor = heatColor(row.total, maxTotal);
                return (
                  <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-medium text-gray-800 whitespace-nowrap">{row.label}</td>
                    <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: closedColor.bg, color: closedColor.fg }}>{formatStatusValue(row.closed)}</td>
                    <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: openColor.bg, color: openColor.fg }}>{formatStatusValue(row.open)}</td>
                    <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: onProgressColor.bg, color: onProgressColor.fg }}>{formatStatusValue(row.onProgress)}</td>
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
              <td className="py-1.5 px-2 text-gray-800">Grand total</td>
              <td className="py-1.5 px-2 text-center text-gray-800">{totals.closed}</td>
              <td className="py-1.5 px-2 text-center text-gray-800">{totals.open}</td>
              <td className="py-1.5 px-2 text-center text-gray-800">{totals.onProgress}</td>
              <td className="py-1.5 px-2 text-center text-gray-800">{totals.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailedStatusTable({ rows }: { rows: Array<{ branch: string; airline: string } & StatusCountItem> }) {
  const maxClosed = Math.max(...rows.map((row) => row.closed), 1);
  const maxOpen = Math.max(...rows.map((row) => row.open), 1);
  const maxOnProgress = Math.max(...rows.map((row) => row.onProgress), 1);
  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  const totals = rows.reduce(
    (acc, row) => ({
      closed: acc.closed + row.closed,
      open: acc.open + row.open,
      onProgress: acc.onProgress + row.onProgress,
      total: acc.total + row.total,
    }),
    { closed: 0, open: 0, onProgress: 0, total: 0 } satisfies StatusCountItem
  );

  return (
    <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden">
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Detail Report Status</h3>
      <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Status / Record Count</p>
      <div className="overflow-x-auto">
        <div className="max-h-[220px] overflow-y-auto">
          <table className="w-full text-xs min-w-[430px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-black border-b border-gray-300">
                <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Branch</th>
                <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Airlines</th>
                <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Closed</th>
                <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Open</th>
                <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">On Progress</th>
                <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Grand total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const prev = rows[index - 1];
                const showBranch = !prev || prev.branch !== row.branch;
                const closedColor = heatColor(row.closed, maxClosed);
                const openColor = heatColor(row.open, maxOpen);
                const onProgressColor = heatColor(row.onProgress, maxOnProgress);
                const totalColor = heatColor(row.total, maxTotal);
                return (
                  <tr key={`${row.branch}-${row.airline}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-medium text-gray-800 whitespace-nowrap">{showBranch ? row.branch : ''}</td>
                    <td className="py-1.5 px-2 text-gray-800 whitespace-nowrap">{row.airline}</td>
                    <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: closedColor.bg, color: closedColor.fg }}>{formatStatusValue(row.closed)}</td>
                    <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: openColor.bg, color: openColor.fg }}>{formatStatusValue(row.open)}</td>
                    <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: onProgressColor.bg, color: onProgressColor.fg }}>{formatStatusValue(row.onProgress)}</td>
                    <td className="py-1.5 px-2 text-center font-bold" style={{ backgroundColor: totalColor.bg, color: totalColor.fg }}>{row.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <table className="w-full text-xs min-w-[430px] border-t-2 border-gray-300">
          <tbody>
            <tr className="bg-gray-100 font-bold">
              <td className="py-1.5 px-2 text-gray-800" colSpan={2}>Grand total</td>
              <td className="py-1.5 px-2 text-center text-gray-800">{totals.closed}</td>
              <td className="py-1.5 px-2 text-center text-gray-800">{totals.open}</td>
              <td className="py-1.5 px-2 text-center text-gray-800">{totals.onProgress}</td>
              <td className="py-1.5 px-2 text-center text-gray-800">{totals.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  CLOSED: { bg: 'oklch(0.92 0.08 145 / 0.9)', fg: 'oklch(0.38 0.12 145)', label: 'Closed' },
  OPEN: { bg: 'oklch(0.93 0.07 25 / 0.9)', fg: 'oklch(0.45 0.14 25)', label: 'Open' },
  'ON PROGRESS': { bg: 'oklch(0.94 0.07 80 / 0.9)', fg: 'oklch(0.42 0.12 80)', label: 'On Progress' },
};

function StatusBadge({ status }: { status: string | undefined }) {
  const key = String(status || '').trim().toUpperCase();
  const cfg = STATUS_BADGE[key] || STATUS_BADGE['ON PROGRESS'];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
    >
      {cfg.label}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  progress,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  progress?: number; // 0–100
}) {
  return (
    <div className="card-glass p-5 group transition-all duration-500 hover:shadow-2xl flex items-center gap-4">
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
        style={{ backgroundColor: accent }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
        <p className="text-xl font-black tracking-tight text-[var(--text-primary)]">{value}</p>
        {progress !== undefined && (
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-[oklch(0_0_0_/_0.06)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: accent }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface CgoCargoReportTabProps {
  reports: Report[];
}

export function CgoCargoReportTab({ reports }: CgoCargoReportTabProps) {
  // ── CGO Data Filtering ───────────────────────────────────────────────────
  const cgoReports = useMemo(() =>
    reports.filter(r => r.source_sheet === 'CGO'),
  [reports]);

  // ── KPI Aggregation ──────────────────────────────────────────────────────
  const cgoKpi = useMemo(() => {
    const total = cgoReports.length;
    let closed = 0;
    let open = 0;
    let onProgress = 0;
    cgoReports.forEach(r => {
      const key = normalizeStatusKey(r.status);
      if (key === 'closed') closed++;
      else if (key === 'open') open++;
      else onProgress++;
    });
    return { total, closed, open, onProgress, resolutionRate: total > 0 ? ((closed / total) * 100) : 0 };
  }, [cgoReports]);

  // ── Chart Data ───────────────────────────────────────────────────────────

  // 1. Report by Case Category
  const cgoCaseCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    cgoReports.forEach(r => {
      const cat = r.category || r.main_category || 'Unknown';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const colorMap: Record<string, string> = {
      Complaint: '#4fc3f7',
      Irregularity: '#81c784',
      Compliment: '#dce775',
    };
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: colorMap[name] || '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
  }, [cgoReports]);

  // 2. Branch Reporting — top 10
  const cgoBranchData = useMemo(() => {
    const counts: Record<string, number> = {};
    cgoReports.forEach(r => {
      const branch = r.stations?.code || r.branch || r.station_code || 'Unknown';
      counts[branch] = (counts[branch] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([branch, count]) => ({ branch, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [cgoReports]);

  // 3. Airlines Report — top 10
  const cgoAirlinesData = useMemo(() => {
    const counts: Record<string, number> = {};
    cgoReports.forEach(r => {
      const airline = (r.airlines || (r as any).airline || 'Unknown').trim() || 'Unknown';
      counts[airline] = (counts[airline] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([airline, count]) => ({ airline, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [cgoReports]);

  // 4. Monthly Report — last 12 months
  const cgoMonthlyData = useMemo(() => {
    const counts: Record<string, { count: number; date: Date }> = {};
    cgoReports.forEach(r => {
      const raw = r.date_of_event || r.event_date || r.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!counts[key]) counts[key] = { count: 0, date: d };
      counts[key].count++;
    });
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([, v]) => ({
        month: v.date.toLocaleString('en-US', { month: 'long' }),
        count: v.count,
      }));
  }, [cgoReports]);

  // 5. Category by Area
  const cgoCategoryByAreaData = useMemo(() => {
    const counts: Record<string, number> = {};
    const deriveArea = (r: any): 'Terminal Area' | 'Apron Area' | 'General' | null => {
      if (r?.terminal_area_category && String(r.terminal_area_category).trim()) return 'Terminal Area';
      if (r?.apron_area_category && String(r.apron_area_category).trim()) return 'Apron Area';
      if (r?.general_category && String(r.general_category).trim()) return 'General';
      const raw = (r.area || '').toString().trim().toLowerCase();
      if (raw.includes('terminal')) return 'Terminal Area';
      if (raw.includes('apron')) return 'Apron Area';
      if (raw.includes('general')) return 'General';
      return null;
    };
    cgoReports.forEach(r => {
      const area = deriveArea(r);
      if (area) counts[area] = (counts[area] || 0) + 1;
    });
    const colorMap: Record<string, string> = {
      'Apron Area': '#4fc3f7',
      'Terminal Area': '#81c784',
      'General': '#dce775',
    };
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: colorMap[name] || '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
  }, [cgoReports]);

  // 6. Case Category by Branch pivot
  const cgoPivotByBranch = useMemo(() => {
    const map: Record<string, { complaint: number; irregularity: number; compliment: number }> = {};
    cgoReports.forEach(r => {
      const branch = r.stations?.code || r.branch || r.station_code || 'Unknown';
      if (!map[branch]) map[branch] = { complaint: 0, irregularity: 0, compliment: 0 };
      const cat = (r.category || r.main_category || '').toLowerCase();
      if (cat === 'complaint') map[branch].complaint++;
      else if (cat === 'irregularity') map[branch].irregularity++;
      else if (cat === 'compliment') map[branch].compliment++;
    });
    return Object.entries(map)
      .map(([branch, d]) => ({ branch, ...d, total: d.complaint + d.irregularity + d.compliment }))
      .sort((a, b) => b.total - a.total);
  }, [cgoReports]);

  // 7. Case Category by Airlines pivot
  const cgoPivotByAirlines = useMemo(() => {
    const map: Record<string, { complaint: number; irregularity: number; compliment: number }> = {};
    cgoReports.forEach(r => {
      const airline = ((r.airlines || (r as any).airline || 'Unknown') as string).trim() || 'Unknown';
      if (!map[airline]) map[airline] = { complaint: 0, irregularity: 0, compliment: 0 };
      const cat = (r.category || r.main_category || '').toLowerCase();
      if (cat === 'complaint') map[airline].complaint++;
      else if (cat === 'irregularity') map[airline].irregularity++;
      else if (cat === 'compliment') map[airline].compliment++;
    });
    return Object.entries(map)
      .map(([airline, d]) => ({ airline, ...d, total: d.complaint + d.irregularity + d.compliment }))
      .sort((a, b) => b.total - a.total);
  }, [cgoReports]);

  // 8. CGO Case Report by Area pivot
  const cgoCaseReportByArea = useMemo((): CaseReportByAreaBranchItem[] => {
    const branchMap: Record<string, Record<string, { terminal: number; apron: number; general: number }>> = {};
    const normalize = (v: any) => (typeof v === 'string' ? v.trim() : String(v || '')).trim();
    const getBranch = (r: any) => normalize(r.branch || r.stations?.code || r.station_code || 'Unknown') || 'Unknown';
    const getAirline = (r: any) => normalize(r.airlines || r.airline || 'Unknown') || 'Unknown';
    const getAreaKey = (r: any): 'terminal' | 'apron' | 'general' | null => {
      if (r?.terminal_area_category && String(r.terminal_area_category).trim()) return 'terminal';
      if (r?.apron_area_category && String(r.apron_area_category).trim()) return 'apron';
      if (r?.general_category && String(r.general_category).trim()) return 'general';
      const raw = normalize(r.area).toLowerCase();
      if (raw.includes('terminal')) return 'terminal';
      if (raw.includes('apron')) return 'apron';
      if (raw.includes('general')) return 'general';
      return null;
    };
    cgoReports.forEach((r) => {
      const branch = getBranch(r);
      const airline = getAirline(r);
      const k = getAreaKey(r);
      if (!branchMap[branch]) branchMap[branch] = {};
      if (!branchMap[branch][airline]) branchMap[branch][airline] = { terminal: 0, apron: 0, general: 0 };
      if (k) branchMap[branch][airline][k]++;
    });
    return Object.entries(branchMap)
      .map(([branch, airlineData]) => {
        const airlines: CaseReportByAreaAirlineItem[] = Object.entries(airlineData)
          .map(([name, counts]) => ({ name, ...counts, total: counts.terminal + counts.apron + counts.general }))
          .sort((a, b) => b.total - a.total);
        return {
          branch,
          airlines,
          totalTerminal: airlines.reduce((s, a) => s + a.terminal, 0),
          totalApron: airlines.reduce((s, a) => s + a.apron, 0),
          totalGeneral: airlines.reduce((s, a) => s + a.general, 0),
          grandTotal: airlines.reduce((s, a) => s + a.total, 0),
        };
      })
      .sort((a, b) => b.grandTotal - a.grandTotal);
  }, [cgoReports]);

  // 9-11. Area Category breakdowns
  const cgoTerminalAreaCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    cgoReports.forEach((r) => {
      const cat = ((r as any).terminal_area_category || '').trim();
      if (cat) map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [cgoReports]);

  const cgoApronAreaCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    cgoReports.forEach((r) => {
      const cat = ((r as any).apron_area_category || '').trim();
      if (cat) map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [cgoReports]);

  const cgoGeneralCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    cgoReports.forEach((r) => {
      const cat = ((r as any).general_category || '').trim();
      if (cat) map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [cgoReports]);

  // 12. HUB Report
  const cgoHubData = useMemo(() => {
    const map: Record<string, number> = {};
    cgoReports.forEach((r) => {
      const hub = ((r as any).hub || '').trim();
      if (hub) map[hub] = (map[hub] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [cgoReports]);

  // Status tables
  const cgoStatusByBranch = useMemo(() => {
    const map = new Map<string, StatusCountItem>();
    cgoReports.forEach((report) => {
      const branch = String(report.stations?.code || report.branch || report.station_code || 'Unknown').trim() || 'Unknown';
      const current = map.get(branch) || { closed: 0, open: 0, onProgress: 0, total: 0 };
      const key = normalizeStatusKey(report.status);
      current[key] += 1;
      current.total += 1;
      map.set(branch, current);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, ...value })).sort((a, b) => b.total - a.total);
  }, [cgoReports]);

  const cgoStatusByAirline = useMemo(() => {
    const map = new Map<string, StatusCountItem>();
    cgoReports.forEach((report) => {
      const airline = String(report.airlines || report.airline || 'Unknown').trim() || 'Unknown';
      const current = map.get(airline) || { closed: 0, open: 0, onProgress: 0, total: 0 };
      const key = normalizeStatusKey(report.status);
      current[key] += 1;
      current.total += 1;
      map.set(airline, current);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, ...value })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [cgoReports]);

  const cgoDetailedStatusRows = useMemo(() => {
    const branchMap = new Map<string, Map<string, StatusCountItem>>();
    cgoReports.forEach((report) => {
      const branch = String(report.stations?.code || report.branch || report.station_code || 'Unknown').trim() || 'Unknown';
      const airline = String(report.airlines || report.airline || 'Unknown').trim() || 'Unknown';
      if (!branchMap.has(branch)) branchMap.set(branch, new Map());
      const airlineMap = branchMap.get(branch)!;
      const current = airlineMap.get(airline) || { closed: 0, open: 0, onProgress: 0, total: 0 };
      const key = normalizeStatusKey(report.status);
      current[key] += 1;
      current.total += 1;
      airlineMap.set(airline, current);
    });
    return Array.from(branchMap.entries())
      .sort((a, b) => Array.from(b[1].values()).reduce((sum, row) => sum + row.total, 0) - Array.from(a[1].values()).reduce((sum, row) => sum + row.total, 0))
      .flatMap(([branch, airlines]) => Array.from(airlines.entries()).map(([airline, counts]) => ({ branch, airline, ...counts })).sort((a, b) => b.total - a.total));
  }, [cgoReports]);

  const cgoRootCauseRows = useMemo(() => {
    const map = new Map<string, { branch: string; airlines: string; area: string; category: string; root: string; total: number }>();
    cgoReports.forEach((report) => {
      const row = {
        branch: String(report.stations?.code || report.branch || '-').trim() || '-',
        airlines: String(report.airlines || report.airline || '-').trim() || '-',
        area: report.terminal_area_category ? 'Terminal Area' : report.apron_area_category ? 'Apron Area' : report.general_category ? 'General Service' : String(report.area || '-'),
        category: String(report.terminal_area_category || report.apron_area_category || report.general_category || report.remarks_case || report.case_classification || '-').trim() || '-',
        root: String(report.root_caused || report.identification_of_root || report.root_cause || '-').trim() || '-',
      };
      if (row.category === '-' && row.root === '-') return;
      const key = `${row.branch}|${row.airlines}|${row.area}|${row.category}|${row.root}`;
      const current = map.get(key) || { ...row, total: 0 };
      current.total += 1;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [cgoReports]);

  const cgoCaseClassificationData = useMemo(() => {
    const map: Record<string, number> = {};
    cgoReports.forEach((r) => {
      const value = String(r.case_classification || r.remarks_case || '').trim();
      if (value) map[value] = (map[value] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [cgoReports]);

  const cgoIdentificationOfRootData = useMemo(() => {
    const map: Record<string, number> = {};
    cgoReports.forEach((r) => {
      const value = String((r as any).identification_of_root || (r as any).root_caused || (r as any).root_cause || '').trim();
      if (value) map[value] = (map[value] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [cgoReports]);

  // Sorted reports for detail table
  const sortedCgoReports = useMemo(() =>
    [...cgoReports].sort((a, b) => {
      const dA = a.date_of_event ? new Date(a.date_of_event).getTime() : 0;
      const dB = b.date_of_event ? new Date(b.date_of_event).getTime() : 0;
      return dB - dA;
    }),
  [cgoReports]);

  // ── Empty State ──────────────────────────────────────────────────────────
  if (cgoReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BarChart3 className="w-12 h-12 text-[var(--text-muted)] opacity-30 mb-4" />
        <p className="text-sm font-medium text-[var(--text-muted)]">Tidak ada data CGO untuk periode ini</p>
        <p className="text-xs text-[var(--text-muted)] opacity-60 mt-1">Coba ubah filter atau periode waktu</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 — Status Overview & Resolution Progress
          ═══════════════════════════════════════════════════════════════════ */}
      <SummarySectionCard
        badge="CGO Cargo Report"
        title="Status Overview"
        subtitle="Ringkasan status penyelesaian laporan CGO Cargo — total laporan, tingkat penyelesaian, dan distribusi status per cabang dan maskapai."
      >
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
          <KpiCard label="Total Reports" value={cgoKpi.total} icon={FileStack} accent="oklch(0.55 0.14 240)" />
          <KpiCard label="Closed" value={cgoKpi.closed} icon={CheckCircle2} accent="oklch(0.55 0.18 145)" />
          <KpiCard label="Open" value={cgoKpi.open} icon={AlertCircle} accent="oklch(0.6 0.18 25)" />
          <KpiCard label="On Progress" value={cgoKpi.onProgress} icon={Clock} accent="oklch(0.72 0.16 80)" />
          <KpiCard label="Resolution Rate" value={`${cgoKpi.resolutionRate.toFixed(1)}%`} icon={Activity} accent="oklch(0.5 0.18 160)" progress={cgoKpi.resolutionRate} />
        </div>

        {/* Status Summary — Branch & Airline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <StatusHeatmapTable title="Report Status by Branch" firstColumnLabel="Branch" rows={cgoStatusByBranch} />
          <StatusHeatmapTable title="Report Status by Airlines" firstColumnLabel="Airlines" rows={cgoStatusByAirline} />
        </div>

        {/* Detailed Status — Collapsible */}
        {cgoDetailedStatusRows.length > 0 && (
          <details className="group/details mb-6">
            <summary className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0_0_0_/_0.03)] hover:bg-[oklch(0_0_0_/_0.05)] transition-colors text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] select-none list-none">
              <svg className="w-3.5 h-3.5 transition-transform group-open/details:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              Detailed Status by Branch &amp; Airline
            </summary>
            <div className="mt-3">
              <DetailedStatusTable rows={cgoDetailedStatusRows} />
            </div>
          </details>
        )}

        {/* Area Category Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Landside Area Category</h3>
            <CategoryBarList data={cgoTerminalAreaCategoryData} color="oklch(0.65 0.18 160)" />
          </div>
          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Airside Area Category</h3>
            <CategoryBarList data={cgoApronAreaCategoryData} color="oklch(0.6 0.14 240)" />
          </div>
          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">General Service Category</h3>
            <CategoryBarList data={cgoGeneralCategoryData} color="oklch(0.8 0.15 80)" />
          </div>
        </div>
      </SummarySectionCard>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 — Case Analytics & Distribution
          ═══════════════════════════════════════════════════════════════════ */}
      <SummarySectionCard
        badge="CGO Cargo Report"
        title="Case Analytics & Distribution"
        subtitle="Distribusi laporan berdasarkan kategori kasus, cabang, maskapai, bulan, area, dan HUB — dilengkapi tabel pivot untuk cross-analysis."
      >
        {/* Bar Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col border-t-2 border-t-[oklch(0.65_0.18_160)]">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Report by Case Category</h3>
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(200, cgoCaseCategoryData.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cgoCaseCategoryData} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {cgoCaseCategoryData.map((entry, idx) => (
                        <Cell key={`cgo-cat-${idx}`} fill={entry.color} />
                      ))}
                      <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col border-t-2 border-t-[oklch(0.55_0.14_240)]">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Branch Reporting</h3>
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(200, cgoBranchData.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cgoBranchData} layout="vertical" margin={{ top: 4, right: 40, left: 20, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="branch" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={100} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Laporan" fill={REFERENCE_COLORS.irregularity} radius={[0, 4, 4, 0]} maxBarSize={20}>
                      <LabelList dataKey="count" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col border-t-2 border-t-[oklch(0.6_0.18_25)]">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Airlines Report</h3>
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(200, cgoAirlinesData.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cgoAirlinesData} layout="vertical" margin={{ top: 4, right: 40, left: 20, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="airline" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={100} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Laporan" fill={REFERENCE_COLORS.complaint} radius={[0, 4, 4, 0]} maxBarSize={16}>
                      <LabelList dataKey="count" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col border-t-2 border-t-[oklch(0.7_0.2_330)]">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Monthly Report</h3>
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(200, cgoMonthlyData.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cgoMonthlyData} layout="vertical" margin={{ top: 4, right: 40, left: 20, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="month" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={100} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Laporan" fill={CHART_PALETTE[2]} radius={[0, 4, 4, 0]} maxBarSize={16}>
                      <LabelList dataKey="count" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Category by Area + Pivot Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col border-t-2 border-t-[oklch(0.8_0.15_80)]">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Category by Area</h3>
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(220, cgoCategoryByAreaData.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cgoCategoryByAreaData} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {cgoCategoryByAreaData.map((entry, idx) => (
                        <Cell key={`cgo-area-${idx}`} fill={entry.color} />
                      ))}
                      <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Pivot: Case Category by Branch */}
          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden border-t-2 border-t-[oklch(0.65_0.18_160)]">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Case Category by Branch</h3>
            <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Report Category / Record Count</p>
            {(() => {
              const maxC = Math.max(...cgoPivotByBranch.map(r => r.complaint), 1);
              const maxI = Math.max(...cgoPivotByBranch.map(r => r.irregularity), 1);
              const maxCo = Math.max(...cgoPivotByBranch.map(r => r.compliment), 1);
              const maxTot = Math.max(...cgoPivotByBranch.map(r => r.total), 1);
              return (
                <div className="overflow-x-auto">
                  <div className="max-h-[240px] overflow-y-auto">
                    <table className="w-full text-xs min-w-[320px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100 text-black border-b border-gray-300">
                          <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px] w-32">Branch</th>
                          <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Complaint</th>
                          <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Irregularity</th>
                          <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Compliment</th>
                          <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cgoPivotByBranch.map(row => {
                          const cC = heatColor(row.complaint, maxC);
                          const iC = heatColor(row.irregularity, maxI);
                          const coC = heatColor(row.compliment, maxCo);
                          const tC = heatColor(row.total, maxTot);
                          return (
                            <tr key={row.branch} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-1.5 px-2 font-medium text-gray-800">{row.branch}</td>
                              <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: cC.bg, color: cC.fg }}>{row.complaint || '-'}</td>
                              <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: iC.bg, color: iC.fg }}>{row.irregularity || '-'}</td>
                              <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: coC.bg, color: coC.fg }}>{row.compliment || '-'}</td>
                              <td className="py-1.5 px-2 text-center font-bold" style={{ backgroundColor: tC.bg, color: tC.fg }}>{row.total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <table className="w-full text-xs min-w-[320px] border-t-2 border-gray-300">
                    <tbody>
                      <tr className="bg-gray-100 font-bold">
                        <td className="py-1.5 px-2 text-gray-800">Grand total</td>
                        <td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.complaint, 0)}</td>
                        <td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.irregularity, 0)}</td>
                        <td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.compliment, 0)}</td>
                        <td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.total, 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Pivot: Case Category by Airlines */}
          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden border-t-2 border-t-[oklch(0.6_0.14_240)]">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Case Category by Airlines</h3>
            <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Report Category / Record Count</p>
            {(() => {
              const maxC = Math.max(...cgoPivotByAirlines.map(r => r.complaint), 1);
              const maxI = Math.max(...cgoPivotByAirlines.map(r => r.irregularity), 1);
              const maxCo = Math.max(...cgoPivotByAirlines.map(r => r.compliment), 1);
              const maxTot = Math.max(...cgoPivotByAirlines.map(r => r.total), 1);
              return (
                <div className="overflow-x-auto">
                  <div className="max-h-[240px] overflow-y-auto">
                    <table className="w-full text-xs min-w-[340px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100 text-black border-b border-gray-300">
                          <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px] w-32">Airlines</th>
                          <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Complaint</th>
                          <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Irregularity</th>
                          <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Compliment</th>
                          <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cgoPivotByAirlines.map(row => {
                          const cC = heatColor(row.complaint, maxC);
                          const iC = heatColor(row.irregularity, maxI);
                          const coC = heatColor(row.compliment, maxCo);
                          const tC = heatColor(row.total, maxTot);
                          return (
                            <tr key={row.airline} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-1.5 px-2 font-medium text-gray-800 whitespace-nowrap">{row.airline}</td>
                              <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: cC.bg, color: cC.fg }}>{row.complaint || '-'}</td>
                              <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: iC.bg, color: iC.fg }}>{row.irregularity || '-'}</td>
                              <td className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: coC.bg, color: coC.fg }}>{row.compliment || '-'}</td>
                              <td className="py-1.5 px-2 text-center font-bold" style={{ backgroundColor: tC.bg, color: tC.fg }}>{row.total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <table className="w-full text-xs min-w-[340px] border-t-2 border-gray-300">
                    <tbody>
                      <tr className="bg-gray-100 font-bold">
                        <td className="py-1.5 px-2 text-gray-800">Grand total</td>
                        <td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.complaint, 0)}</td>
                        <td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.irregularity, 0)}</td>
                        <td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.compliment, 0)}</td>
                        <td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.total, 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>

        {/* HUB + Classifications Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col border-t-2 border-t-[oklch(0.67_0.16_145)]">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">HUB Report</h3>
            <div className="h-[220px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(200, cgoHubData.length * 42) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cgoHubData} layout="vertical" margin={{ top: 4, right: 28, left: 10, bottom: 4 }} barCategoryGap="26%">
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={72} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Laporan" fill="oklch(0.67 0.16 145)" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl border-t-2 border-t-[oklch(0.65_0.18_160)]">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Case Classification</h3>
            <div className="flex items-center justify-between mb-3"><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Classification</span><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total</span></div>
            <CategoryBarList data={cgoCaseClassificationData} color="oklch(0.65 0.18 160)" />
          </div>

          <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl border-t-2 border-t-[oklch(0.6_0.2_25)]">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Identification of Root</h3>
            <div className="flex items-center justify-between mb-3"><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Root Cause</span><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total</span></div>
            {cgoIdentificationOfRootData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">No data</div>
            ) : (
              <CategoryBarList data={cgoIdentificationOfRootData} color="oklch(0.65 0.18 160)" />
            )}
          </div>
        </div>
      </SummarySectionCard>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3 — Detail Report & Root Cause Analysis
          ═══════════════════════════════════════════════════════════════════ */}
      <SummarySectionCard
        badge="CGO Cargo Report"
        title="Detail Report & Root Cause Analysis"
        subtitle="Laporan detail area CGO berdasarkan cabang dan maskapai, analisis akar masalah, serta arsip laporan lengkap."
      >
        {/* Area Report Table */}
        <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden mb-6">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Area Report by Branch & Airlines</h3>
          <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Distribusi Terminal Area, Apron Area, dan General per cabang dan maskapai</p>
          {cgoCaseReportByArea.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Tidak ada data</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[260px] overflow-y-auto">
                <table className="w-full text-xs min-w-[320px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-100 text-black border-b border-gray-300">
                      <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Branch</th>
                      <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Airlines</th>
                      <th className="text-center py-2 px-1 font-black uppercase tracking-widest text-[8px]">Terminal<br/>Area</th>
                      <th className="text-center py-2 px-1 font-black uppercase tracking-widest text-[8px]">Apron<br/>Area</th>
                      <th className="text-center py-2 px-1 font-black uppercase tracking-widest text-[8px]">General</th>
                      <th className="text-center py-2 px-1 font-black uppercase tracking-widest text-[8px]">Grand<br/>total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const allRows = cgoCaseReportByArea.flatMap(b => b.airlines);
                      const maxT = Math.max(...allRows.map(a => a.terminal), 1);
                      const maxA = Math.max(...allRows.map(a => a.apron), 1);
                      const maxG = Math.max(...allRows.map(a => a.general), 1);
                      const maxTotal = Math.max(...allRows.map(a => a.total), 1);
                      return cgoCaseReportByArea.flatMap((branchRow) =>
                        branchRow.airlines.map((airline, aIdx) => {
                          const tC = heatColor(airline.terminal, maxT);
                          const aC = heatColor(airline.apron, maxA);
                          const gC = heatColor(airline.general, maxG);
                          const totC = heatColor(airline.total, maxTotal);
                          return (
                            <tr key={`${branchRow.branch}-${airline.name}`} className={`border-b border-gray-100 hover:bg-gray-50${aIdx === 0 ? ' border-t border-t-gray-300' : ''}`}>
                              <td className="py-1.5 px-1.5 font-bold text-gray-800 border-r border-gray-100 whitespace-nowrap">{aIdx === 0 ? branchRow.branch : ''}</td>
                              <td className="py-1.5 px-1.5 text-gray-700 whitespace-nowrap">{airline.name}</td>
                              <td className="py-1.5 px-1.5 text-center font-medium" style={{ backgroundColor: tC.bg, color: tC.fg }}>{airline.terminal || '-'}</td>
                              <td className="py-1.5 px-1.5 text-center font-medium" style={{ backgroundColor: aC.bg, color: aC.fg }}>{airline.apron || '-'}</td>
                              <td className="py-1.5 px-1.5 text-center font-medium" style={{ backgroundColor: gC.bg, color: gC.fg }}>{airline.general || '-'}</td>
                              <td className="py-1.5 px-1.5 text-center font-bold" style={{ backgroundColor: totC.bg, color: totC.fg }}>{airline.total}</td>
                            </tr>
                          );
                        })
                      );
                    })()}
                  </tbody>
                </table>
              </div>
              <table className="w-full text-xs min-w-[320px] border-t-2 border-gray-300">
                <tbody>
                  <tr className="bg-gray-100 font-bold">
                    <td className="py-1.5 px-1.5 text-gray-800" colSpan={2}>Grand total</td>
                    <td className="py-1.5 px-1.5 text-center text-gray-800">{cgoCaseReportByArea.reduce((s, b) => s + b.totalTerminal, 0)}</td>
                    <td className="py-1.5 px-1.5 text-center text-gray-800">{cgoCaseReportByArea.reduce((s, b) => s + b.totalApron, 0)}</td>
                    <td className="py-1.5 px-1.5 text-center text-gray-800">{cgoCaseReportByArea.reduce((s, b) => s + b.totalGeneral, 0)}</td>
                    <td className="py-1.5 px-1.5 text-center text-gray-800">{cgoCaseReportByArea.reduce((s, b) => s + b.grandTotal, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Root Cause Summary */}
        <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden mb-6">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Root Cause Summary</h3>
          <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Analisis klasifikasi kasus dan identifikasi akar masalah per cabang dan maskapai</p>
          <div className="overflow-x-auto">
            <div className="max-h-[270px] overflow-y-auto">
              <table className="w-full text-xs min-w-[760px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-100 text-black border-b border-gray-300">
                    <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Branch</th>
                    <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Airlines</th>
                    <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Case Classification</th>
                    <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Identification of Root</th>
                    <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[8px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cgoRootCauseRows.map((row, index) => {
                    const totalColor = heatColor(row.total, Math.max(...cgoRootCauseRows.map((item) => item.total), 1));
                    return (
                      <tr key={`${row.branch}-${row.airlines}-${row.category}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-1.5 px-2 text-gray-800 whitespace-nowrap">{row.branch}</td>
                        <td className="py-1.5 px-2 text-gray-800 whitespace-nowrap">{row.airlines}</td>
                        <td className="py-1.5 px-2 text-gray-700 max-w-[220px]"><p className="line-clamp-2">{row.category}</p></td>
                        <td className="py-1.5 px-2 text-gray-700 max-w-[240px]"><p className="line-clamp-2">{row.root}</p></td>
                        <td className="py-1.5 px-2 text-center font-bold" style={{ backgroundColor: totalColor.bg, color: totalColor.fg }}>{row.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Full Detail Report Table */}
        <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Detail Report CGO Cargo</h3>
          <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Arsip laporan cargo dari sheet CGO, diurutkan berdasarkan tanggal terbaru</p>
          <CGODetailReportTable data={sortedCgoReports} />
        </div>
      </SummarySectionCard>
    </div>
  );
}
