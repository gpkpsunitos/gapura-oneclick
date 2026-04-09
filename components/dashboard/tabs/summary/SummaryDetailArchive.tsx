'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SummaryDetailRow } from './types';

interface SummaryDetailArchiveProps {
  rows: SummaryDetailRow[];
  itemsPerPage?: number;
}

export function SummaryDetailArchive({
  rows,
  itemsPerPage = 20,
}: SummaryDetailArchiveProps) {
  const [page, setPage] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const sortedRows = useMemo(
    () => [...rows].sort((left, right) => right.rawDate - left.rawDate),
    [rows]
  );

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / itemsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedRows = sortedRows.slice(safePage * itemsPerPage, safePage * itemsPerPage + itemsPerPage);
  const startIndex = sortedRows.length === 0 ? 0 : safePage * itemsPerPage + 1;
  const endIndex = Math.min(sortedRows.length, safePage * itemsPerPage + paginatedRows.length);

  const toggleRow = (id: string) => {
    setExpandedIds((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <div className="overflow-hidden rounded-[22px] border border-[oklch(0.9_0.01_90_/_0.7)] bg-white/50">
      <div className="overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-[var(--surface-1)]/95 backdrop-blur-xl">
            <tr>
              {['Date', 'Branch', 'Airline', 'Flight', 'Category', 'Breakdown / Root', 'Status', 'Details'].map((label, index) => (
                <th
                  key={label}
                  className={`border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-1)]/95 px-4 py-3 text-left text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] ${index === 7 ? 'text-right' : ''}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm font-medium text-[var(--text-muted)]">
                  No detailed reports available.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIndex) => {
                const isExpanded = Boolean(expandedIds[row.id]);
                const isLastRow = rowIndex === paginatedRows.length - 1 && !isExpanded;

                return (
                  <Fragment key={row.id}>
                    <tr className="hover:bg-[var(--surface-2)]/70">
                      <td className={cn(!isLastRow && 'border-b border-[oklch(0.9_0.01_90_/_0.55)]', 'px-4 py-3 font-mono text-[0.8rem] font-semibold text-[var(--text-primary)]')}>
                        {row.date}
                      </td>
                      <td className={cn(!isLastRow && 'border-b border-[oklch(0.9_0.01_90_/_0.55)]', 'px-4 py-3 font-mono text-[0.82rem] font-semibold text-[var(--text-primary)]')}>
                        {row.branch}
                      </td>
                      <td className={cn(!isLastRow && 'border-b border-[oklch(0.9_0.01_90_/_0.55)]', 'px-4 py-3 text-[0.82rem] text-[var(--text-primary)]')}>
                        <span className="break-words">
                          {row.airline}
                        </span>
                      </td>
                      <td className={cn(!isLastRow && 'border-b border-[oklch(0.9_0.01_90_/_0.55)]', 'px-4 py-3 font-mono text-[0.82rem] text-[var(--text-primary)]')}>
                        {row.flight}
                      </td>
                      <td className={cn(!isLastRow && 'border-b border-[oklch(0.9_0.01_90_/_0.55)]', 'px-4 py-3')}>
                        <span className="inline-flex rounded-full border border-[var(--brand-emerald-100)] bg-[var(--brand-emerald-50)] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--brand-emerald-700)]">
                          {row.category}
                        </span>
                      </td>
                      <td className={cn(!isLastRow && 'border-b border-[oklch(0.9_0.01_90_/_0.55)]', 'px-4 py-3 text-[0.82rem] text-[var(--text-primary)]')}>
                        <div className="space-y-1">
                          <p className="break-words">
                            {row.breakdown}
                          </p>
                          <p className="break-words text-[var(--text-secondary)]">
                            {row.rootSummary}
                          </p>
                        </div>
                      </td>
                      <td className={cn(!isLastRow && 'border-b border-[oklch(0.9_0.01_90_/_0.55)]', 'px-4 py-3')}>
                        <span className="inline-flex rounded-full border border-[oklch(0.9_0.01_90_/_0.9)] bg-white px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                          {row.status}
                        </span>
                      </td>
                      <td className={cn(!isLastRow && 'border-b border-[oklch(0.9_0.01_90_/_0.55)]', 'px-4 py-3 text-right')}>
                        <button
                          type="button"
                          onClick={() => toggleRow(row.id)}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] transition-all',
                            isExpanded
                              ? 'border border-[oklch(0.9_0.01_90_/_0.9)] bg-white text-[var(--text-secondary)] hover:border-[var(--brand-emerald-400)] hover:text-[var(--brand-emerald-700)]'
                              : 'border border-[var(--brand-emerald-500)] bg-[var(--brand-emerald-500)] text-white hover:bg-[var(--brand-emerald-600)]'
                          )}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? 'Hide' : 'See Details'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="bg-[var(--surface-0)]/80">
                        <td colSpan={8} className="border-b border-[oklch(0.9_0.01_90_/_0.55)] px-5 py-5">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <DetailBlock label="Detail Report" value={row.detail} />
                            <DetailBlock label="Detail Root Caused" value={row.detailRoot} />
                            <DetailBlock label="Action Taken" value={row.action} />
                            <DetailBlock label="Preventive Action" value={row.preventive} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-0)]/90 px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        <span>
          {startIndex}-{endIndex} of {sortedRows.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage === 0}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[oklch(0.9_0.01_90_/_0.9)] bg-white text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-emerald-400)] hover:text-[var(--brand-emerald-700)] disabled:cursor-not-allowed disabled:opacity-35"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[oklch(0.9_0.01_90_/_0.9)] bg-white text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-emerald-400)] hover:text-[var(--brand-emerald-700)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[oklch(0.9_0.01_90_/_0.7)] bg-white/80 p-4">
      <p className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="text-sm leading-7 text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
