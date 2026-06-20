'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Fragment, useDeferredValue, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
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
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { Report } from '@/types';
import { useDrilldown } from '@/components/chart-detail/useDrilldown';
import { ChartAiAnalysisButton, type ChartAiContext } from '@/components/dashboard/ai/ChartAiAnalysisButton';
import { SectionAiSummaryInsightButton } from '@/components/dashboard/ai/SectionAiSummaryInsightButton';
import {
  resolveAreaType,
  resolveCaseClassification,
  resolveEvidenceLinks,
  resolveReportAirline,
  resolveReportBranch,
  resolveReportCategory,
  resolveRootCause,
} from '@/lib/report-normalization';

// ── Types & Constants ────────────────────────────────────────────────────────

interface ServiceQualityImprovementTabProps {
  reports: Report[];
}

type CountRow = { id: string; label: string; total: number };
type MatrixCell = { total: number; reports: Report[] };

const PANEL_FRAME = 'sr-table-card flex min-h-0 min-w-0 flex-col';
const DONUT_COLORS = ['var(--sr-accent)', 'var(--sr-gold)', 'var(--sr-chart-3)', 'var(--sr-chart-4)', 'var(--sr-chart-5)', 'var(--sr-neg)'];

const REPORT_CATEGORIES = ['Irregularity', 'Complaint', 'Compliment', 'Occurrence', 'Accident / Incident'] as const;
const AREA_KEYS = ['TERMINAL', 'APRON', 'CARGO', 'GENERAL', 'GSE'] as const;
const AREA_LABELS: Record<string, string> = {
  TERMINAL: 'Terminal Area',
  APRON: 'Apron Area',
  CARGO: 'Cargo Area',
  GENERAL: 'General',
  GSE: 'GSE Availability',
};

// ── Resolvers ─────────────────────────────────────────────────────────────────

function val(v: unknown): string {
  return String(v ?? '').trim();
}

function hasValue(v: unknown): boolean {
  const t = val(v).toLowerCase();
  return t !== '' && t !== '-' && t !== '#n/a' && t !== 'n/a' && t !== 'null' && t !== 'undefined' && t !== 'nil' && t !== 'unknown';
}

function getReportDate(r: Report): Date | null {
  const raw = r.date_of_event || r.event_date || r.incident_date || r.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getMonthKey(r: Report): string {
  const d = getReportDate(r);
  if (!d) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getCategory(r: Report): string {
  return resolveReportCategory(r) || 'Irregularity';
}

function getArea(r: Report): string {
  const raw = (resolveAreaType(r) || 'General').toUpperCase();
  return AREA_LABELS[raw] || raw;
}

function getBranch(r: Report): string {
  return resolveReportBranch(r) || val(r.branch) || val(r.station_code) || 'Unknown';
}

function getAirline(r: Report): string {
  return resolveReportAirline(r) || val(r.airlines) || val(r.airline) || 'Unknown';
}

function getCaseClass(r: Report): string {
  return val(resolveCaseClassification(r));
}

function getRoot(r: Report): string {
  return val(resolveRootCause(r));
}

function getStatus(r: Report): string {
  const raw = val(r.status).toUpperCase();
  return raw === 'CLOSED' ? 'CLOSED' : 'OPEN';
}

function normalizeSeverity(value: unknown): string {
  const t = val(value).toUpperCase();
  if (!t) return '-';
  if (t.includes('TOP RISK') || t === 'CRITICAL' || t === 'URGENT') return 'TOP RISK';
  if (t.includes('HIGH RISK')) return 'HIGH RISK';
  if (t === 'HIGH') return 'HIGH';
  if (t === 'MEDIUM') return 'MEDIUM';
  if (t === 'LOW') return 'LOW';
  return t;
}

function getSeverity(r: Report): string {
  return normalizeSeverity(r.severity_level || r.severity);
}

function aggregate(reports: Report[], getValue: (r: Report) => string): CountRow[] {
  const buckets = new Map<string, CountRow>();
  reports.forEach((r) => {
    const raw = getValue(r);
    if (!hasValue(raw)) return;
    const key = raw.toLowerCase();
    const existing = buckets.get(key);
    if (existing) existing.total += 1;
    else buckets.set(key, { id: key, label: raw, total: 1 });
  });
  return Array.from(buckets.values()).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

// ── Visual primitives (cloned from CGO Cargo Report) ─────────────────────────

function sqiAiContext(chartTitle: string, chartType: string, chartData: unknown): ChartAiContext {
  return {
    section: 'Service Quality Improvement',
    chartTitle,
    chartType,
    chartData,
    featureHints: chartTitle.toLowerCase().includes('root') || chartTitle.toLowerCase().includes('classification')
      ? ['rootCause', 'riskScoring', 'similaritySearch', 'actionRecommendation']
      : ['summarization', 'riskScoring'],
  };
}

function Panel({
  title,
  subtitle,
  total,
  className = '',
  bodyClassName = '',
  aiContext,
  children,
}: {
  title: string;
  subtitle?: string;
  total?: number;
  className?: string;
  bodyClassName?: string;
  aiContext?: ChartAiContext;
  children: ReactNode;
}) {
  return (
    <div className={`${PANEL_FRAME} ${className}`}>
      <div className="sr-table-caption">
        <div className="sr-table-caption-title min-w-0 !items-start">
          <span className="mt-[5px] h-[19px] w-1 shrink-0 bg-[color:var(--sr-gold)]" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold leading-snug tracking-[-0.02em] text-[color:var(--sr-text)] break-words">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {typeof total === 'number' ? (
            <span className="inline-flex items-baseline gap-1 rounded-md bg-[color:var(--sr-accent-soft)] px-2 py-0.5 text-[color:var(--sr-accent-dark)]">
              <span className="font-mono text-[13px] font-bold tabular-nums">{total}</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.12em]">cases</span>
            </span>
          ) : null}
          {aiContext ? <ChartAiAnalysisButton context={aiContext} /> : null}
        </div>
      </div>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

function KpiTile({ label, value, helper, tone = 'accent' }: { label: string; value: ReactNode; helper?: string; tone?: 'accent' | 'gold' | 'neutral' | 'neg' }) {
  const valueColor =
    tone === 'gold' ? 'var(--sr-gold-strong)' :
    tone === 'neg' ? 'var(--sr-neg-strong)' :
    tone === 'neutral' ? 'var(--sr-text)' :
    'var(--sr-accent-dark)';
  return (
    <div className="sr-table-card flex h-full min-h-[88px] flex-col justify-between gap-2 p-4">
      <div className="flex items-start gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--sr-text-3)]">
        <span className="mt-0.5 h-3 w-1 shrink-0 rounded-sm bg-[color:var(--sr-gold)]" aria-hidden="true" />
        <span className="break-words leading-tight">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-bold leading-none tabular-nums tracking-[-0.02em]" style={{ color: valueColor }}>{value}</span>
        {helper ? <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">{helper}</span> : null}
      </div>
    </div>
  );
}

function BarList({
  rows,
  emptyLabel,
  onOpen,
  limit,
}: {
  rows: CountRow[];
  emptyLabel: string;
  onOpen: (row: CountRow) => void;
  limit?: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-[7rem] items-center justify-center text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
        {emptyLabel}
      </div>
    );
  }
  const visibleRows = limit ? rows.slice(0, limit) : rows;
  const max = rows[0]?.total || 1;
  const totalValue = rows.reduce((s, r) => s + r.total, 0) || 1;

  return (
    <ol className="flex h-full flex-col gap-1.5 overflow-y-auto p-2.5">
      {visibleRows.map((row) => {
        const barPct = Math.max(4, (row.total / max) * 100);
        const sharePct = (row.total / totalValue) * 100;
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onOpen(row)}
              className="group flex w-full items-center gap-2 rounded-md border border-[color:var(--sr-border)] bg-white p-2 text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--sr-accent)] hover:shadow-[0_6px_18px_-12px_rgba(6,78,59,0.3)]"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-[12px] font-semibold leading-snug text-[color:var(--sr-text)]">{row.label}</p>
                <div className="flex items-center gap-2">
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--sr-sunken)]">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--sr-accent)] transition-all"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums text-[color:var(--sr-text-3)]">
                    {sharePct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <span className="shrink-0 font-mono text-[15px] font-bold tabular-nums leading-none text-[color:var(--sr-text)]">
                {row.total}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function HBarChart({
  rows,
  emptyLabel,
  onOpen,
  limit,
  scrollable = false,
  rowHeight = 28,
  color = 'var(--sr-accent)',
}: {
  rows: CountRow[];
  emptyLabel: string;
  onOpen: (row: CountRow) => void;
  limit?: number;
  scrollable?: boolean;
  rowHeight?: number;
  color?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-[10rem] items-center justify-center text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
        {emptyLabel}
      </div>
    );
  }
  const data = limit ? rows.slice(0, limit) : rows;
  const longest = data.reduce((m, r) => Math.max(m, r.label.length), 0);
  const yAxisWidth = Math.min(140, Math.max(60, longest * 6));
  const chartHeight = scrollable ? Math.max(data.length * rowHeight + 40, 200) : '100%';
  const outerClass = scrollable ? 'h-full overflow-y-auto overflow-x-hidden p-2.5' : 'h-full min-h-[10rem] p-2.5';

  return (
    <div className={outerClass}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="var(--sr-border)" />
          <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--sr-text-3)' }} />
          <YAxis type="category" dataKey="label" width={yAxisWidth} interval={0} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--sr-text)' }} />
          <Tooltip cursor={{ fill: 'var(--sr-accent-tint)' }} contentStyle={{ borderRadius: 4, borderColor: 'var(--sr-border-strong)', fontSize: 11 }} />
          <Bar
            dataKey="total"
            fill={color}
            radius={[0, 4, 4, 0]}
            barSize={16}
            cursor="pointer"
            onClick={(value: unknown) => {
              const payload = (value as { payload?: CountRow } | undefined)?.payload;
              if (payload) onOpen(payload);
            }}
          >
            <LabelList dataKey="total" position="right" style={{ fill: 'var(--sr-text)', fontSize: 10, fontWeight: 800 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Donut({ rows, onOpen }: { rows: CountRow[]; onOpen: (row: CountRow) => void }) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  if (total === 0) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
        No data available
      </div>
    );
  }
  return (
    <div className="grid h-full grid-cols-[1fr_minmax(0,1.1fr)] items-stretch gap-2 p-2.5">
      <div className="relative flex min-h-0 items-center justify-center">
        <ResponsiveContainer width="100%" height="100%" minHeight={120}>
          <PieChart>
            <Pie
              data={rows}
              dataKey="total"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="92%"
              stroke="var(--sr-raised)"
              strokeWidth={2}
              cursor="pointer"
              onClick={(value: unknown) => {
                const payload = (value as { payload?: CountRow } | undefined)?.payload;
                if (payload) onOpen(payload);
              }}
            >
              {rows.map((row, idx) => (
                <Cell key={row.id} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 4, borderColor: 'var(--sr-border-strong)', fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[18px] font-bold leading-none tabular-nums text-[color:var(--sr-text)]">{total}</span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">Total</span>
        </div>
      </div>
      <ul className="flex flex-col gap-1 overflow-y-auto">
        {rows.map((row, idx) => (
          <li key={row.id} className="flex items-center justify-between gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => onOpen(row)}
              className="flex min-w-0 items-center gap-1.5 text-left hover:text-[color:var(--sr-accent-dark)]"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
              <span className="truncate font-semibold text-[color:var(--sr-text-2)]">{row.label}</span>
            </button>
            <span className="shrink-0 font-mono text-[12px] font-bold tabular-nums text-[color:var(--sr-text)]">{row.total}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeatMatrix({
  rowKeys,
  rowLabel,
  colKeys,
  cells,
  onOpen,
}: {
  rowKeys: { id: string; label: string }[];
  rowLabel: string;
  colKeys: { id: string; label: string }[];
  cells: Record<string, Record<string, MatrixCell>>;
  onOpen: (reports: Report[], context: string) => void;
}) {
  if (rowKeys.length === 0) {
    return (
      <div className="flex min-h-[9rem] items-center justify-center text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
        No data available
      </div>
    );
  }

  let max = 0;
  rowKeys.forEach((r) =>
    colKeys.forEach((c) => {
      max = Math.max(max, cells[r.id]?.[c.id]?.total || 0);
    })
  );

  const shade = (v: number) => {
    if (!v || !max) return 'transparent';
    const intensity = Math.min(0.95, 0.12 + (v / max) * 0.65);
    return `rgba(6, 78, 59, ${intensity.toFixed(3)})`;
  };

  const colTotals = colKeys.map((c) =>
    rowKeys.reduce((sum, r) => sum + (cells[r.id]?.[c.id]?.total || 0), 0)
  );

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden p-2.5">
      <table className="sr-table text-[11px]" style={{ width: '100%', minWidth: 0, tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th className="!text-left" style={{ width: '32%', whiteSpace: 'normal' }}>{rowLabel}</th>
            {colKeys.map((c) => (
              <th key={c.id} className="sr-center" style={{ whiteSpace: 'normal' }}>{c.label}</th>
            ))}
            <th className="sr-center" style={{ whiteSpace: 'normal' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rowKeys.map((r) => {
            const rowTotal = colKeys.reduce((sum, c) => sum + (cells[r.id]?.[c.id]?.total || 0), 0);
            return (
              <tr key={r.id}>
                <td
                  className="sr-label leading-tight !bg-[color:var(--sr-overlay)] font-bold"
                  style={{ verticalAlign: 'middle', paddingTop: 8, paddingBottom: 8, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {r.label}
                </td>
                {colKeys.map((c) => {
                  const cell = cells[r.id]?.[c.id];
                  const v = cell?.total || 0;
                  const fg = v / Math.max(1, max) > 0.5 ? 'white' : 'var(--sr-text)';
                  return (
                    <td key={c.id} className="sr-center align-middle !p-0">
                      <button
                        type="button"
                        disabled={!v}
                        onClick={() => onOpen(cell?.reports || [], `${r.label} · ${c.label}`)}
                        className="h-full w-full px-2 py-2 font-mono text-[13px] font-bold tabular-nums transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-100"
                        style={{ backgroundColor: shade(v), color: v ? fg : 'var(--sr-text-3)' }}
                      >
                        {v || '–'}
                      </button>
                    </td>
                  );
                })}
                <td className="sr-center align-middle font-mono text-[13px] font-bold tabular-nums">{rowTotal}</td>
              </tr>
            );
          })}
          <tr>
            <td className="sr-label !bg-[color:var(--sr-overlay)] font-bold uppercase tracking-[0.06em]" style={{ verticalAlign: 'middle' }}>
              Grand Total
            </td>
            {colKeys.map((c, idx) => (
              <td key={c.id} className="sr-center align-middle !bg-[color:var(--sr-overlay)] font-mono text-[13px] font-bold tabular-nums">
                {colTotals[idx]}
              </td>
            ))}
            <td className="sr-center align-middle !bg-[color:var(--sr-overlay)] font-mono text-[13px] font-bold tabular-nums">
              {colTotals.reduce((s, v) => s + v, 0)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Detail Report Table ───────────────────────────────────────────────────────

type DetailRow = {
  id: string;
  ts: number;
  date: string;
  branch: string;
  airline: string;
  category: string;
  area: string;
  caseClass: string;
  rootCause: string;
  actionTaken: string;
  preventive: string;
  severity: string;
  status: string;
  report: string;
  evidenceLinks: string[];
};

function buildDetailRow(r: Report): DetailRow {
  const d = getReportDate(r);
  return {
    id: r.id || r.original_id || `${r.row_number ?? Math.random()}`,
    ts: d ? d.getTime() : 0,
    date: d ? d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    branch: getBranch(r),
    airline: getAirline(r),
    category: getCategory(r),
    area: getArea(r),
    caseClass: getCaseClass(r) || '—',
    rootCause: getRoot(r) || '—',
    actionTaken: val(r.action_taken) || '—',
    preventive: val(r.preventive_action) || '—',
    severity: getSeverity(r),
    status: getStatus(r),
    report: val(r.report) || val(r.description) || '—',
    evidenceLinks: resolveEvidenceLinks(r),
  };
}

function SeverityChip({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    'TOP RISK': 'bg-[color:var(--sr-neg-soft)] text-[color:var(--sr-neg-strong)]',
    'HIGH RISK': 'bg-[color:var(--sr-gold-soft)] text-[color:var(--sr-gold-strong)]',
    'HIGH': 'bg-[color:var(--sr-gold-soft)] text-[color:var(--sr-gold-strong)]',
    'MEDIUM': 'bg-[color:var(--sr-sunken)] text-[color:var(--sr-text-2)]',
    'LOW': 'bg-[color:var(--sr-accent-soft)] text-[color:var(--sr-accent-dark)]',
    '-': 'bg-[color:var(--sr-sunken)] text-[color:var(--sr-text-3)]',
  };
  return (
    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${styles[severity] || styles['-']}`}>
      {severity}
    </span>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[7rem] rounded-lg border border-[color:var(--sr-border)] bg-[color:var(--sr-raised)] p-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-accent-dark)]">
        <span className="h-3 w-1 rounded-sm bg-[color:var(--sr-gold)]" aria-hidden="true" />
        {label}
      </div>
      <div className="whitespace-pre-wrap break-words text-[12px] font-medium leading-snug text-[color:var(--sr-text)]">
        {value || '–'}
      </div>
    </div>
  );
}

function formatEvidenceLabel(link: string, index: number) {
  try {
    const url = new URL(link);
    if (url.hostname.includes('sharepoint')) return `SharePoint ${index + 1}`;
    return `${url.hostname.replace(/^www\./, '')} ${index + 1}`;
  } catch {
    return `Evidence ${index + 1}`;
  }
}

function DetailTable({ rows }: { rows: DetailRow[] }) {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const start = rows.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const end = Math.min(rows.length, safePage * PAGE_SIZE + pageRows.length);

  const tdStyle: CSSProperties = {
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    padding: '8px 10px',
    verticalAlign: 'top',
    fontSize: 12,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <table className="sr-table text-[12px]" style={{ width: '100%', minWidth: 0, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '10%', whiteSpace: 'normal' }} className="!text-left">Date</th>
              <th style={{ width: '7%', whiteSpace: 'normal' }} className="!text-left">Branch</th>
              <th style={{ width: '13%', whiteSpace: 'normal' }} className="!text-left">Airlines</th>
              <th style={{ width: '11%', whiteSpace: 'normal' }} className="!text-left">Category</th>
              <th style={{ width: '11%', whiteSpace: 'normal' }} className="!text-left">Area</th>
              <th style={{ whiteSpace: 'normal' }} className="!text-left">Case Classification</th>
              <th style={{ width: '9%', whiteSpace: 'normal' }} className="sr-center">Severity</th>
              <th style={{ width: '8%', whiteSpace: 'normal' }} className="sr-center">Status</th>
              <th style={{ width: '9%', whiteSpace: 'normal' }} className="sr-center">Details</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="!py-10 text-center text-[12px] font-medium text-[color:var(--sr-text-3)]">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const isExpanded = expandedId === row.id;
                const statusClass = row.status === 'CLOSED'
                  ? 'bg-[color:var(--sr-accent-soft)] text-[color:var(--sr-accent-dark)]'
                  : 'bg-[color:var(--sr-sunken)] text-[color:var(--sr-text-2)]';
                return (
                  <Fragment key={row.id}>
                    <tr className={isExpanded ? '!bg-[color:var(--sr-accent-soft)]' : ''}>
                      <td className="font-mono tabular-nums" style={tdStyle}>{row.date}</td>
                      <td className="font-bold" style={tdStyle}>{row.branch}</td>
                      <td style={tdStyle}>{row.airline}</td>
                      <td style={tdStyle}>{row.category}</td>
                      <td style={tdStyle}>{row.area}</td>
                      <td style={tdStyle}>
                        <span className="block leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {row.caseClass}
                        </span>
                      </td>
                      <td className="sr-center" style={{ ...tdStyle, textAlign: 'center' }}>
                        <SeverityChip severity={row.severity} />
                      </td>
                      <td className="sr-center" style={{ ...tdStyle, textAlign: 'center' }}>
                        <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${statusClass}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="sr-center" style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                          className={`inline-flex h-6 items-center justify-center rounded-md px-2 text-[10px] font-bold uppercase tracking-[0.04em] transition-colors ${
                            isExpanded
                              ? 'bg-[color:var(--sr-sunken)] text-[color:var(--sr-text-2)] hover:bg-[color:var(--sr-border)]'
                              : 'bg-[color:var(--sr-accent)] text-white hover:bg-[color:var(--sr-accent-strong)]'
                          }`}
                        >
                          {isExpanded ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr>
                        <td colSpan={9} className="!bg-[color:var(--sr-sunken)] !p-0">
                          <div className="border-l-4 border-[color:var(--sr-accent)] p-5">
                            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                              <DetailBlock label="Report" value={row.report} />
                              <DetailBlock label="Root Cause" value={row.rootCause} />
                              <DetailBlock label="Action Taken" value={row.actionTaken} />
                              <DetailBlock label="Preventive Action" value={row.preventive} />
                              <DetailBlock label="Status / Severity" value={`${row.status} / ${row.severity}`} />
                              <DetailBlock label="Category / Area" value={`${row.category} / ${row.area}`} />
                            </div>
                            {row.evidenceLinks.length > 0 ? (
                              <div className="mt-4 rounded-lg border border-[color:var(--sr-border)] bg-[color:var(--sr-raised)] p-3">
                                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-accent-dark)]">
                                  <span className="h-3 w-1 rounded-sm bg-[color:var(--sr-gold)]" aria-hidden="true" />
                                  Evidence Links
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {row.evidenceLinks.map((link, i) => (
                                    <a
                                      key={`${row.id}-evidence-${i}`}
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex max-w-[15rem] items-center gap-1.5 truncate rounded-md border border-[color:var(--sr-accent)] bg-[color:var(--sr-accent)] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-[color:var(--sr-accent-strong)]"
                                    >
                                      <ExternalLink size={12} />
                                      <span className="truncate">{formatEvidenceLabel(link, i)}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {rows.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between border-t border-[color:var(--sr-border)] bg-[color:var(--sr-overlay)] px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
          <span>{start}-{end} of {rows.length}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="inline-flex h-9 w-9 items-center justify-center border border-[color:var(--sr-border)] bg-[color:var(--sr-raised)] text-[color:var(--sr-text)] disabled:opacity-35"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="min-w-[4rem] text-center">{safePage + 1}/{totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="inline-flex h-9 w-9 items-center justify-center border border-[color:var(--sr-border)] bg-[color:var(--sr-raised)] text-[color:var(--sr-text)] disabled:opacity-35"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ServiceQualityImprovementTab({ reports }: ServiceQualityImprovementTabProps) {
  const { openDrilldown, DrilldownRenderer } = useDrilldown();
  const [liveSheetReports, setLiveSheetReports] = useState<Report[] | null>(null);
  const [liveSheetError, setLiveSheetError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadLiveSheetReports() {
      try {
        setLiveSheetError(null);
        const response = await fetch('/api/admin/reports?source=sheets', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`Failed to load live Google Sheets reports (${response.status})`);
        const payload = await response.json();
        setLiveSheetReports(Array.isArray(payload) ? payload : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLiveSheetError(error instanceof Error ? error.message : 'Failed to load live Google Sheets reports');
        setLiveSheetReports(null);
      }
    }
    loadLiveSheetReports();
    return () => controller.abort();
  }, []);

  const baseReports = liveSheetReports ?? reports;
  const deferredReports = useDeferredValue(baseReports);

  const filteredSourceReports = useMemo(
    () =>
      deferredReports.filter((report) => {
        const serviceType = val(report.service_business_type).toLowerCase();
        return (
          val(report.source_sheet).toUpperCase() !== 'CGO' &&
          serviceType !== 'joumpa service' &&
          serviceType !== 'gse service performance'
        );
      }),
    [deferredReports]
  );

  const scopedReports = useMemo(() => {
    if (!dateFrom && !dateTo) return filteredSourceReports;
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Infinity;
    return filteredSourceReports.filter((r) => {
      const d = getReportDate(r);
      if (!d) return false;
      const t = d.getTime();
      return t >= fromTs && t <= toTs;
    });
  }, [filteredSourceReports, dateFrom, dateTo]);

  // Year toggle for monthly trend
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const [monthlyYear, setMonthlyYear] = useState<number>(currentYear);

  const monthlyRows = useMemo<CountRow[]>(() => {
    const counts = new Array(12).fill(0);
    scopedReports.forEach((r) => {
      const d = getReportDate(r);
      if (!d || d.getFullYear() !== monthlyYear) return;
      counts[d.getMonth()] += 1;
    });
    return counts.map((total, idx) => ({
      id: `${monthlyYear}-${String(idx + 1).padStart(2, '0')}`,
      label: new Date(Date.UTC(monthlyYear, idx, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      total,
    }));
  }, [scopedReports, monthlyYear]);

  // Aggregations
  const reportCategoryRows = useMemo<CountRow[]>(() => {
    const bucket: Record<string, number> = {};
    scopedReports.forEach((r) => {
      const c = getCategory(r);
      bucket[c] = (bucket[c] || 0) + 1;
    });
    return REPORT_CATEGORIES
      .map((name) => ({ id: name.toLowerCase(), label: name, total: bucket[name] || 0 }))
      .filter((r) => r.total > 0);
  }, [scopedReports]);

  const areaRows = useMemo<CountRow[]>(() => aggregate(scopedReports, getArea), [scopedReports]);
  const caseClassRows = useMemo<CountRow[]>(() => aggregate(scopedReports, getCaseClass), [scopedReports]);
  const branchRows = useMemo<CountRow[]>(() => aggregate(scopedReports, getBranch), [scopedReports]);
  const airlineRows = useMemo<CountRow[]>(() => aggregate(scopedReports, getAirline), [scopedReports]);
  const rootRows = useMemo<CountRow[]>(() => {
    // Root cause matters most when issue is non-compliment
    const nonCompliment = scopedReports.filter((r) => !getCategory(r).toLowerCase().includes('compliment'));
    return aggregate(nonCompliment, getRoot);
  }, [scopedReports]);

  // Heat matrices
  const caseByArea = useMemo(() => {
    const cells: Record<string, Record<string, MatrixCell>> = {};
    scopedReports.forEach((r) => {
      const cc = getCaseClass(r);
      const area = getArea(r);
      if (!hasValue(cc) || !hasValue(area)) return;
      const ck = cc.toLowerCase();
      if (!cells[ck]) cells[ck] = {};
      if (!cells[ck][area]) cells[ck][area] = { total: 0, reports: [] };
      cells[ck][area].total += 1;
      cells[ck][area].reports.push(r);
    });
    return cells;
  }, [scopedReports]);

  const branchByCategory = useMemo(() => {
    const cells: Record<string, Record<string, MatrixCell>> = {};
    scopedReports.forEach((r) => {
      const branch = getBranch(r);
      const cat = getCategory(r);
      if (!hasValue(branch)) return;
      const bk = branch.toLowerCase();
      if (!cells[bk]) cells[bk] = {};
      if (!cells[bk][cat]) cells[bk][cat] = { total: 0, reports: [] };
      cells[bk][cat].total += 1;
      cells[bk][cat].reports.push(r);
    });
    return cells;
  }, [scopedReports]);

  const caseClassKeys = useMemo(() => caseClassRows.slice(0, 12).map((r) => ({ id: r.id, label: r.label })), [caseClassRows]);
  const presentCategoryCols = useMemo(
    () => reportCategoryRows.map((r) => ({ id: r.label, label: r.label })),
    [reportCategoryRows]
  );
  const presentAreaCols = useMemo(() => areaRows.map((r) => ({ id: r.label, label: r.label })), [areaRows]);
  const branchKeys = useMemo(() => branchRows.slice(0, 12).map((r) => ({ id: r.id, label: r.label })), [branchRows]);

  const detailRows = useMemo(
    () => scopedReports.map(buildDetailRow).sort((a, b) => b.ts - a.ts),
    [scopedReports]
  );

  // === Closure Discipline ===
  // For CLOSED reports, do we actually document the response? An undocumented
  // close is a process gap, not a real resolution.
  const closureDiscipline = useMemo(() => {
    const closedReports = scopedReports.filter((r) => getStatus(r) === 'CLOSED');
    const denom = closedReports.length || 1;
    const noAction = closedReports.filter((r) => !hasValue(r.action_taken) && !hasValue(r.gapura_kps_action_taken)).length;
    const noPreventive = closedReports.filter((r) => !hasValue(r.preventive_action)).length;
    const noRemarks = closedReports.filter((r) => !hasValue(r.final_remarks)).length;
    const fullyDocumented = closedReports.filter((r) =>
      (hasValue(r.action_taken) || hasValue(r.gapura_kps_action_taken)) &&
      hasValue(r.preventive_action) &&
      hasValue(r.final_remarks)
    ).length;
    return {
      closedTotal: closedReports.length,
      fullyDocumentedPct: ((fullyDocumented / denom) * 100).toFixed(0),
      noActionPct: ((noAction / denom) * 100).toFixed(0),
      noPreventivePct: ((noPreventive / denom) * 100).toFixed(0),
      noRemarksPct: ((noRemarks / denom) * 100).toFixed(0),
      closedReports,
    };
  }, [scopedReports]);

  // Branches ranked by share of CLOSED reports missing at least one of the
  // three documentation fields.
  const branchClosureGapRows = useMemo<CountRow[]>(() => {
    const perBranch = new Map<string, { branch: string; total: number; gaps: number }>();
    closureDiscipline.closedReports.forEach((r) => {
      const branch = getBranch(r);
      if (!hasValue(branch)) return;
      const key = branch.toLowerCase();
      const bucket = perBranch.get(key) || { branch, total: 0, gaps: 0 };
      bucket.total += 1;
      const hasAction = hasValue(r.action_taken) || hasValue(r.gapura_kps_action_taken);
      const hasPreventive = hasValue(r.preventive_action);
      const hasRemarks = hasValue(r.final_remarks);
      if (!hasAction || !hasPreventive || !hasRemarks) bucket.gaps += 1;
      perBranch.set(key, bucket);
    });
    return Array.from(perBranch.entries())
      .filter(([, v]) => v.total >= 3) // suppress small-sample noise
      .map(([id, v]) => ({ id, label: `${v.branch} (${v.gaps}/${v.total})`, total: v.gaps }))
      .sort((a, b) => b.total - a.total);
  }, [closureDiscipline.closedReports]);

  // === Chronic Issues ===
  // (Branch × Sub-Category) combos that appear in 3+ distinct calendar months.
  // Sub-category is read from whichever of Terminal/Apron/General Category is
  // populated for the row — this preserves the taxonomy the analyst chose.
  type ChronicRow = {
    branch: string;
    subCategory: string;
    monthsCount: number;
    total: number;
    reports: Report[];
  };
  const chronicIssueRows = useMemo<ChronicRow[]>(() => {
    const subCategoryOf = (r: Report): string =>
      val(r.terminal_area_category) || val(r.apron_area_category) || val(r.general_category) || '';
    const buckets = new Map<string, { branch: string; subCategory: string; months: Set<string>; reports: Report[] }>();
    scopedReports.forEach((r) => {
      const branch = getBranch(r);
      const sub = subCategoryOf(r);
      const monthKey = getMonthKey(r);
      if (!hasValue(branch) || !hasValue(sub) || !monthKey) return;
      const key = `${branch.toLowerCase()}::${sub.toLowerCase()}`;
      const bucket = buckets.get(key) || { branch, subCategory: sub, months: new Set<string>(), reports: [] };
      bucket.months.add(monthKey);
      bucket.reports.push(r);
      buckets.set(key, bucket);
    });
    return Array.from(buckets.values())
      .filter((b) => b.months.size >= 3)
      .map((b) => ({
        branch: b.branch,
        subCategory: b.subCategory,
        monthsCount: b.months.size,
        total: b.reports.length,
        reports: b.reports,
      }))
      .sort((a, b) => b.monthsCount - a.monthsCount || b.total - a.total);
  }, [scopedReports]);

  // KPI calculations
  const closed = scopedReports.filter((r) => getStatus(r) === 'CLOSED').length;
  const open = scopedReports.length - closed;
  const resolutionPct = scopedReports.length > 0 ? ((closed / scopedReports.length) * 100).toFixed(1) : '0.0';
  const topRisk = scopedReports.filter((r) => {
    const s = getSeverity(r);
    return s === 'TOP RISK' || s === 'HIGH RISK' || s === 'HIGH';
  }).length;
  const topBranch = branchRows[0]?.label || '—';
  const topBranchCount = branchRows[0]?.total || 0;

  const sectionAiContext = useMemo(() => ({
    section: 'Service Quality Improvement',
    title: 'Service Quality Improvement',
    chartTitle: 'Service Quality Improvement',
    chartType: 'sqi_overview',
    chartData: [
      ...monthlyRows.map((r) => ({ label: `Month ${r.label}`, value: r.total })),
      ...caseClassRows.slice(0, 10).map((r) => ({ label: `Case ${r.label}`, value: r.total })),
      ...rootRows.slice(0, 10).map((r) => ({ label: `Root ${r.label}`, value: r.total })),
      ...branchRows.slice(0, 10).map((r) => ({ label: `Branch ${r.label}`, value: r.total })),
    ],
    featureHints: ['rootCause', 'riskScoring', 'similaritySearch', 'actionRecommendation', 'summarization'],
  }), [monthlyRows, caseClassRows, rootRows, branchRows]);

  return (
    <div className="sr-scope space-y-6 bg-[color:var(--sr-canvas)] px-4 py-6 pb-10 text-[color:var(--sr-text)] sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sr-card relative flex flex-col gap-4 overflow-hidden px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="absolute inset-x-0 top-0 h-[5px] bg-[color:var(--sr-accent)]" aria-hidden="true" />
        <div className="flex min-w-0 items-center gap-4">
          <span className="inline-block h-12 w-[6px] shrink-0 rounded bg-[color:var(--sr-accent)] shadow-[5px_0_0_var(--sr-gold)]" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(26px,2.4vw,34px)] font-bold leading-tight tracking-[-0.02em] text-[color:var(--sr-text)]">
              Service Quality Improvement
            </h1>
            <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[color:var(--sr-text-3)]">
              {scopedReports.length} reports · {caseClassRows.length} case types · {branchRows.length} branches · {airlineRows.length} airlines
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="sqi-date-from" className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">From</label>
            <input id="sqi-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-[color:var(--sr-border)] bg-[color:var(--sr-raised)] px-2.5 py-1.5 text-[12px] font-semibold text-[color:var(--sr-text)] focus:border-[color:var(--sr-accent)] focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="sqi-date-to" className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">To</label>
            <input id="sqi-date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-[color:var(--sr-border)] bg-[color:var(--sr-raised)] px-2.5 py-1.5 text-[12px] font-semibold text-[color:var(--sr-text)] focus:border-[color:var(--sr-accent)] focus:outline-none" />
          </div>
          {dateFrom || dateTo ? (
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="rounded-md border border-[color:var(--sr-border)] bg-[color:var(--sr-sunken)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--sr-text-2)] transition-colors hover:bg-[color:var(--sr-border)]"
            >
              Clear
            </button>
          ) : null}
          <SectionAiSummaryInsightButton context={sectionAiContext} />
        </div>
      </div>

      {liveSheetError ? (
        <div className="border border-[color:var(--sr-border)] bg-white px-3 py-2 text-[11px] font-bold text-[color:var(--sr-gold-strong)]">
          {liveSheetError}. Fallback dataset aktif.
        </div>
      ) : null}

      {/* Key Metrics */}
      <section>
        <div className="sr-section-h">
          <span className="sr-section-rule" aria-hidden="true" />
          <h2>Key Metrics</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiTile label="Total Reports" value={scopedReports.length} helper="in scope" tone="neutral" />
          <KpiTile label="Resolution Rate" value={`${resolutionPct}%`} helper={`${closed} closed / ${open} open`} tone="accent" />
          <KpiTile label="High / Top Risk" value={topRisk} helper={`${scopedReports.length > 0 ? ((topRisk / scopedReports.length) * 100).toFixed(0) : 0}% of total`} tone="neg" />
          <KpiTile label="Top Branch" value={topBranch} helper={`${topBranchCount} reports`} tone="gold" />
        </div>
      </section>

      {/* Volume Overview */}
      <section>
        <div className="sr-section-h">
          <span className="sr-section-rule" aria-hidden="true" />
          <h2>Volume Overview</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Panel
            title="Monthly Report"
            total={monthlyRows.reduce((s, r) => s + r.total, 0)}
            className="h-[18rem]"
            aiContext={sqiAiContext('Monthly Report', 'monthly_volume', monthlyRows)}
          >
            <div className="mb-2 flex justify-center gap-1">
              {[previousYear, currentYear].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setMonthlyYear(y)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums transition-colors ${
                    monthlyYear === y
                      ? 'bg-[color:var(--sr-accent)] text-white'
                      : 'bg-[color:var(--sr-sunken)] text-[color:var(--sr-text-2)] hover:bg-[color:var(--sr-border)]'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
            <HBarChart
              rows={monthlyRows}
              emptyLabel="No monthly data"
              scrollable
              onOpen={(row) =>
                openDrilldown(
                  scopedReports.filter((r) => {
                    const d = getReportDate(r);
                    if (!d || d.getFullYear() !== monthlyYear) return false;
                    return `${monthlyYear}-${String(d.getMonth() + 1).padStart(2, '0')}` === row.id;
                  }),
                  `Month: ${row.label} ${monthlyYear}`
                )
              }
            />
          </Panel>

          <Panel
            title="Top Case Classifications"
            total={caseClassRows.reduce((s, r) => s + r.total, 0)}
            className="h-[18rem]"
            aiContext={sqiAiContext('Top Case Classifications', 'case_classification_bar', caseClassRows.slice(0, 10))}
          >
            <BarList
              rows={caseClassRows}
              emptyLabel="No classification data"
              limit={10}
              onOpen={(row) => openDrilldown(scopedReports.filter((r) => getCaseClass(r).toLowerCase() === row.id), `Case: ${row.label}`)}
            />
          </Panel>

          <Panel
            title="Report by Category"
            total={reportCategoryRows.reduce((s, r) => s + r.total, 0)}
            className="h-[18rem]"
            aiContext={sqiAiContext('Report by Category', 'category_donut', reportCategoryRows)}
          >
            <Donut
              rows={reportCategoryRows}
              onOpen={(row) => openDrilldown(scopedReports.filter((r) => getCategory(r) === row.label), `Category: ${row.label}`)}
            />
          </Panel>

          <Panel
            title="Report by Area"
            total={areaRows.reduce((s, r) => s + r.total, 0)}
            className="h-[18rem]"
            aiContext={sqiAiContext('Report by Area', 'area_donut', areaRows)}
          >
            <Donut
              rows={areaRows}
              onOpen={(row) => openDrilldown(scopedReports.filter((r) => getArea(r) === row.label), `Area: ${row.label}`)}
            />
          </Panel>
        </div>
      </section>

      {/* Where & Who */}
      <section>
        <div className="sr-section-h">
          <span className="sr-section-rule" aria-hidden="true" />
          <h2>Where &amp; Who</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Panel
            title="Reports by Station"
            total={branchRows.reduce((s, r) => s + r.total, 0)}
            className="h-[22rem]"
            aiContext={sqiAiContext('Reports by Station', 'station_bar', branchRows)}
          >
            <HBarChart
              rows={branchRows}
              emptyLabel="No station data"
              scrollable
              limit={20}
              onOpen={(row) => openDrilldown(scopedReports.filter((r) => getBranch(r).toLowerCase() === row.id), `Station: ${row.label}`)}
            />
          </Panel>

          <Panel
            title="Reports by Airlines"
            total={airlineRows.reduce((s, r) => s + r.total, 0)}
            className="h-[22rem]"
            aiContext={sqiAiContext('Reports by Airlines', 'airline_bar', airlineRows)}
          >
            <HBarChart
              rows={airlineRows}
              emptyLabel="No airline data"
              scrollable
              limit={20}
              color="var(--sr-gold-strong)"
              onOpen={(row) => openDrilldown(scopedReports.filter((r) => getAirline(r).toLowerCase() === row.id), `Airline: ${row.label}`)}
            />
          </Panel>
        </div>
      </section>

      {/* Root Cause Analysis */}
      <section>
        <div className="sr-section-h">
          <span className="sr-section-rule" aria-hidden="true" />
          <h2>Root Cause Analysis</h2>
        </div>
        <Panel
          title="Identification of Root"
          total={rootRows.reduce((s, r) => s + r.total, 0)}
          className="h-[26rem]"
          aiContext={sqiAiContext('Identification of Root', 'root_cause_bar', rootRows.slice(0, 25))}
        >
          <BarList
            rows={rootRows}
            emptyLabel="No root cause data"
            limit={25}
            onOpen={(row) => openDrilldown(scopedReports.filter((r) => getRoot(r).toLowerCase() === row.id), `Root: ${row.label}`)}
          />
        </Panel>
      </section>

      {/* Cross-Tab Analysis */}
      <section>
        <div className="sr-section-h">
          <span className="sr-section-rule" aria-hidden="true" />
          <h2>Cross-Tab Analysis</h2>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel
            title="Where Each Case Type Strikes Most"
            className="h-[26rem]"
            aiContext={sqiAiContext('Case Classification x Area', 'pivot_table', { keys: caseClassKeys, cols: presentAreaCols })}
            bodyClassName="overflow-hidden"
          >
            <HeatMatrix
              rowKeys={caseClassKeys}
              rowLabel="Case Classification"
              colKeys={presentAreaCols}
              cells={caseByArea}
              onOpen={(rs, ctx) => openDrilldown(rs, ctx)}
            />
          </Panel>

          <Panel
            title="Station Hotspots by Report Category"
            className="h-[26rem]"
            aiContext={sqiAiContext('Station x Report Category', 'pivot_table', { keys: branchKeys, cols: presentCategoryCols })}
            bodyClassName="overflow-hidden"
          >
            <HeatMatrix
              rowKeys={branchKeys}
              rowLabel="Branch"
              colKeys={presentCategoryCols}
              cells={branchByCategory}
              onOpen={(rs, ctx) => openDrilldown(rs, ctx)}
            />
          </Panel>
        </div>
      </section>

      {/* Closure Discipline */}
      <section>
        <div className="sr-section-h">
          <span className="sr-section-rule" aria-hidden="true" />
          <h2>Closure Discipline</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Fully Documented Closures"
            value={`${closureDiscipline.fullyDocumentedPct}%`}
            helper={`${closureDiscipline.closedTotal} closed cases in scope`}
            tone="accent"
          />
          <KpiTile
            label="Closed without Action Taken"
            value={`${closureDiscipline.noActionPct}%`}
            helper="No action recorded at closure"
            tone={Number(closureDiscipline.noActionPct) >= 20 ? 'neg' : 'neutral'}
          />
          <KpiTile
            label="Closed without Preventive Action"
            value={`${closureDiscipline.noPreventivePct}%`}
            helper="Recurrence risk left on the table"
            tone={Number(closureDiscipline.noPreventivePct) >= 20 ? 'neg' : 'neutral'}
          />
          <KpiTile
            label="Closed without Final Remarks"
            value={`${closureDiscipline.noRemarksPct}%`}
            helper="Closures with no narrative"
            tone={Number(closureDiscipline.noRemarksPct) >= 20 ? 'neg' : 'neutral'}
          />
        </div>
        <div className="mt-3">
          <Panel
            title="Branches with the Most Undocumented Closures"
            total={branchClosureGapRows.reduce((s, r) => s + r.total, 0)}
            className="h-[26rem]"
            aiContext={sqiAiContext('Branches with Undocumented Closures', 'closure_gap_bar', branchClosureGapRows.slice(0, 20))}
          >
            <HBarChart
              rows={branchClosureGapRows}
              emptyLabel="No undocumented closures detected"
              scrollable
              limit={20}
              color="var(--sr-neg)"
              onOpen={(row) => {
                const branchKey = row.id;
                openDrilldown(
                  closureDiscipline.closedReports.filter((r) => {
                    if (getBranch(r).toLowerCase() !== branchKey) return false;
                    const hasAction = hasValue(r.action_taken) || hasValue(r.gapura_kps_action_taken);
                    return !hasAction || !hasValue(r.preventive_action) || !hasValue(r.final_remarks);
                  }),
                  `Undocumented closures · ${row.label}`
                );
              }}
            />
          </Panel>
        </div>
      </section>

      {/* Chronic Issues */}
      <section>
        <div className="sr-section-h">
          <span className="sr-section-rule" aria-hidden="true" />
          <h2>Chronic Issues</h2>
        </div>
        <Panel
          title="Recurring Issues by Branch & Sub-Category"
          total={chronicIssueRows.length}
          className="h-[28rem]"
          aiContext={sqiAiContext('Chronic Issues', 'chronic_issues_table', chronicIssueRows.slice(0, 20).map((r) => ({
            branch: r.branch,
            sub_category: r.subCategory,
            months: r.monthsCount,
            total: r.total,
          })))}
          bodyClassName="overflow-hidden"
        >
          {chronicIssueRows.length === 0 ? (
            <div className="flex h-full min-h-[12rem] items-center justify-center text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
              No recurring patterns detected
            </div>
          ) : (
            <div className="h-full overflow-y-auto overflow-x-hidden p-2.5">
              <table className="sr-table text-[12px]" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th className="!text-left" style={{ width: '20%', whiteSpace: 'normal' }}>Branch</th>
                    <th className="!text-left" style={{ width: '52%', whiteSpace: 'normal' }}>Sub-Category</th>
                    <th className="sr-center" style={{ width: '14%', whiteSpace: 'normal' }}>Months Seen</th>
                    <th className="sr-center" style={{ width: '14%', whiteSpace: 'normal' }}>Total Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {chronicIssueRows.map((row) => (
                    <tr
                      key={`${row.branch}::${row.subCategory}`}
                      className="cursor-pointer transition-colors hover:bg-[color:var(--sr-overlay)]"
                      onClick={() => openDrilldown(row.reports, `${row.branch} · ${row.subCategory}`)}
                    >
                      <td className="sr-label !bg-[color:var(--sr-overlay)] font-bold leading-tight" style={{ verticalAlign: 'top', whiteSpace: 'normal' }}>
                        {row.branch}
                      </td>
                      <td className="leading-tight" style={{ verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {row.subCategory}
                      </td>
                      <td className="sr-center align-middle font-mono font-bold tabular-nums">{row.monthsCount}</td>
                      <td className="sr-center align-middle font-mono font-bold tabular-nums">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      {/* Detail Report */}
      <section>
        <div className="sr-section-h">
          <span className="sr-section-rule" aria-hidden="true" />
          <h2>Detail Report</h2>
        </div>
        <Panel
          title="Quality Records"
          className="h-[40rem]"
          aiContext={sqiAiContext('Quality Records', 'detail_table', detailRows.slice(0, 20))}
          bodyClassName="overflow-hidden"
        >
          <DetailTable rows={detailRows} />
        </Panel>
      </section>

      {DrilldownRenderer()}
    </div>
  );
}
