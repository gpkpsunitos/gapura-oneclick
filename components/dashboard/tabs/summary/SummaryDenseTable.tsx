'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortDirection = 'asc' | 'desc';

export interface SummaryDenseColumn<T> {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  minWidth?: string;
}

interface SummaryDenseTableProps<T> {
  data: T[];
  columns: SummaryDenseColumn<T>[];
  rowKey: (row: T, index: number) => string;
  itemsPerPage?: number;
  initialSort?: {
    columnId: string;
    direction: SortDirection;
  };
  emptyMessage?: string;
  rowClassName?: (row: T, index: number) => string | undefined;
}

function alignClasses(align: SummaryDenseColumn<unknown>['align']) {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

export function SummaryDenseTable<T>({
  data,
  columns,
  rowKey,
  itemsPerPage = 8,
  initialSort,
  emptyMessage = 'No records available.',
  rowClassName,
}: SummaryDenseTableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(initialSort?.columnId ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSort?.direction ?? 'desc');

  const sortedData = useMemo(() => {
    if (!sortColumn) {
      return data;
    }

    const column = columns.find((item) => item.id === sortColumn);
    if (!column?.sortValue) {
      return data;
    }

    return [...data].sort((left, right) => {
      const leftValue = column.sortValue?.(left);
      const rightValue = column.sortValue?.(right);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      const normalizedLeft = String(leftValue ?? '').toLowerCase();
      const normalizedRight = String(rightValue ?? '').toLowerCase();
      return sortDirection === 'asc'
        ? normalizedLeft.localeCompare(normalizedRight)
        : normalizedRight.localeCompare(normalizedLeft);
    });
  }, [columns, data, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedRows = sortedData.slice(safePage * itemsPerPage, safePage * itemsPerPage + itemsPerPage);
  const startIndex = sortedData.length === 0 ? 0 : safePage * itemsPerPage + 1;
  const endIndex = Math.min(sortedData.length, safePage * itemsPerPage + paginatedRows.length);

  const handleSort = (column: SummaryDenseColumn<T>) => {
    if (!column.sortValue) {
      return;
    }

    if (sortColumn === column.id) {
      setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'));
      return;
    }

    setSortColumn(column.id);
    setSortDirection('desc');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-[oklch(0.9_0.01_90_/_0.7)] bg-white/50">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-[var(--surface-1)]/95 backdrop-blur-xl">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    'border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-1)]/95 px-4 py-3 text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]',
                    alignClasses(column.align),
                    column.sortValue ? 'cursor-pointer select-none transition-colors hover:text-[var(--brand-emerald-700)]' : '',
                    column.headerClassName
                  )}
                  style={column.minWidth ? { minWidth: column.minWidth } : undefined}
                  onClick={() => handleSort(column)}
                >
                  <div className={cn('flex items-center gap-1', column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-start')}>
                    <span>{column.header}</span>
                    {sortColumn === column.id ? <span>{sortDirection === 'desc' ? '▼' : '▲'}</span> : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm font-medium text-[var(--text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  className={cn(
                    'transition-colors hover:bg-[var(--surface-2)]/80',
                    rowClassName?.(row, index)
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        index !== paginatedRows.length - 1
                          ? 'border-b border-[oklch(0.9_0.01_90_/_0.55)]'
                          : '',
                        'px-4 py-3 align-top text-[0.82rem] text-[var(--text-primary)]',
                        alignClasses(column.align),
                        column.className
                      )}
                      style={column.minWidth ? { minWidth: column.minWidth } : undefined}
                    >
                      {column.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-0)]/90 px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        <span>
          {startIndex}-{endIndex} of {sortedData.length}
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
