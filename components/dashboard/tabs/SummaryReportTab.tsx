'use client';

import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  FileStack,
  Plane,
  Shapes,
  Sparkles,
} from 'lucide-react';
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
import type { Report } from '@/types';
import { SummarySectionCard } from './summary/SummarySectionCard';
import { SummaryDenseTable } from './summary/SummaryDenseTable';
import { SummaryDetailArchive } from './summary/SummaryDetailArchive';
import { SummaryMatrixTable } from './summary/SummaryMatrixTable';
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

export function SummaryReportTab({ reports }: SummaryReportTabProps) {
  const deferredReports = useDeferredValue(reports);
  const [matrixMode, setMatrixMode] = useState<MatrixMode>('branch');

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

  const activeMatrix = matrixMode === 'branch' ? matrices.branch : matrices.airline;
  const totalCategoryCount = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      <SummarySectionCard
        title="Overview"
        subtitle=""
      >
        <div className="space-y-6">
          <SummaryKpiGrid items={kpis} />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <SummaryMiniPanel
                icon={<Shapes size={18} />}
                title="Category Distribution"
                subtitle=""
              >
                <div className="h-[280px]">
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
                      <Tooltip
                        formatter={(value: number, _name: string, entry: { payload?: { name?: string } }) => [`${value} reports`, entry?.payload?.name || '']}
                        contentStyle={{
                          borderRadius: '16px',
                          borderColor: 'oklch(0.9 0.01 90 / 0.9)',
                          background: 'oklch(0.99 0.005 90 / 0.95)',
                        }}
                      />
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
              </SummaryMiniPanel>
            </div>

            <div>
              <SummaryMiniPanel
                icon={<BarChart3 size={18} />}
                title="Monthly Trend"
                subtitle=""
              >
                <div className="h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      layout="vertical"
                      margin={{ top: 8, right: 36, left: 18, bottom: 8 }}
                    >
                      <CartesianGrid horizontal={false} stroke="oklch(0.92 0.01 90 / 0.9)" strokeDasharray="4 4" />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="shortMonth"
                        width={72}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 700 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value} reports`, 'Volume']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.month || ''}
                        contentStyle={{
                          borderRadius: '16px',
                          borderColor: 'oklch(0.9 0.01 90 / 0.9)',
                          background: 'oklch(0.99 0.005 90 / 0.95)',
                        }}
                      />
                      <Bar dataKey="value" fill="oklch(0.65 0.18 160)" barSize={20} radius={[0, 12, 12, 0]}>
                        <LabelList
                          dataKey="value"
                          position="right"
                          offset={10}
                          className="fill-[var(--text-primary)] text-[11px] font-black"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SummaryMiniPanel>
            </div>

          </div>

          <div>
            <SummaryMiniPanel
              icon={<Plane size={18} />}
              title="Airline Category Breakdown"
              subtitle=""
            >
              <div className="h-[460px] min-h-0">
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
                      accessor: (row) => row.accident || '–',
                      sortValue: (row) => row.accident,
                      align: 'right',
                    },
                    {
                      id: 'complaint',
                      header: 'Complaint',
                      accessor: (row) => row.complaint || '–',
                      sortValue: (row) => row.complaint,
                      align: 'right',
                    },
                    {
                      id: 'irregularity',
                      header: 'Irregularity',
                      accessor: (row) => row.irregularity || '–',
                      sortValue: (row) => row.irregularity,
                      align: 'right',
                    },
                    {
                      id: 'compliment',
                      header: 'Compliment',
                      accessor: (row) => row.compliment || '–',
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
            </SummaryMiniPanel>
          </div>
        </div>
      </SummarySectionCard>

      <SummarySectionCard
        title="Case Classification and Root Cause Report"
        subtitle=""
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SummaryMiniPanel
              icon={<AlertCircle size={18} />}
              title="Case Classification"
              subtitle=""
            >
              <div className="min-h-0 flex-1">
                <SummaryDenseTable
                  data={caseClassificationRows}
                  rowKey={(row) => row.id}
                  itemsPerPage={10}
                  initialSort={{ columnId: 'value', direction: 'desc' }}
                  columns={[
                    {
                      id: 'name',
                      header: 'Case Classification',
                      accessor: (row) => <span className="block max-w-[200px] break-words">{row.name}</span>,
                      sortValue: (row) => row.name,
                    },
                    {
                      id: 'value',
                      header: 'Total',
                      accessor: (row) => <span className="font-mono font-black text-[var(--brand-emerald-700)]">{row.value}</span>,
                      sortValue: (row) => row.value,
                      align: 'right',
                    },
                  ]}
                />
              </div>
            </SummaryMiniPanel>

            <SummaryMiniPanel
              icon={<Sparkles size={18} />}
              title="Root Cause Identification"
              subtitle=""
            >
              <div className="min-h-0 flex-1">
                <SummaryDenseTable
                  data={rootCauseRows}
                  rowKey={(row) => row.id}
                  itemsPerPage={10}
                  initialSort={{ columnId: 'value', direction: 'desc' }}
                  columns={[
                    {
                      id: 'name',
                      header: 'Identification Of Root',
                      accessor: (row) => <span className="block max-w-[200px] break-words">{row.name}</span>,
                      sortValue: (row) => row.name,
                    },
                    {
                      id: 'value',
                      header: 'Total',
                      accessor: (row) => <span className="font-mono font-black text-[var(--brand-emerald-700)]">{row.value}</span>,
                      sortValue: (row) => row.value,
                      align: 'right',
                    },
                  ]}
                />
              </div>
            </SummaryMiniPanel>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <AreaBreakdownPanel
              title="Landside Area"
              subtitle=""
              rows={areaPanels.landside}
            />
            <AreaBreakdownPanel
              title="Airside Area"
              subtitle=""
              rows={areaPanels.airside}
            />
            <AreaBreakdownPanel
              title="General Service"
              subtitle=""
              rows={areaPanels.general}
            />
          </div>
        </div>
      </SummarySectionCard>

      <SummarySectionCard
        title="Breakdown of Identified Causes by Branch & Airlines"
        subtitle=""
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

      <SummarySectionCard
        title="Detail Root Cause Identification by Area"
        subtitle=""
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

      <SummarySectionCard
        title="Detail Report"
        subtitle=""
      >
        <SummaryDetailArchive rows={detailRows} />
      </SummarySectionCard>
    </div>
  );
}

function SummaryKpiGrid({ items }: { items: SummaryKpiItem[] }) {
  const groups = [
    { id: 'volume', title: 'Volume', icon: <FileStack size={16} />, items: items.filter((item) => item.tone === 'volume') },
    { id: 'mix', title: 'Case Mix', icon: <Shapes size={16} />, items: items.filter((item) => item.tone === 'mix') },
    { id: 'workflow', title: 'Workflow', icon: <CheckCircle2 size={16} />, items: items.filter((item) => item.tone === 'workflow') },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12">
      {groups.map((group) => (
        <div key={group.id} className="sm:col-span-1 xl:col-span-4">
          <div className="rounded-[24px] border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/75 p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[oklch(0.65_0.18_160_/_0.12)] text-[var(--brand-emerald-700)]">
                {group.icon}
              </span>
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-[var(--brand-emerald-700)]">
                  {group.title}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {group.id === 'workflow' ? 'Closure state' : group.id === 'mix' ? 'Current category balance' : 'Current data footprint'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-[22px] border px-4 py-3 ${
                    group.id === 'mix'
                      ? 'border-[oklch(0.92_0.02_82_/_0.85)] bg-[oklch(0.99_0.01_82_/_0.85)]'
                      : group.id === 'workflow'
                      ? 'border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-0)]/95'
                      : 'border-[var(--brand-emerald-100)] bg-[var(--brand-emerald-50)]/55'
                  }`}
                >
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-2 font-mono text-[1.65rem] font-black leading-none text-[var(--brand-emerald-700)]">
                    {item.value.toLocaleString()}
                  </p>
                  {item.description ? (
                    <p className="mt-2 text-[0.76rem] leading-5 text-[var(--text-secondary)]">{item.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryMiniPanel({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[oklch(0.9_0.01_90_/_0.72)] bg-white/75 p-4">
      <div className="mb-4 flex shrink-0 items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[oklch(0.65_0.18_160_/_0.12)] text-[var(--brand-emerald-700)]">
          {icon}
        </span>
        <div className="space-y-1">
          <h3 className="font-display text-[1.02rem] font-black tracking-[-0.03em] text-[var(--text-primary)]">
            {title}
          </h3>
          {subtitle ? <p className="text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p> : null}
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function AreaBreakdownPanel({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: SummaryAreaRow[];
}) {
  return (
    <SummaryMiniPanel
      icon={<Building2 size={18} />}
      title={title}
      subtitle={subtitle}
    >
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
    </SummaryMiniPanel>
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
