'use client';

import { useDeferredValue, useMemo } from 'react';
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Report } from '@/types';
import { SummaryDenseTable } from './summary/SummaryDenseTable';
import { SummarySectionCard } from './summary/SummarySectionCard';
import { heatColor, normalizeText } from './summary/summary-utils';

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

const PIE_COLORS = ['#27b0c6', '#85c67f', '#d6e92a', '#f97316'];
const GSE_TYPE_PIE_COLORS = ['#ff9800', '#1f87ad'];
const GSE_TYPE_LABELS = ['Lack Of GSE Motorized', 'Lack Of GSE Non-Motorized'] as const;

function normalizeLower(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getGseAvailableRequirement(report: Report) {
  return (report as Report & { gse_available_requirement?: string }).gse_available_requirement;
}

function getGseRequirement(report: Report) {
  return (report as Report & { gse_requirement?: string }).gse_requirement;
}

function getCaseCategory(report: Report) {
  return (report as Report & { case_category?: string }).case_category;
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
  const buckets: Record<(typeof GSE_TYPE_LABELS)[number], number> = {
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

function MiniBarChart({ data, dataKey = 'total', yKey = 'label' }: { data: MetricRow[]; dataKey?: string; yKey?: string }) {
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ top: 8, right: 18, left: 10, bottom: 8 }}>
          <CartesianGrid stroke="oklch(0.92 0.01 90 / 0.7)" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} fontSize={11} />
          <YAxis
            dataKey={yKey}
            type="category"
            width={180}
            axisLine={false}
            tickLine={false}
            fontSize={11}
          />
          <Tooltip
            cursor={{ fill: 'oklch(0.96 0.01 90 / 0.65)' }}
            contentStyle={{ borderRadius: 16, borderColor: 'oklch(0.88 0.01 90)', fontSize: 12 }}
          />
          <Bar dataKey={dataKey} radius={[8, 8, 8, 8]} fill="oklch(0.68 0.17 165)">
            {data.slice(0, 8).map((entry) => (
              <Cell key={entry.id} fill="oklch(0.68 0.17 165)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniPieChart({
  data,
  colors = PIE_COLORS,
}: {
  data: MetricRow[];
  colors?: string[];
}) {
  const total = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="flex min-h-[320px] flex-col">
      <div className="h-[248px] min-h-[248px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
            <Pie
              data={data}
              dataKey="total"
              nameKey="label"
              cx="50%"
              cy="52%"
              outerRadius={96}
              label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={entry.id} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value}`, 'Total']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--text-secondary)]">
        {data.map((entry, index) => (
          <div key={entry.id} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            <span>{entry.label} ({total ? Math.round((entry.total / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankedMetricTable({
  title,
  rows,
}: {
  title: string;
  rows: MetricRow[];
}) {
  const maxValue = rows.reduce((max, row) => Math.max(max, row.total), 0);

  return (
    <SummarySectionCard title={title}>
      <div className="overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--surface-1)]/95 backdrop-blur-xl">
            <tr>
              <th className="border-b px-4 py-3 text-left text-[0.72rem] font-semibold text-[var(--text-primary)] min-w-[360px]">
                Identification of Root
              </th>
              <th className="border-b px-4 py-3 text-left text-[0.72rem] font-semibold text-[var(--text-primary)] min-w-[220px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                  No motorized root-cause rows available.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--surface-2)]/70">
                  <td className="border-b px-4 py-3 align-top text-[0.82rem] text-[var(--text-primary)]">
                    {row.label}
                  </td>
                  <td className="border-b px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="min-w-[1.5rem] text-right font-semibold text-[var(--text-primary)]">
                        {row.total}
                      </span>
                      <div className="h-5 flex-1 rounded-sm bg-[oklch(0.93_0.02_140_/_0.45)]">
                        <div
                          className="h-5 rounded-sm bg-[oklch(0.68_0.17_165)]"
                          style={{ width: `${maxValue > 0 ? (row.total / maxValue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </SummarySectionCard>
  );
}

function BreakdownTable({
  title,
  subtitle,
  breakdown,
  label,
}: {
  title: string;
  subtitle: string;
  breakdown: { columns: string[]; rows: BreakdownRow[]; maxValue: number };
  label: string;
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
    <SummarySectionCard title={title} subtitle={subtitle}>
      <div className="overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--surface-1)]/95 backdrop-blur-xl">
            <tr>
              <th className="border-b px-4 py-3 text-left text-[0.72rem] font-semibold text-[var(--text-primary)] min-w-[220px]">
                GSE Available &amp; Requirement
              </th>
              <th className="border-b px-4 py-3 text-left text-[0.72rem] font-semibold text-[var(--text-primary)] min-w-[280px]">
                Identification of Root
              </th>
              {columns.map((column) => (
                <th key={column} className="border-b px-4 py-3 text-right text-[0.72rem] font-semibold text-[var(--text-primary)] min-w-[120px]">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {breakdown.rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                  No {label} breakdown available.
                </td>
              </tr>
            ) : (
              groupedRows.map((group) =>
                group.rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-[var(--surface-2)]/70">
                    {index === 0 ? (
                      <td rowSpan={group.rows.length} className="border-b px-4 py-3 align-top text-[0.8rem] text-[var(--text-primary)]">
                        {group.requirement}
                      </td>
                    ) : null}
                    <td className="border-b px-4 py-3 align-top text-[0.8rem] text-[var(--text-primary)]">{row.identificationOfRoot}</td>
                    {columns.map((column) => {
                      const value = row.values[column] || 0;
                      return (
                        <td
                          key={column}
                          className="border-b px-4 py-3 text-right font-semibold"
                          style={{ backgroundColor: value ? heatColor(value, breakdown.maxValue) : 'transparent' }}
                        >
                          {value || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </SummarySectionCard>
  );
}

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
      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <SummarySectionCard
          title="Monthly Report"
          subtitle="Date of event vs report count after excluding Joumpa Service and General Operational Service."
        >
          <MiniBarChart data={monthlyRows} />
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

      <SummarySectionCard
        title="Report Category by Airlines"
        subtitle="Branch and airline pivot against case classification."
        bodyClassName="p-0"
      >
        <div className="overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--surface-1)]/95 backdrop-blur-xl">
              <tr>
                <th rowSpan={2} className="border-b px-4 py-3 text-left text-[0.72rem] font-semibold text-[var(--text-primary)]">Branch</th>
                <th rowSpan={2} className="border-b px-4 py-3 text-left text-[0.72rem] font-semibold text-[var(--text-primary)]">Airlines</th>
                <th
                  colSpan={reportCategoryByAirlines.columns.length + 1}
                  className="border-b px-4 py-2 text-right text-[0.72rem] font-bold text-[var(--text-primary)]"
                >
                  Case Classification / Record Count
                </th>
              </tr>
              <tr>
                {reportCategoryByAirlines.columns.map((column) => (
                  <th key={column} className="border-b px-4 py-3 text-center text-[0.72rem] font-semibold leading-tight text-[var(--text-primary)] min-w-[230px]">
                    {column}
                  </th>
                ))}
                <th className="border-b px-4 py-3 text-right text-[0.72rem] font-bold text-[var(--text-primary)] min-w-[120px]">Grand total</th>
              </tr>
            </thead>
            <tbody>
              {reportCategoryByAirlines.branchGroups.map((group) =>
                group.rows.map((row, rowIndex) => (
                  <tr key={row.id} className="hover:bg-[var(--surface-2)]/50">
                    {rowIndex === 0 ? (
                      <td
                        rowSpan={group.rows.length}
                        className="px-4 py-3 align-top text-[0.78rem] font-medium text-[var(--text-primary)]"
                      >
                        {group.branch}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-[0.78rem] text-[var(--text-primary)]">{row.airline}</td>
                    {reportCategoryByAirlines.columns.map((column) => {
                      const value = row.values[column] || 0;
                      return (
                        <td
                          key={column}
                          className="px-4 py-3 text-right text-[0.8rem] font-medium text-[var(--text-primary)]"
                          style={{ backgroundColor: value ? heatColor(value, reportCategoryByAirlines.maxValue) : 'transparent' }}
                        >
                          {value || '-'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right text-[0.82rem] font-bold text-[var(--text-primary)]">{row.total}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="sticky bottom-0 bg-white">
              <tr>
                <td className="border-t px-4 py-3 text-[0.8rem] font-bold text-[var(--text-primary)]" colSpan={2}>
                  Grand total
                </td>
                {reportCategoryByAirlines.columns.map((column) => (
                  <td key={column} className="border-t px-4 py-3 text-right text-[0.82rem] font-bold text-[var(--text-primary)]">
                    {reportCategoryByAirlines.columnTotals[column] || 0}
                  </td>
                ))}
                <td className="border-t px-4 py-3 text-right text-[0.82rem] font-black text-[var(--text-primary)]">
                  {reportCategoryByAirlines.grandTotal}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SummarySectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SummarySectionCard title="Report Category" subtitle="Distribution by case category.">
          <MiniPieChart data={reportCategoryRows} colors={PIE_COLORS} />
        </SummarySectionCard>
        <SummarySectionCard title="Report Category by GSE Type" subtitle="Distribution by remarks case.">
          <MiniPieChart data={reportCategoryByGseTypeRows} colors={GSE_TYPE_PIE_COLORS} />
        </SummarySectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SummarySectionCard
          title="GSE Motorized"
          subtitle="Identification of root after applying motorized remarks exclusions."
          toolbar={<AlertTriangle size={18} className="text-[var(--brand-emerald-700)]" />}
        >
          <MiniBarChart data={motorizedRootRows} />
        </SummarySectionCard>
        <SummarySectionCard
          title="GSE Motorized"
          subtitle="GSE requirement distribution."
          toolbar={<Bus size={18} className="text-[var(--brand-emerald-700)]" />}
        >
          <MiniBarChart data={motorizedRequirementRows} />
        </SummarySectionCard>
      </div>

      <SummarySectionCard
        title="GSE Motorized"
        subtitle="Branch, airlines, category, issue caused, requirement, and root caused."
        toolbar={<ClipboardList size={18} className="text-[var(--brand-emerald-700)]" />}
      >
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

      <div className="grid gap-6 xl:grid-cols-2">
        <SummarySectionCard
          title="GSE Non Motorized"
          subtitle="Identification of root after applying non-motorized remarks exclusions."
          toolbar={<Wrench size={18} className="text-[var(--brand-emerald-700)]" />}
        >
          <MiniBarChart data={nonMotorizedRootRows} />
        </SummarySectionCard>
        <SummarySectionCard
          title="GSE Non Motorized"
          subtitle="GSE requirement distribution."
          toolbar={<Package size={18} className="text-[var(--brand-emerald-700)]" />}
        >
          <MiniBarChart data={nonMotorizedRequirementRows} />
        </SummarySectionCard>
      </div>

      <SummarySectionCard
        title="GSE Non Motorized"
        subtitle="Branch, airlines, category, issue caused, requirement, and root caused."
        toolbar={<ClipboardList size={18} className="text-[var(--brand-emerald-700)]" />}
      >
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

      <RankedMetricTable
        title="Breakdown of Identified Causes - GSE Motorized"
        rows={motorizedRootRows}
      />

      <BreakdownTable
        title="Breakdown of Identified Causes - GSE Motorized"
        subtitle="Heatmap by branch / record count."
        breakdown={branchBreakdown}
        label="branch"
      />

      <BreakdownTable
        title="Breakdown of Identified Causes - GSE Motorized"
        subtitle="Heatmap by airlines / branch."
        breakdown={airlineBreakdown}
        label="airline"
      />

      <RankedMetricTable
        title="Breakdown of Identified Causes - GSE Non Motorized"
        rows={nonMotorizedRootRows}
      />

      <BreakdownTable
        title="Breakdown of Identified Causes - GSE Non Motorized"
        subtitle="Heatmap by branch / record count."
        breakdown={nonMotorizedBranchBreakdown}
        label="branch"
      />

      <BreakdownTable
        title="Breakdown of Identified Causes - GSE Non Motorized"
        subtitle="Heatmap by airlines / branch."
        breakdown={nonMotorizedAirlineBreakdown}
        label="airline"
      />

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
