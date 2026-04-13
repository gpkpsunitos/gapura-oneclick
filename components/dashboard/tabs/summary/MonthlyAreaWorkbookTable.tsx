'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const AIRLINE_COL_WIDTH = 240;
const DETAIL_COL_WIDTH = 320;

export interface MonthlyAreaWorkbookRow {
  id: string;
  airline: string;
  category: string;
  months: number[];
  total: number;
  improvementPct: number | null;
  improvementDirection: 'up' | 'down' | 'flat' | null;
}

interface MonthlyAreaWorkbookTableProps {
  title: string;
  rows: MonthlyAreaWorkbookRow[];
  emptyMessage?: string;
  detailHeader?: string;
  totalDetailLabel?: string;
}

function formatImprovement(row: MonthlyAreaWorkbookRow) {
  if (row.improvementDirection === null || row.improvementPct === null) {
    return { label: 'No baseline', tone: 'muted' as const, arrow: '•' };
  }

  if (row.improvementDirection === 'flat') {
    return { label: 'Flat', tone: 'flat' as const, arrow: '→' };
  }

  const tone = row.improvementDirection === 'up' ? 'up' as const : 'down' as const;
  const arrow = row.improvementDirection === 'up' ? '↑' : '↓';
  return { label: `${Math.round(row.improvementPct)}%`, tone, arrow };
}

export function MonthlyAreaWorkbookTable({
  title,
  rows,
  emptyMessage = 'Belum ada data untuk area ini.',
  detailHeader = 'Category',
  totalDetailLabel = 'All Categories',
}: MonthlyAreaWorkbookTableProps) {
  const [page, setPage] = useState(0);
  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(
    () => rows.slice(safePage * itemsPerPage, safePage * itemsPerPage + itemsPerPage),
    [rows, safePage]
  );
  const startIndex = rows.length === 0 ? 0 : safePage * itemsPerPage + 1;
  const endIndex = Math.min(rows.length, safePage * itemsPerPage + paginatedRows.length);

  const totals = rows.reduce(
    (acc, row) => {
      row.months.forEach((value, index) => {
        acc.months[index] += value;
      });
      acc.total += row.total;
      return acc;
    },
    { months: new Array(12).fill(0) as number[], total: 0 }
  );
  const activeMonths = totals.months.filter((value) => value > 0).length;
  const leader = rows[0];

  return (
    <div className="overflow-hidden rounded-[26px] border border-[oklch(0.86_0.06_150_/_0.6)] bg-white shadow-[0_24px_56px_-34px_oklch(0.38_0.12_160_/_0.35)]">
      <div className="border-b border-[oklch(0.82_0.08_150_/_0.55)] bg-[linear-gradient(90deg,oklch(0.56_0.17_154),oklch(0.62_0.14_146))] px-5 py-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-white/70">
              Workbook View
            </p>
            <h3 className="text-[0.98rem] font-black tracking-[0.01em] text-white">{title}</h3>
          </div>
          <div className="flex flex-wrap gap-2 text-[0.64rem] font-black uppercase tracking-[0.16em] text-white/88">
            <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
              {rows.length} mapped rows
            </span>
            <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
              {activeMonths} active months
            </span>
            <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
              {totals.total} total reports
            </span>
          </div>
        </div>
      </div>

      {leader ? (
        <div className="border-b border-[oklch(0.9_0.02_145)] bg-[linear-gradient(180deg,oklch(0.985_0.015_145),oklch(0.975_0.02_145))] px-5 py-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-[var(--brand-emerald-700)]">
              Top Line
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              <span className="font-black">{leader.airline}</span>
              <span className="mx-2 text-[var(--text-muted)]">/</span>
              <span>{leader.category}</span>
              <span className="mx-2 text-[var(--text-muted)]">/</span>
              <span className="font-mono font-black text-[var(--brand-emerald-700)]">{leader.total}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative overflow-x-auto">
        <div
          className="pointer-events-none absolute inset-y-0 z-30 w-px bg-[oklch(0.86_0.03_140)]"
          style={{ left: `${AIRLINE_COL_WIDTH + DETAIL_COL_WIDTH}px` }}
        />
        <table className="min-w-[1300px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-[oklch(0.97_0.02_140)]">
              <th
                className="sticky left-0 z-30 border-b border-r border-[oklch(0.88_0.03_140)] bg-[oklch(0.97_0.02_140)] px-4 py-3 text-left text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                style={{ minWidth: `${AIRLINE_COL_WIDTH}px`, width: `${AIRLINE_COL_WIDTH}px`, maxWidth: `${AIRLINE_COL_WIDTH}px` }}
              >
                Airlines Report
              </th>
              <th
                className="sticky z-30 border-b border-r border-[oklch(0.88_0.03_140)] bg-[oklch(0.97_0.02_140)] px-4 py-3 text-left text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                style={{ left: `${AIRLINE_COL_WIDTH}px`, minWidth: `${DETAIL_COL_WIDTH}px`, width: `${DETAIL_COL_WIDTH}px`, maxWidth: `${DETAIL_COL_WIDTH}px` }}
              >
                {detailHeader}
              </th>
              {MONTH_LABELS.map((month) => (
                <th
                  key={month}
                  className="min-w-[68px] border-b border-r border-[oklch(0.88_0.03_140)] px-2 py-3 text-center text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                >
                  {month}
                </th>
              ))}
              <th className="min-w-[96px] border-b border-r border-[oklch(0.88_0.03_140)] px-3 py-3 text-center text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Grand Total
              </th>
              <th className="min-w-[140px] border-b border-[oklch(0.88_0.03_140)] px-3 py-3 text-center text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Improvement
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={16}
                  className="px-4 py-10 text-center text-sm font-medium text-[var(--text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => {
                const prevAirline = index > 0 ? paginatedRows[index - 1]?.airline : null;
                const showAirline = row.airline !== prevAirline;
                const improvement = formatImprovement(row);

                return (
                  <tr key={row.id} className="transition-colors hover:bg-[oklch(0.98_0.02_145)]/80">
                    <td
                      className={cn(
                        'sticky left-0 z-20 border-b border-r border-[oklch(0.9_0.02_140)] px-4 py-3 align-top',
                        showAirline ? 'bg-[oklch(0.93_0.05_145)] font-black text-[var(--text-primary)]' : 'bg-white text-transparent'
                      )}
                      style={{ minWidth: `${AIRLINE_COL_WIDTH}px`, width: `${AIRLINE_COL_WIDTH}px`, maxWidth: `${AIRLINE_COL_WIDTH}px` }}
                    >
                      <span className={showAirline ? 'block' : 'sr-only'}>{row.airline}</span>
                    </td>
                    <td
                      className="sticky z-20 border-b border-r border-[oklch(0.9_0.02_140)] bg-white px-4 py-3 text-[0.82rem] text-[var(--text-primary)]"
                      style={{ left: `${AIRLINE_COL_WIDTH}px`, minWidth: `${DETAIL_COL_WIDTH}px`, width: `${DETAIL_COL_WIDTH}px`, maxWidth: `${DETAIL_COL_WIDTH}px` }}
                    >
                      {row.category}
                    </td>
                    {row.months.map((value, monthIndex) => (
                      <td
                        key={`${row.id}-${monthIndex}`}
                        className="border-b border-r border-[oklch(0.92_0.02_140)] px-2 py-3 text-center font-mono text-[0.82rem] text-[var(--text-primary)]"
                      >
                        {value > 0 ? value : ''}
                      </td>
                    ))}
                    <td className="border-b border-r border-[oklch(0.92_0.02_140)] px-3 py-3 text-center font-mono text-[0.84rem] font-black text-[var(--brand-emerald-700)]">
                      {row.total}
                    </td>
                    <td className="border-b border-[oklch(0.92_0.02_140)] px-3 py-3 text-center">
                      <span
                        className={cn(
                          'inline-flex min-w-[88px] items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[0.72rem] font-black',
                          improvement.tone === 'up' && 'bg-emerald-50 text-emerald-700',
                          improvement.tone === 'down' && 'bg-rose-50 text-rose-700',
                          improvement.tone === 'flat' && 'bg-amber-50 text-amber-700',
                          improvement.tone === 'muted' && 'bg-slate-100 text-slate-500'
                        )}
                      >
                        <span>{improvement.arrow}</span>
                        <span>{improvement.label}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}

            {rows.length > 0 ? (
              <tr className="bg-[oklch(0.95_0.03_145)]">
                <td
                  className="sticky left-0 z-20 border-r border-t border-[oklch(0.86_0.04_145)] bg-[oklch(0.95_0.03_145)] px-4 py-3 font-black uppercase tracking-[0.16em] text-[var(--text-primary)]"
                  style={{ minWidth: `${AIRLINE_COL_WIDTH}px`, width: `${AIRLINE_COL_WIDTH}px`, maxWidth: `${AIRLINE_COL_WIDTH}px` }}
                >
                  Grand Total
                </td>
                <td
                  className="sticky z-20 border-r border-t border-[oklch(0.86_0.04_145)] bg-[oklch(0.95_0.03_145)] px-4 py-3 text-[0.78rem] font-bold text-[var(--text-secondary)]"
                  style={{ left: `${AIRLINE_COL_WIDTH}px`, minWidth: `${DETAIL_COL_WIDTH}px`, width: `${DETAIL_COL_WIDTH}px`, maxWidth: `${DETAIL_COL_WIDTH}px` }}
                >
                  {totalDetailLabel}
                </td>
                {totals.months.map((value, monthIndex) => (
                  <td
                    key={`total-${monthIndex}`}
                    className="border-r border-t border-[oklch(0.86_0.04_145)] px-2 py-3 text-center font-mono text-[0.82rem] font-black text-[var(--text-primary)]"
                  >
                    {value > 0 ? value : ''}
                  </td>
                ))}
                <td className="border-r border-t border-[oklch(0.86_0.04_145)] px-3 py-3 text-center font-mono text-[0.84rem] font-black text-[var(--brand-emerald-700)]">
                  {totals.total}
                </td>
                <td className="border-t border-[oklch(0.86_0.04_145)] px-3 py-3 text-center text-[0.72rem] font-bold text-[var(--text-muted)]">
                  Summary
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[oklch(0.88_0.03_140)] bg-[oklch(0.985_0.01_140)] px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span className="order-2 sm:order-1">
          {startIndex}-{endIndex} of {rows.length}
        </span>
        <div className="order-1 flex items-center justify-between gap-3 sm:order-2 sm:justify-end">
          <span className="text-[0.62rem] tracking-[0.22em] text-[var(--brand-emerald-700)]">
            Page {safePage + 1}
          </span>
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage === 0}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[oklch(0.88_0.03_140)] bg-white text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-emerald-400)] hover:text-[var(--brand-emerald-700)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-[4.5rem] text-center">
            {safePage + 1}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={safePage >= totalPages - 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[oklch(0.88_0.03_140)] bg-white text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-emerald-400)] hover:text-[var(--brand-emerald-700)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight size={14} />
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
