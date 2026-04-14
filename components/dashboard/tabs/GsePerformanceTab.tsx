'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bus,
  ClipboardList,
  Package,
  Wrench,
} from 'lucide-react';
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
import type { Report } from '@/types';
import { SummaryDenseTable } from './summary/SummaryDenseTable';
import { SummarySectionCard } from './summary/SummarySectionCard';
import { normalizeText } from './summary/summary-utils';
import {
  ChartCard,
  HeatmapTableCard,
  CustomTooltip,
  WrappedYAxisTick,
  ResponsiveContainer,
  CategoryBarList,
  heatColor,
  StatusBadge,
  CHART_PALETTE,
  renderPieLabel,
  PIE_LABEL_LINE_PROPS,
} from './shared/chart-ui';

interface GsePerformanceTabProps {
  reports: Report[];
}

type MetricRow = {
  id: string;
  label: string;
  total: number;
};

type PivotRow = {
  id: string;
  branch: string;
  airline: string;
  values: Record<string, number>;
  total: number;
};

type PivotBranchGroup = {
  branch: string;
  rows: PivotRow[];
  total: number;
};

type DetailRow = {
  id: string;
  date: string;
  rawDate: number;
  branch: string;
  airline: string;
  flight: string;
  category: string;
  gseRequirement: string;
  identificationOfRoot: string;
  detailReport: string;
  detailRootCaused: string;
  action: string;
  preventiveAction: string;
  status: string;
};

type BreakdownRow = {
  id: string;
  gseRequirement: string;
  identificationOfRoot: string;
  values: Record<string, number>;
  total: number;
};

type GroupedDetailRow = {
  id: string;
  branch: string;
  airline: string;
  category: string;
  issueCaused: string;
  gseRequirement: string;
  rootCaused: string;
  total: number;
};

const EXCLUDED_SERVICE_TYPES = ['joumpa service', 'general operational service'];
const EXCLUDED_GSE_REQUIREMENT = ['non gse report'];

const MOTORIZED_REMARK_EXCLUSIONS = [
  'safety & security',
  'passenger issue',
  'lack of service',
  'lack of procedure',
  'lack of gse non-motorized',
  'compliment best of process',
  'compliment best of service',
  'joumpa lack of procedure',
  'joumpa lack of service',
  'kontraproduktif procedure',
];

const NON_MOTORIZED_REMARK_EXCLUSIONS = [
  'safety & security',
  'passenger issue',
  'lack of service',
  'lack of procedure',
  'lack of gse motorized',
  'compliment best of process',
  'compliment best of service',
  'joumpa lack of procedure',
  'joumpa lack of service',
  'kontraproduktif procedure',
];

const PIE_COLORS = ['oklch(0.65 0.18 160)', 'oklch(0.6 0.14 240)', 'oklch(0.7 0.2 330)', 'oklch(0.8 0.15 80)'];
const GSE_TYPE_PIE_COLORS = ['oklch(0.6 0.2 25)', 'oklch(0.75 0.1 190)'];

function normalizeLower(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getGseAvailableRequirement(report: Report) {
  return (report as Report & { gse_available_requirement?: string }).gse_available_requirement;
}

function getGseRequirement(report: Report) {
  return (report as Report & { gse_requirement?: string }).gse_requirement;
}

function getMonthKey(report: Report) {
  const raw = report.date_of_event || report.event_date || report.incident_date || report.created_at;
  if (!raw) return null;

  let date: Date;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    date = new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  }

  if (Number.isNaN(date.getTime())) return null;

  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    timestamp: date.getTime(),
  };
}

function formatDisplayDate(value: unknown) {
  if (typeof value !== 'string') {
    return '-';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '-';
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return normalizeText(trimmed, '-');
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function matchesMotorized(report: Report) {
  return !MOTORIZED_REMARK_EXCLUSIONS.includes(normalizeLower(report.remarks_case));
}

function matchesNonMotorized(report: Report) {
  return !NON_MOTORIZED_REMARK_EXCLUSIONS.includes(normalizeLower(report.remarks_case));
}

function isIncludedServiceType(report: Report) {
  return !EXCLUDED_SERVICE_TYPES.includes(normalizeLower(report.service_business_type));
}

function hasIncludedGseRequirement(report: Report) {
  const requirement = normalizeText(getGseAvailableRequirement(report) || getGseRequirement(report) || report.gse_name || '', '').trim();
  if (!requirement) {
    return false;
  }

  return !EXCLUDED_GSE_REQUIREMENT.includes(requirement.toLowerCase());
}

function aggregateMetricRows(reports: Report[], selector: (report: Report) => string | undefined): MetricRow[] {
  const buckets: Record<string, number> = {};

  reports.forEach((report) => {
    const label = normalizeText(selector(report), '').trim();
    if (!label) return;
    buckets[label] = (buckets[label] || 0) + 1;
  });

  return Object.entries(buckets)
    .map(([label, total]) => ({
      id: label,
      label,
      total,
    }))
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label));
}

function aggregateReportCategoryRows(reports: Report[]): MetricRow[] {
  const buckets: Record<string, number> = {};

  reports.forEach((report) => {
    const rawCaseCategory = report.accident_incident;
    const raw = normalizeLower(rawCaseCategory);
    if (!raw) return;

    const label = normalizeText(rawCaseCategory);
    buckets[label] = (buckets[label] || 0) + 1;
  });

  return Object.entries(buckets)
    .map(([label, total]) => ({ id: label, label, total }))
    .filter((item) => item.total > 0)
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label));
}

function aggregateGseTypeRows(reports: Report[]): MetricRow[] {
  const buckets: Record<string, number> = {
    'Lack Of GSE Motorized': 0,
    'Lack Of GSE Non-Motorized': 0,
  };

  reports.forEach((report) => {
    const raw = normalizeLower(report.remarks_case);
    if (!raw) return;

    if (raw === 'lack of gse motorized') {
      buckets['Lack Of GSE Motorized'] += 1;
    } else if (raw === 'lack of gse non-motorized' || raw === 'lack of gse non motorized') {
      buckets['Lack Of GSE Non-Motorized'] += 1;
    }
  });

  return Object.entries(buckets)
    .map(([label, total]) => ({ id: label, label, total }))
    .filter((item) => item.total > 0);
}

function aggregatePivot(
  reports: Report[],
  columnSelector: (report: Report) => string | undefined
): { columns: string[]; rows: PivotRow[]; branchGroups: PivotBranchGroup[]; columnTotals: Record<string, number>; grandTotal: number; maxValue: number } {
  const columnsSet = new Set<string>();
  const buckets: Record<string, PivotRow> = {};
  const columnTotals: Record<string, number> = {};
  let grandTotal = 0;
  let maxValue = 0;

  reports.forEach((report) => {
    const branch = normalizeText(report.stations?.code || report.branch || 'Unknown').toUpperCase();
    const airline = normalizeText(report.airlines || report.airline || 'Unknown');
    const column = normalizeText(columnSelector(report), '');
    if (!column) return;

    columnsSet.add(column);
    const key = `${branch}::${airline}`;
    if (!buckets[key]) {
      buckets[key] = {
        id: key,
        branch,
        airline,
        values: {},
        total: 0,
      };
    }

    buckets[key].values[column] = (buckets[key].values[column] || 0) + 1;
    buckets[key].total += 1;
    columnTotals[column] = (columnTotals[column] || 0) + 1;
    grandTotal += 1;
    maxValue = Math.max(maxValue, buckets[key].values[column]);
  });

  const columns = Array.from(columnsSet).sort((left, right) => left.localeCompare(right));
  const rows = Object.values(buckets).sort((left, right) => right.total - left.total);
  const branchOrder = Array.from(new Set(rows.map((row) => row.branch)));
  const branchGroups = branchOrder.map((branch) => {
    const groupedRows = rows.filter((row) => row.branch === branch);
    return {
      branch,
      rows: groupedRows,
      total: groupedRows.reduce((sum, row) => sum + row.total, 0),
    };
  });

  return { columns, rows, branchGroups, columnTotals, grandTotal, maxValue };
}

function aggregateBreakdown(
  reports: Report[],
  columnSelector: (report: Report) => string
): { columns: string[]; rows: BreakdownRow[]; maxValue: number } {
  const columnsSet = new Set<string>();
  const buckets: Record<string, BreakdownRow> = {};
  let maxValue = 0;
  const excludedRootValues = new Set(['-', 'unknown', '#n/a', 'nil']);
  const excludedRequirementValues = new Set(['-', 'unknown', '#n/a', 'nil']);

  reports.forEach((report) => {
    const requirement = normalizeText(report.gse_name || report.gse_number || getGseRequirement(report) || getGseAvailableRequirement(report), '-');
    const root = normalizeText(report.identification_of_root || report.root_caused, '-');
    const column = normalizeText(columnSelector(report), 'Unknown');

    if (excludedRequirementValues.has(requirement.trim().toLowerCase())) return;
    if (excludedRootValues.has(root.trim().toLowerCase())) return;

    columnsSet.add(column);
    const key = `${requirement}::${root}`;
    if (!buckets[key]) {
      buckets[key] = {
        id: key,
        gseRequirement: requirement,
        identificationOfRoot: root,
        values: {},
        total: 0,
      };
    }

    buckets[key].values[column] = (buckets[key].values[column] || 0) + 1;
    buckets[key].total += 1;
    maxValue = Math.max(maxValue, buckets[key].values[column]);
  });

  return {
    columns: Array.from(columnsSet).sort((left, right) => left.localeCompare(right)),
    rows: Object.values(buckets).sort((left, right) => right.total - left.total),
    maxValue,
  };
}

function aggregateGroupedDetailRows(reports: Report[]): GroupedDetailRow[] {
  const buckets: Record<string, GroupedDetailRow> = {};

  reports.forEach((report) => {
    const branch = normalizeText(report.stations?.code || report.branch || 'Unknown').toUpperCase();
    const airline = normalizeText(report.airlines || report.airline || 'Unknown');
    const category = normalizeText(report.accident_incident || report.category || '-');
    const issueCaused = normalizeText(report.issue_caused || report.remarks_case || '-');
    const gseRequirement = normalizeText(getGseRequirement(report) || getGseAvailableRequirement(report) || report.gse_name || '-');
    const rootCaused = normalizeText(report.identification_of_root || '-');

    if (issueCaused === '-' || gseRequirement === '-' || rootCaused === '-') {
      return;
    }

    const key = [branch, airline, category, issueCaused, gseRequirement, rootCaused].join('::');
    if (!buckets[key]) {
      buckets[key] = {
        id: key,
        branch,
        airline,
        category,
        issueCaused,
        gseRequirement,
        rootCaused,
        total: 0,
      };
    }

    buckets[key].total += 1;
  });

  return Object.values(buckets).sort(
    (left, right) =>
      right.total - left.total ||
      left.branch.localeCompare(right.branch) ||
      left.airline.localeCompare(right.airline)
  );
}

// ── CGO-Style Pivot Table with Pagination ──────────────────────────────────────

function GsePivotTable({
  data,
}: {
  data: {
    columns: string[];
    branchGroups: PivotBranchGroup[];
    columnTotals: Record<string, number>;
    grandTotal: number;
    maxValue: number;
  };
}) {
  const [page, setPage] = useState(0);
  const itemsPerPage = 3;
  const totalPages = Math.max(1, Math.ceil(data.branchGroups.length / itemsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const pagedGroups = data.branchGroups.slice(safePage * itemsPerPage, safePage * itemsPerPage + itemsPerPage);
  const startIdx = data.branchGroups.length === 0 ? 0 : safePage * itemsPerPage + 1;
  const endIdx = Math.min(data.branchGroups.length, safePage * itemsPerPage + pagedGroups.length);

  return (
    <HeatmapTableCard title="Report Category by Airlines" subtitle="Branch and airline pivot against case classification." accent="oklch(0.55 0.14 240)">
      <div className="overflow-x-auto">
        <div className="max-h-[260px] overflow-y-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-black border-b border-gray-300">
                <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Branch</th>
                <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Airlines</th>
                {data.columns.map((column) => (
                  <th key={column} className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">{column}</th>
                ))}
                <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Grand total</th>
              </tr>
            </thead>
            <tbody>
              {pagedGroups.map((group) =>
                group.rows.map((row, rowIndex) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {rowIndex === 0 ? (
                      <td rowSpan={group.rows.length} className="py-1.5 px-2 font-bold text-gray-800 border-r border-gray-100">{group.branch}</td>
                    ) : null}
                    <td className="py-1.5 px-2 text-gray-700">{row.airline}</td>
                    {data.columns.map((column) => {
                      const value = row.values[column] || 0;
                      const color = heatColor(value, data.maxValue);
                      return (
                        <td key={column} className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: color.bg, color: color.fg }}>
                          {value || '-'}
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-2 text-center font-bold">{row.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <table className="w-full text-xs min-w-[600px] border-t-2 border-gray-300">
          <tbody>
            <tr className="bg-gray-100 font-bold">
              <td className="py-1.5 px-2 text-gray-800" colSpan={2}>Grand total</td>
              {data.columns.map((column) => (
                <td key={column} className="py-1.5 px-2 text-center text-gray-800">{data.columnTotals[column] || 0}</td>
              ))}
              <td className="py-1.5 px-2 text-center text-gray-800">{data.grandTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-gray-500">{startIdx}-{endIdx} / {data.branchGroups.length} records</span>
          <div className="flex items-center gap-2">
            <button className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-[10px] font-semibold text-gray-600 tabular-nums">Page {safePage + 1} / {totalPages}</span>
            <button className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}
    </HeatmapTableCard>
  );
}

// ── CGO-Style Breakdown Heatmap Table ──────────────────────────────────────────

function BreakdownHeatmapTable({
  title,
  subtitle,
  breakdown,
  accent,
}: {
  title: string;
  subtitle: string;
  breakdown: { columns: string[]; rows: BreakdownRow[]; maxValue: number };
  accent: string;
}) {
  const columns = breakdown.columns;
  const groupedRows = breakdown.rows.reduce<Array<{ requirement: string; rows: BreakdownRow[] }>>((acc, row) => {
    const current = acc[acc.length - 1];
    if (current && current.requirement === row.gseRequirement) {
      current.rows.push(row);
      return acc;
    }
    acc.push({ requirement: row.gseRequirement, rows: [row] });
    return acc;
  }, []);

  return (
    <HeatmapTableCard title={title} subtitle={subtitle} accent={accent}>
      <div className="overflow-x-auto">
        <div className="max-h-[240px] overflow-y-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-black border-b border-gray-300">
                <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">GSE Available &amp; Requirement</th>
                <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Identification of Root</th>
                {columns.map((column) => (
                  <th key={column} className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {breakdown.rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="py-10 text-center text-xs text-gray-400">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                groupedRows.map((group) =>
                  group.rows.map((row, index) => {
                    return (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {index === 0 ? (
                          <td rowSpan={group.rows.length} className="py-1.5 px-2 font-medium text-gray-800 border-r border-gray-100">
                            {group.requirement}
                          </td>
                        ) : null}
                        <td className="py-1.5 px-2 text-gray-700">{row.identificationOfRoot}</td>
                        {columns.map((column) => {
                          const value = row.values[column] || 0;
                          const color = heatColor(value, breakdown.maxValue);
                          return (
                            <td
                              key={column}
                              className="py-1.5 px-2 text-center font-medium"
                              style={{ backgroundColor: color.bg, color: color.fg }}
                            >
                              {value || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </HeatmapTableCard>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function GsePerformanceTab({ reports }: GsePerformanceTabProps) {
  const deferredReports = useDeferredValue(reports);

  const baseReports = useMemo(
    () => deferredReports.filter((report) => isIncludedServiceType(report)),
    [deferredReports]
  );

  const overviewReports = useMemo(
    () => baseReports.filter((report) => hasIncludedGseRequirement(report)),
    [baseReports]
  );

  const motorizedReports = useMemo(() => baseReports.filter(matchesMotorized), [baseReports]);
  const nonMotorizedReports = useMemo(() => baseReports.filter(matchesNonMotorized), [baseReports]);

  const monthlyRows = useMemo(() => {
    const buckets: Record<string, MetricRow & { timestamp: number }> = {};

    overviewReports.forEach((report) => {
      const month = getMonthKey(report);
      if (!month) return;
      if (!buckets[month.key]) {
        buckets[month.key] = {
          id: month.key,
          label: month.label,
          total: 0,
          timestamp: month.timestamp,
        };
      }
      buckets[month.key].total += 1;
    });

    return Object.values(buckets).sort((left, right) => right.timestamp - left.timestamp);
  }, [overviewReports]);

  const requirementRows = useMemo(
    () => aggregateMetricRows(overviewReports, (report) => getGseAvailableRequirement(report)),
    [overviewReports]
  );

  const reportCategoryByAirlines = useMemo(
    () => aggregatePivot(baseReports, (report) => report.case_classification),
    [baseReports]
  );

  const reportCategoryRows = useMemo(() => aggregateReportCategoryRows(baseReports), [baseReports]);
  const reportCategoryByGseTypeRows = useMemo(() => aggregateGseTypeRows(baseReports), [baseReports]);

  const motorizedRootRows = useMemo(() => aggregateMetricRows(motorizedReports, (report) => report.identification_of_root), [motorizedReports]);
  const motorizedRequirementRows = useMemo(
    () => aggregateMetricRows(motorizedReports, (report) => getGseRequirement(report) || getGseAvailableRequirement(report) || report.gse_name),
    [motorizedReports]
  );
  const motorizedDetailRows = useMemo(() => aggregateGroupedDetailRows(motorizedReports), [motorizedReports]);
  const nonMotorizedRootRows = useMemo(() => aggregateMetricRows(nonMotorizedReports, (report) => report.identification_of_root), [nonMotorizedReports]);
  const nonMotorizedRequirementRows = useMemo(
    () => aggregateMetricRows(nonMotorizedReports, (report) => getGseRequirement(report) || getGseAvailableRequirement(report) || report.gse_name),
    [nonMotorizedReports]
  );
  const nonMotorizedDetailRows = useMemo(() => aggregateGroupedDetailRows(nonMotorizedReports), [nonMotorizedReports]);

  const branchBreakdown = useMemo(
    () => aggregateBreakdown(baseReports, (report) => normalizeText(report.stations?.code || report.branch || 'Unknown').toUpperCase()),
    [baseReports]
  );
  const airlineBreakdown = useMemo(
    () => aggregateBreakdown(baseReports, (report) => normalizeText(report.airlines || report.airline || 'Unknown')),
    [baseReports]
  );
  const nonMotorizedBranchBreakdown = useMemo(
    () => aggregateBreakdown(nonMotorizedReports, (report) => normalizeText(report.stations?.code || report.branch || 'Unknown').toUpperCase()),
    [nonMotorizedReports]
  );
  const nonMotorizedAirlineBreakdown = useMemo(
    () => aggregateBreakdown(nonMotorizedReports, (report) => normalizeText(report.airlines || report.airline || 'Unknown')),
    [nonMotorizedReports]
  );

  const detailRows = useMemo<DetailRow[]>(
    () =>
      baseReports
        .filter((report) => hasIncludedGseRequirement(report))
        .map((report) => {
          const month = getMonthKey(report);
          return {
            id: report.id,
            date: formatDisplayDate(report.date_of_event || report.event_date || report.incident_date || report.created_at),
            rawDate: month?.timestamp || 0,
            branch: normalizeText(report.stations?.code || report.branch || 'Unknown').toUpperCase(),
            airline: normalizeText(report.airlines || report.airline || 'Unknown'),
            flight: normalizeText(report.flight_number || report.reference_number || '-'),
            category: normalizeText(report.accident_incident || report.category || '-'),
            gseRequirement: normalizeText(getGseAvailableRequirement(report) || getGseRequirement(report) || report.gse_name || '-'),
            identificationOfRoot: normalizeText(report.identification_of_root || '-'),
            detailReport: normalizeText(report.report || report.description || '-'),
            detailRootCaused: normalizeText(report.root_caused || report.root_cause || '-'),
            action: normalizeText(report.action_taken || report.gapura_kps_action_taken || report.immediate_action || '-'),
            preventiveAction: normalizeText(report.preventive_action || '-'),
            status: normalizeText(report.status || '-'),
          };
        })
        .sort((left, right) => right.rawDate - left.rawDate),
    [baseReports]
  );

  return (
    <div className="space-y-6">

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 — Monthly Report & GSE Requirement
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <SummarySectionCard
          title="Monthly Report"
          subtitle="Date of event vs report count after excluding Joumpa Service and General Operational Service."
        >
          <ChartCard title="Monthly Report" subtitle="Report count by month" accent="oklch(0.65 0.18 160)">
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(200, monthlyRows.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRows.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Count" fill="oklch(0.65 0.18 160)" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      <LabelList dataKey="total" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartCard>
        </SummarySectionCard>

        <SummarySectionCard
          title="Monthly Report"
          subtitle="GSE available & requirement ranking."
        >
          <SummaryDenseTable
            data={requirementRows}
            rowKey={(row) => row.id}
            itemsPerPage={6}
            initialSort={{ columnId: 'total', direction: 'desc' }}
            columns={[
              { id: 'label', header: 'GSE Available & Requirement', accessor: (row) => <span className="break-words">{row.label}</span>, sortValue: (row) => row.label, minWidth: '260px' },
              { id: 'total', header: 'Report', accessor: (row) => row.total, sortValue: (row) => row.total, align: 'right', minWidth: '100px' },
            ]}
          />
        </SummarySectionCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 — Report Category by Airlines (Pivot Table)
          ═══════════════════════════════════════════════════════════════════ */}
      <GsePivotTable data={reportCategoryByAirlines} />

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3 — Report Category Pie Charts
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Report Category" subtitle="Distribution by case category." accent="oklch(0.7 0.2 330)">
          <div className="h-[220px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={reportCategoryRows} dataKey="total" nameKey="label" innerRadius={50} outerRadius={72} strokeWidth={0} paddingAngle={2} label={renderPieLabel} labelLine={PIE_LABEL_LINE_PROPS}>
                  {reportCategoryRows.map((entry, i) => (
                    <Cell key={entry.id} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 mt-4">
            {reportCategoryRows.map((item, i) => {
              const total = reportCategoryRows.reduce((s, d) => s + d.total, 0);
              const share = total > 0 ? Math.round((item.total / total) * 100) : 0;
              return (
                <div key={item.id} className="rounded-2xl border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/80 px-3 py-2.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="min-w-0 break-words text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{item.label}</span>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="font-mono text-lg font-black text-[var(--text-primary)]">{item.total}</span>
                    <span className="text-[0.72rem] font-semibold text-[var(--text-muted)]">{share}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Report Category by GSE Type" subtitle="Distribution by remarks case." accent="oklch(0.6 0.2 25)">
          <div className="h-[220px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={reportCategoryByGseTypeRows} dataKey="total" nameKey="label" innerRadius={50} outerRadius={72} strokeWidth={0} paddingAngle={2} label={renderPieLabel} labelLine={PIE_LABEL_LINE_PROPS}>
                  {reportCategoryByGseTypeRows.map((entry, i) => (
                    <Cell key={entry.id} fill={GSE_TYPE_PIE_COLORS[i % GSE_TYPE_PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 mt-4">
            {reportCategoryByGseTypeRows.map((item, i) => {
              const total = reportCategoryByGseTypeRows.reduce((s, d) => s + d.total, 0);
              const share = total > 0 ? Math.round((item.total / total) * 100) : 0;
              return (
                <div key={item.id} className="rounded-2xl border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/80 px-3 py-2.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: GSE_TYPE_PIE_COLORS[i % GSE_TYPE_PIE_COLORS.length] }} />
                    <span className="min-w-0 break-words text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{item.label}</span>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="font-mono text-lg font-black text-[var(--text-primary)]">{item.total}</span>
                    <span className="text-[0.72rem] font-semibold text-[var(--text-muted)]">{share}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4 — GSE Motorized Bar Charts
          ═══════════════════════════════════════════════════════════════════ */}
      <SummarySectionCard
        title="GSE Motorized"
        subtitle="Identification of root and GSE requirement distribution after applying motorized remarks exclusions."
        toolbar={<AlertTriangle size={18} className="text-[var(--brand-emerald-700)]" />}
      >
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <ChartCard title="Identification of Root" subtitle="Motorized root cause breakdown" accent="oklch(0.65 0.18 160)">
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(200, motorizedRootRows.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={motorizedRootRows.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Count" fill="oklch(0.65 0.18 160)" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      <LabelList dataKey="total" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="GSE Requirement" subtitle="Motorized requirement distribution" accent="oklch(0.55 0.14 240)">
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(200, motorizedRequirementRows.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={motorizedRequirementRows.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Count" fill="oklch(0.55 0.14 240)" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      <LabelList dataKey="total" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartCard>
        </div>

        <SummaryDenseTable
          data={motorizedDetailRows}
          rowKey={(row) => row.id}
          itemsPerPage={5}
          initialSort={{ columnId: 'total', direction: 'desc' }}
          columns={[
            { id: 'branch', header: 'Branch', accessor: (row) => row.branch, sortValue: (row) => row.branch },
            { id: 'airline', header: 'Airlines', accessor: (row) => row.airline, sortValue: (row) => row.airline, minWidth: '150px' },
            { id: 'category', header: 'Category', accessor: (row) => row.category, sortValue: (row) => row.category },
            { id: 'issue', header: 'Issue Caused', accessor: (row) => <span className="break-words">{row.issueCaused}</span>, sortValue: (row) => row.issueCaused, minWidth: '180px' },
            { id: 'requirement', header: 'GSE Requirement', accessor: (row) => <span className="break-words">{row.gseRequirement}</span>, sortValue: (row) => row.gseRequirement, minWidth: '180px' },
            { id: 'root', header: 'Root Caused', accessor: (row) => <span className="break-words">{row.rootCaused}</span>, sortValue: (row) => row.rootCaused, minWidth: '220px' },
            { id: 'total', header: 'Total', accessor: (row) => row.total, sortValue: (row) => row.total, align: 'right', minWidth: '90px' },
          ]}
        />
      </SummarySectionCard>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5 — GSE Non Motorized Bar Charts
          ═══════════════════════════════════════════════════════════════════ */}
      <SummarySectionCard
        title="GSE Non Motorized"
        subtitle="Identification of root and GSE requirement distribution after applying non-motorized remarks exclusions."
        toolbar={<Wrench size={18} className="text-[var(--brand-emerald-700)]" />}
      >
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <ChartCard title="Identification of Root" subtitle="Non-motorized root cause breakdown" accent="oklch(0.6 0.2 25)">
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(200, nonMotorizedRootRows.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nonMotorizedRootRows.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Count" fill="oklch(0.6 0.2 25)" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      <LabelList dataKey="total" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="GSE Requirement" subtitle="Non-motorized requirement distribution" accent="oklch(0.75 0.1 190)">
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              <div style={{ height: Math.max(200, nonMotorizedRequirementRows.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nonMotorizedRequirementRows.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Count" fill="oklch(0.75 0.1 190)" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      <LabelList dataKey="total" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartCard>
        </div>

        <SummaryDenseTable
          data={nonMotorizedDetailRows}
          rowKey={(row) => row.id}
          itemsPerPage={5}
          initialSort={{ columnId: 'total', direction: 'desc' }}
          columns={[
            { id: 'branch', header: 'Branch', accessor: (row) => row.branch, sortValue: (row) => row.branch },
            { id: 'airline', header: 'Airlines', accessor: (row) => row.airline, sortValue: (row) => row.airline, minWidth: '150px' },
            { id: 'category', header: 'Category', accessor: (row) => row.category, sortValue: (row) => row.category },
            { id: 'issue', header: 'Issue Caused', accessor: (row) => <span className="break-words">{row.issueCaused}</span>, sortValue: (row) => row.issueCaused, minWidth: '180px' },
            { id: 'requirement', header: 'GSE Requirement', accessor: (row) => <span className="break-words">{row.gseRequirement}</span>, sortValue: (row) => row.gseRequirement, minWidth: '180px' },
            { id: 'root', header: 'Root Caused', accessor: (row) => <span className="break-words">{row.rootCaused}</span>, sortValue: (row) => row.rootCaused, minWidth: '220px' },
            { id: 'total', header: 'Total', accessor: (row) => row.total, sortValue: (row) => row.total, align: 'right', minWidth: '90px' },
          ]}
        />
      </SummarySectionCard>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 6 — Breakdown of Identified Causes — GSE Motorized
          ═══════════════════════════════════════════════════════════════════ */}
      <SummarySectionCard
        title="Breakdown of Identified Causes - GSE Motorized"
        subtitle="Ranked root causes and heatmap breakdowns by branch and airline."
        toolbar={<Bus size={18} className="text-[var(--brand-emerald-700)]" />}
      >
        <ChartCard title="Identification of Root — Motorized" subtitle="Ranked metric distribution" accent="oklch(0.65 0.18 160)">
          <CategoryBarList data={motorizedRootRows.map((r) => ({ name: r.label, value: r.total }))} color="oklch(0.65 0.18 160)" />
        </ChartCard>

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <BreakdownHeatmapTable
            title="Breakdown by Branch"
            subtitle="Heatmap by branch / record count."
            breakdown={branchBreakdown}
            accent="oklch(0.65 0.18 160)"
          />
          <BreakdownHeatmapTable
            title="Breakdown by Airlines"
            subtitle="Heatmap by airlines / record count."
            breakdown={airlineBreakdown}
            accent="oklch(0.55 0.14 240)"
          />
        </div>
      </SummarySectionCard>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 7 — Breakdown of Identified Causes — GSE Non Motorized
          ═══════════════════════════════════════════════════════════════════ */}
      <SummarySectionCard
        title="Breakdown of Identified Causes - GSE Non Motorized"
        subtitle="Ranked root causes and heatmap breakdowns by branch and airline."
        toolbar={<Package size={18} className="text-[var(--brand-emerald-700)]" />}
      >
        <ChartCard title="Identification of Root — Non Motorized" subtitle="Ranked metric distribution" accent="oklch(0.6 0.2 25)">
          <CategoryBarList data={nonMotorizedRootRows.map((r) => ({ name: r.label, value: r.total }))} color="oklch(0.6 0.2 25)" />
        </ChartCard>

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <BreakdownHeatmapTable
            title="Breakdown by Branch"
            subtitle="Heatmap by branch / record count."
            breakdown={nonMotorizedBranchBreakdown}
            accent="oklch(0.6 0.2 25)"
          />
          <BreakdownHeatmapTable
            title="Breakdown by Airlines"
            subtitle="Heatmap by airlines / record count."
            breakdown={nonMotorizedAirlineBreakdown}
            accent="oklch(0.75 0.1 190)"
          />
        </div>
      </SummarySectionCard>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 8 — Detail Report
          ═══════════════════════════════════════════════════════════════════ */}
      <SummarySectionCard
        title="Detail Report"
        subtitle="Detailed GSE records after service-type exclusion and current global filters."
        toolbar={<BarChart3 size={18} className="text-[var(--brand-emerald-700)]" />}
      >
        <SummaryDenseTable
          data={detailRows}
          rowKey={(row) => row.id}
          itemsPerPage={10}
          initialSort={{ columnId: 'date', direction: 'desc' }}
          columns={[
            { id: 'date', header: 'Date', accessor: (row) => row.date, sortValue: (row) => row.rawDate, minWidth: '120px' },
            { id: 'branch', header: 'Branch', accessor: (row) => row.branch, sortValue: (row) => row.branch, minWidth: '90px' },
            { id: 'airline', header: 'Airlines', accessor: (row) => row.airline, sortValue: (row) => row.airline, minWidth: '160px' },
            { id: 'flight', header: 'Flight', accessor: (row) => row.flight, sortValue: (row) => row.flight, minWidth: '100px' },
            { id: 'category', header: 'Accident / Incident', accessor: (row) => row.category, sortValue: (row) => row.category, minWidth: '130px' },
            { id: 'gseRequirement', header: 'GSE Available & Requirement', accessor: (row) => <span className="break-words">{row.gseRequirement}</span>, sortValue: (row) => row.gseRequirement, minWidth: '180px' },
            { id: 'identificationOfRoot', header: 'Identification of Root', accessor: (row) => <span className="break-words">{row.identificationOfRoot}</span>, sortValue: (row) => row.identificationOfRoot, minWidth: '180px' },
            { id: 'detailReport', header: 'Detail Report', accessor: (row) => <span className="line-clamp-4 break-words">{row.detailReport}</span>, sortValue: (row) => row.detailReport, minWidth: '260px' },
            { id: 'detailRootCaused', header: 'Detail Root Caused', accessor: (row) => <span className="line-clamp-4 break-words">{row.detailRootCaused}</span>, sortValue: (row) => row.detailRootCaused, minWidth: '220px' },
            { id: 'action', header: 'Action', accessor: (row) => <span className="line-clamp-4 break-words">{row.action}</span>, sortValue: (row) => row.action, minWidth: '180px' },
            { id: 'preventiveAction', header: 'Preventive Action', accessor: (row) => <span className="line-clamp-4 break-words">{row.preventiveAction}</span>, sortValue: (row) => row.preventiveAction, minWidth: '220px' },
            { id: 'status', header: 'Status', accessor: (row) => row.status, sortValue: (row) => row.status, minWidth: '100px' },
          ]}
        />
      </SummarySectionCard>
    </div>
  );
}
