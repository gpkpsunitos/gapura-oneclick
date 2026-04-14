'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileStack,
  Plane,
  Shapes,
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
import type { ComparisonData, Report } from '@/types';
import { ExecutiveSummaryTables } from '@/components/dashboard/analyst/ExecutiveSummaryTables';
import { calculateComparisonData } from '@/lib/utils/comparison-utils';
import { SummarySectionCard } from './summary/SummarySectionCard';
import { SummaryDenseTable } from './summary/SummaryDenseTable';
import { SummaryDetailArchive } from './summary/SummaryDetailArchive';
import { MonthlyAreaWorkbookTable, type MonthlyAreaWorkbookRow } from './summary/MonthlyAreaWorkbookTable';
import { SummaryMatrixTable } from './summary/SummaryMatrixTable';
import {
  ChartCard,
  CustomTooltip,
  WrappedYAxisTick,
  ResponsiveContainer,
  KpiCard,
  CategoryBarList,
  REFERENCE_COLORS,
} from './shared/chart-ui';
import type {
  SummaryAirlineRow,
  SummaryAreaRow,
  SummaryCategorySlice,
  SummaryDetailRow,
  SummaryKpiItem,
  SummaryMatrixData,
  SummaryMatrixRow,
  SummaryMetricRow,
  SummaryMonthlyRow,
  SummaryRootCauseAreaRow,
} from './summary/types';
import { normalizeText } from './summary/summary-utils';

interface SummaryReportTabProps {
  reports: Report[];
}

const CATEGORY_FILLS = {
  accident: 'oklch(0.55 0.18 25)',
  complaint: 'oklch(0.62 0.2 25)',
  irregularity: 'oklch(0.68 0.17 165)',
  compliment: 'oklch(0.68 0.16 205)',
};

const MATRIX_MODES = [
  { id: 'branch', label: 'By Branch' },
  { id: 'airline', label: 'By Airline' },
] as const;

type MatrixMode = (typeof MATRIX_MODES)[number]['id'];

const SCHEMA_TABS = [
  { id: 'category_area', label: 'Category Area' },
  { id: 'identification_root', label: 'Identification of Root' },
] as const;

type SchemaTab = (typeof SCHEMA_TABS)[number]['id'];

export function SummaryReportTab({ reports }: SummaryReportTabProps) {
  const deferredReports = useDeferredValue(reports);
  const [matrixMode, setMatrixMode] = useState<MatrixMode>('branch');
  const [schemaTab, setSchemaTab] = useState<SchemaTab>('category_area');
  const [isComparisonFilterOpen, setIsComparisonFilterOpen] = useState(false);
  const [comparisonTimeframe, setComparisonTimeframe] = useState<'3m' | '6m' | '12m' | 'all' | 'custom'>('all');
  const [comparisonBranch, setComparisonBranch] = useState('all');
  const [comparisonAirline, setComparisonAirline] = useState('all');
  const [comparisonArea, setComparisonArea] = useState('all');
  const [comparisonCustomFrom, setComparisonCustomFrom] = useState('');
  const [comparisonCustomTo, setComparisonCustomTo] = useState('');

  const kpis = useMemo<SummaryKpiItem[]>(() => {
    const branches = new Set(deferredReports.map((report) => report.stations?.code || report.branch).filter(Boolean));
    const airlines = new Set(deferredReports.map((report) => report.airlines || report.airline).filter(Boolean));
    const complaints = deferredReports.filter((report) => report.category === 'Complaint').length;
    const compliments = deferredReports.filter((report) => report.category === 'Compliment').length;
    const open = deferredReports.filter((report) => report.status === 'OPEN').length;
    const closed = deferredReports.filter((report) => report.status === 'CLOSED').length;

    return [
      { key: 'total', label: 'Reports', value: deferredReports.length, description: '', tone: 'volume' },
      { key: 'branches', label: 'Branch', value: branches.size, description: '', tone: 'volume' },
      { key: 'airlines', label: 'Airlines', value: airlines.size, description: '', tone: 'volume' },
      { key: 'complaints', label: 'Complaint', value: complaints, description: '', tone: 'mix' },
      { key: 'compliments', label: 'Compliment Report', value: compliments, description: '', tone: 'mix' },
      { key: 'open', label: 'Report Open', value: open, description: '', tone: 'workflow' },
      { key: 'closed', label: 'Report Closed', value: closed, description: '', tone: 'workflow' },
    ];
  }, [deferredReports]);

  const categoryData = useMemo<SummaryCategorySlice[]>(() => {
    const counts = {
      accident: 0,
      complaint: 0,
      irregularity: 0,
      compliment: 0,
    };

    deferredReports.forEach((report) => {
      const category = (report.category || '').toLowerCase();
      if (category.includes('complai')) counts.complaint += 1;
      else if (category.includes('irreg')) counts.irregularity += 1;
      else if (category.includes('complim')) counts.compliment += 1;
      else if (category.includes('accid') || report.accident_incident) counts.accident += 1;
    });

    return [
      { name: 'Accident / Incident', value: counts.accident, fill: CATEGORY_FILLS.accident },
      { name: 'Complaint', value: counts.complaint, fill: CATEGORY_FILLS.complaint },
      { name: 'Irregularity', value: counts.irregularity, fill: CATEGORY_FILLS.irregularity },
      { name: 'Compliment', value: counts.compliment, fill: CATEGORY_FILLS.compliment },
    ].filter((item) => item.value > 0);
  }, [deferredReports]);

  const monthlyData = useMemo<SummaryMonthlyRow[]>(() => {
    const counts: Record<string, { month: string; shortMonth: string; value: number; year: number; monthIndex: number }> = {};

    deferredReports.forEach((report) => {
      const dateStr = report.date_of_event || report.created_at;
      if (!dateStr) return;

      let d: Date;
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // Pure date string (YYYY-MM-DD) — parse without timezone shift
        const [y, m, day] = dateStr.split('-').map(Number);
        d = new Date(y, m - 1, day);
      } else {
        // ISO string or other format — extract date parts to avoid timezone issues
        const parsed = new Date(dateStr);
        if (Number.isNaN(parsed.getTime())) return;
        // Use UTC getters to preserve the original calendar date from the API
        d = new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
      }
      if (Number.isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthName = d.toLocaleString('en-US', { month: 'long' });
      const twoDigitYear = String(year).slice(-2);
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const label = `${monthName} ${year}`;

      if (!counts[key]) {
        counts[key] = {
          month: label,
          shortMonth: `${monthName.slice(0, 3).toUpperCase()} '${twoDigitYear}`,
          value: 0,
          year,
          monthIndex,
        };
      }
      counts[key].value += 1;
    });

    // Sort ascending: oldest month first (top of chart = oldest)
    return Object.values(counts)
      .sort((left, right) => {
        if (left.year !== right.year) return left.year - right.year;
        return left.monthIndex - right.monthIndex;
      });
  }, [deferredReports]);

  const airlineRows = useMemo<SummaryAirlineRow[]>(() => {
    const grouped: Record<string, SummaryAirlineRow> = {};

    deferredReports.forEach((report) => {
      const branch = normalizeText(report.stations?.code || report.branch || 'Unknown');
      const airline = normalizeText(report.airlines || report.airline || 'Unknown');
      const key = `${branch}::${airline}`;

      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          branch,
          airline,
          accident: 0,
          complaint: 0,
          irregularity: 0,
          compliment: 0,
          total: 0,
        };
      }

      const category = (report.category || '').toLowerCase();
      if (category.includes('accid') || report.accident_incident) grouped[key].accident += 1;
      else if (category.includes('complai')) grouped[key].complaint += 1;
      else if (category.includes('irreg')) grouped[key].irregularity += 1;
      else if (category.includes('complim')) grouped[key].compliment += 1;

      grouped[key].total += 1;
    });

    return Object.values(grouped).sort((left, right) => right.total - left.total);
  }, [deferredReports]);

  const caseClassificationRows = useMemo<SummaryMetricRow[]>(
    () => aggregateMetricRows(deferredReports, 'case_classification'),
    [deferredReports]
  );

  const rootCauseRows = useMemo<SummaryMetricRow[]>(
    () => aggregateMetricRows(deferredReports, 'identification_of_root'),
    [deferredReports]
  );

  const areaPanels = useMemo(
    () => ({
      landside: aggregateAreaRows(
        deferredReports,
        (report) => Boolean(report.terminal_area_category) || String(report.area || '').toLowerCase().includes('terminal'),
        'terminal_area_category'
      ),
      airside: aggregateAreaRows(
        deferredReports,
        (report) => Boolean(report.apron_area_category) || String(report.area || '').toLowerCase().includes('apron'),
        'apron_area_category'
      ),
      general: aggregateAreaRows(
        deferredReports,
        (report) => Boolean(report.general_category) || String(report.area || '').toLowerCase().includes('general'),
        'general_category'
      ),
    }),
    [deferredReports]
  );

  const workbookTables = useMemo(
    () => ({
      landside: aggregateWorkbookRowsByArea(
        deferredReports,
        (report) => Boolean(report.terminal_area_category) || String(report.area || '').toLowerCase().includes('terminal'),
        'terminal_area_category'
      ),
      airside: aggregateWorkbookRowsByArea(
        deferredReports,
        (report) => Boolean(report.apron_area_category) || String(report.area || '').toLowerCase().includes('apron'),
        'apron_area_category'
      ),
      general: aggregateWorkbookRowsByArea(
        deferredReports,
        (report) => Boolean(report.general_category) || String(report.area || '').toLowerCase().includes('general'),
        'general_category'
      ),
    }),
    [deferredReports]
  );

  const rootCauseAreaPanels = useMemo(
    () => ({
      landside: aggregateRootCauseByArea(
        deferredReports,
        (report) => Boolean(report.terminal_area_category && String(report.terminal_area_category).trim()),
        'terminal_area_category'
      ),
      airside: aggregateRootCauseByArea(
        deferredReports,
        (report) => Boolean(report.apron_area_category && String(report.apron_area_category).trim()),
        'apron_area_category'
      ),
      general: aggregateRootCauseByArea(
        deferredReports,
        (report) => Boolean(report.general_category && String(report.general_category).trim()),
        'general_category'
      ),
    }),
    [deferredReports]
  );

  const rootWorkbookTables = useMemo(
    () => ({
      primaryIndicators: aggregateRootWorkbookRows(
        deferredReports,
        (report) => resolvePrimaryIndicatorLabel(report)
      ),
      rootCauseResult: aggregateRootWorkbookRows(
        deferredReports,
        (report) => resolveRootCauseResultLabel(report)
      ),
    }),
    [deferredReports]
  );

  const matrices = useMemo<{ branch: SummaryMatrixData; airline: SummaryMatrixData }>(() => {
    const branchBuckets: Record<string, Record<string, number>> = {};
    const branchColumnTotals: Record<string, number> = {};
    const airlineBuckets: Record<string, Record<string, number>> = {};
    const airlineColumnTotals: Record<string, number> = {};

    deferredReports.forEach((report) => {
      const label = normalizeText(report.case_classification);
      if (!label || label === '-' || label.toLowerCase() === 'unknown') return;
      const branch = normalizeText(report.stations?.code || report.branch || 'Unknown').toUpperCase();
      const airline = normalizeText(report.airlines || report.airline || 'Unknown');

      if (!branchBuckets[label]) branchBuckets[label] = {};
      if (!airlineBuckets[label]) airlineBuckets[label] = {};

      branchBuckets[label][branch] = (branchBuckets[label][branch] || 0) + 1;
      airlineBuckets[label][airline] = (airlineBuckets[label][airline] || 0) + 1;

      branchColumnTotals[branch] = (branchColumnTotals[branch] || 0) + 1;
      airlineColumnTotals[airline] = (airlineColumnTotals[airline] || 0) + 1;
    });

    return {
      branch: createMatrixData(branchBuckets, branchColumnTotals),
      airline: createMatrixData(airlineBuckets, airlineColumnTotals),
    };
  }, [deferredReports]);

  const detailRows = useMemo<SummaryDetailRow[]>(() => {
    return deferredReports.map((report) => {
      const dateSource = report.date_of_event || report.created_at;
      const parsedDate = new Date(dateSource);
      const rawDate = Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();

      return {
        id: report.id,
        date: rawDate > 0 ? parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
        rawDate,
        branch: normalizeText(report.stations?.code || report.branch || '-').toUpperCase(),
        airline: normalizeText(report.airlines || report.airline || 'Non Airline Case'),
        flight: normalizeText(report.flight_number || '#N/A'),
        category: normalizeText(report.category || '-'),
        breakdown: normalizeText(report.breakdown_caused || '-'),
        rootSummary: normalizeText(report.identification_of_root || '-'),
        detail: normalizeText(report.description || report.report || '-'),
        detailRoot: normalizeText(report.root_caused || report.identification_of_root || '-'),
        action: normalizeText(report.action_taken || '-'),
        preventive: normalizeText(report.preventive_action || '-'),
        status: normalizeText(report.status || '-'),
      };
    });
  }, [deferredReports]);

  const comparisonBranchOptions = useMemo(
    () =>
      Array.from(new Set(deferredReports.map((report) => normalizeText(report.stations?.code || report.branch || '')).filter(Boolean))).sort(),
    [deferredReports]
  );

  const comparisonAirlineOptions = useMemo(
    () =>
      Array.from(new Set(deferredReports.map((report) => normalizeText(report.airlines || report.airline || '')).filter(Boolean))).sort(),
    [deferredReports]
  );

  const comparisonAreaOptions = useMemo(
    () => Array.from(new Set(deferredReports.map((report) => normalizeText(report.area || '')).filter(Boolean))).sort(),
    [deferredReports]
  );

  const filteredComparisonReports = useMemo(() => {
    let nextReports = [...deferredReports];

    if (comparisonBranch !== 'all') {
      nextReports = nextReports.filter(
        (report) => normalizeText(report.stations?.code || report.branch || '') === comparisonBranch
      );
    }

    if (comparisonAirline !== 'all') {
      nextReports = nextReports.filter(
        (report) => normalizeText(report.airlines || report.airline || '') === comparisonAirline
      );
    }

    if (comparisonArea !== 'all') {
      nextReports = nextReports.filter((report) => normalizeText(report.area || '') === comparisonArea);
    }

    if (comparisonTimeframe === 'custom') {
      const fromTime = comparisonCustomFrom ? new Date(comparisonCustomFrom).getTime() : Number.NEGATIVE_INFINITY;
      const toTime = comparisonCustomTo ? new Date(comparisonCustomTo).getTime() : Number.POSITIVE_INFINITY;

      nextReports = nextReports.filter((report) => {
        const dateSource = report.date_of_event || report.created_at;
        if (!dateSource) return false;

        let parsedDate: Date;
        if (typeof dateSource === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateSource)) {
          const [year, month, day] = dateSource.split('-').map(Number);
          parsedDate = new Date(year, month - 1, day);
        } else {
          const raw = new Date(dateSource);
          if (Number.isNaN(raw.getTime())) return false;
          parsedDate = new Date(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate());
        }

        const time = parsedDate.getTime();
        return time >= fromTime && time <= toTime;
      });
    } else if (comparisonTimeframe !== 'all') {
      const monthsToTake = comparisonTimeframe === '3m' ? 3 : comparisonTimeframe === '6m' ? 6 : 12;
      const datedReports = nextReports
        .map((report) => {
          const dateSource = report.date_of_event || report.created_at;
          if (!dateSource) return null;

          let parsedDate: Date;
          if (typeof dateSource === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateSource)) {
            const [year, month, day] = dateSource.split('-').map(Number);
            parsedDate = new Date(year, month - 1, day);
          } else {
            const raw = new Date(dateSource);
            if (Number.isNaN(raw.getTime())) return null;
            parsedDate = new Date(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate());
          }

          if (Number.isNaN(parsedDate.getTime())) return null;
          return { report, monthStart: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1).getTime() };
        })
        .filter((value): value is { report: Report; monthStart: number } => value !== null);

      const uniqueMonths = Array.from(new Set(datedReports.map((item) => item.monthStart))).sort((left, right) => right - left);
      const allowedMonths = new Set(uniqueMonths.slice(0, monthsToTake));
      nextReports = datedReports.filter((item) => allowedMonths.has(item.monthStart)).map((item) => item.report);
    }

    return nextReports;
  }, [
    deferredReports,
    comparisonAirline,
    comparisonArea,
    comparisonBranch,
    comparisonCustomFrom,
    comparisonCustomTo,
    comparisonTimeframe,
  ]);

  const comparisonData = useMemo<ComparisonData>(() => calculateComparisonData(filteredComparisonReports), [filteredComparisonReports]);

  const activeMatrix = matrixMode === 'branch' ? matrices.branch : matrices.airline;
  const totalCategoryCount = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {/* ── Section 1: Executive Overview ── */}
      <SummarySectionCard
        title="Overview"
        subtitle="Executive summary — key metrics and current operational snapshot"
      >
        <div className="space-y-6">
          {/* KPI Row — CGO-style KpiCard grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <KpiCard label="Total Reports" value={kpis.find((k) => k.key === 'total')?.value ?? 0} icon={FileStack} accent="oklch(0.55 0.14 240)" />
            <KpiCard label="Branches" value={kpis.find((k) => k.key === 'branches')?.value ?? 0} icon={Building2} accent="oklch(0.65 0.18 160)" />
            <KpiCard label="Airlines" value={kpis.find((k) => k.key === 'airlines')?.value ?? 0} icon={Plane} accent="oklch(0.6 0.14 240)" />
            <KpiCard label="Complaints" value={kpis.find((k) => k.key === 'complaints')?.value ?? 0} icon={AlertCircle} accent="oklch(0.6 0.18 25)" />
            <KpiCard label="Compliments" value={kpis.find((k) => k.key === 'compliments')?.value ?? 0} icon={Shapes} accent="oklch(0.8 0.15 80)" />
            <KpiCard label="Report Open" value={kpis.find((k) => k.key === 'open')?.value ?? 0} icon={Clock} accent="oklch(0.72 0.16 80)" />
            <KpiCard label="Report Closed" value={kpis.find((k) => k.key === 'closed')?.value ?? 0} icon={CheckCircle2} accent="oklch(0.55 0.18 145)" />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Category Distribution — Pie Chart */}
            <ChartCard title="Category Distribution" accent="oklch(0.65 0.18 160)">
              <div className="h-[220px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={98}
                      strokeWidth={0}
                      paddingAngle={2}
                    >
                      {categoryData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <text
                      x="50%"
                      y="48%"
                      textAnchor="middle"
                      className="fill-[var(--text-muted)] text-[11px] font-black uppercase tracking-[0.24em]"
                    >
                      TOTAL
                    </text>
                    <text
                      x="50%"
                      y="57%"
                      textAnchor="middle"
                      className="fill-[var(--text-primary)] text-[28px] font-black"
                    >
                      {totalCategoryCount}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {categoryData.map((item) => {
                  const share = totalCategoryCount > 0 ? Math.round((item.value / totalCategoryCount) * 100) : 0;

                  return (
                    <div key={item.name} className="rounded-2xl border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/80 px-3 py-2.5">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="min-w-0 break-words text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          {item.name}
                        </span>
                      </div>
                      <div className="mt-2 flex items-end justify-between">
                        <span className="font-mono text-lg font-black text-[var(--text-primary)]">{item.value}</span>
                        <span className="text-[0.72rem] font-semibold text-[var(--text-muted)]">{share}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            {/* Monthly Trend — Bar Chart (CGO style) */}
            <ChartCard title="Monthly Trend" accent="oklch(0.6 0.14 240)">
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                <div style={{ height: Math.max(200, monthlyData.length * 50) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      layout="vertical"
                      margin={{ top: 4, right: 40, left: 40, bottom: 4 }}
                      barCategoryGap="30%"
                    >
                      <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                      <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="shortMonth" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Count" fill={REFERENCE_COLORS.irregularity} radius={[0, 4, 4, 0]} maxBarSize={28}>
                        <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Airline Category Breakdown — DenseTable wrapped in ChartCard */}
          <ChartCard title="Airline Category Breakdown" accent="oklch(0.6 0.2 25)">
            <div className="h-[340px] sm:h-[460px] min-h-0">
              <SummaryDenseTable
                data={airlineRows}
                rowKey={(row) => row.id}
                itemsPerPage={7}
                initialSort={{ columnId: 'total', direction: 'desc' }}
                columns={[
                  {
                    id: 'branch',
                    header: 'Branch',
                    accessor: (row) => <span className="font-mono font-bold">{row.branch}</span>,
                    sortValue: (row) => row.branch,
                    minWidth: '88px',
                  },
                  {
                    id: 'airline',
                    header: 'Airline',
                    accessor: (row) => <span title={row.airline}>{row.airline}</span>,
                    sortValue: (row) => row.airline,
                    minWidth: '180px',
                  },
                  {
                    id: 'accident',
                    header: 'Accident / Incident',
                    accessor: (row) => row.accident || '\u2013',
                    sortValue: (row) => row.accident,
                    align: 'right',
                  },
                  {
                    id: 'complaint',
                    header: 'Complaint',
                    accessor: (row) => row.complaint || '\u2013',
                    sortValue: (row) => row.complaint,
                    align: 'right',
                  },
                  {
                    id: 'irregularity',
                    header: 'Irregularity',
                    accessor: (row) => row.irregularity || '\u2013',
                    sortValue: (row) => row.irregularity,
                    align: 'right',
                  },
                  {
                    id: 'compliment',
                    header: 'Compliment',
                    accessor: (row) => row.compliment || '\u2013',
                    sortValue: (row) => row.compliment,
                    align: 'right',
                  },
                  {
                    id: 'total',
                    header: 'Total',
                    accessor: (row) => <span className="font-mono font-black text-[var(--brand-emerald-700)]">{row.total}</span>,
                    sortValue: (row) => row.total,
                    align: 'right',
                  },
                ]}
              />
            </div>
          </ChartCard>
        </div>
      </SummarySectionCard>

      {/* ── Section 2: Classification & Root Cause ── */}
      <SummarySectionCard
        title="Case Classification and Root Cause Report"
        subtitle="Classification breakdown and root cause analysis by operational area"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Case Classification — wrapped in card-glass with CategoryBarList */}
            <ChartCard title="Case Classification" accent="oklch(0.65 0.18 160)">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Classification</span>
                <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total</span>
              </div>
              <CategoryBarList data={caseClassificationRows} color="oklch(0.65 0.18 160)" />
            </ChartCard>

            {/* Root Cause Identification — wrapped in card-glass with CategoryBarList */}
            <ChartCard title="Root Cause Identification" accent="oklch(0.6 0.2 25)">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Root Cause</span>
                <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total</span>
              </div>
              <CategoryBarList data={rootCauseRows} color="oklch(0.65 0.18 160)" />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <AreaBreakdownPanel
              title="Landside Area"
              subtitle=""
              accent="oklch(0.65 0.18 160)"
              rows={areaPanels.landside}
            />
            <AreaBreakdownPanel
              title="Airside Area"
              subtitle=""
              accent="oklch(0.6 0.14 240)"
              rows={areaPanels.airside}
            />
            <AreaBreakdownPanel
              title="General Service"
              subtitle=""
              accent="oklch(0.8 0.15 80)"
              rows={areaPanels.general}
            />
          </div>
        </div>
      </SummarySectionCard>

      {/* ── Section 3: Hotspot Matrix ── */}
      <SummarySectionCard
        title="Breakdown of Identified Causes by Branch & Airlines"
        subtitle="Cross-tabulation of case classifications across branches and airlines"
        toolbar={
          <div className="inline-flex rounded-full border border-[oklch(0.9_0.01_90_/_0.85)] bg-white/85 p-1">
            {MATRIX_MODES.map((mode) => {
              const active = matrixMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setMatrixMode(mode.id)}
                  className={`rounded-full px-4 py-2 text-[0.72rem] font-black uppercase tracking-[0.18em] transition-all ${
                    active
                      ? 'bg-[var(--brand-emerald-500)] text-white shadow-[0_10px_24px_-16px_oklch(0.65_0.18_160_/_0.7)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        }
      >
        <SummaryMatrixTable
          data={activeMatrix}
          columnLabel={matrixMode === 'branch' ? 'branch' : 'airline'}
        />
      </SummarySectionCard>

      {/* ── Section 4: Temporal Comparison ── */}
      <SummarySectionCard
        title="MoM & YoY Comparison"
        subtitle="Month-over-Month and Year-over-Year"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[1.55rem] font-black uppercase tracking-[0.04em] text-[var(--text-primary)]">
              Filter Data Analysis
            </h3>
            <button
              type="button"
              onClick={() => setIsComparisonFilterOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-[18px] border border-[oklch(0.9_0.03_85_/_0.95)] bg-[oklch(0.98_0.02_85_/_0.96)] px-4 py-2.5 text-[0.95rem] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[oklch(0.96_0.03_85_/_0.96)]"
            >
              <span>{isComparisonFilterOpen ? 'Sembunyikan Filter' : 'Tampilkan Filter'}</span>
              {isComparisonFilterOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {isComparisonFilterOpen ? (
            <div className="rounded-[24px] border border-slate-200/70 bg-white/70 p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Custom Range
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[180px] flex-1">
                      <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={comparisonCustomFrom}
                        onChange={(event) => {
                          setComparisonCustomFrom(event.target.value);
                          setComparisonTimeframe('custom');
                        }}
                        className="h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-sky-500"
                      />
                    </div>
                    <span className="px-1 text-[10px] font-bold text-slate-400">&rarr;</span>
                    <div className="relative min-w-[180px] flex-1">
                      <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={comparisonCustomTo}
                        onChange={(event) => {
                          setComparisonCustomTo(event.target.value);
                          setComparisonTimeframe('custom');
                        }}
                        className="h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Timeframe
                  </label>
                  <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
                    {(['3m', '6m', '12m', 'all'] as const).map((timeframe) => (
                      <button
                        key={timeframe}
                        type="button"
                        onClick={() => setComparisonTimeframe(timeframe)}
                        className={`h-[42px] rounded-lg border text-xs font-bold uppercase transition-colors ${
                          comparisonTimeframe === timeframe
                            ? 'border-sky-500 bg-sky-500 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {timeframe}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Branch
                    </label>
                    <select
                      value={comparisonBranch}
                      onChange={(event) => setComparisonBranch(event.target.value)}
                      className="h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-sky-500"
                    >
                      <option value="all">All Branches</option>
                      {comparisonBranchOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Airline
                    </label>
                    <select
                      value={comparisonAirline}
                      onChange={(event) => setComparisonAirline(event.target.value)}
                      className="h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-sky-500"
                    >
                      <option value="all">All Airlines</option>
                      {comparisonAirlineOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Area
                    </label>
                    <select
                      value={comparisonArea}
                      onChange={(event) => setComparisonArea(event.target.value)}
                      className="h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-sky-500"
                    >
                      <option value="all">All Areas</option>
                      {comparisonAreaOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <ExecutiveSummaryTables data={comparisonData} className="mt-2" />
        </div>
      </SummarySectionCard>

      {/* ── Section 5: Full Workbook ── */}
      <SummarySectionCard
        title="Global Workbook Schema"
        subtitle="Complete 12-month breakdown per area and root cause category"
        toolbar={
          <div className="inline-flex rounded-full border border-[oklch(0.9_0.01_90_/_0.85)] bg-white/85 p-1">
            {SCHEMA_TABS.map((tab) => {
              const active = schemaTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSchemaTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-[0.72rem] font-black uppercase tracking-[0.18em] transition-all ${
                    active
                      ? 'bg-[var(--brand-emerald-500)] text-white shadow-[0_10px_24px_-16px_oklch(0.65_0.18_160_/_0.7)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        }
      >
        {schemaTab === 'category_area' ? (
          <div className="grid grid-cols-1 gap-5">
            <MonthlyAreaWorkbookTable
              title="Category by Landside Area / Terminal Area"
              rows={workbookTables.landside}
            />
            <MonthlyAreaWorkbookTable
              title="Category by Airside / Apron Area"
              rows={workbookTables.airside}
            />
            <MonthlyAreaWorkbookTable
              title="Category by General Service Area"
              rows={workbookTables.general}
            />
          </div>
        ) : null}

        {schemaTab === 'identification_root' ? (
          <div className="grid grid-cols-1 gap-5">
            <MonthlyAreaWorkbookTable
              title="Airlines Report - Primary Indicators of Root"
              rows={rootWorkbookTables.primaryIndicators}
              detailHeader="Primary Indicators of Root"
              totalDetailLabel="All Primary Indicators"
            />
            <MonthlyAreaWorkbookTable
              title="Airlines Report - Root Cause Result"
              rows={rootWorkbookTables.rootCauseResult}
              detailHeader="Root Cause Result"
              totalDetailLabel="All Root Cause Result"
            />
          </div>
        ) : null}
      </SummarySectionCard>

      {/* ── Section 6: Detailed Root Cause ── */}
      <SummarySectionCard
        title="Detail Root Cause Identification by Area"
        subtitle="Granular root cause analysis per operational area"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-[0.72rem] font-black uppercase tracking-[0.2em] text-[var(--brand-emerald-700)]">Landside Area</h3>
            <SummaryDenseTable
              data={rootCauseAreaPanels.landside}
              rowKey={(row) => row.id}
              itemsPerPage={8}
              initialSort={{ columnId: 'branch', direction: 'asc' }}
              columns={[
                { id: 'branch', header: 'Branch', accessor: (row) => <span>{row.branch}</span>, sortValue: (row) => row.branch },
                { id: 'airline', header: 'Airlines', accessor: (row) => <span>{row.airline}</span>, sortValue: (row) => row.airline },
                { id: 'category', header: 'Category', accessor: (row) => <span>{row.category}</span>, sortValue: (row) => row.category },
                { id: 'areaCategory', header: 'Landside Area', accessor: (row) => <span className="break-words">{row.areaCategory}</span>, sortValue: (row) => row.areaCategory },
                { id: 'issueCaused', header: 'Issue Caused', accessor: (row) => <span className="break-words">{row.issueCaused}</span>, sortValue: (row) => row.issueCaused },
                { id: 'breakdownCaused', header: 'Breakdown Caused', accessor: (row) => <span className="break-words">{row.breakdownCaused}</span>, sortValue: (row) => row.breakdownCaused },
                { id: 'rootCause', header: 'Root Caused', accessor: (row) => <span className="break-words">{row.rootCause}</span>, sortValue: (row) => row.rootCause },
              ]}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-[0.72rem] font-black uppercase tracking-[0.2em] text-[var(--brand-emerald-700)]">Airside Area</h3>
            <SummaryDenseTable
              data={rootCauseAreaPanels.airside}
              rowKey={(row) => row.id}
              itemsPerPage={8}
              initialSort={{ columnId: 'rootCause', direction: 'asc' }}
              columns={[
                { id: 'branch', header: 'Branch', accessor: (row) => <span>{row.branch}</span>, sortValue: (row) => row.branch },
                { id: 'airline', header: 'Airlines', accessor: (row) => <span>{row.airline}</span>, sortValue: (row) => row.airline },
                { id: 'category', header: 'Category', accessor: (row) => <span>{row.category}</span>, sortValue: (row) => row.category },
                { id: 'areaCategory', header: 'Airside Area', accessor: (row) => <span className="break-words">{row.areaCategory}</span>, sortValue: (row) => row.areaCategory },
                { id: 'issueCaused', header: 'Issue Caused', accessor: (row) => <span className="break-words">{row.issueCaused}</span>, sortValue: (row) => row.issueCaused },
                { id: 'breakdownCaused', header: 'Breakdown Caused', accessor: (row) => <span className="break-words">{row.breakdownCaused}</span>, sortValue: (row) => row.breakdownCaused },
                { id: 'rootCause', header: 'Root Caused', accessor: (row) => <span className="break-words">{row.rootCause}</span>, sortValue: (row) => row.rootCause },
              ]}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-[0.72rem] font-black uppercase tracking-[0.2em] text-[var(--brand-emerald-700)]">General Service Area</h3>
            <SummaryDenseTable
              data={rootCauseAreaPanels.general}
              rowKey={(row) => row.id}
              itemsPerPage={8}
              initialSort={{ columnId: 'rootCause', direction: 'asc' }}
              columns={[
                { id: 'branch', header: 'Branch', accessor: (row) => <span>{row.branch}</span>, sortValue: (row) => row.branch },
                { id: 'airline', header: 'Airlines', accessor: (row) => <span>{row.airline}</span>, sortValue: (row) => row.airline },
                { id: 'category', header: 'Category', accessor: (row) => <span>{row.category}</span>, sortValue: (row) => row.category },
                { id: 'areaCategory', header: 'General Service', accessor: (row) => <span className="break-words">{row.areaCategory}</span>, sortValue: (row) => row.areaCategory },
                { id: 'issueCaused', header: 'Issue Caused', accessor: (row) => <span className="break-words">{row.issueCaused}</span>, sortValue: (row) => row.issueCaused },
                { id: 'breakdownCaused', header: 'Breakdown Caused', accessor: (row) => <span className="break-words">{row.breakdownCaused}</span>, sortValue: (row) => row.breakdownCaused },
                { id: 'rootCause', header: 'Root Caused', accessor: (row) => <span className="break-words">{row.rootCause}</span>, sortValue: (row) => row.rootCause },
              ]}
            />
          </div>
        </div>
      </SummarySectionCard>

      {/* ── Section 7: Individual Reports Archive ── */}
      <SummarySectionCard
        title="Detail Report"
        subtitle="Complete individual report archive"
      >
        <SummaryDetailArchive rows={detailRows} />
      </SummarySectionCard>
    </div>
  );
}

function AreaBreakdownPanel({
  title,
  subtitle,
  accent,
  rows,
}: {
  title: string;
  subtitle: string;
  accent: string;
  rows: SummaryAreaRow[];
}) {
  return (
    <ChartCard title={title} accent={accent}>
      <div className="min-h-0 flex-1">
        <SummaryDenseTable
          data={rows}
          rowKey={(row) => row.id}
          itemsPerPage={9}
          initialSort={{ columnId: 'total', direction: 'desc' }}
          columns={[
            {
              id: 'category',
              header: 'Category',
              accessor: (row) => <span className="block max-w-[120px] break-words">{row.category}</span>,
              sortValue: (row) => row.category,
            },
            {
              id: 'classification',
              header: 'Case Classification',
              accessor: (row) => <span className="block max-w-[140px] break-words">{row.classification}</span>,
              sortValue: (row) => row.classification,
            },
            {
              id: 'total',
              header: 'Total',
              accessor: (row) => <span className="font-mono font-black text-[var(--brand-emerald-700)]">{row.total}</span>,
              sortValue: (row) => row.total,
              align: 'right',
            },
          ]}
        />
      </div>
    </ChartCard>
  );
}

function aggregateMetricRows(reports: Report[], field: keyof Report): SummaryMetricRow[] {
  const counts: Record<string, number> = {};

  reports.forEach((report) => {
    const value = report[field];
    if (typeof value !== 'string') return;
    const normalized = value.trim();
    if (!normalized) return;
    counts[normalized] = (counts[normalized] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, value]) => ({
      id: name,
      name,
      value,
    }))
    .sort((left, right) => right.value - left.value);
}

function aggregateAreaRows(
  reports: Report[],
  filterFn: (report: Report) => boolean,
  categoryField: keyof Report
): SummaryAreaRow[] {
  const buckets: Record<string, SummaryAreaRow> = {};

  reports.filter(filterFn).forEach((report) => {
    const category = normalizeText(report[categoryField], '');
    if (!category) return;

    const classification = normalizeText(report.case_classification);
    if (!classification || classification === '-') return;
    const key = `${category}::${classification}`;

    if (!buckets[key]) {
      buckets[key] = {
        id: key,
        category,
        classification,
        total: 0,
      };
    }

    buckets[key].total += 1;
  });

  return Object.values(buckets).sort((left, right) => right.total - left.total);
}

function aggregateWorkbookRowsByArea(
  reports: Report[],
  filterFn: (report: Report) => boolean,
  categoryField: keyof Report
): MonthlyAreaWorkbookRow[] {
  const buckets: Record<string, MonthlyAreaWorkbookRow> = {};

  reports.filter(filterFn).forEach((report) => {
    const category = normalizeText(report[categoryField], '');
    if (!category) return;

    const airline = normalizeText(report.airlines || report.airline || 'Non Airline Case');
    if (!airline) return;

    const monthIndex = getReportMonthIndex(report);
    if (monthIndex === null) return;

    const key = `${airline}::${category}`;
    if (!buckets[key]) {
      buckets[key] = {
        id: key,
        airline,
        category,
        months: new Array(12).fill(0),
        total: 0,
        improvementPct: null,
        improvementDirection: null,
      };
    }

    buckets[key].months[monthIndex] += 1;
    buckets[key].total += 1;
  });

  const latestMonthIndex = getLatestAvailableMonthIndex(reports);

  return Object.values(buckets)
    .map((row) => {
      const improvement = calculateMonthImprovement(row.months, latestMonthIndex);
      return {
        ...row,
        improvementPct: improvement.pct,
        improvementDirection: improvement.direction,
      };
    })
    .sort((left, right) => {
      if (right.total !== left.total) return right.total - left.total;
      const airlineCompare = left.airline.localeCompare(right.airline);
      if (airlineCompare !== 0) return airlineCompare;
      return left.category.localeCompare(right.category);
    });
}

function aggregateRootWorkbookRows(
  reports: Report[],
  resolveLabel: (report: Report) => string
): MonthlyAreaWorkbookRow[] {
  const buckets: Record<string, MonthlyAreaWorkbookRow> = {};

  reports.forEach((report) => {
    const airline = normalizeText(report.airlines || report.airline || 'Non Airline Case');
    if (!airline) return;

    const label = resolveLabel(report);
    const monthIndex = getReportMonthIndex(report);
    if (monthIndex === null) return;

    const key = `${airline}::${label}`;
    if (!buckets[key]) {
      buckets[key] = {
        id: key,
        airline,
        category: label,
        months: new Array(12).fill(0),
        total: 0,
        improvementPct: null,
        improvementDirection: null,
      };
    }

    buckets[key].months[monthIndex] += 1;
    buckets[key].total += 1;
  });

  const latestMonthIndex = getLatestAvailableMonthIndex(reports);

  return Object.values(buckets)
    .map((row) => {
      const improvement = calculateMonthImprovement(row.months, latestMonthIndex);
      return {
        ...row,
        improvementPct: improvement.pct,
        improvementDirection: improvement.direction,
      };
    })
    .sort((left, right) => {
      if (right.total !== left.total) return right.total - left.total;
      const airlineCompare = left.airline.localeCompare(right.airline);
      if (airlineCompare !== 0) return airlineCompare;
      if (left.category === '(blank)' && right.category !== '(blank)') return -1;
      if (right.category === '(blank)' && left.category !== '(blank)') return 1;
      return left.category.localeCompare(right.category);
    });
}

function resolvePrimaryIndicatorLabel(report: Report): string {
  const caseClassification = normalizeWorkbookLabel(report.case_classification);
  if (caseClassification) return caseClassification;

  const remarksCase = normalizeWorkbookLabel(report.remarks_case);
  if (remarksCase) return remarksCase;

  return '(blank)';
}

function resolveRootCauseResultLabel(report: Report): string {
  const identification = normalizeWorkbookLabel(report.identification_of_root);
  if (identification) return identification;

  return '(blank)';
}

function normalizeWorkbookLabel(value: unknown): string {
  const normalized = normalizeText(value, '');
  if (!normalized) return '';

  const lower = normalized.toLowerCase();
  if (lower === '-' || lower === 'nil' || lower === 'n/a' || lower === '#n/a' || lower === '(blank)') {
    return '';
  }

  return normalized;
}

function getReportMonthIndex(report: Report): number | null {
  const dateSource = report.date_of_event || report.created_at;
  if (!dateSource) return null;

  if (typeof dateSource === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateSource)) {
    const [, month] = dateSource.split('-').map(Number);
    return Number.isFinite(month) ? month - 1 : null;
  }

  const parsed = new Date(dateSource);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCMonth();
}

function getLatestAvailableMonthIndex(reports: Report[]): number | null {
  let latestTime = Number.NEGATIVE_INFINITY;
  let latestMonthIndex: number | null = null;

  reports.forEach((report) => {
    const dateSource = report.date_of_event || report.created_at;
    if (!dateSource) return;

    let parsed: Date;
    if (typeof dateSource === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateSource)) {
      const [year, month, day] = dateSource.split('-').map(Number);
      parsed = new Date(year, month - 1, day);
    } else {
      parsed = new Date(dateSource);
    }

    if (Number.isNaN(parsed.getTime())) return;
    if (parsed.getTime() > latestTime) {
      latestTime = parsed.getTime();
      latestMonthIndex = parsed.getMonth();
    }
  });

  return latestMonthIndex;
}

function calculateMonthImprovement(
  months: number[],
  latestMonthIndex: number | null
): { pct: number | null; direction: MonthlyAreaWorkbookRow['improvementDirection'] } {
  if (latestMonthIndex === null) {
    return { pct: null, direction: null };
  }

  const current = months[latestMonthIndex] || 0;
  const previousMonthIndex = latestMonthIndex === 0 ? 11 : latestMonthIndex - 1;
  const previous = months[previousMonthIndex] || 0;

  if (previous === 0 && current === 0) {
    return { pct: null, direction: null };
  }

  if (previous === 0 && current > 0) {
    return { pct: 100, direction: 'up' };
  }

  if (current === previous) {
    return { pct: 0, direction: 'flat' };
  }

  const pct = Math.abs(((current - previous) / previous) * 100);
  return {
    pct,
    direction: current > previous ? 'up' : 'down',
  };
}

function createMatrixData(
  buckets: Record<string, Record<string, number>>,
  columnTotals: Record<string, number>
): SummaryMatrixData {
  const columns = Object.entries(columnTotals)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name]) => name);

  let maxValue = 0;

  const rows: SummaryMatrixRow[] = Object.entries(buckets)
    .map(([label, values]) => {
      const total = columns.reduce((sum, column) => sum + (values[column] || 0), 0);
      maxValue = Math.max(maxValue, ...Object.values(values));

      return {
        id: label,
        label,
        values,
        total,
      };
    })
    .sort((left, right) => right.total - left.total);

  return {
    columns,
    rows,
    maxValue,
  };
}

function aggregateRootCauseByArea(
  reports: Report[],
  filterFn: (report: Report) => boolean,
  areaCategoryField: keyof Report
): SummaryRootCauseAreaRow[] {
  const EXCLUDED_SERVICE_TYPES = ['joumpa service', 'gse service performance'];

  const buckets: Record<string, SummaryRootCauseAreaRow> = {};

  reports.filter((report) => {
    if (!filterFn(report)) return false;
    const sbt = String(report.service_business_type || '').trim().toLowerCase();
    if (EXCLUDED_SERVICE_TYPES.some((excluded) => sbt.includes(excluded))) return false;
    return true;
  }).forEach((report) => {
    const branch = normalizeText(report.stations?.code || report.branch, '-').toUpperCase();
    const airline = normalizeText(report.airlines || report.airline, '-');
    const category = normalizeText(report.accident_incident, '-');
    const areaCategory = normalizeText(report[areaCategoryField], '-');
    // Issue Caused = Remarks Case
    const issueCaused = normalizeText(report.remarks_case);
    // Breakdown Caused = Case Classification
    const breakdownCaused = normalizeText(report.case_classification);
    if (!issueCaused || issueCaused === '-') return;
    if (!breakdownCaused || breakdownCaused === '-') return;
    // Root Caused = Identification of Root
    const rootCause = normalizeText(report.identification_of_root || report.root_caused, '-');

    const key = `${branch}::${airline}::${category}::${areaCategory}::${issueCaused}::${breakdownCaused}::${rootCause}`;

    if (!buckets[key]) {
      buckets[key] = {
        id: key,
        branch,
        airline,
        category,
        areaCategory,
        issueCaused,
        breakdownCaused,
        rootCause,
        total: 0,
      };
    }

    buckets[key].total += 1;
  });

  return Object.values(buckets).sort((left, right) => right.total - left.total);
}
