'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { QueryResult } from '@/types/builder';
import { formatDisplayValue } from '@/lib/chart-utils';

interface CustomTableProps {
  result: QueryResult;
  title?: string;
}

function formatValue(val: unknown, colName: string): string {
  return formatDisplayValue(val, colName);
}

function isNumericColumn(rows: Record<string, unknown>[], col: string): boolean {
  let numericCount = 0;
  let totalCount = 0;
  
  for (const row of rows.slice(0, 10)) {
    const val = row[col];
    if (val !== null && val !== undefined) {
      totalCount++;
      if (typeof val === 'number' || (!isNaN(Number(val)) && String(val).trim() !== '')) {
        numericCount++;
      }
    }
  }
  
  return totalCount > 0 && numericCount / totalCount > 0.8;
}

export function CustomTable({ result, title }: CustomTableProps) {
  const columns = result.columns;
  const allRows = result.rows as Record<string, unknown>[];
  const totalRows = allRows.length;
  const lastUpdated = new Date().toLocaleTimeString('id-ID', { hour12: false });
  
  // Generate a stable report ID once when component mounts
  const [reportId] = useState(() => Math.random().toString(36).substring(7).toUpperCase());
  
  // Pagination
  const pageSize = 15; // Increased density
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalRows / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRows);
  const displayRows = allRows.slice(startIdx, endIdx);
  
  const numericCols = new Set<string>();
  columns.forEach(col => {
    if (isNumericColumn(allRows, col)) numericCols.add(col);
  });

  return (
    <div className="card-glass w-full h-full flex flex-col p-0 border-none shadow-none">
      {/* Header with Noise Grain */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/10"
           style={{ background: 'linear-gradient(to right, var(--brand-gradient-start), var(--brand-gradient-end))' }}>
        <h3 className="text-sm font-bold text-white tracking-tight uppercase flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {title || 'Intelligence Table'}
        </h3>
        <div className="text-[10px] text-white/70 font-medium">REPORT_ID: {reportId}</div>
      </div>
      
      {/* Table Container */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-white/50 backdrop-blur-md">
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap"
                  style={{ textAlign: numericCols.has(col) ? 'right' : 'left' }}
                >
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {displayRows.map((row, idx) => (
              <tr
                key={idx}
                className="group hover:bg-slate-50/50 transition-all duration-150"
              >
                <td className="px-4 py-2.5 text-[11px] font-mono text-slate-400 group-hover:text-slate-600 transition-colors">
                  {(startIdx + idx + 1).toString().padStart(2, '0')}
                </td>
                {columns.map(col => {
                  const val = row[col];
                  const isNum = numericCols.has(col);
                  const formatted = formatValue(val, col);
                  const isLong = formatted.length > 50;
                  
                  return (
                    <td
                      key={col}
                      className="px-4 py-2.5 text-[11px] text-slate-700 font-medium"
                      style={{ 
                        textAlign: isNum ? 'right' : 'left',
                        maxWidth: 320
                      }}
                    >
                      <span className={isLong ? 'truncate block opacity-90' : ''} title={formatted}>
                        {formatted}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer / Transparency Layer */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-tight flex items-center gap-1.5 leading-none">
            <div className="w-1 h-1 rounded-full bg-slate-300" />
            Source: Gapura Airside Real-Time Intelligence
          </div>
          <div className="text-[9px] text-slate-400 flex items-center gap-2">
            <span>Last Updated: {lastUpdated}</span>
            <span className="w-1 h-1 rounded-full bg-slate-200" />
            <span>Accuracy: Confidence High</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
            <span className="text-slate-900 font-bold">{startIdx + 1}-{endIdx}</span> of {totalRows} records
          </div>
          
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg shadow-sm">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md hover:bg-slate-50 disabled:opacity-20 transition-all active:scale-90"
            >
              <ChevronLeft size={14} className="text-slate-600" />
            </button>
            <div className="px-2 text-[10px] font-bold text-slate-900 border-x border-slate-100">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md hover:bg-slate-50 disabled:opacity-20 transition-all active:scale-90"
            >
              <ChevronRight size={14} className="text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


