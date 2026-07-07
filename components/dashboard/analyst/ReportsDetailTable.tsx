'use client';

import { useState, useMemo, useCallback, memo, type MouseEvent, type ReactNode } from 'react';
import {
  FileText, MapPin, Plane,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUp, ArrowDown,
  Loader2, CalendarDays, UserRound, Building2, GitBranch, Download,
  PencilLine, Save, X
} from 'lucide-react';
import {
  STATUS_CONFIG,
  type ReportStatus,
  getSeverityConfig,
  normalizeSeverityLevel
} from '@/lib/constants/report-status';
import { Report } from '@/types';
import { cn } from '@/lib/utils';
import { exportSingleReportToDocx } from '@/lib/reports-export';
import { resolveAreaType } from '@/lib/report-normalization';

type AreaTag = 'CGO' | 'LANDSIDE' | 'AIRSIDE' | 'GENERAL' | 'GSE' | 'JOUMPA' | 'LANDSIDE & AIRSIDE';

const AREA_TAG_CLASS: Record<AreaTag, string> = {
  CGO: 'bg-[var(--brand-emerald-50,#ecfdf5)] text-[var(--brand-emerald-700,#047857)]',
  LANDSIDE: 'bg-[var(--brand-blue-50,#eff6ff)] text-[var(--brand-blue-700,#1d4ed8)]',
  AIRSIDE: 'bg-sky-50 text-sky-700',
  GENERAL: 'bg-slate-100 text-slate-700',
  GSE: 'bg-amber-50 text-amber-700',
  JOUMPA: 'bg-violet-50 text-violet-700',
  'LANDSIDE & AIRSIDE': 'bg-[var(--brand-blue-50,#eff6ff)] text-[var(--brand-blue-700,#1d4ed8)]',
};

// ponytail: delegates to the same classifier the All Reports source toggle
// uses (lib/report-normalization.ts) so a card's badge always agrees with
// which toggle pill surfaces it.
function resolveAreaTag(report: Report): AreaTag {
  switch (resolveAreaType(report)) {
    case 'Terminal Area': return 'LANDSIDE';
    case 'Apron Area': return 'AIRSIDE';
    case 'General': return 'GENERAL';
    case 'GSE Availability': return 'GSE';
    case 'Cargo (CGO)': return 'CGO';
    case 'Joumpa': return 'JOUMPA';
    default: return 'LANDSIDE & AIRSIDE';
  }
}

type SortField = 'created_at' | 'status' | 'severity' | 'report' | 'location' | 'station';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const STATUS_OPTIONS: ReportStatus[] = ['OPEN', 'CLOSED'];
const REMARKS_BY_DIVISIONS = ['OP', 'UQ', 'OT', 'OS', 'OCS', 'HT', 'HC'] as const;

type StatusUpdateDetails = {
  finalRemarks: string;
  remarksBy: string;
};

type StatusEditorState = {
  reportId: string;
  status: ReportStatus;
  finalRemarks: string;
  division: string;
  name: string;
};

function resolveSeverity(report: Report): string {
  const raw = (report as Record<string, unknown>)['severity_level']
    || (report as Record<string, unknown>)['Severity Level']
    || (report as Record<string, unknown>)['Severity_Level']
    || report.severity;
  return normalizeSeverityLevel(raw);
}

const severityOrder: Record<string, number> = {
  'TOP RISK': 0,
  'HIGH RISK': 1,
  'MEDIUM': 2,
  'LOW': 3,
};

const statusOrder: Record<string, number> = {
  'OPEN': 0,
  'ON PROGRESS': 1,
  'CLOSED': 2,
};

function cleanDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text || text === '#N/A' || text === '-' || text.toLowerCase() === 'null') return '';
  return text;
}

function resolveCaseClassification(report: Report): string {
  return cleanDisplayValue((report as Record<string, unknown>).case_classification)
    || cleanDisplayValue((report as Record<string, unknown>)['Case Classification'])
    || cleanDisplayValue(report.category)
    || cleanDisplayValue(report.main_category)
    || 'Unclassified';
}

function resolveSeverityLevel(report: Report): string {
  return cleanDisplayValue((report as Record<string, unknown>).severity_level)
    || cleanDisplayValue((report as Record<string, unknown>)['Severity Level'])
    || cleanDisplayValue((report as Record<string, unknown>)['Severity_Level'])
    || resolveSeverity(report)
    || 'LOW';
}

function getStatusTone(status: ReportStatus) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
  if (status === 'OPEN') {
    return { bg: 'oklch(0.62 0.22 25 / 0.12)', text: 'oklch(0.55 0.22 25)', accent: 'oklch(0.55 0.22 25)' };
  }
  if (status === 'CLOSED') {
    return { bg: 'oklch(0.58 0.18 145 / 0.12)', text: 'oklch(0.45 0.16 145)', accent: 'oklch(0.45 0.16 145)' };
  }
  return { bg: cfg.bgColor, text: cfg.color, accent: cfg.color };
}

const StatusCell = memo(function StatusCell({ status }: { status: ReportStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
  const Icon = cfg.icon;
  const tone = getStatusTone(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide whitespace-nowrap"
      style={{ backgroundColor: tone.bg, color: tone.text }}
    >
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
});

const ClassificationSeverityCell = memo(function ClassificationSeverityCell({ report }: { report: Report }) {
  const classification = resolveCaseClassification(report);
  const level = resolveSeverityLevel(report);
  const config = getSeverityConfig(level);
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200/70 xl:bg-transparent xl:px-0 xl:py-0 xl:ring-0">
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        <span className="whitespace-normal break-words text-[10px] font-black uppercase leading-snug tracking-wide text-slate-800" title={classification}>
          {classification}
        </span>
        <span className="text-[10px] font-black text-slate-400">-</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide whitespace-nowrap"
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          {level}
        </span>
      </div>
    </div>
  );
});

interface ReportsDetailTableProps {
  reports: Report[];
  onReportClick: (report: Report) => void;
  onStatusUpdate?: (
    reportId: string,
    status: string,
    notes?: string,
    evidenceUrl?: string,
    details?: StatusUpdateDetails
  ) => Promise<void>;
  loading?: boolean;
  pageSize?: number;
  emptyTitle?: string;
  emptySubtitle?: string;
  toolbarFilter?: ReactNode;
  fullHeight?: boolean;
}

export const ReportsDetailTable = memo(function ReportsDetailTable({
  reports,
  onReportClick,
  onStatusUpdate,
  loading,
  pageSize: initialPageSize,
  emptyTitle = 'Tidak ada laporan ditemukan',
  emptySubtitle = 'Coba sesuaikan filter Anda untuk melihat hasil lain.',
  toolbarFilter,
  fullHeight = false,
}: ReportsDetailTableProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize ?? 50);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [statusEditor, setStatusEditor] = useState<StatusEditorState | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  const [updatingStatusReportId, setUpdatingStatusReportId] = useState<string | null>(null);

  const handleSort = useCallback((field: SortField) => {
    setPage(0);
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return field;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  const sortedReports = useMemo(() => {
    const copy = [...reports];
    const dir = sortDir === 'asc' ? 1 : -1;

    copy.sort((a, b) => {
      switch (sortField) {
        case 'created_at':
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case 'status':
          return dir * ((statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
        case 'severity': {
          const sa = severityOrder[resolveSeverity(a)] ?? 9;
          const sb = severityOrder[resolveSeverity(b)] ?? 9;
          return dir * (sa - sb);
        }
        case 'report':
          return dir * ((a.report || a.title || '').localeCompare(b.report || b.title || ''));
        case 'location':
          return dir * ((a.location || '').localeCompare(b.location || ''));
        case 'station':
          return dir * ((a.stations?.code || a.branch || '').localeCompare(b.stations?.code || b.branch || ''));
        default:
          return 0;
      }
    });
    return copy;
  }, [reports, sortField, sortDir]);

  const totalPages = Math.ceil(sortedReports.length / pageSize);
  const pageItems = useMemo(
    () => sortedReports.slice(page * pageSize, (page + 1) * pageSize),
    [sortedReports, page, pageSize]
  );
  const startIdx = page * pageSize + 1;
  const endIdx = Math.min((page + 1) * pageSize, sortedReports.length);

  const sortOptions: Array<{ field: SortField; label: string }> = [
    { field: 'created_at', label: 'Tanggal' },
    { field: 'severity', label: 'Severity' },
    { field: 'status', label: 'Status' },
    { field: 'station', label: 'Bandara' },
    { field: 'report', label: 'Laporan' },
  ];

  const handleDownloadCaseReport = useCallback(async (event: MouseEvent, report: Report) => {
    event.stopPropagation();
    setDownloadingReportId(report.id);
    try {
      await exportSingleReportToDocx(report);
    } finally {
      setDownloadingReportId(null);
    }
  }, []);

  const handleOpenStatusEditor = useCallback((event: MouseEvent, report: Report) => {
    event.stopPropagation();
    setStatusUpdateError(null);
    setStatusEditor({
      reportId: report.id,
      status: report.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
      finalRemarks: cleanDisplayValue(report.kps_remarks),
      division: '',
      name: '',
    });
  }, []);

  const handleSubmitStatusUpdate = useCallback(async (event: MouseEvent) => {
    event.stopPropagation();
    if (!statusEditor || !onStatusUpdate) return;

    const finalRemarks = statusEditor.finalRemarks.trim();
    const name = statusEditor.name.trim();
    const status = statusEditor.status;
    const remarksBy = statusEditor.division && name ? `${statusEditor.division} - ${name}` : '';

    if (!status || !finalRemarks || !statusEditor.division || !name) {
      setStatusUpdateError('Status, final remarks, division, and name are required.');
      return;
    }

    setUpdatingStatusReportId(statusEditor.reportId);
    setStatusUpdateError(null);
    try {
      await onStatusUpdate(statusEditor.reportId, status, finalRemarks, undefined, {
        finalRemarks,
        remarksBy,
      });
      setStatusEditor(null);
    } catch (error) {
      setStatusUpdateError(error instanceof Error ? error.message : 'Failed to update report status.');
    } finally {
      setUpdatingStatusReportId(null);
    }
  }, [onStatusUpdate, statusEditor]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--surface-4)] bg-[var(--surface-1)] overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--brand-emerald-500,#10b981)]" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Memuat laporan...</p>
        </div>
        <div className="border-t border-[var(--surface-3)]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-[var(--surface-3)] last:border-b-0">
              <div className="w-6 h-3 rounded bg-[var(--surface-2)] animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-[var(--surface-2)] animate-pulse" />
                <div className="h-2 w-1/2 rounded bg-[var(--surface-2)] animate-pulse" />
              </div>
              <div className="w-16 h-5 rounded-full bg-[var(--surface-2)] animate-pulse" />
              <div className="w-20 h-5 rounded-full bg-[var(--surface-2)] animate-pulse" />
              <div className="w-14 h-3 rounded bg-[var(--surface-2)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--surface-4)] bg-[var(--surface-1)]">
        {toolbarFilter && (
          <div className="border-b border-[var(--surface-4)] bg-[var(--surface-0)] px-4 py-3">
            {toolbarFilter}
          </div>
        )}
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="p-5 rounded-full bg-[var(--surface-2)]">
            <FileText size={32} className="text-[var(--text-muted)] opacity-30" />
          </div>
          <p className="text-base font-display font-bold text-[var(--text-secondary)]">{emptyTitle}</p>
          <p className="text-sm text-[var(--text-muted)]">{emptySubtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--surface-4)] bg-[var(--surface-1)]',
        fullHeight && 'flex min-h-[calc(100dvh-150px)] flex-col overflow-hidden'
      )}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--surface-4)] bg-[var(--surface-0)] px-4 py-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Urutkan
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sortOptions.map((option) => {
              const active = sortField === option.field;
              return (
                <button
                  key={option.field}
                  type="button"
                  onClick={() => handleSort(option.field)}
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-wide transition',
                    active
                      ? 'border-[var(--brand-emerald-200,#a7f3d0)] bg-[var(--brand-emerald-50,#ecfdf5)] text-[var(--brand-emerald-700,#047857)]'
                      : 'border-[var(--surface-3)] bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  )}
                >
                  {option.label}
                  {active && (sortDir === 'asc'
                    ? <ArrowUp size={10} strokeWidth={2.5} />
                    : <ArrowDown size={10} strokeWidth={2.5} />)}
                </button>
              );
            })}
          </div>
        </div>
        {toolbarFilter && (
          <div className="min-w-0 flex-1 xl:max-w-[1120px]">
            {toolbarFilter}
          </div>
        )}
      </div>

      <div
        className={cn(
          'space-y-2 overflow-y-auto p-3',
          fullHeight ? 'min-h-0 flex-1' : 'max-h-[calc(100vh-320px)] min-h-[300px]'
        )}
      >
        {pageItems.map((report, idx) => {
          const station = cleanDisplayValue(report.stations?.code)
            || cleanDisplayValue(report.branch)
            || cleanDisplayValue(report.reporting_branch)
            || '-';
          const reporter = cleanDisplayValue(report.users?.full_name) || cleanDisplayValue(report.reporter_name) || '-';
          const title = report.report || report.title || '(Tanpa Judul)';
          const createdAt = new Date(report.created_at);
          const sourceTag = resolveAreaTag(report);
          const flightNumber = cleanDisplayValue(report.flight_number);
          const route = cleanDisplayValue(report.route);
          const headline = [report.status, station !== '-' ? station : '', flightNumber, route].filter(Boolean).join(' - ');
          const statusTone = getStatusTone(report.status as ReportStatus);
          const isUpdatingStatus = updatingStatusReportId === report.id;

          return (
            <div
              key={report.id}
              role="button"
              tabIndex={0}
              onClick={() => onReportClick(report)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onReportClick(report);
                }
              }}
              className="group grid w-full grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-xl border border-[var(--surface-3)] bg-white px-3.5 py-3 text-left shadow-[0_1px_0_rgba(15,23,42,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 sm:grid-cols-[52px_minmax(0,1fr)]"
              style={{ borderLeft: `4px solid ${statusTone.accent}` }}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f8f2df] text-[12px] font-black tabular-nums text-slate-900 ring-1 ring-black/[0.03] sm:h-12 sm:w-12">
                {page * pageSize + idx + 1}
              </div>

              <div className="min-w-0 flex flex-col gap-2">
                {}
                <div className="flex items-center justify-between gap-2">
                  <span className={cn(
                    'rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide',
                    AREA_TAG_CLASS[sourceTag]
                  )}>
                    {sourceTag}
                  </span>
                  {report.status && (
                    <span className={cn(
                      'rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide',
                      report.status === 'CLOSED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : report.status === 'ON PROGRESS'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-600'
                    )}>
                      {report.status}
                    </span>
                  )}
                </div>

                {}
                {(station !== '-' || flightNumber || route) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {station && station !== '-' && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-600">
                        <Building2 size={9} strokeWidth={2.5} />
                        {station}
                      </span>
                    )}
                    {flightNumber && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-600">
                        <Plane size={9} strokeWidth={2.5} />
                        {flightNumber}
                      </span>
                    )}
                    {route && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-600">
                        <GitBranch size={9} strokeWidth={2.5} />
                        {route}
                      </span>
                    )}
                  </div>
                )}

                {}
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-700" title={title}>
                  {title}
                </p>

                {}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    <UserRound size={11} className="shrink-0 text-slate-400" />
                    <span className="truncate max-w-[160px]" title={reporter}>{reporter}</span>
                  </span>
                  <span className="text-slate-200">|</span>
                  <ClassificationSeverityCell report={report} />
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 tabular-nums">
                    <CalendarDays size={11} className="shrink-0" />
                    {createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}
                    <span className="hidden sm:inline">
                      {createdAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                </div>

                {}
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-2">
                  {onStatusUpdate && (
                    <button
                      type="button"
                      onClick={(event) => handleOpenStatusEditor(event, report)}
                      disabled={isUpdatingStatus}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      <PencilLine size={13} />
                      Change Status
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(event) => handleDownloadCaseReport(event, report)}
                    disabled={downloadingReportId === report.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {downloadingReportId === report.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Download This Case Report
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {statusEditor && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
          onClick={() => {
            setStatusEditor(null);
            setStatusUpdateError(null);
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_32px_90px_-28px_rgba(15,23,42,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Report status</p>
                <h3 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">Change Status</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatusEditor(null);
                  setStatusUpdateError(null);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="Close status dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Status <span className="text-red-500">*</span></span>
                <select
                  value={statusEditor.status}
                  onChange={(event) => setStatusEditor((current) => current ? { ...current, status: event.target.value as ReportStatus } : current)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-black text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  required
                  aria-required="true"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{STATUS_CONFIG[status]?.label || status}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Final Remarks <span className="text-red-500">*</span></span>
                <textarea
                  value={statusEditor.finalRemarks}
                  onChange={(event) => setStatusEditor((current) => current ? { ...current, finalRemarks: event.target.value } : current)}
                  rows={4}
                  className="min-h-[8rem] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold leading-relaxed text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Write final remarks"
                  required
                  aria-required="true"
                  autoFocus
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Division <span className="text-red-500">*</span></span>
                <select
                  value={statusEditor.division}
                  onChange={(event) => setStatusEditor((current) => current ? { ...current, division: event.target.value } : current)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-black text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  required
                  aria-required="true"
                >
                  <option value="">Select</option>
                  {REMARKS_BY_DIVISIONS.map((division) => (
                    <option key={division} value={division}>{division}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Name <span className="text-red-500">*</span></span>
                <input
                  value={statusEditor.name}
                  onChange={(event) => setStatusEditor((current) => current ? { ...current, name: event.target.value } : current)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Filled by"
                  required
                  aria-required="true"
                />
              </label>
            </div>

            {statusUpdateError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700">{statusUpdateError}</p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatusEditor(null);
                  setStatusUpdateError(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitStatusUpdate}
                disabled={updatingStatusReportId === statusEditor.reportId}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.14em] text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {updatingStatusReportId === statusEditor.reportId ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[var(--surface-4)] bg-[var(--surface-0)]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium text-[var(--text-muted)]">
            {startIdx}&ndash;{endIdx} / {sortedReports.length} records
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--text-muted)]">Per halaman:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="text-[10px] font-bold bg-[var(--surface-2)] border border-[var(--surface-3)] rounded px-1.5 py-0.5 outline-none"
            >
              {PAGE_SIZE_OPTIONS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] disabled:opacity-25 transition-colors"
            disabled={page === 0}
            onClick={() => setPage(0)}
          >
            <ChevronsLeft size={14} className="text-[var(--text-muted)]" />
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] disabled:opacity-25 transition-colors"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={14} className="text-[var(--text-muted)]" />
          </button>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] tabular-nums px-2">
            {page + 1} / {totalPages}
          </span>
          <button
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] disabled:opacity-25 transition-colors"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] disabled:opacity-25 transition-colors"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(totalPages - 1)}
          >
            <ChevronsRight size={14} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </div>
    </div>
  );
});
