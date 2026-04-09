'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { Report } from '@/types';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface JoumpaServiceTabProps {
  allReports: Report[];
  reports: Report[];
}

const COLORS = {
  header: '#86c97c',
  bar: '#51b44d',
  barSoft: '#8acc88',
  heat: 'rgba(81, 180, 77, 0.14)',
  heatStrong: 'rgba(81, 180, 77, 0.92)',
  border: '#d7d9dc',
  text: '#303030',
  textSoft: '#4d4d4d',
  sheetBg: '#ffffff',
  cardBg: '#ffffff',
  pieGreen: '#50b44e',
  pieBlue: '#28afd0',
  pieYellow: '#d6e92a',
  pieDarkGreen: '#2f5d1e',
  pieOrange: '#ea8c2a',
};

const MONTH_ORDER = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const REMARKS_ORDER = [
  'Joumpa Lack of Service',
  'Joumpa Lack of Procedure',
  'Joumpa Kontraproduktif Procedure',
  'Compliment Best Of Service',
];

type RemarksCaseMatrixRow = Record<string, number | string> & {
  branch: string;
  airline: string;
  total: number;
};

function normalize(value: unknown) {
  return String(value || '').trim();
}

function normalizeLower(value: unknown) {
  return normalize(value).toLowerCase();
}

function formatDateLabel(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

function isCompliment(report: Report) {
  return normalizeLower(report.category) === 'compliment';
}

function isIssueReport(report: Report) {
  return !isCompliment(report);
}

function heatValue(value: number, max: number) {
  if (!value || max <= 0) return 'transparent';
  const ratio = Math.max(0.18, value / max);
  return `rgba(81, 180, 77, ${ratio})`;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = normalize(getKey(item));
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function sumNumeric(values: Array<number | undefined>) {
  return values.reduce((total, value) => total + (value || 0), 0);
}

function buildDistribution<T>(items: T[], getKey: (item: T) => string, preferredOrder?: string[]) {
  const counts = countBy(items, getKey);

  if (preferredOrder?.length) {
    return preferredOrder
      .map((label) => ({ name: label, value: counts.get(label) || 0 }))
      .filter((item) => item.value > 0);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => (b.value === a.value ? a.name.localeCompare(b.name) : b.value - a.value));
}

function buildMatrix<T>(
  items: T[],
  rowKey: (item: T) => string,
  colKey: (item: T) => string,
  columnsOrder?: string[]
) {
  const columnSet = new Set<string>();
  const rowMap = new Map<string, Record<string, number>>();

  items.forEach((item) => {
    const rowName = normalize(rowKey(item));
    const colName = normalize(colKey(item));
    if (!rowName || !colName) return;

    columnSet.add(colName);
    const row = rowMap.get(rowName) || {};
    row[colName] = (row[colName] || 0) + 1;
    rowMap.set(rowName, row);
  });

  const columns = columnsOrder?.length
    ? columnsOrder.filter((column) => columnSet.has(column))
    : Array.from(columnSet).sort();

  const data = Array.from(rowMap.entries())
    .map(([name, row]) => {
      const values = columns.map((column) => row[column] || 0);
      return {
        name,
        total: sumNumeric(values),
        ...row,
      };
    })
    .sort((a, b) => (b.total === a.total ? a.name.localeCompare(b.name) : b.total - a.total));

  return { columns, data };
}

function buildAreaTable(
  items: Report[],
  categoryField: 'terminal_area_category' | 'apron_area_category' | 'general_category'
) {
  const counts = new Map<string, { label: string; classification: string; total: number }>();

  items.forEach((report) => {
    const areaLabel = normalize(report[categoryField]);
    const classification = normalize(report.case_classification) || '-';
    if (!areaLabel) return;

    const key = `${areaLabel}__${classification}`;
    const current = counts.get(key) || {
      label: areaLabel,
      classification,
      total: 0,
    };
    current.total += 1;
    counts.set(key, current);
  });

  return Array.from(counts.values()).sort((a, b) => (
    b.total === a.total ? a.label.localeCompare(b.label) : b.total - a.total
  ));
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
          fill={COLORS.text}
          fontSize={10}
          fontWeight={500}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function Card({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden border bg-white shadow-[0_1px_4px_rgba(15,23,42,0.14)] ${className}`}
      style={{ borderColor: COLORS.border, backgroundColor: COLORS.cardBg }}
    >
      <div className="px-4 pt-4 pb-2 text-[14px] font-bold" style={{ color: COLORS.text }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ label = 'No data' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center px-4 py-8 text-[12px]" style={{ color: COLORS.textSoft }}>
      {label}
    </div>
  );
}

function PaginatedTable<T>({
  data,
  headers,
  renderRow,
  itemsPerPage = 10,
  minHeightClass = 'min-h-[220px]',
}: {
  data: T[];
  headers: Array<{ label: string; className?: string }>;
  renderRow: (row: T, rowIndex: number) => React.ReactNode;
  itemsPerPage?: number;
  minHeightClass?: string;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = data.slice(safePage * itemsPerPage, (safePage + 1) * itemsPerPage);
  const start = data.length === 0 ? 0 : safePage * itemsPerPage + 1;
  const end = Math.min((safePage + 1) * itemsPerPage, data.length);

  return (
    <div className={`flex h-full flex-col ${minHeightClass}`}>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-[11px]" style={{ color: COLORS.text }}>
          <thead>
            <tr style={{ backgroundColor: COLORS.header }}>
              {headers.map((header) => (
                <th
                  key={header.label}
                  className={`px-3 py-2 font-semibold ${header.className || ''}`}
                  style={{ color: '#244124' }}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, rowIndex) => renderRow(row, safePage * itemsPerPage + rowIndex))}
            {pageData.length === 0 && (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-8 text-center text-[12px]"
                  style={{ color: COLORS.textSoft }}
                >
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data.length > 0 && (
        <div className="flex items-center justify-end gap-3 border-t px-3 py-2 text-[11px]" style={{ borderColor: '#e6e6e6', color: COLORS.textSoft }}>
          <span>
            {start} - {end} / {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={safePage === 0}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              disabled={safePage >= totalPages - 1}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function JoumpaServiceTab({ allReports, reports }: JoumpaServiceTabProps) {
  const activeReportIds = useMemo(() => new Set(reports.map((report) => report.id)), [reports]);

  const fullJoumpaReports = useMemo(() => allReports.filter(isJoumpaSourceReport), [allReports]);

  const filteredJoumpaReports = useMemo(() => (
    fullJoumpaReports.filter((report) => activeReportIds.has(report.id))
  ), [activeReportIds, fullJoumpaReports]);

  const issueReports = useMemo(() => filteredJoumpaReports.filter(isIssueReport), [filteredJoumpaReports]);

  const kpis = useMemo(() => {
    const branches = new Set(filteredJoumpaReports.map((report) => normalize(report.stations?.code || report.branch)).filter(Boolean));
    const airlines = new Set(filteredJoumpaReports.map((report) => normalize(report.airlines || report.airline)).filter(Boolean));

    return {
      total: filteredJoumpaReports.length,
      branches: branches.size,
      airlines: airlines.size,
      complaints: filteredJoumpaReports.filter((report) => normalizeLower(report.category).includes('complai')).length,
      compliments: filteredJoumpaReports.filter((report) => normalizeLower(report.category).includes('compliment')).length,
      open: filteredJoumpaReports.filter((report) => normalizeLower(report.status) === 'open').length,
      closed: filteredJoumpaReports.filter((report) => normalizeLower(report.status) === 'closed').length,
    };
  }, [filteredJoumpaReports]);

  const monthlyData = useMemo(() => {
    const monthCounts = new Map<string, number>();

    filteredJoumpaReports.forEach((report) => {
      const rawDate = report.date_of_event || report.created_at;
      const date = rawDate ? new Date(rawDate) : null;
      if (!date || Number.isNaN(date.getTime())) return;

      const month = date.toLocaleString('en-US', { month: 'long' });
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    });

    return MONTH_ORDER
      .filter((month) => monthCounts.has(month))
      .map((month) => ({ month, value: monthCounts.get(month) || 0 }));
  }, [filteredJoumpaReports]);

  const remarksCaseData = useMemo(() => (
    buildDistribution(filteredJoumpaReports, (report) => normalize(report.remarks_case), REMARKS_ORDER)
  ), [filteredJoumpaReports]);

  const reportCategoryData = useMemo(() => {
    const counts = {
      Complaint: 0,
      'Accident / Incident': 0,
      Compliment: 0,
    };

    filteredJoumpaReports.forEach((report) => {
      const category = normalizeLower(report.category);
      if (category === 'compliment') {
        counts.Compliment += 1;
        return;
      }
      if (category === 'irregularity') {
        counts['Accident / Incident'] += 1;
        return;
      }
      counts.Complaint += 1;
    });

    return [
      { name: 'Complaint', value: counts.Complaint, fill: COLORS.pieBlue },
      { name: 'Accident / Incident', value: counts['Accident / Incident'], fill: COLORS.pieGreen },
      { name: 'Compliment', value: counts.Compliment, fill: COLORS.pieOrange },
    ].filter((item) => item.value > 0);
  }, [filteredJoumpaReports]);

  const reportAreaData = useMemo(() => {
    const counts = {
      'Terminal Area': 0,
      General: 0,
    };

    issueReports.forEach((report) => {
      const area = normalize(report.area);
      if (area === 'General') {
        counts.General += 1;
        return;
      }
      counts['Terminal Area'] += 1;
    });

    return [
      { name: 'Terminal Area', value: counts['Terminal Area'], fill: COLORS.pieGreen },
      { name: 'General', value: counts.General, fill: COLORS.pieBlue },
    ].filter((item) => item.value > 0);
  }, [issueReports]);

  const remarksCaseMatrix = useMemo(() => {
    const grouped = new Map<string, Omit<RemarksCaseMatrixRow, 'total'>>();

    filteredJoumpaReports.forEach((report) => {
      const branch = normalize(report.stations?.code || report.branch) || '-';
      const airline = normalize(report.airlines || report.airline) || '-';
      const remarksCase = normalize(report.remarks_case);
      const key = `${branch}__${airline}`;

      const row = grouped.get(key) || {
        branch,
        airline,
      };

      REMARKS_ORDER.forEach((label) => {
        row[label] = Number(row[label] || 0);
      });

      if (remarksCase && REMARKS_ORDER.includes(remarksCase)) {
        row[remarksCase] = Number(row[remarksCase] || 0) + 1;
      }

      grouped.set(key, row);
    });

    return Array.from(grouped.values())
      .map<RemarksCaseMatrixRow>((row) => ({
        ...row,
        branch: String(row.branch || '-'),
        airline: String(row.airline || '-'),
        total: REMARKS_ORDER.reduce((sum, label) => sum + Number(row[label] || 0), 0),
      }))
      .sort((a, b) => (b.total === a.total ? String(a.airline).localeCompare(String(b.airline)) : b.total - a.total));
  }, [filteredJoumpaReports]);

  const rootIdentificationData = useMemo(() => (
    buildDistribution(issueReports, (report) => normalize(report.identification_of_root))
  ), [issueReports]);

  const breakdownData = useMemo(() => (
    buildDistribution(issueReports, (report) => normalize(report.case_classification))
  ), [issueReports]);

  const breakdownByBranch = useMemo(() => (
    buildMatrix(issueReports, (report) => normalize(report.case_classification), (report) => normalize(report.stations?.code || report.branch))
  ), [issueReports]);

  const rootByBranch = useMemo(() => (
    buildMatrix(issueReports, (report) => normalize(report.identification_of_root), (report) => normalize(report.stations?.code || report.branch))
  ), [issueReports]);

  const rootByAirline = useMemo(() => (
    buildMatrix(
      issueReports,
      (report) => normalize(report.identification_of_root),
      (report) => normalize(report.airlines || report.airline),
      buildDistribution(issueReports, (report) => normalize(report.airlines || report.airline)).map((item) => item.name)
    )
  ), [issueReports]);

  const areaTables = useMemo(() => ({
    landside: buildAreaTable(issueReports.filter((report) => normalize(report.area) === 'Terminal Area'), 'terminal_area_category'),
    airside: buildAreaTable(issueReports.filter((report) => normalize(report.area) === 'Apron Area'), 'apron_area_category'),
    general: buildAreaTable(issueReports.filter((report) => normalize(report.area) === 'General'), 'general_category'),
  }), [issueReports]);

  const rootDetailRows = useMemo(() => filteredJoumpaReports.map((report) => ({
    branch: normalize(report.stations?.code || report.branch) || '-',
    airline: normalize(report.airlines || report.airline) || '-',
    category: normalize(report.category) || '-',
    area: normalize(report.area) || '-',
    issueCaused: normalize(report.remarks_case) || '-',
    breakdownCaused: normalize(report.case_classification) || '-',
    rootCaused: normalize(report.identification_of_root) || '-',
  })), [filteredJoumpaReports]);

  const detailReportRows = useMemo(() => filteredJoumpaReports.map((report, index) => ({
    index: index + 1,
    date: formatDateLabel(report.date_of_event || report.created_at),
    branch: normalize(report.stations?.code || report.branch) || '-',
    airline: normalize(report.airlines || report.airline) || '-',
    flight: normalize(report.flight_number) || '#N/A',
    category: normalize(report.category) || '-',
    breakdownCaused: normalize(report.case_classification) || '-',
    identificationOfRoot: normalize(report.identification_of_root) || '-',
    detailReport: normalize(report.description || report.report) || '-',
    detailRootCaused: normalize(report.root_caused) || '-',
    action: normalize(report.action_taken) || '#N/A',
    preventiveAction: normalize(report.preventive_action) || '#N/A',
    status: normalize(report.status) || 'OPEN',
  })), [filteredJoumpaReports]);

  const remarksColumnMaxima = useMemo(() => (
    REMARKS_ORDER.map((label) => Math.max(1, ...remarksCaseMatrix.map((row) => Number(row[label] || 0))))
  ), [remarksCaseMatrix]);

  const branchBreakdownMaxima = useMemo(() => (
    breakdownByBranch.columns.map((column) => Math.max(1, ...breakdownByBranch.data.map((row) => Number(row[column] || 0))))
  ), [breakdownByBranch.columns, breakdownByBranch.data]);

  const branchRootMaxima = useMemo(() => (
    rootByBranch.columns.map((column) => Math.max(1, ...rootByBranch.data.map((row) => Number(row[column] || 0))))
  ), [rootByBranch.columns, rootByBranch.data]);

  const airlineRootMaxima = useMemo(() => (
    rootByAirline.columns.map((column) => Math.max(1, ...rootByAirline.data.map((row) => Number(row[column] || 0))))
  ), [rootByAirline.columns, rootByAirline.data]);

  return (
    <div className="min-h-screen bg-white px-4 pb-8 pt-2 text-[12px] md:px-6">
      <div className="mx-auto max-w-[1520px]">
        <div className="grid gap-[1px] border" style={{ borderColor: COLORS.border, backgroundColor: COLORS.border, gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {[
            { label: 'Report', value: kpis.total },
            { label: 'Branch', value: kpis.branches },
            { label: 'Airlines', value: kpis.airlines },
            { label: 'Complaint', value: kpis.complaints },
            { label: 'Compliment Report', value: kpis.compliments },
            { label: 'Report Open', value: kpis.open },
            { label: 'Closed Report', value: kpis.closed },
          ].map((item) => (
            <div key={item.label} className="flex min-h-[88px] flex-col items-center justify-center bg-white px-3 py-4 text-center">
              <div className="text-[13px] font-medium" style={{ color: '#2f8f8a' }}>
                {item.label}
              </div>
              <div className="mt-1 text-[42px] font-normal leading-none" style={{ color: '#0d7070' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h1 className="text-[32px] font-bold leading-tight" style={{ color: '#0d7070' }}>
            Report by Staff Joumpa
          </h1>
          <p className="mt-1 text-[14px] italic" style={{ color: '#0fa0b3' }}>
            Joumpa Handling Report based on Staff feedback
          </p>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
          <div className="space-y-6">
            <Card title="Monthly Report">
              {monthlyData.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="h-[250px] px-2 pb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} layout="vertical" margin={{ top: 6, right: 16, left: 20, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf2" />
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="month" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={54} />
                      <Tooltip />
                      <Bar dataKey="value" fill={COLORS.barSoft} radius={[0, 0, 0, 0]} barSize={40}>
                        <LabelList dataKey="value" position="right" fill="#111827" fontSize={10} fontWeight={600} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="Monthly Report">
              {remarksCaseData.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="h-[250px] px-2 pb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={remarksCaseData} layout="vertical" margin={{ top: 6, right: 16, left: 84, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf2" />
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={WrappedYAxisTick} width={126} />
                      <Tooltip />
                      <Bar dataKey="value" fill={COLORS.barSoft} radius={[0, 0, 0, 0]} barSize={32}>
                        <LabelList dataKey="value" position="right" fill="#111827" fontSize={10} fontWeight={600} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="Report Category">
              {reportCategoryData.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="h-[280px] px-2 pb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportCategoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="46%"
                        outerRadius={92}
                        stroke="none"
                        label={({ value }) => value}
                      >
                        {reportCategoryData.map((item) => (
                          <Cell key={item.name} fill={item.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 pb-2 text-[11px]" style={{ color: COLORS.textSoft }}>
                    {reportCategoryData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <Card title="Report Category by Airlines">
            <div className="px-4 pb-2 text-right text-[12px] font-semibold" style={{ color: COLORS.textSoft }}>
              Remarks Case / Record Count
            </div>
            <PaginatedTable
              data={remarksCaseMatrix}
              itemsPerPage={15}
              minHeightClass="min-h-[580px]"
              headers={[
                { label: 'Branch' },
                { label: 'Airlines' },
                ...REMARKS_ORDER.map((label) => ({ label })),
                { label: 'Grand total', className: 'text-right' },
              ]}
              renderRow={(row) => (
                <tr key={`${row.branch}-${row.airline}`} className="border-b" style={{ borderColor: '#eef0f2' }}>
                  <td className="px-3 py-2 align-top">{String(row.branch)}</td>
                  <td className="px-3 py-2 align-top">{String(row.airline)}</td>
                  {REMARKS_ORDER.map((label, index) => {
                    const value = Number(row[label] || 0);
                    return (
                      <td
                        key={label}
                        className="px-3 py-2 text-right font-medium"
                        style={{ backgroundColor: heatValue(value, remarksColumnMaxima[index]) }}
                      >
                        {value || '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-bold">{row.total}</td>
                </tr>
              )}
            />
          </Card>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.08fr,1.42fr]">
          <Card title="Root Cause Identification">
            <PaginatedTable
              data={rootIdentificationData}
              itemsPerPage={7}
              minHeightClass="min-h-[360px]"
              headers={[
                { label: 'Identification of Root' },
                { label: 'Total ▼' },
              ]}
              renderRow={(row) => {
                const maxValue = rootIdentificationData[0]?.value || 1;
                return (
                  <tr key={row.name} className="border-b" style={{ borderColor: '#eef0f2' }}>
                    <td className="px-3 py-2 align-top">{row.name}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 shrink-0 text-left font-medium">{row.value}</span>
                        <div className="h-3 flex-1" style={{ backgroundColor: COLORS.bar, width: `${(row.value / maxValue) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              }}
            />
          </Card>

          <div className="space-y-6">
            <Card title="Breakdown of Identified Causes">
              <PaginatedTable
                data={rootByBranch.data}
                itemsPerPage={7}
                minHeightClass="min-h-[260px]"
                headers={[
                  { label: 'Identification of Root' },
                  ...rootByBranch.columns.map((column) => ({ label: column })),
                ]}
                renderRow={(row) => (
                  <tr key={row.name} className="border-b" style={{ borderColor: '#eef0f2' }}>
                    <td className="px-3 py-2 align-top">{row.name}</td>
                    {rootByBranch.columns.map((column, index) => {
                      const value = Number(row[column] || 0);
                      return (
                        <td
                          key={column}
                          className="px-3 py-2 text-center font-medium"
                          style={{ backgroundColor: heatValue(value, branchRootMaxima[index]) }}
                        >
                          {value || '-'}
                        </td>
                      );
                    })}
                  </tr>
                )}
              />
            </Card>

            <Card title="Breakdown of Identified Causes">
              <PaginatedTable
                data={rootByAirline.data}
                itemsPerPage={7}
                minHeightClass="min-h-[260px]"
                headers={[
                  { label: 'Identification of Root' },
                  ...rootByAirline.columns.map((column) => ({ label: column })),
                ]}
                renderRow={(row) => (
                  <tr key={row.name} className="border-b" style={{ borderColor: '#eef0f2' }}>
                    <td className="px-3 py-2 align-top">{row.name}</td>
                    {rootByAirline.columns.map((column, index) => {
                      const value = Number(row[column] || 0);
                      return (
                        <td
                          key={column}
                          className="px-3 py-2 text-center font-medium"
                          style={{ backgroundColor: heatValue(value, airlineRootMaxima[index]) }}
                        >
                          {value || '-'}
                        </td>
                      );
                    })}
                  </tr>
                )}
              />
            </Card>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr,1.15fr]">
          <Card title="Breakdown of Identified Causes">
            <PaginatedTable
              data={breakdownData}
              itemsPerPage={8}
              minHeightClass="min-h-[360px]"
              headers={[
                { label: 'Case Classification' },
                { label: 'Total ▼' },
              ]}
              renderRow={(row) => {
                const maxValue = breakdownData[0]?.value || 1;
                return (
                  <tr key={row.name} className="border-b" style={{ borderColor: '#eef0f2' }}>
                    <td className="px-3 py-2 align-top">{row.name}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 shrink-0 text-left font-medium">{row.value}</span>
                        <div className="h-3 flex-1" style={{ backgroundColor: COLORS.bar, width: `${(row.value / maxValue) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              }}
            />
          </Card>

          <Card title="Breakdown of Identified Causes">
            <PaginatedTable
              data={breakdownByBranch.data}
              itemsPerPage={8}
              minHeightClass="min-h-[360px]"
              headers={[
                { label: 'Case Classification' },
                ...breakdownByBranch.columns.map((column) => ({ label: column })),
              ]}
              renderRow={(row) => (
                <tr key={row.name} className="border-b" style={{ borderColor: '#eef0f2' }}>
                  <td className="px-3 py-2 align-top">{row.name}</td>
                  {breakdownByBranch.columns.map((column, index) => {
                    const value = Number(row[column] || 0);
                    return (
                      <td
                        key={column}
                        className="px-3 py-2 text-center font-medium"
                        style={{ backgroundColor: heatValue(value, branchBreakdownMaxima[index]) }}
                      >
                        {value || '-'}
                      </td>
                    );
                  })}
                </tr>
              )}
            />
          </Card>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-3">
          <Card title="Landside Area">
            {areaTables.landside.length === 0 ? (
              <EmptyState />
            ) : (
              <PaginatedTable
                data={areaTables.landside}
                itemsPerPage={7}
                minHeightClass="min-h-[320px]"
                headers={[
                  { label: 'Terminal Area' },
                  { label: 'Case Classification' },
                  { label: 'Total ▼' },
                ]}
                renderRow={(row) => {
                  const maxValue = areaTables.landside[0]?.total || 1;
                  return (
                    <tr key={`${row.label}-${row.classification}`} className="border-b" style={{ borderColor: '#eef0f2' }}>
                      <td className="px-3 py-2 align-top">{row.label}</td>
                      <td className="px-3 py-2 align-top">{row.classification}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 shrink-0 text-left font-medium">{row.total}</span>
                          <div className="h-3 flex-1" style={{ backgroundColor: COLORS.bar, width: `${(row.total / maxValue) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                }}
              />
            )}
          </Card>

          <Card title="Airside Area">
            {areaTables.airside.length === 0 ? (
              <EmptyState />
            ) : (
              <PaginatedTable
                data={areaTables.airside}
                itemsPerPage={7}
                minHeightClass="min-h-[320px]"
                headers={[
                  { label: 'Apron Area' },
                  { label: 'Case Classification' },
                  { label: 'Total ▼' },
                ]}
                renderRow={(row) => {
                  const maxValue = areaTables.airside[0]?.total || 1;
                  return (
                    <tr key={`${row.label}-${row.classification}`} className="border-b" style={{ borderColor: '#eef0f2' }}>
                      <td className="px-3 py-2 align-top">{row.label}</td>
                      <td className="px-3 py-2 align-top">{row.classification}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 shrink-0 text-left font-medium">{row.total}</span>
                          <div className="h-3 flex-1" style={{ backgroundColor: COLORS.bar, width: `${(row.total / maxValue) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                }}
              />
            )}
          </Card>

          <Card title="General Service">
            {areaTables.general.length === 0 ? (
              <EmptyState />
            ) : (
              <PaginatedTable
                data={areaTables.general}
                itemsPerPage={7}
                minHeightClass="min-h-[320px]"
                headers={[
                  { label: 'General Service' },
                  { label: 'Case Classification' },
                  { label: 'Total ▼' },
                ]}
                renderRow={(row) => {
                  const maxValue = areaTables.general[0]?.total || 1;
                  return (
                    <tr key={`${row.label}-${row.classification}`} className="border-b" style={{ borderColor: '#eef0f2' }}>
                      <td className="px-3 py-2 align-top">{row.label}</td>
                      <td className="px-3 py-2 align-top">{row.classification}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 shrink-0 text-left font-medium">{row.total}</span>
                          <div className="h-3 flex-1" style={{ backgroundColor: COLORS.bar, width: `${(row.total / maxValue) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                }}
              />
            )}
          </Card>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[280px,minmax(0,1fr)]">
          <Card title="Report Category">
            {reportAreaData.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="h-[300px] px-2 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportAreaData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="46%"
                      outerRadius={95}
                      stroke="none"
                      label={({ value }) => value}
                    >
                      {reportAreaData.map((item) => (
                        <Cell key={item.name} fill={item.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 pb-2 text-[11px]" style={{ color: COLORS.textSoft }}>
                  {reportAreaData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Landside Area - Detail Root Cause Identification">
            <PaginatedTable
              data={rootDetailRows}
              itemsPerPage={7}
              minHeightClass="min-h-[360px]"
              headers={[
                { label: 'Branch' },
                { label: 'Airlines' },
                { label: 'Category' },
                { label: 'Area' },
                { label: 'Issue Caused' },
                { label: 'Breakdown Caused' },
                { label: 'Root Caused' },
                { label: 'Total ▼' },
              ]}
              renderRow={(row, rowIndex) => (
                <tr key={`${row.branch}-${row.airline}-${rowIndex}`} className="border-b" style={{ borderColor: '#eef0f2' }}>
                  <td className="px-3 py-2 align-top">{row.branch}</td>
                  <td className="px-3 py-2 align-top">{row.airline}</td>
                  <td className="px-3 py-2 align-top">{row.category}</td>
                  <td className="px-3 py-2 align-top">{row.area}</td>
                  <td className="px-3 py-2 align-top">{row.issueCaused}</td>
                  <td className="px-3 py-2 align-top">{row.breakdownCaused}</td>
                  <td className="px-3 py-2 align-top">{row.rootCaused}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 shrink-0 text-left font-medium">1</span>
                      <div className="h-3 flex-1" style={{ backgroundColor: COLORS.bar, width: '100%' }} />
                    </div>
                  </td>
                </tr>
              )}
            />
          </Card>
        </div>

        <Card title="Detail Report" className="mt-8">
          <PaginatedTable
            data={detailReportRows}
            itemsPerPage={8}
            minHeightClass="min-h-[420px]"
            headers={[
              { label: '' },
              { label: 'Date' },
              { label: 'Branch' },
              { label: 'Airlines' },
              { label: 'Flight' },
              { label: 'Category' },
              { label: 'Breakdown Caused' },
              { label: 'Identification of Root' },
              { label: 'Detail Report' },
              { label: 'Detail Root Caused' },
              { label: 'Action' },
              { label: 'Preventive Action' },
              { label: 'Status' },
            ]}
            renderRow={(row) => (
              <tr key={`${row.index}-${row.date}-${row.airline}`} className="border-b align-top" style={{ borderColor: '#eef0f2' }}>
                <td className="px-3 py-2 font-medium">{row.index}.</td>
                <td className="whitespace-nowrap px-3 py-2">{row.date}</td>
                <td className="px-3 py-2">{row.branch}</td>
                <td className="px-3 py-2">{row.airline}</td>
                <td className="px-3 py-2">{row.flight}</td>
                <td className="px-3 py-2">{row.category}</td>
                <td className="min-w-[180px] px-3 py-2">{row.breakdownCaused}</td>
                <td className="min-w-[200px] px-3 py-2">{row.identificationOfRoot}</td>
                <td className="min-w-[220px] px-3 py-2">
                  <div className="line-clamp-5">{row.detailReport}</div>
                </td>
                <td className="min-w-[220px] px-3 py-2">
                  <div className="line-clamp-5">{row.detailRootCaused}</div>
                </td>
                <td className="min-w-[180px] px-3 py-2">
                  <div className="line-clamp-5">{row.action}</div>
                </td>
                <td className="min-w-[180px] px-3 py-2">
                  <div className="line-clamp-5">{row.preventiveAction}</div>
                </td>
                <td className="px-3 py-2">{row.status}</td>
              </tr>
            )}
          />
        </Card>
      </div>
    </div>
  );
}
