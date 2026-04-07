'use client';

import React, { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Download, Info, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { QueryResult } from '@/types/builder';

interface ParetoChartProps {
  result: QueryResult;
  title: string;
  headline?: string;
  explanation?: string;
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
  onViewCategoryRecords?: (category: string) => void;
}

interface ParetoRankRow {
  name: string;
  value: number;
  sharePercentage: number;
  cumulativePercentage: number;
  rank: number;
  priority: 'focus' | 'monitor';
  reachesThreshold: boolean;
}

function truncateLabel(value: string, maxLength = 16) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function formatPercentage(value: number) {
  return `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}

function exportRowsToCsv(rows: Array<Record<string, string | number>>, filename: string) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] ?? '');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ParetoChart({
  result,
  title,
  headline = 'Top Complaint Drivers',
  explanation,
  selectedCategory,
  onCategorySelect,
  onViewCategoryRecords,
}: ParetoChartProps) {
  const processed = useMemo(() => {
    const rows = result.rows as Record<string, unknown>[];
    if (rows.length === 0) {
      return null;
    }

    const columns = result.columns;
    const sampleRow = rows[0];
    const measureKey = columns.find((column) => typeof sampleRow[column] === 'number') || columns[1];
    const dimensionKey = columns.find((column) => typeof sampleRow[column] === 'string') || columns[0];

    const sortedRows = [...rows].sort(
      (left, right) => (Number(right[measureKey]) || 0) - (Number(left[measureKey]) || 0),
    );
    const totalCases = sortedRows.reduce((sum, row) => sum + (Number(row[measureKey]) || 0), 0);

    const allRows = sortedRows.reduce<{
      cumulativeValue: number;
      rows: Array<{
        name: string;
        value: number;
        sharePercentage: number;
        cumulativePercentage: number;
        rank: number;
      }>;
    }>((accumulator, row, index) => {
      const value = Number(row[measureKey]) || 0;
      const cumulativeValue = accumulator.cumulativeValue + value;
      const sharePercentage = totalCases > 0 ? Number(((value / totalCases) * 100).toFixed(1)) : 0;
      const cumulativePercentage = totalCases > 0
        ? Number(((cumulativeValue / totalCases) * 100).toFixed(1))
        : 0;

      return {
        cumulativeValue,
        rows: [
          ...accumulator.rows,
          {
            name: String(row[dimensionKey]),
            value,
            sharePercentage,
            cumulativePercentage,
            rank: index + 1,
          },
        ],
      };
    }, { cumulativeValue: 0, rows: [] }).rows;

    const thresholdIndex = allRows.findIndex((row) => row.cumulativePercentage >= 80);
    const thresholdRank = thresholdIndex >= 0 ? thresholdIndex + 1 : allRows.length;
    const rankedRows: ParetoRankRow[] = allRows.map((row, index) => ({
      ...row,
      priority: index < thresholdRank ? 'focus' : 'monitor',
      reachesThreshold: index + 1 === thresholdRank,
    }));

    const topVisibleRows = rankedRows.slice(0, 6);
    const otherRows = rankedRows.slice(6);
    const chartRows = [...topVisibleRows];
    if (otherRows.length > 0) {
      const otherTotal = otherRows.reduce((sum, row) => sum + row.value, 0);
      const topVisibleTotal = topVisibleRows.reduce((sum, row) => sum + row.value, 0);
      chartRows.push({
        name: 'Others',
        value: otherTotal,
        sharePercentage: totalCases > 0 ? Number(((otherTotal / totalCases) * 100).toFixed(1)) : 0,
        cumulativePercentage: totalCases > 0
          ? Number((((topVisibleTotal + otherTotal) / totalCases) * 100).toFixed(1))
          : 0,
        rank: topVisibleRows.length + 1,
        priority: 'monitor',
        reachesThreshold: thresholdRank > topVisibleRows.length,
      });
    }

    const topCategory = rankedRows[0] || null;
    const thresholdRow = rankedRows[Math.max(thresholdRank - 1, 0)] || topCategory;
    const focusCategory =
      rankedRows.find((row) => row.name === selectedCategory) ||
      topCategory;
    const topPriorityRows = rankedRows.filter((row) => row.priority === 'focus');

    return {
      allRows: rankedRows,
      chartRows,
      totalCases,
      thresholdRank,
      thresholdShare: thresholdRow?.cumulativePercentage || 0,
      topCategory,
      focusCategory,
      topPriorityRows,
    };
  }, [result, selectedCategory]);

  if (!processed || processed.allRows.length === 0) return null;

  const { allRows, chartRows, totalCases, thresholdRank, thresholdShare, topCategory, focusCategory, topPriorityRows } =
    processed;
  const activeCategory = focusCategory?.name || topCategory?.name || '';
  const actionLabel =
    activeCategory && activeCategory === topCategory?.name
      ? 'View top contributor records'
      : 'View selected records';
  const recommendationTargets = topPriorityRows.slice(0, 2).map((row) => row.name);
  const insightExplanation =
    explanation ||
    'Focus improvement efforts on the categories before the 80% threshold to reduce complaint volume faster than spreading follow-up evenly.';

  const handleExport = () => {
    exportRowsToCsv(
      allRows.map((row) => ({
        rank: row.rank,
        category: row.name,
        cases: row.value,
        share_pct: row.sharePercentage,
        cumulative_pct: row.cumulativePercentage,
        status: row.priority === 'focus' ? 'High priority' : 'Below threshold',
      })),
      'op_pareto_top_categories',
    );
  };

  return (
    <section className="min-w-0 flex w-full max-w-full flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/40 p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03] backdrop-blur-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl min-w-0">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
            {title}
          </div>
          <h2 className="text-[24px] font-medium tracking-tight text-slate-900">
            {headline}
          </h2>
          {insightExplanation && <p className="mt-1 text-sm leading-relaxed text-slate-500">{insightExplanation}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => activeCategory && onViewCategoryRecords?.(activeCategory)}
            disabled={!activeCategory || !onViewCategoryRecords}
            className="h-9 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700"
          >
            {actionLabel}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            className="h-9 rounded-full border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Export
            <Download className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 items-start gap-4 overflow-hidden xl:grid-cols-[3fr_2fr]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                Cumulative share vs case volume
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Bars show case count. The line shows cumulative contribution toward the 80% threshold.
              </p>
            </div>
            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-800">
              80% threshold
            </div>
          </div>

          <div className="h-[400px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartRows}
                margin={{ top: 20, right: 18, bottom: 80, left: 6 }}
                barCategoryGap="18%"
                barGap={8}
              >
                <CartesianGrid stroke="#64748b" strokeOpacity={0.16} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  height={90}
                  tickLine={false}
                  axisLine={{ stroke: '#64748b' }}
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }}
                  tickFormatter={(value) => truncateLabel(String(value), 18)}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis
                  yAxisId="left"
                  width={52}
                  tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={58}
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: '#92400e', fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  labelFormatter={(label) => String(label)}
                  formatter={(value, name) => [
                    name === 'Cumulative share'
                      ? formatPercentage(Number(value))
                      : Number(value).toLocaleString('id-ID'),
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: '16px',
                    border: '1px solid #d1d5db',
                    boxShadow: '0 20px 40px -26px rgba(15,23,42,0.45)',
                    backgroundColor: '#ffffff',
                  }}
                  cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={80}
                  stroke="#9a3412"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  label={{
                    value: '80%',
                    position: 'insideTopRight',
                    fill: '#9a3412',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="value"
                  name="Cases"
                  barSize={34}
                  fill="#86efac"
                  stroke="#047857"
                  strokeWidth={1.5}
                  radius={[10, 10, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativePercentage"
                  name="Cumulative share"
                  stroke="#b45309"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#b45309', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#92400e' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">
                Ranked categories
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Select a category card to focus the complaint records table below.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
              {allRows.length} categories
            </div>
          </div>

          <div className="max-h-[360px] space-y-2 overflow-y-auto overflow-x-hidden pr-1">
            {allRows.map((entry) => {
              const isActive = activeCategory === entry.name;
              const statusLabel = entry.reachesThreshold
                ? 'Crosses 80%'
                : entry.priority === 'focus'
                  ? 'High priority'
                  : 'Below threshold';

              return (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => onCategorySelect?.(entry.name)}
                  className={cn(
                    'w-full rounded-[22px] border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                    isActive
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                      : entry.priority === 'focus'
                        ? 'border-emerald-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                        : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={cn(
                          'inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[11px] font-black',
                          isActive ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white',
                        )}
                      >
                        {entry.rank}
                      </span>
                      <div className="min-w-0 overflow-hidden">
                        <div className="truncate text-sm font-bold leading-5 text-slate-900">{entry.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{entry.value.toLocaleString('id-ID')} cases</span>
                          <span>{formatPercentage(entry.sharePercentage)} share</span>
                          <span>{formatPercentage(entry.cumulativePercentage)} cumulative</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                        entry.priority === 'focus'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700',
                      )}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}


