/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared chart utilities and components for analyst dashboard
 *
 * This file contains shared constants, color palettes, and small utility
 * components used across the analyst charts components.
 */

import { type ComponentProps, useState } from 'react';
import {
    ResponsiveContainer as RechartsResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Report } from '@/types';

/**
 * Prism semantic color palette (OP Solid Hex style)
 */
export const REFERENCE_COLORS = {
    irregularity: '#08ad6f', // OP Emerald
    complaint: '#0f86c1',    // OP Blue
    compliment: '#e49418',   // OP Amber
    trend: '#007073',        // OP Teal
    neutral: '#263033',      // Slate/dark grey
};

export const CHART_PALETTE = [
    '#08ad6f',
    '#0f86c1',
    '#e49418',
    '#79c77b',
    '#007073',
    '#a8bca6',
];

export const COLORS = [
    REFERENCE_COLORS.irregularity,
    REFERENCE_COLORS.complaint,
    REFERENCE_COLORS.compliment,
    '#79c77b', // Soft green
    '#007073', // Teal
    '#8a8a8a', // Slate
    '#cfd8ce', // Border light
];

export const ENTERPRISE_COLORS = [
    '#1f2a2d',
    '#263033',
    '#48ad4f',
    '#e49418',
] as const;

export const OS_CARD_CLASS = 'border border-[#cfd8ce] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.16)]';
export const OS_TABLE_HEADER_CLASS = 'bg-[#79c77b] text-[#17231c]';
export const OS_BORDER_CLASS = 'border-[#b9c5b8]';
export const OS_HOVER_CLASS = 'hover:bg-[#eef7ed]';

/**
 * Wrapper for responsive container that ensures minimum dimensions
 */
export function ResponsiveContainer(props: ComponentProps<typeof RechartsResponsiveContainer>) {
    return (
        <RechartsResponsiveContainer
            {...props}
            minWidth={props.minWidth ?? 1}
            minHeight={props.minHeight ?? 1}
        />
    );
}

interface AxisTickProps {
    x?: number;
    y?: number;
    payload?: {
        value?: string | number;
    };
}

/**
 * X-axis tick that wraps long labels
 */
export const WrappedXAxisTick = (props: AxisTickProps) => {
    const { x, y, payload } = props;
    const label = String(payload?.value ?? '');
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
        <g transform={`translate(${x ?? 0},${y ?? 0})`}>
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

/**
 * Y-axis tick that wraps long labels
 */
export const WrappedYAxisTick = (props: AxisTickProps) => {
    const { x, y, payload } = props;
    const words = String(payload?.value ?? '').split(/\s+/);
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
        <g transform={`translate(${x ?? 0},${y ?? 0})`}>
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

/**
 * Props for custom tooltip
 */
export interface CustomTooltipProps {
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

/**
 * Custom tooltip component for charts
 */
export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;

    return (
        <div className="border border-[#b9c9b6] bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.12)] min-w-[140px] font-black">
            {label && <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#007073] mb-2 border-b border-[#dfe7dd] pb-1">{label}</p>}
            <div className="space-y-1">
                {payload.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-1.5 text-[#3f4742]">
                            <div
                                className="w-2 h-2 shrink-0"
                                style={{ backgroundColor: entry.fill || entry.color || '#08ad6f' }}
                            />
                            <span className="text-[11px] font-semibold text-[#3f4742]">
                                {entry.name || 'Value'}
                            </span>
                        </div>
                        <span className="text-[11px] font-black text-[#1f2a2d]">
                            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Returns perceptual emerald-scale background + foreground for heat-map cells.
 */
export function heatColor(value: number, max: number): { bg: string; fg: string } {
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

const DETAIL_PAGE_SIZE = 10;

export function DetailReportTable({ data }: { data: Report[] }) {
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(data.length / DETAIL_PAGE_SIZE);
    const pageItems = data.slice(page * DETAIL_PAGE_SIZE, (page + 1) * DETAIL_PAGE_SIZE);
    const startIdx = page * DETAIL_PAGE_SIZE + 1;
    const endIdx = Math.min((page + 1) * DETAIL_PAGE_SIZE, data.length);

    if (data.length === 0) {
        return <p className="text-xs text-[var(--text-muted)] text-center py-4">Tidak ada data</p>;
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
                    <span className="text-[10px] text-[var(--text-muted)]">
                        {startIdx}-{endIdx} / {data.length} records
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            aria-label="Halaman sebelumnya"
                            className="p-1 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                            disabled={page === 0}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            <ChevronLeft size={14} className="text-[var(--text-secondary)]" aria-hidden="true" />
                        </button>
                        <span className="text-[10px] text-[var(--text-secondary)]">Page {page + 1}/{totalPages}</span>
                        <button
                            aria-label="Halaman selanjutnya"
                            className="p-1 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            <ChevronRight size={14} className="text-[var(--text-secondary)]" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
