'use client';

import { useMemo, useState, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer as RechartsResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell, BarChart, Bar, LineChart, Line,
    ComposedChart, LabelList
} from 'recharts';
import {
    TrendingUp, PieChart as PieChartIcon, Building2,
    Target, Users, Activity, CalendarDays, MapPin, Shield, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import { BarChart3 } from 'lucide-react';
import { PrismMultiSelect } from '@/components/ui/PrismMultiSelect';
import { STATUS_CONFIG, type ReportStatus } from '@/lib/constants/report-status';
import { PresentationSlide } from '@/components/dashboard/PresentationSlide';
import { cn } from '@/lib/utils';
import type { Report } from '@/types';
import { AVIATION_CHART_COLORS, CHART_AXIS_STYLE, CHART_TOOLTIP_STYLE, CHART_LEGEND_STYLE } from '@/lib/aviation-chart-config';
import { ChartTitle } from '@/components/charts/ChartTitle';
import { ComparisonTable } from '@/components/charts/ComparisonTable';
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart';
import { ExecutiveSummaryTables } from '@/components/dashboard/analyst/ExecutiveSummaryTables';
import { SummaryReportTab } from '@/components/dashboard/tabs/SummaryReportTab';
import { ServiceQualityImprovementTab } from '@/components/dashboard/tabs/ServiceQualityImprovementTab';
import { JoumpaServiceTab } from '@/components/dashboard/tabs/JoumpaServiceTab';
import { GsePerformanceTab } from '@/components/dashboard/tabs/GsePerformanceTab';
import type { ComparisonData, ComparisonMetric } from '@/types';
import { calculateComparisonData } from '@/lib/utils/comparison-utils';

// Complexity: Time O(n) per render | Space O(k) where k = chart data points (pre-computed by parent)

interface CaseCategoryItem {
    name: string;
    value: number;
    fill: string;
}

interface BranchReportItem {
    station: string;
    count: number;
}

interface MonthlyReportItem {
    month: string;
    irregularity: number;
    complaint: number;
    compliment: number;
}

interface CategoryByAreaItem {
    name: string;
    value: number;
    fill: string;
}

interface CategoryByBranchItem {
    branch: string;
    irregularity: number;
    complaint: number;
    compliment: number;
}

interface CategoryByAirlinesItem {
    airline: string;
    irregularity: number;
    complaint: number;
    compliment: number;
}

interface TopReporterItem {
    name: string;
    station: string;
    count: number;
}

interface MonthlyComparisonItem {
    month: string;
    masuk: number;
    selesai: number;
    rate: number;
}

interface HubDistributionItem {
    hub: string;
    count: number;
}

interface ResolutionByBranchItem {
    branch: string;
    total: number;
    resolved: number;
    rate: number;
}

interface AreaSubCategoryItem {
    area: string;
    [key: string]: string | number;
}

interface AnalyticsData {
    summary: {
        totalReports: number;
        resolvedReports: number;
        pendingReports: number;
        highSeverity: number;
        avgResolutionRate: number;
        slaBreachCount?: number;
    };
    stationData: Array<{ station: string; total: number; resolved: number }>;
    statusData: Array<{ name: string; value: number; color: string }>;
    trendData: Array<{ month: string; total: number; resolved: number }>;
    divisionData?: Array<{ division: string; count: number }>;
    categoryData?: Array<{ category: string; count: number }>;
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

interface CategoryCountItem {
    name: string;
    value: number;
}

interface StatusCountItem {
    closed: number;
    open: number;
    onProgress: number;
    total: number;
}

export interface AnalystChartsProps {
    readonly analytics: AnalyticsData | null;
    readonly caseCategoryData: readonly CaseCategoryItem[];
    readonly branchReportData: readonly BranchReportItem[];
    readonly monthlyReportData: readonly MonthlyReportItem[];
    readonly categoryByAreaData: readonly CategoryByAreaItem[];
    readonly categoryByBranchData: readonly CategoryByBranchItem[];
    readonly areaSubCategoryData: readonly AreaSubCategoryItem[];
    readonly categoryByAirlinesData: readonly CategoryByAirlinesItem[];
    readonly topReportersData: readonly TopReporterItem[];
    readonly monthlyComparisonData: readonly MonthlyComparisonItem[];
    readonly hubDistributionData: readonly HubDistributionItem[];
    readonly resolutionByBranchData: readonly ResolutionByBranchItem[];
    readonly allReports: readonly Report[];
    readonly filteredReports: readonly Report[];
    readonly caseReportByAreaData: readonly CaseReportByAreaBranchItem[];
    readonly terminalAreaCategoryData: readonly CategoryCountItem[];
    readonly apronAreaCategoryData: readonly CategoryCountItem[];
    readonly generalCategoryData: readonly CategoryCountItem[];
    readonly caseClassificationData?: readonly CategoryCountItem[];
    readonly comparisonData?: ComparisonData;
    readonly onDrilldown: (url: string) => void;
    readonly drilldownUrl: (type: string, value: string) => string;
    readonly globalFilters: {
        hubs: string[];
        branches: string[];
        airlines: string[];
        categories: string[];
    };
    readonly setGlobalFilters: React.Dispatch<React.SetStateAction<{
        hubs: string[];
        branches: string[];
        airlines: string[];
        categories: string[];
    }>>;
    readonly availableOptions: {
        hubs: string[];
        branches: string[];
        airlines: string[];
        categories: string[];
    };
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

// Semantic color palette — Gapura Emerald + complementary hues
// PRISM V3 Semantic color palette (OKLCH)
const REFERENCE_COLORS = {
    irregularity: 'oklch(0.65 0.18 160)', // PRISM Emerald
    complaint: 'oklch(0.6 0.14 240)',    // PRISM Blue
    compliment: 'oklch(0.8 0.15 80)',     // PRISM Amber
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

const COLORS = [
    REFERENCE_COLORS.irregularity,
    REFERENCE_COLORS.complaint,
    REFERENCE_COLORS.compliment,
    'oklch(0.6 0.2 280)', // Indigo
    'oklch(0.7 0.2 330)', // Pink
    'oklch(0.65 0.2 180)', // Teal
    'oklch(0.75 0.18 50)',  // Orange
    'oklch(0.6 0.2 285)',   // Violet
    'oklch(0.6 0.05 240)',  // Slate-ish
];

const ENTERPRISE_COLORS = [
    'oklch(0.55 0.06 250)',
    'oklch(0.62 0.12 210)',
    'oklch(0.62 0.11 150)',
    'oklch(0.62 0.11 80)',
] as const;

function ResponsiveContainer(props: ComponentProps<typeof RechartsResponsiveContainer>) {
    return (
        <RechartsResponsiveContainer
            {...props}
            minWidth={props.minWidth ?? 1}
            minHeight={props.minHeight ?? 1}
        />
    );
}

const WrappedXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const label = String(payload.value);
    const words = label.split(/\s+/);
    const lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        if ((currentLine + ' ' + words[i]).length < 15) {
            currentLine += ' ' + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);
    const displayLines = lines.slice(0, 3);
    if (lines.length > 3) displayLines[2] += '...';

    return (
        <g transform={`translate(${x},${y})`}>
            {displayLines.map((line, i) => (
                <text
                    key={i}
                    x={0}
                    y={0}
                    dy={16 + (i * 12)}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize={10}
                    fontWeight={600}
                    className="tracking-tighter"
                >
                    {line}
                </text>
            ))}
        </g>
    );
};

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

/** Returns perceptual emerald-scale background + foreground for heat-map cells. */
function heatColor(value: number, max: number): { bg: string; fg: string } {
    if (value === 0 || max === 0) return { bg: 'transparent', fg: 'var(--text-muted)' };
    const ratio = Math.min(1, Math.max(0, value / max));
    
    // Using PRISM Emerald: oklch(0.65 0.18 160)
    // For bg, we'll scale the lightness and chroma for depth
    // Low: oklch(0.95 0.03 160) | High: oklch(0.5 0.2 160)
    const l = 0.95 - (0.45 * ratio);
    const c = 0.03 + (0.17 * ratio);
    const h = 160;
    
    return {
        bg: `oklch(${l} ${c} ${h})`,
        fg: l < 0.65 ? '#ffffff' : '#0f172a',
    };
}

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

function DetailReportTable({ data }: { data: Report[] }) {
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
                <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs min-w-[800px]">
                        <thead className="sticky top-0 z-10 bg-white">
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Date</th>
                                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Tag</th>
                                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Category</th>
                                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Branch</th>
                                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Airlines</th>
                                <th className="text-left py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap">Flight</th>
                                <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Report</th>
                                <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Root Caused</th>
                                <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Action Taken</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageItems.map((r, idx) => {
                                const date = r.date_of_event
                                    ? new Date(r.date_of_event).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })
                                    : '-';
                                const tag = (r as any).primary_tag || '-';
                                const tagColor = tag === 'Landside' ? 'bg-blue-100 text-blue-700' : tag === 'Airside' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600';
                                const branch = r.stations?.code || r.branch || '-';
                                return (
                                    <tr key={`${r.id || idx}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                                        <td className="py-1.5 px-2 whitespace-nowrap text-gray-700">{date}</td>
                                        <td className="py-1.5 px-2 whitespace-nowrap">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tagColor}`}>{tag}</span>
                                        </td>
                                        <td className="py-1.5 px-2 whitespace-nowrap text-gray-700">{r.category || r.main_category || '-'}</td>
                                        <td className="py-1.5 px-2 whitespace-nowrap font-medium text-gray-800">{branch}</td>
                                        <td className="py-1.5 px-2 whitespace-nowrap text-gray-700">{r.airlines || '-'}</td>
                                        <td className="py-1.5 px-2 whitespace-nowrap text-gray-700">{(r as any).flight_number || '-'}</td>
                                        <td className="py-1.5 px-2 text-gray-700 max-w-[160px]">
                                            <p className="line-clamp-2">{(r as any).description || (r as any).report || '-'}</p>
                                        </td>
                                        <td className="py-1.5 px-2 text-gray-700 max-w-[140px]">
                                            <p className="line-clamp-2">{(r as any).root_caused || '-'}</p>
                                        </td>
                                        <td className="py-1.5 px-2 text-gray-700 max-w-[140px]">
                                            <p className="line-clamp-2">{(r as any).action_taken || '-'}</p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-500">
                        {startIdx}-{endIdx} / {data.length} records
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
                            disabled={page === 0}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-[10px] text-gray-600">Page {page + 1}/{totalPages}</span>
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
                </div>
            )}
        </div>
    );
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

export default function AnalystCharts({
    analytics,
    caseCategoryData,
    branchReportData,
    monthlyReportData,
    categoryByAreaData,
    categoryByBranchData,
    areaSubCategoryData,
    categoryByAirlinesData,
    topReportersData,
    monthlyComparisonData,
    hubDistributionData,
    resolutionByBranchData,
    allReports,
    filteredReports,
    caseReportByAreaData,
    terminalAreaCategoryData,
    apronAreaCategoryData,
    generalCategoryData,
    caseClassificationData = [],
    comparisonData,
    onDrilldown,
    drilldownUrl,
    globalFilters,
    setGlobalFilters,
    availableOptions,
}: AnalystChartsProps) {
    const TABS = ['summary', 'sqi', 'joumpa', 'delay', 'gse', 'cgo_cargo'] as const;
    type AnalystTab = typeof TABS[number];
    const TAB_LABELS: Record<AnalystTab, string> = {
        summary: 'Summary Report',
        sqi: 'Service Quality Improvement',
        joumpa: 'Joumpa Service',
        delay: 'Delay Code Report Breakdown',
        gse: 'GSE Performance',
        cgo_cargo: 'CGO Cargo Report',
    };
    const [activeTab, setActiveTab] = useState<AnalystTab>('summary');
    const [timeframe, setTimeframe] = useState<'3m' | '6m' | '12m' | 'all' | 'custom'>('all');

    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [focus, setFocus] = useState<'all' | 'Total' | 'Irregularity' | 'Complaint' | 'Compliment'>('all');
    const [branchFilter, setBranchFilter] = useState<string[]>([]);
    const [airlineFilter, setAirlineFilter] = useState<string[]>([]);
    const [areaFilter, setAreaFilter] = useState<string[]>([]);
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
    const [isGlobalFilterCollapsed, setIsGlobalFilterCollapsed] = useState(true);
    
    const isDataStale = useMemo(() => {
        if (!filteredReports.length) return false;
        const latest = Math.max(...filteredReports.map(r => {
            const d = new Date((r as any).date_of_event || r.created_at);
            return isNaN(d.getTime()) ? 0 : d.getTime();
        }));
        if (latest === 0) return false;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return latest < thirtyDaysAgo.getTime();
    }, [filteredReports]);


    // Extract unique sub-categories for stacked bar chart
    const allSubCategories = useMemo(() => {
        const cats = new Set<string>();
        areaSubCategoryData.forEach(item => {
            Object.keys(item).forEach(key => {
                if (key !== 'area' && typeof item[key] === 'number') cats.add(key);
            });
        });
        return Array.from(cats);
    }, [areaSubCategoryData]);
    // Derived Data: Sorted Case Category with Rank Colors
    const sortedCaseCategoryData = useMemo(() => {
        return [...caseCategoryData]
            .sort((a, b) => b.value - a.value)
            .map((item, index) => ({
                ...item,
                fill: COLORS[index % COLORS.length]
            }));
    }, [caseCategoryData]);

    const router = useRouter();

    const safeComparison = useMemo<ComparisonData | null>(() => {
        if (comparisonData) return comparisonData;
        try {
            const calc = calculateComparisonData(filteredReports as Report[]);
            return calc;
        } catch {
            return null;
        }
    }, [comparisonData, filteredReports]);

    // Options populated from Google Sheets data (via filteredReports)
    const branchOptions = useMemo(() => {
        const set = new Set<string>();
        (filteredReports as Report[]).forEach((r) => {
            const code = (r as any).stations?.code || r.branch || r.reporting_branch || r.station_code;
            if (code) set.add(String(code).trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [filteredReports]);

    const airlineOptions = useMemo(() => {
        const set = new Set<string>();
        (filteredReports as Report[]).forEach((r) => {
            const a = (r as any).airlines || (r as any).airline;
            if (a) set.add(String(a).trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [filteredReports]);

    const areaOptions = useMemo(() => {
        const set = new Set<string>();
        (filteredReports as Report[]).forEach((r) => {
            const a = (r as any).area || (r as any).terminal_area_category || (r as any).apron_area_category || (r as any).general_category;
            if (!a) return;
            const v = String(a).toLowerCase();
            const canon = v.includes('terminal') ? 'Terminal Area' : v.includes('apron') ? 'Apron Area' : v.includes('general') ? 'General Area' : '';
            if (canon) set.add(canon);
        });
        return Array.from(set).sort();
    }, [filteredReports]);

    const filteredReportsForCalc = useMemo(() => {
        let base = filteredReports as Report[];
        if (branchFilter.length > 0) {
            base = base.filter(r => {
                const code = (r as any).stations?.code || r.branch || r.reporting_branch || r.station_code;
                return code ? branchFilter.includes(String(code)) : false;
            });
        }
        if (airlineFilter.length > 0) {
            base = base.filter(r => {
                const a = r.airlines || (r as any).airline;
                return a ? airlineFilter.includes(String(a)) : false;
            });
        }
        if (areaFilter.length > 0) {
            base = base.filter(r => {
                const a = (r as any).area || (r as any).terminal_area_category || (r as any).apron_area_category || (r as any).general_category;
                if (!a) return false;
                const v = String(a).toLowerCase();
                const canon = v.includes('terminal') ? 'Terminal Area' : v.includes('apron') ? 'Apron Area' : v.includes('general') ? 'General Area' : '';
                return areaFilter.includes(canon);
            });
        }
        if (timeframe !== 'all') {
            const monthsBack = timeframe === '3m' ? 3 : timeframe === '6m' ? 6 : 12;
            const now = new Date();
            const cutoff = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1).getTime();
            if (timeframe === 'custom') {
                if (customFrom && customTo) {
                    const from = new Date(customFrom);
                    const to = new Date(customTo);
                    to.setHours(23,59,59,999);
                    if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from.getTime() <= to.getTime()) {
                        base = base.filter(r => {
                            const dateStr = (r as any).date_of_event || r.created_at;
                            if (!dateStr) return false;
                            let d: Date;
                            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                                const [y, m, day] = dateStr.split('-').map(Number);
                                d = new Date(y, m - 1, day);
                            } else {
                                d = new Date(dateStr);
                            }
                            if (isNaN(d.getTime())) return false;
                            return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
                        });
                    }
                }
            } else {
                base = base.filter(r => {
                    const dateStr = (r as any).date_of_event || r.created_at;
                    if (!dateStr) return false;
                    let d: Date;
                    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                        const [y, m, day] = dateStr.split('-').map(Number);
                        d = new Date(y, m - 1, day);
                    } else {
                        d = new Date(dateStr);
                    }
                    if (isNaN(d.getTime())) return false;
                    const key = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
                    return key >= cutoff;
                });
            }
        }
        return base;
    }, [filteredReports, branchFilter, airlineFilter, areaFilter, timeframe, customFrom, customTo]);

    const customComparison = useMemo(() => calculateComparisonData(filteredReportsForCalc), [filteredReportsForCalc]);

    const displayComparison = useMemo<ComparisonData | null>(() => {
        const base = (branchFilter.length || airlineFilter.length || areaFilter.length || timeframe !== 'all') ? customComparison : safeComparison;
        if (!base) return null;
        if (timeframe === 'all' || timeframe === 'custom') return base;
        const take = timeframe === '3m' ? 3 : timeframe === '6m' ? 6 : 12;
        return { ...base, monthlyTrend: base.monthlyTrend.slice(-take) };
    }, [safeComparison, customComparison, timeframe, branchFilter.length, airlineFilter.length, areaFilter.length]);

    const chartKeys = useMemo(() => {
        if (focus === 'Total') return ['total'] as const;
        if (focus === 'Irregularity') return ['irregularity'] as const;
        if (focus === 'Complaint') return ['complaint'] as const;
        if (focus === 'Compliment') return ['compliment'] as const;
        return ['total', 'irregularity', 'complaint', 'compliment'] as const;
    }, [focus]);

    const handleViewDetail = (
        title: string,
        data: any[],
        chartType: string,
        visualizationConfig: any,
        queryConfig?: any
    ) => {
        const detailData = {
            tile: {
                id: `analyst-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                visualization: {
                    title: title,
                    chartType: chartType,
                    ...visualizationConfig
                },
                query: queryConfig || {
                    source: 'reports',
                    joins: [],
                    dimensions: [],
                    measures: [],
                    filters: [],
                    sorts: [],
                    limit: 1000
                },
                layout: { x: 0, y: 0, w: 6, h: 3 }
            },
            result: {
                rows: data,
                columns: Object.keys(data[0] || {}),
                rowCount: data.length,
                executionTimeMs: 0
            },
            dashboardId: 'analyst-dashboard',
            timestamp: Date.now()
        };

        sessionStorage.setItem('chartDetailData', JSON.stringify(detailData));
        
        const params = new URLSearchParams();
        params.set('dashboardId', 'analyst-dashboard');
        params.set('tileId', detailData.tile.id);
        
        router.push(`/dashboard/chart-detail?${params.toString()}`);
    };

    // Derived Data: Airlines Total (Sum of categories)
    const airlinesTotalData = useMemo(() => {
        return categoryByAirlinesData.map(item => ({
            airline: item.airline,
            total: item.irregularity + item.complaint + item.compliment
        })).sort((a, b) => b.total - a.total);
    }, [categoryByAirlinesData]);

    const safeTrendData = useMemo(() => {
        if (analytics?.trendData?.length) return analytics.trendData;
        
        // Fallback: Use monthlyComparisonData which matches { month, total: masuk, resolved: selesai }
        if (monthlyComparisonData && monthlyComparisonData.length > 0) {
            return monthlyComparisonData.map(item => ({
                month: item.month,
                total: item.masuk,
                resolved: item.selesai
            }));
        }

        // Last resort: Map monthlyReportData
        return monthlyReportData.map(item => ({
            month: item.month,
            total: item.irregularity + item.complaint + item.compliment,
            resolved: 0
        }));
    }, [analytics?.trendData, monthlyComparisonData, monthlyReportData]);

    // Derived Data: Completion Status (Total vs Resolved)
    const completionStatusData = useMemo(() => {
        const total = safeTrendData.reduce((acc, curr) => acc + curr.total, 0);
        const resolved = safeTrendData.reduce((acc, curr) => acc + curr.resolved, 0);
        const pending = total - resolved;
        return [
            { name: 'Selesai', value: resolved, fill: '#81c784' },
            { name: 'Belum Selesai', value: pending, fill: '#cbd5e1' }
        ];
    }, [safeTrendData]);

    // Derived Data: Monthly Volume Distribution (Pie Chart)
    const monthlyVolumeData = useMemo(() => {
        return monthlyReportData
            .map(item => ({
                name: item.month,
                value: item.irregularity + item.complaint + item.compliment
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((item, index) => ({
                ...item,
                fill: COLORS[index % COLORS.length]
            }));
    }, [monthlyReportData]);

    // Derived Data: Status Flow
    const statusFlowData = useMemo(() => [
        { status: 'OPEN', label: 'Open', count: filteredReports.filter(r => r.status === 'OPEN').length },
        { status: 'ON PROGRESS', label: 'On Progress', count: filteredReports.filter(r => r.status === 'ON PROGRESS').length },
        { status: 'CLOSED', label: 'Closed', count: filteredReports.filter(r => r.status === 'CLOSED').length },
    ], [filteredReports]);

    // Pivot data for Case Category by Branch table (top 6)
    const pivotTableData = useMemo(() => {
        const data = categoryByBranchData
            .map(item => ({
                branch: item.branch,
                irregularity: item.irregularity,
                complaint: item.complaint,
                compliment: item.compliment,
                total: item.irregularity + item.complaint + item.compliment
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);
        
        // Add grand total row
        const grandTotal = data.reduce((acc, row) => ({
            irregularity: acc.irregularity + row.irregularity,
            complaint: acc.complaint + row.complaint,
            compliment: acc.compliment + row.compliment,
            total: acc.total + row.total
        }), { irregularity: 0, complaint: 0, compliment: 0, total: 0 });
        
        return { rows: data, grandTotal };
    }, [categoryByBranchData]);

    // Get max values for heatmap normalization
    const maxValues = useMemo(() => {
        const { rows } = pivotTableData;
        return {
            irregularity: Math.max(...rows.map(r => r.irregularity)),
            complaint: Math.max(...rows.map(r => r.complaint)),
            compliment: Math.max(...rows.map(r => r.compliment))
        };
    }, [pivotTableData]);

    // Category by Area with reference colors
    const categoryByAreaWithColors = useMemo(() => {
        return categoryByAreaData.map((item, index) => ({
            ...item,
            fill: [
                REFERENCE_COLORS.irregularity,
                REFERENCE_COLORS.complaint,
                REFERENCE_COLORS.compliment
            ][index % 3]
        }));
    }, [categoryByAreaData]);

    // Helper function to compute pivot table data
    const computePivotData = (categoryField: string) => {
        // Get all categories and branches
        const categoryBranchCounts: Record<string, Record<string, number>> = {};
        const branchTotals: Record<string, number> = {};
        const areaGuard = (report: any) => {
            const area = String(report.area || '').toLowerCase();
            if (categoryField === 'terminal_area_category') return area.includes('terminal') || !!(report as any).terminal_area_category;
            if (categoryField === 'apron_area_category') return area.includes('apron') || !!(report as any).apron_area_category;
            if (categoryField === 'general_category') return area.includes('general') || !!(report as any).general_category;
            return true;
        };
        filteredReports.forEach(report => {
            if (!areaGuard(report)) return;
            const raw = (report as any)[categoryField];
            if (!raw || String(raw).trim() === '') return;
            const category = String(raw).trim();
            const branch = report.stations?.code || report.branch || report.station_code || 'Unknown';
            if (!categoryBranchCounts[category]) {
                categoryBranchCounts[category] = {};
            }
            if (!categoryBranchCounts[category][branch]) {
                categoryBranchCounts[category][branch] = 0;
            }
            categoryBranchCounts[category][branch]++;
            branchTotals[branch] = (branchTotals[branch] || 0) + 1;
        });
        
        // Get top 10 branches by total volume
        const topBranches = Object.entries(branchTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([branch]) => branch);
        
        // Get top 30 categories by total count (more for scrolling)
        const categoryTotals = Object.entries(categoryBranchCounts).map(([category, branches]) => ({
            category,
            total: Object.values(branches).reduce((sum, count) => sum + count, 0),
            branches
        })).sort((a, b) => b.total - a.total).slice(0, 30);
        
        // Compute grand totals
        const grandTotal: Record<string, number> = { total: 0 };
        topBranches.forEach(branch => {
            grandTotal[branch] = 0;
        });
        
        categoryTotals.forEach(cat => {
            grandTotal.total += cat.total;
            topBranches.forEach(branch => {
                grandTotal[branch] += cat.branches[branch] || 0;
            });
        });
        
        // Compute max values for heatmap
        const maxValues: Record<string, number> = {};
        topBranches.forEach(branch => {
            maxValues[branch] = Math.max(...categoryTotals.map(cat => cat.branches[branch] || 0));
        });
        
        return {
            rows: categoryTotals,
            branches: topBranches,
            grandTotal,
            maxValues
        };
    };

    // Terminal Area by Branch
    const terminalAreaByBranch = useMemo(() => {
        return computePivotData('terminal_area_category');
    }, [filteredReports]);

    // Apron Area by Branch
    const apronAreaByBranch = useMemo(() => {
        return computePivotData('apron_area_category');
    }, [filteredReports]);

    // General Category by Branch
    const generalCategoryByBranch = useMemo(() => {
        return computePivotData('general_category');
    }, [filteredReports]);

    // Helper function to compute airline pivot table data
    const computeAirlinePivotData = (categoryField: string) => {
        // Get all categories and airlines
        const categoryAirlineCounts: Record<string, Record<string, number>> = {};
        const airlineTotals: Record<string, number> = {};
        const areaGuard = (report: any) => {
            const area = String(report.area || '').toLowerCase();
            if (categoryField === 'terminal_area_category') return area.includes('terminal') || !!(report as any).terminal_area_category;
            if (categoryField === 'apron_area_category') return area.includes('apron') || !!(report as any).apron_area_category;
            if (categoryField === 'general_category') return area.includes('general') || !!(report as any).general_category;
            return true;
        };
        filteredReports.forEach(report => {
            if (!areaGuard(report)) return;
            const raw = (report as any)[categoryField];
            if (!raw || String(raw).trim() === '') return;
            const category = String(raw).trim();
            const airline = (report.airline || report.airlines || 'Unknown').toString().trim() || 'Unknown';
            if (!categoryAirlineCounts[category]) {
                categoryAirlineCounts[category] = {};
            }
            if (!categoryAirlineCounts[category][airline]) {
                categoryAirlineCounts[category][airline] = 0;
            }
            categoryAirlineCounts[category][airline]++;
            airlineTotals[airline] = (airlineTotals[airline] || 0) + 1;
        });
        
        // Get top 15 airlines sorted by total volume (descending)
        const allAirlines = Object.entries(airlineTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([airline]) => airline);
        
        // Get all categories sorted by total count (descending)
        const categoryTotals = Object.entries(categoryAirlineCounts).map(([category, airlines]) => ({
            category,
            total: Object.values(airlines).reduce((sum, count) => sum + count, 0),
            airlines
        })).sort((a, b) => b.total - a.total);
        
        // Compute grand totals
        const grandTotal: Record<string, number> = { total: 0 };
        allAirlines.forEach(airline => {
            grandTotal[airline] = 0;
        });
        
        categoryTotals.forEach(cat => {
            grandTotal.total += cat.total;
            allAirlines.forEach(airline => {
                grandTotal[airline] += cat.airlines[airline] || 0;
            });
        });
        
        // Compute max values for heatmap
        const maxValues: Record<string, number> = {};
        allAirlines.forEach(airline => {
            maxValues[airline] = Math.max(...categoryTotals.map(cat => cat.airlines[airline] || 0));
        });
        
        return {
            rows: categoryTotals,
            airlines: allAirlines,
            grandTotal,
            maxValues
        };
    };

    // Terminal Area by Airline
    const terminalAreaByAirline = useMemo(() => {
        return computeAirlinePivotData('terminal_area_category');
    }, [filteredReports]);

    // Apron Area by Airline
    const apronAreaByAirline = useMemo(() => {
        return computeAirlinePivotData('apron_area_category');
    }, [filteredReports]);

    // General Category by Airline
    const generalCategoryByAirline = useMemo(() => {
        return computeAirlinePivotData('general_category');
    }, [filteredReports]);

    // ── CGO-only data ──────────────────────────────────────────────────────────
    const cgoReports = useMemo(() =>
        filteredReports.filter(r => r.source_sheet === 'CGO'),
    [filteredReports]);

    // 1. Report by Case Category (Complaint / Irregularity / Compliment)
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

    // 2. Branch Reporting — top 10 branches by count
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

    // 3. Airlines Report — top 10 airlines by count
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

    // 6. Case Category by Branch pivot — { branch, complaint, irregularity, compliment, total }[]
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

    // 7. Case Category by Airlines pivot — { airline, complaint, irregularity, compliment, total }[]
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

    // CGO Detail Report useMemos
    // 8. CGO Case Report by Area pivot — Branch → Airlines → { terminal, apron, general }
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

    // 9. CGO Terminal Area Category
    const cgoTerminalAreaCategoryData = useMemo(() => {
        const map: Record<string, number> = {};
        cgoReports.forEach((r) => {
            const cat = ((r as any).terminal_area_category || '').trim();
            if (cat) map[cat] = (map[cat] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [cgoReports]);

    // 10. CGO Apron Area Category
    const cgoApronAreaCategoryData = useMemo(() => {
        const map: Record<string, number> = {};
        cgoReports.forEach((r) => {
            const cat = ((r as any).apron_area_category || '').trim();
            if (cat) map[cat] = (map[cat] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [cgoReports]);

    // 11. CGO General Category
    const cgoGeneralCategoryData = useMemo(() => {
        const map: Record<string, number> = {};
        cgoReports.forEach((r) => {
            const cat = ((r as any).general_category || '').trim();
            if (cat) map[cat] = (map[cat] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [cgoReports]);

    // 12. CGO HUB Report
    const cgoHubData = useMemo(() => {
        const map: Record<string, number> = {};
        cgoReports.forEach((r) => {
            const hub = ((r as any).hub || '').trim();
            if (hub) map[hub] = (map[hub] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [cgoReports]);

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
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [cgoReports]);

    return (
        <div className="space-y-6">
            {/* Global Filters Section */}
            <div className="relative z-50 bg-[oklch(1_0_0_/_0.4)] backdrop-blur-2xl border border-[oklch(1_0_0_/_0.1)] shadow-inner-rim rounded-2xl mb-6">
                <div className="flex justify-between items-center px-6 py-4 border-b border-[oklch(1_0_0_/_0.05)]">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                        <Filter size={16} className="text-[var(--brand-emerald-500)]" />
                        Global Dashboard Filter
                    </h3>
                    <button
                        onClick={() => setIsGlobalFilterCollapsed(!isGlobalFilterCollapsed)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors text-xs font-bold text-[var(--text-secondary)]"
                    >
                        <span>{isGlobalFilterCollapsed ? 'Tampilkan' : 'Sembunyikan'}</span>
                        <motion.svg 
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            animate={{ rotate: isGlobalFilterCollapsed ? 0 : 180 }}
                            transition={{ duration: 0.2 }}
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </motion.svg>
                    </button>
                </div>
                
                <AnimatePresence>
                    {!isGlobalFilterCollapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                        >
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[var(--surface-0)]/30 rounded-b-2xl">
                                <PrismMultiSelect
                                    label="Hub"
                                    placeholder="Semua Hub..."
                                    options={availableOptions.hubs.map(h => ({ label: h, value: h }))}
                                    values={globalFilters.hubs}
                                    onChange={(vals) => setGlobalFilters(prev => ({ ...prev, hubs: vals }))}
                                />
                                <PrismMultiSelect
                                    label="Branch"
                                    placeholder="Semua Branch..."
                                    options={availableOptions.branches.map(b => ({ label: b, value: b }))}
                                    values={globalFilters.branches}
                                    onChange={(vals) => setGlobalFilters(prev => ({ ...prev, branches: vals }))}
                                />
                                <PrismMultiSelect
                                    label="Airline"
                                    placeholder="Semua Airline..."
                                    options={availableOptions.airlines.map(a => ({ label: a, value: a }))}
                                    values={globalFilters.airlines}
                                    onChange={(vals) => setGlobalFilters(prev => ({ ...prev, airlines: vals }))}
                                />
                                <PrismMultiSelect
                                    label="Kategori"
                                    placeholder="Semua Kategori..."
                                    options={availableOptions.categories.map(c => ({ label: c, value: c }))}
                                    values={globalFilters.categories}
                                    onChange={(vals) => setGlobalFilters(prev => ({ ...prev, categories: vals }))}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Tab Bar - PRISM Floating Capsule */}
            <div className="flex justify-center sticky top-0 z-40 py-2">
                <div className="flex p-1.5 rounded-2xl bg-[oklch(1_0_0_/_0.4)] backdrop-blur-2xl border border-[oklch(1_0_0_/_0.1)] shadow-inner-rim max-w-full overflow-x-auto no-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                'px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap relative flex items-center gap-2',
                                activeTab === tab
                                    ? 'text-black'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[oklch(1_0_0_/_0.1)]'
                            )}
                        >
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-br from-[var(--brand-aurora-1)] to-[var(--brand-aurora-2)] rounded-xl shadow-lg shadow-emerald-500/20"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{TAB_LABELS[tab]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Blank Canvas for Each Tab */}
            {activeTab === 'summary' && <SummaryReportTab reports={filteredReportsForCalc as Report[]} />}
            {activeTab === 'sqi' && <ServiceQualityImprovementTab reports={filteredReportsForCalc as Report[]} />}
            {activeTab === 'joumpa' && (
                <JoumpaServiceTab
                    allReports={allReports as Report[]}
                    reports={filteredReportsForCalc as Report[]}
                />
            )}
            {activeTab === 'delay' && <div className="p-12 text-center text-[var(--text-muted)] border border-dashed rounded-2xl border-[oklch(1_0_0_/_0.2)] bg-[oklch(1_0_0_/_0.1)]">Delay Code Report Breakdown - Blank Canvas</div>}
            {activeTab === 'gse' && <GsePerformanceTab reports={filteredReportsForCalc as Report[]} />}
            {activeTab === 'cgo_cargo' && (
            <>
            <PresentationSlide
                title="CGO - Status Analytics"
                subtitle="Status analytics dari sheet CGO pada GOOGLE_SHEET_ID"
                icon={Activity}
            >
                {cgoReports.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Tidak ada data CGO untuk periode ini</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <DetailedStatusTable rows={cgoDetailedStatusRows} />
                            <StatusHeatmapTable title="Report Status by Branch" firstColumnLabel="Branch" rows={cgoStatusByBranch} />
                            <StatusHeatmapTable title="Report Status by Airlines" firstColumnLabel="Airlines" rows={cgoStatusByAirline} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Landside Area Category</h3>
                                <CategoryBarList data={cgoTerminalAreaCategoryData} color="oklch(0.65 0.18 160)" />
                            </div>
                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Airside Area Category</h3>
                                <CategoryBarList data={cgoApronAreaCategoryData} color="oklch(0.65 0.18 160)" />
                            </div>
                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">General Service Category</h3>
                                <CategoryBarList data={cgoGeneralCategoryData} color="oklch(0.65 0.18 160)" />
                            </div>
                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Root Cause Identification</h3>
                                <div className="overflow-x-auto">
                                    <div className="max-h-[220px] overflow-y-auto">
                                        <table className="w-full text-xs min-w-[540px]">
                                            <thead className="sticky top-0 z-10">
                                                <tr className="bg-slate-100 text-black border-b border-gray-300">
                                                    <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Branch</th>
                                                    <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Airlines</th>
                                                    <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Area</th>
                                                    <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Category</th>
                                                    <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Root</th>
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
                                                            <td className="py-1.5 px-2 text-gray-700">{row.area}</td>
                                                            <td className="py-1.5 px-2 text-gray-700 max-w-[180px]"><p className="line-clamp-2">{row.category}</p></td>
                                                            <td className="py-1.5 px-2 text-gray-700 max-w-[200px]"><p className="line-clamp-2">{row.root}</p></td>
                                                            <td className="py-1.5 px-2 text-center font-bold" style={{ backgroundColor: totalColor.bg, color: totalColor.fg }}>{row.total}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Detail Report Landside & Airside</h3>
                            <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Data laporan CGO diurutkan berdasarkan tanggal</p>
                            <DetailReportTable
                                data={[...cgoReports].sort((a, b) => {
                                    const dA = a.date_of_event ? new Date(a.date_of_event).getTime() : 0;
                                    const dB = b.date_of_event ? new Date(b.date_of_event).getTime() : 0;
                                    return dB - dA;
                                })}
                            />
                        </div>
                    </div>
                )}
            </PresentationSlide>
            <PresentationSlide
                title="CGO - Report Category"
                subtitle="Report category dari sheet CGO pada GOOGLE_SHEET_ID"
                icon={BarChart3}
            >
                {cgoReports.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                        Tidak ada data CGO untuk periode ini
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                             <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Report by Case Category</h3>
                                <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
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

                             <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Branch Reporting</h3>
                                <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
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

                             <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Airlines Report</h3>
                                <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
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

                             <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Monthly Report</h3>
                                <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
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

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                             <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col">
                                <h3 className="font-semibold text-[13px] tracking-tight text-slate-900 mb-3">Category by Area</h3>
                                <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
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

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Case Category by Branch</h3>
                                <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Report Category / Record Count</p>
                                {(() => {
                                    const maxC = Math.max(...cgoPivotByBranch.map(r => r.complaint), 1);
                                    const maxI = Math.max(...cgoPivotByBranch.map(r => r.irregularity), 1);
                                    const maxCo = Math.max(...cgoPivotByBranch.map(r => r.compliment), 1);
                                    const maxTot = Math.max(...cgoPivotByBranch.map(r => r.total), 1);
                                    return (
                                        <div className="overflow-x-auto">
                                            <div className="max-h-[188px] overflow-y-auto">
                                                <table className="w-full text-xs min-w-[320px]">
                                                    <thead className="sticky top-0 z-10">
                                                        <tr className="bg-slate-100 text-black border-b border-gray-300">
                                                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px] w-32">Reporting Br...</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Complaint</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Irregularity</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Compliment</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Grand total</th>
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
                                            <table className="w-full text-xs min-w-[320px] border-t-2 border-gray-300"><tbody><tr className="bg-gray-100 font-bold"><td className="py-1.5 px-2 text-gray-800">Grand total</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.complaint, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.irregularity, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.compliment, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.total, 0)}</td></tr></tbody></table>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Case Category by Airlines</h3>
                                <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Report Category / Record Count</p>
                                {(() => {
                                    const maxC = Math.max(...cgoPivotByAirlines.map(r => r.complaint), 1);
                                    const maxI = Math.max(...cgoPivotByAirlines.map(r => r.irregularity), 1);
                                    const maxCo = Math.max(...cgoPivotByAirlines.map(r => r.compliment), 1);
                                    const maxTot = Math.max(...cgoPivotByAirlines.map(r => r.total), 1);
                                    return (
                                        <div className="overflow-x-auto">
                                            <div className="max-h-[188px] overflow-y-auto">
                                                <table className="w-full text-xs min-w-[340px]">
                                                    <thead className="sticky top-0 z-10">
                                                        <tr className="bg-slate-100 text-black border-b border-gray-300">
                                                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px] w-32">Airlines</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Complaint</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Irregularity</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Compliment</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Grand total</th>
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
                                            <table className="w-full text-xs min-w-[340px] border-t-2 border-gray-300"><tbody><tr className="bg-gray-100 font-bold"><td className="py-1.5 px-2 text-gray-800">Grand total</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.complaint, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.irregularity, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.compliment, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.total, 0)}</td></tr></tbody></table>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </PresentationSlide>

            <PresentationSlide
                title="CGO - Report Category"
                subtitle="Report category breakdown dari sheet CGO"
                icon={BarChart3}
            >
                {cgoReports.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                        Tidak ada data CGO untuk periode ini
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Report by Case Category</h3>
                                <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                                    <div style={{ height: Math.max(200, cgoCaseCategoryData.length * 50) }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={cgoCaseCategoryData} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                                                <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                                                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                                <YAxis type="category" dataKey="name" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                                                    {cgoCaseCategoryData.map((entry, idx) => (
                                                        <Cell key={`cgo-report-cat-${idx}`} fill={entry.color} />
                                                    ))}
                                                    <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Branch Reporting</h3>
                                <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
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

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Airlines Report</h3>
                                <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                                    <div style={{ height: Math.max(200, cgoAirlinesData.length * 50) }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={cgoAirlinesData} layout="vertical" margin={{ top: 4, right: 40, left: 20, bottom: 4 }} barCategoryGap="30%">
                                                <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                                                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                                <YAxis type="category" dataKey="airline" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="count" name="Laporan" fill={REFERENCE_COLORS.irregularity} radius={[0, 4, 4, 0]} maxBarSize={20}>
                                                    <LabelList dataKey="count" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Monthly Report</h3>
                                <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                                    <div style={{ height: Math.max(200, cgoMonthlyData.length * 50) }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={cgoMonthlyData} layout="vertical" margin={{ top: 4, right: 40, left: 20, bottom: 4 }} barCategoryGap="30%">
                                                <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                                                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                                <YAxis type="category" dataKey="month" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={100} interval={0} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="count" name="Laporan" fill={REFERENCE_COLORS.irregularity} radius={[0, 4, 4, 0]} maxBarSize={20}>
                                                    <LabelList dataKey="count" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Category by Area</h3>
                                <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                                    <div style={{ height: Math.max(220, cgoCategoryByAreaData.length * 50) }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={cgoCategoryByAreaData} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                                                <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                                                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                                <YAxis type="category" dataKey="name" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                                                    {cgoCategoryByAreaData.map((entry, idx) => (
                                                        <Cell key={`cgo-report-area-${idx}`} fill={entry.color} />
                                                    ))}
                                                    <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Case Category by Branch</h3>
                                <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Report Category / Record Count</p>
                                {(() => {
                                    const maxC = Math.max(...cgoPivotByBranch.map(r => r.complaint), 1);
                                    const maxI = Math.max(...cgoPivotByBranch.map(r => r.irregularity), 1);
                                    const maxCo = Math.max(...cgoPivotByBranch.map(r => r.compliment), 1);
                                    const maxTot = Math.max(...cgoPivotByBranch.map(r => r.total), 1);
                                    return (
                                        <div className="overflow-x-auto">
                                            <div className="max-h-[188px] overflow-y-auto">
                                                <table className="w-full text-xs min-w-[320px]">
                                                    <thead className="sticky top-0 z-10">
                                                        <tr className="bg-slate-100 text-black border-b border-gray-300">
                                                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px] w-32">Reporting Br...</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Complaint</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Irregularity</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Compliment</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Grand total</th>
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
                                            <table className="w-full text-xs min-w-[320px] border-t-2 border-gray-300"><tbody><tr className="bg-gray-100 font-bold"><td className="py-1.5 px-2 text-gray-800">Grand total</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.complaint, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.irregularity, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.compliment, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByBranch.reduce((s, r) => s + r.total, 0)}</td></tr></tbody></table>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Case Category by Airlines</h3>
                                <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Report Category / Record Count</p>
                                {(() => {
                                    const maxC = Math.max(...cgoPivotByAirlines.map(r => r.complaint), 1);
                                    const maxI = Math.max(...cgoPivotByAirlines.map(r => r.irregularity), 1);
                                    const maxCo = Math.max(...cgoPivotByAirlines.map(r => r.compliment), 1);
                                    const maxTot = Math.max(...cgoPivotByAirlines.map(r => r.total), 1);
                                    return (
                                        <div className="overflow-x-auto">
                                            <div className="max-h-[188px] overflow-y-auto">
                                                <table className="w-full text-xs min-w-[340px]">
                                                    <thead className="sticky top-0 z-10">
                                                        <tr className="bg-slate-100 text-black border-b border-gray-300">
                                                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px] w-32">Airlines</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Complaint</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Irregularity</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Compliment</th>
                                                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Grand total</th>
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
                                            <table className="w-full text-xs min-w-[340px] border-t-2 border-gray-300"><tbody><tr className="bg-gray-100 font-bold"><td className="py-1.5 px-2 text-gray-800">Grand total</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.complaint, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.irregularity, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.compliment, 0)}</td><td className="py-1.5 px-2 text-center text-gray-800">{cgoPivotByAirlines.reduce((s, r) => s + r.total, 0)}</td></tr></tbody></table>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col">
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

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Identification of Root</h3>
                                <div className="flex items-center justify-between mb-3"><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Case Classification</span><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total</span></div>
                                <CategoryBarList data={cgoCaseClassificationData} color="oklch(0.65 0.18 160)" />
                            </div>

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Landside Area Category</h3>
                                <div className="flex items-center justify-between mb-3"><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Terminal Area</span><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total</span></div>
                                <CategoryBarList data={cgoTerminalAreaCategoryData} color="oklch(0.65 0.18 160)" />
                            </div>

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Airside Area Category</h3>
                                <div className="flex items-center justify-between mb-3"><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Apron Area</span><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total</span></div>
                                <CategoryBarList data={cgoApronAreaCategoryData} color="oklch(0.65 0.18 160)" />
                            </div>

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">General Service Category</h3>
                                <div className="flex items-center justify-between mb-3"><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">General Category</span><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total</span></div>
                                <CategoryBarList data={cgoGeneralCategoryData} color="oklch(0.65 0.18 160)" />
                            </div>
                        </div>
                    </div>
                )}
            </PresentationSlide>

            <PresentationSlide title="CGO - Detail Report" subtitle="Detail laporan area dan kategori CGO" icon={MapPin}>
                {cgoReports.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Tidak ada data CGO untuk periode ini</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl overflow-hidden">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Case Report by Area</h3>
                                <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Area Report / Branch by Airlines</p>
                                {cgoCaseReportByArea.length === 0 ? <p className="text-xs text-gray-400 text-center py-6">Tidak ada data</p> : (
                                    <div className="overflow-x-auto">
                                        <div className="max-h-[188px] overflow-y-auto">
                                            <table className="w-full text-xs min-w-[320px]">
                                                <thead className="sticky top-0 z-10"><tr className="bg-slate-100 text-black border-b border-gray-300"><th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Branch</th><th className="text-left py-2 px-2 font-black uppercase tracking-widest text-[8px]">Airlines</th><th className="text-center py-2 px-1 font-black uppercase tracking-widest text-[8px]">Terminal<br/>Area</th><th className="text-center py-2 px-1 font-black uppercase tracking-widest text-[8px]">Apron<br/>Area</th><th className="text-center py-2 px-1 font-black uppercase tracking-widest text-[8px]">General</th><th className="text-center py-2 px-1 font-black uppercase tracking-widest text-[8px]">Grand<br/>total</th></tr></thead>
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
                                        <table className="w-full text-xs min-w-[320px] border-t-2 border-gray-300"><tbody><tr className="bg-gray-100 font-bold"><td className="py-1.5 px-1.5 text-gray-800" colSpan={2}>Grand total</td><td className="py-1.5 px-1.5 text-center text-gray-800">{cgoCaseReportByArea.reduce((s, b) => s + b.totalTerminal, 0)}</td><td className="py-1.5 px-1.5 text-center text-gray-800">{cgoCaseReportByArea.reduce((s, b) => s + b.totalApron, 0)}</td><td className="py-1.5 px-1.5 text-center text-gray-800">{cgoCaseReportByArea.reduce((s, b) => s + b.totalGeneral, 0)}</td><td className="py-1.5 px-1.5 text-center text-gray-800">{cgoCaseReportByArea.reduce((s, b) => s + b.grandTotal, 0)}</td></tr></tbody></table>
                                    </div>
                                )}
                            </div>

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Terminal Area Category</h3>
                                <div className="flex items-center justify-between mb-3"><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Category</span><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total</span></div>
                                <CategoryBarList data={cgoTerminalAreaCategoryData} color="oklch(0.65 0.18 160)" />
                            </div>
                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">Apron Area Category</h3>
                                <div className="flex items-center justify-between mb-3"><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Category</span><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total</span></div>
                                <CategoryBarList data={cgoApronAreaCategoryData} color="oklch(0.6 0.14 240)" />
                            </div>
                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 opacity-70">General Category</h3>
                                <div className="flex items-center justify-between mb-3"><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Category</span><span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Total</span></div>
                                <CategoryBarList data={cgoGeneralCategoryData} color="oklch(0.8 0.15 80)" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                             <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">HUB Report</h3>
                                <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Distribusi laporan berdasarkan HUB</p>
                                {cgoHubData.length === 0 ? <p className="text-xs text-gray-400 text-center py-6">Tidak ada data HUB</p> : (
                                    <div className="h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                                        <div style={{ height: Math.max(220, cgoHubData.length * 50) }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={cgoHubData} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                                                    <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                                                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                                    <YAxis type="category" dataKey="name" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Bar dataKey="value" name="Count" fill="oklch(0.6 0.2 280)" radius={[0, 4, 4, 0]} maxBarSize={28}>
                                                        <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="card-glass p-6 group transition-all duration-500 hover:shadow-2xl">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-70">Detail Report Landside & Airside</h3>
                                <p className="text-[10px] font-medium text-[var(--text-muted)] mb-6">Data laporan CGO diurutkan berdasarkan tanggal</p>
                                <DetailReportTable data={[...cgoReports].sort((a, b) => {
                                    const dA = a.date_of_event ? new Date(a.date_of_event).getTime() : 0;
                                    const dB = b.date_of_event ? new Date(b.date_of_event).getTime() : 0;
                                    return dB - dA;
                                })} />
                            </div>
                        </div>
                    </div>
                )}
            </PresentationSlide>
            </>
            )}
        </div>
    );
}
