
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DateRangeFilter } from '@/components/embed/DateRangeFilter';
import { EmbedCard } from '@/components/embed/EmbedCard';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Report {
  id: string;
  title: string;
  status: string;
  severity: string;
  airline?: string | null;
  airlines?: string | null;
  main_category?: string | null;
  irregularity_complain_category?: string | null;
  area?: string | null;
  branch?: string | null;
  reporting_branch?: string | null;
  station_code?: string | null;
  hub?: string | null;
  date_of_event?: string | null;
  created_at: string;
  case_classification?: string | null;
  terminal_area_category?: string | null;
  apron_area_category?: string | null;
  general_category?: string | null;
}

interface ReportsResponse {
  summary: { total: number; byStatus: Record<string, number>; bySeverity: Record<string, number> };
  reports: Report[];
}

interface CountDatum {
  name: string;
  count: number;
}

interface PieDatum {
  name: string;
  value: number;
  fill: string;
}

interface PivotMatrix {
  rows: string[];
  columns: string[];
  matrix: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  columnTotals: Record<string, number>;
  maxValue: number;
}

const CHART_COLORS = ['#1d4ed8', '#0f766e', '#b45309', '#be123c', '#5b21b6', '#0369a1', '#4d7c0f', '#a16207'];
const EMPTY_REPORTS: Report[] = [];

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  OPEN: { label: 'Open', class: 'pending' },
  'ON PROGRESS': { label: 'Dalam Proses', class: 'verified' },
  CLOSED: { label: 'Selesai', class: 'completed' },
};

const isPresent = (value: unknown) => {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized !== '' && normalized !== 'null' && normalized !== 'undefined' && normalized !== '-';
};

const clean = (value: unknown, fallback = 'Unknown') => (isPresent(value) ? String(value).trim() : fallback);
const reportCategory = (report: Report) => clean(report.main_category || report.irregularity_complain_category);
const reportBranch = (report: Report) => clean(report.branch || report.reporting_branch || report.station_code);
const reportAirline = (report: Report) => clean(report.airlines || report.airline);
const reportDate = (report: Report) => report.date_of_event || report.created_at;
const distinctReportCount = (reports: Report[]) => new Set(reports.map((report) => report.id)).size;

function countBy(reports: Report[], picker: (report: Report) => string | null | undefined, exclude?: (value: string) => boolean) {
  const map = new Map<string, number>();
  reports.forEach((report) => {
    const label = clean(picker(report), '');
    if (!label || exclude?.(label)) return;
    map.set(label, (map.get(label) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function currentYearMonthlyReports(reports: Report[]) {
  const year = new Date().getFullYear();
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
  const map = new Map<string, { ids: Set<string>; sortKey: number }>();

  reports.forEach((report) => {
    const date = new Date(reportDate(report));
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;
    const label = monthFormatter.format(date);
    if (!map.has(label)) map.set(label, { ids: new Set<string>(), sortKey: date.getMonth() });
    map.get(label)?.ids.add(report.id);
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, count: value.ids.size, sortKey: value.sortKey }))
    .sort((a, b) => b.count - a.count || a.sortKey - b.sortKey)
    .map(({ name, count }) => ({ name, count }));
}

function buildPivot(reports: Report[], rowPicker: (report: Report) => string, columnPicker: (report: Report) => string): PivotMatrix {
  const matrix: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const columnTotals: Record<string, number> = {};
  let maxValue = 0;

  reports.forEach((report) => {
    const row = rowPicker(report);
    const column = columnPicker(report);
    matrix[row] ??= {};
    matrix[row][column] = (matrix[row][column] || 0) + 1;
    rowTotals[row] = (rowTotals[row] || 0) + 1;
    columnTotals[column] = (columnTotals[column] || 0) + 1;
    maxValue = Math.max(maxValue, matrix[row][column]);
  });

  return {
    rows: Object.keys(rowTotals).sort((a, b) => rowTotals[b] - rowTotals[a] || a.localeCompare(b)),
    columns: Object.keys(columnTotals).sort((a, b) => columnTotals[b] - columnTotals[a] || a.localeCompare(b)),
    matrix,
    rowTotals,
    columnTotals,
    maxValue,
  };
}

function CompactBarChart({ data }: { data: CountDatum[] }) {
  const height = Math.max(180, Math.min(320, data.length * 28 + 44));

  return (
    <div className="compact-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 12)} layout="vertical" margin={{ top: 4, right: 14, left: 8, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="oklch(0 0 0 / 0.07)" />
          <XAxis type="number" tick={{ fill: '#667085', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={104}
            tick={{ fill: '#344054', fontSize: 10, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: 'oklch(0.92 0.02 230 / 0.35)' }} />
          <Bar dataKey="count" name="Record Count" fill="#1d4ed8" radius={[0, 5, 5, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CompactPieChart({ data }: { data: CountDatum[] }) {
  const pieData = data.slice(0, 8).map((item, index) => ({
    name: item.name,
    value: item.count,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="compact-pie">
      <div className="compact-chart compact-chart-pie">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={76}
              paddingAngle={2}
              shape={(props) => <Sector {...props} fill={(props.payload as PieDatum).fill} />}
            />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="pie-legend-list">
        {pieData.map((item) => (
          <div key={item.name} className="pie-legend-row">
            <span className="pie-swatch" style={{ background: item.fill }} />
            <span className="pie-label">{item.name}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactRankTable({ data, metricLabel = 'Total' }: { data: CountDatum[]; metricLabel?: string }) {
  return (
    <div className="mini-table-wrap">
      <table className="mini-table">
        <thead>
          <tr>
            <th>Dimension</th>
            <th>{metricLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 12).map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.count.toLocaleString('id-ID')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PivotHeatmapTable({ pivot }: { pivot: PivotMatrix }) {
  return (
    <div className="heatmap-table-wrap">
      <table className="heatmap-table">
        <thead>
          <tr>
            <th>Dimension</th>
            {pivot.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {pivot.rows.slice(0, 18).map((row) => (
            <tr key={row}>
              <th>{row}</th>
              {pivot.columns.map((column) => {
                const value = pivot.matrix[row]?.[column] || 0;
                const intensity = pivot.maxValue ? value / pivot.maxValue : 0;
                return (
                  <td key={column} style={{ backgroundColor: `oklch(0.92 0.08 230 / ${Math.max(0.08, intensity * 0.85)})` }}>
                    {value || ''}
                  </td>
                );
              })}
              <td>{pivot.rowTotals[row]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CategoryDetailContent() {
  const searchParams = useSearchParams();
  const range = searchParams.get('range') || '7d';
  const categoryName = searchParams.get('name');
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range, limit: '5000' });
      if (categoryName) params.set('category', categoryName);
      const res = await fetch(`/api/embed/reports?${params.toString()}`, { signal });
      setData(await res.json());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    } finally {
      setLoading(false);
    }
  }, [range, categoryName]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    const interval = setInterval(() => fetchData(controller.signal), 30000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchData]);

  const reports = data?.reports || EMPTY_REPORTS;
  const analytics = useMemo(() => {
    const categories = countBy(reports, reportCategory);
    const branches = countBy(reports, reportBranch);
    const airlines = countBy(reports, reportAirline);
    const area = countBy(reports, (report) => report.area, (value) => value.toLowerCase().includes('null'));
    const hub = countBy(reports, (report) => report.hub);
    const root = countBy(reports, (report) => report.case_classification, (value) => value.toLowerCase().includes('null'));
    const landside = countBy(reports, (report) => report.terminal_area_category, (value) => value.toLowerCase().includes('null'));
    const airside = countBy(reports, (report) => report.apron_area_category, (value) => value.toLowerCase().includes('null'));
    const general = countBy(
      reports,
      (report) => report.general_category,
      (value) => value.toLowerCase().includes('null') || value.toLowerCase().includes('others')
    );

    return {
      categories,
      branches,
      airlines,
      monthly: currentYearMonthlyReports(reports),
      area,
      categoryByBranch: buildPivot(reports, reportBranch, reportCategory),
      categoryByAirline: buildPivot(reports, reportAirline, reportCategory),
      hub,
      root,
      landside,
      airside,
      general,
    };
  }, [reports]);

  if (loading && !data) {
    return <div className="embed-loading"><div className="embed-spinner" /></div>;
  }

  const title = categoryName ? `Report Category: ${categoryName}` : 'Report Category';
  const total = data?.summary.total || 0;

  return (
    <>
      <Link href={`/embed/overview?range=${range}`} className="back-link">← Back to Overview</Link>

      <header className="page-header report-category-hero">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Compact operational distribution across category, location, airline, and root classification.</p>
        </div>
        <div className="hero-count">
          <strong>{total.toLocaleString('id-ID')}</strong>
          <span>records</span>
        </div>
      </header>

      <DateRangeFilter />

      <div className="kpi-grid kpi-grid-compact">
        <div className="kpi-card"><div className="kpi-value">{total.toLocaleString('id-ID')}</div><div className="kpi-label">Record Count</div></div>
        <div className="kpi-card"><div className="kpi-value">{distinctReportCount(reports).toLocaleString('id-ID')}</div><div className="kpi-label">Distinct Reports</div></div>
        <div className="kpi-card"><div className="kpi-value">{analytics.categories.length}</div><div className="kpi-label">Report Categories</div></div>
        <div className="kpi-card"><div className="kpi-value">{analytics.branches.length}</div><div className="kpi-label">Stations</div></div>
      </div>

      <div className="report-category-grid">
        <EmbedCard title="Report by Case Category" subtitle="Dimension: Report Category · Metric: Record Count" className="compact-card">
          <CompactPieChart data={analytics.categories} />
        </EmbedCard>
        <EmbedCard title="Station Report" subtitle="Dimension: Station · Metric: Record Count" className="compact-card">
          <CompactBarChart data={analytics.branches} />
        </EmbedCard>
        <EmbedCard title="Airlines Report" subtitle="Dimension: Airlines · Metric: Record Count" className="compact-card">
          <CompactBarChart data={analytics.airlines} />
        </EmbedCard>
        <EmbedCard title="Monthly Report" subtitle={`Date of Event by month in ${new Date().getFullYear()} · Distinct reports`} className="compact-card">
          <CompactBarChart data={analytics.monthly} />
        </EmbedCard>
        <EmbedCard title="Category by Area" subtitle="Dimension: Area · Null values excluded" className="compact-card">
          <CompactPieChart data={analytics.area} />
        </EmbedCard>
        <EmbedCard title="HUB Report" subtitle="Dimension: HUB · Metric: Distinct reports" className="compact-card">
          <CompactBarChart data={analytics.hub} />
        </EmbedCard>
      </div>

      <div className="embed-grid embed-grid-1">
        <EmbedCard title="Report Category by Station" subtitle="Rows sorted by total record count; columns sorted by category count." className="compact-card">
          <PivotHeatmapTable pivot={analytics.categoryByBranch} />
        </EmbedCard>
        <EmbedCard title="Report Category by Airlines" subtitle="Rows sorted by total record count; columns sorted by category count." className="compact-card">
          <PivotHeatmapTable pivot={analytics.categoryByAirline} />
        </EmbedCard>
      </div>

      <div className="report-category-grid report-category-grid-4">
        <EmbedCard title="Identification of Root" subtitle="Case Classification · Null values excluded" className="compact-card">
          <CompactRankTable data={analytics.root} />
        </EmbedCard>
        <EmbedCard title="Landside Area Category" subtitle="Terminal Area · Null values excluded" className="compact-card">
          <CompactRankTable data={analytics.landside} />
        </EmbedCard>
        <EmbedCard title="Airside Area Category" subtitle="Apron Area · Null values excluded" className="compact-card">
          <CompactRankTable data={analytics.airside} />
        </EmbedCard>
        <EmbedCard title="General Service Category" subtitle="General Service · Null and others excluded" className="compact-card">
          <CompactRankTable data={analytics.general} />
        </EmbedCard>
      </div>

      <EmbedCard title="Report List" className="mt-6 compact-card">
        <div className="embed-table-container">
          <table className="embed-table">
            <thead>
              <tr><th>Date</th><th>Judul</th><th>Kategori</th><th>Station</th><th>Airlines</th><th>Area</th><th>Status</th><th>Severity</th></tr>
            </thead>
            <tbody>
              {reports.slice(0, 50).map((report) => (
                <tr key={report.id}>
                  <td>{new Date(reportDate(report)).toLocaleDateString('id-ID')}</td>
                  <td>{report.title}</td>
                  <td>{reportCategory(report)}</td>
                  <td>{reportBranch(report)}</td>
                  <td>{reportAirline(report)}</td>
                  <td>{clean(report.area, '-')}</td>
                  <td><span className={`status-badge ${STATUS_MAP[report.status]?.class || ''}`}>{STATUS_MAP[report.status]?.label || report.status}</span></td>
                  <td><span className={`severity-badge ${String(report.severity || '').toLowerCase()}`}>{report.severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EmbedCard>
    </>
  );
}
