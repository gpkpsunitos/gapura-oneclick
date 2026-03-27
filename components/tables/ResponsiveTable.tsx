'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useViewport } from '@/hooks/useViewport';
import { CardViewTable, TableColumn, TableAction, formatMobileDate, truncateMobile } from './CardViewTable';

interface ResponsiveTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  tableClassName?: string;
  cardClassName?: string;
  emptyMessage?: string;
  /**
   * Minimum width for table before switching to card view
   * @default 640 (sm breakpoint)
   */
  cardBreakpoint?: number;
}

/**
 * Responsive Table Component
 * Automatically switches between CardView (mobile) and DataTable (desktop)
 */
export function ResponsiveTable<T>({
  data,
  columns,
  actions,
  keyExtractor,
  onRowClick,
  className,
  tableClassName,
  cardClassName,
  emptyMessage = 'Tidak ada data',
  cardBreakpoint = 640,
}: ResponsiveTableProps<T>) {
  const { width } = useViewport();
  const useCardView = width < cardBreakpoint;

  if (useCardView) {
    return (
      <CardViewTable
        data={data}
        columns={columns}
        actions={actions}
        keyExtractor={keyExtractor}
        onRowClick={onRowClick}
        className={cn(cardClassName, className)}
        emptyMessage={emptyMessage}
      />
    );
  }

  // Desktop: Traditional table
  return (
    <DataTable
      data={data}
      columns={columns}
      actions={actions}
      keyExtractor={keyExtractor}
      onRowClick={onRowClick}
      className={cn(tableClassName, className)}
      emptyMessage={emptyMessage}
    />
  );
}

/**
 * Traditional Data Table for desktop
 */
interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
}

function DataTable<T>({
  data,
  columns,
  actions,
  keyExtractor,
  onRowClick,
  className,
  emptyMessage,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-200">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-gray-200', className)}>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-700 font-medium">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 whitespace-nowrap',
                  column.width && `w-[${column.width}]`
                )}
              >
                {column.header}
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="px-4 py-3 text-right">Aksi</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'transition-colors',
                onRowClick && 'cursor-pointer hover:bg-gray-50'
              )}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3">
                  {column.accessor(row)}
                </td>
              ))}
              {actions && actions.length > 0 && (
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick(row);
                        }}
                        className={cn(
                          'p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
                          action.variant === 'danger' && 'text-red-600 hover:bg-red-50',
                          action.variant === 'primary' && 'text-blue-600 hover:bg-blue-50',
                          (!action.variant || action.variant === 'ghost') && 'text-gray-600 hover:bg-gray-100'
                        )}
                        title={action.label}
                      >
                        {action.icon}
                      </button>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Re-export utilities
export { formatMobileDate, truncateMobile };
export type { TableColumn, TableAction };