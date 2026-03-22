'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, FileText, LayoutList } from 'lucide-react';
import type { QueryResult } from '@/types/builder';
import { formatDisplayValue } from '@/lib/chart-utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DataTableWithPaginationProps {
  data: QueryResult;
  title: string;
  isLoading?: boolean;
  rowsPerPage?: number;
  columnClasses?: Record<string, string>;
  onRowClick?: (row: Record<string, unknown>, index: number) => void;
}

export function DataTableWithPagination({ data, title, isLoading, rowsPerPage = 50, columnClasses, onRowClick }: DataTableWithPaginationProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const pageSize = rowsPerPage;

  // Deduplication & Column filtering
  const uniqueColumns = useMemo(() => {
    const unique = Array.from(new Set(data.columns));
    return unique.filter(c => c !== 'id' && (c !== 'count' || !unique.includes('Count')));
  }, [data.columns]);

  const rows = data.rows as Record<string, unknown>[];

  // Filter and sort
  const filteredRows = useMemo(() => {
    let filtered = rows;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        uniqueColumns.some(col => 
          String(row[col]).toLowerCase().includes(term)
        )
      );
    }
    
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        const aIsTotal = Object.values(a).some(v => String(v).toLowerCase().includes('total'));
        const bIsTotal = Object.values(b).some(v => String(v).toLowerCase().includes('total'));
        if (aIsTotal) return 1;
        if (bIsTotal) return -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }
    
    return filtered;
  }, [rows, uniqueColumns, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const MathMaxPage = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(currentPage, MathMaxPage);
  
  const paginatedRows = filteredRows.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('desc');
    }
  };

  const exportCSV = () => {
    const headers = uniqueColumns.join(',');
    const csvRows = filteredRows.map(row => 
      uniqueColumns.map(col => {
        const val = row[col];
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') ? `"${str}"` : str;
      }).join(',')
    );
    
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatValue = (val: unknown, colName: string): string => {
    return formatDisplayValue(val, colName);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
      className="flex flex-col h-full bg-[var(--surface-1)] backdrop-blur-3xl rounded-3xl border border-[var(--surface-2)] shadow-spatial-md overflow-hidden relative group/fulltable isolate"
    >
      {/* Glow Ornament */}
      <div className="absolute inset-x-0 -top-24 h-48 bg-gradient-to-b from-[var(--brand-primary)]/10 to-transparent blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

      {/* Header */}
      <div className="relative z-10 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--surface-border)]/50 bg-[var(--surface-0)]/30 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-primary)]/5 flex items-center justify-center border border-[var(--brand-primary)]/20 shadow-inner-rim relative overflow-hidden group">
            <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
            <LayoutList size={18} className="text-[var(--brand-primary)] drop-shadow-md group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.15em] font-display">
              {title}
            </h3>
            <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest flex items-center gap-2 mt-1">
              <span>Syncing Archive</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-emerald-500)] shadow-[0_0_8px_var(--brand-emerald-500)] animate-pulse" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] group-focus-within/search:text-[var(--brand-primary)] transition-colors" />
            <input
              type="text"
              placeholder="QUERYS_SEARCH..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] bg-[var(--surface-2)]/50 border border-[var(--surface-border)] rounded-full focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/10 focus:border-[var(--brand-primary)]/50 w-full sm:w-56 transition-all shadow-inner placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)]"
            />
          </div>
          
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-5 py-2 text-[10px] font-black text-[var(--text-on-brand)] bg-[var(--text-primary)] rounded-full hover:bg-[var(--text-secondary)] transition-all shadow-lg active:scale-95 uppercase tracking-[0.15em]"
          >
            <FileText size={12} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto custom-scrollbar relative z-10 bg-[var(--surface-0)]/20">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[var(--surface-1)]/80 backdrop-blur-xl shadow-sm">
              <th className="px-6 py-5 border-b border-[var(--surface-border)] text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] text-center w-16 bg-transparent">idx</th>
              {uniqueColumns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className={`px-6 py-5 border-b border-[var(--surface-border)] text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] cursor-pointer hover:text-[var(--brand-primary)] transition-colors select-none group/th text-left bg-transparent ${columnClasses?.[col] || ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.replace(/_/g, ' ')}</span>
                    {sortColumn === col ? (
                      <span className="text-[var(--brand-primary)]">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    ) : (
                      <span className="opacity-0 group-hover/th:opacity-100 text-[var(--text-tertiary)] transition-opacity">▼</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]/50">
            {isLoading ? (
              <tr>
                <td colSpan={uniqueColumns.length + 1} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-[var(--brand-primary)]/20 blur-2xl rounded-full animate-pulse" />
                      <div className="relative w-12 h-12 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <span className="text-[10px] font-black text-[var(--text-primary)] tracking-[0.2em] uppercase italic">Streaming Records...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={uniqueColumns.length + 1} className="px-6 py-16 text-center text-[var(--text-tertiary)] text-[11px] font-medium italic">
                  Null result set.
                </td>
              </tr>
            ) : (
              <AnimatePresence mode="popLayout">
                {paginatedRows.map((row, idx) => {
                  const isGrandTotal = Object.values(row).some(v => String(v).toLowerCase().includes('grand total') || String(v).toLowerCase() === 'total');
                  const firstCol = uniqueColumns[0];
                  const prevRow = idx > 0 ? paginatedRows[idx - 1] : null;
                  const isRepeated = !searchTerm && !isGrandTotal && (!sortColumn || sortColumn === firstCol) && prevRow && String(row[firstCol]) === String(prevRow[firstCol]);

                  return (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.015, ease: [0.19, 1, 0.22, 1] }}
                      className={`
                        group/tr transition-colors duration-300
                        ${isGrandTotal ? 'bg-[var(--brand-primary)]/5 font-black text-[var(--text-primary)] sticky bottom-0 z-10 border-t border-[var(--brand-primary)]/20 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] backdrop-blur-2xl' : 'hover:bg-[var(--surface-2)]/40'}
                        ${onRowClick ? 'cursor-pointer' : ''}
                      `}
                      onClick={() => onRowClick?.(row, (safeCurrentPage - 1) * pageSize + idx)}
                    >
                      <td className={`px-6 py-4 text-[10px] font-bold text-center border-b border-transparent ${isRepeated && !isGrandTotal ? 'text-transparent' : 'text-[var(--text-tertiary)]'}`}>
                        {isGrandTotal ? '∑' : (safeCurrentPage - 1) * pageSize + idx + 1}
                      </td>
                      {uniqueColumns.map((col, cIdx) => {
                        const val = row[col];
                        const isNumber = typeof val === 'number';
                        const showValue = cIdx === 0 && isRepeated && !isGrandTotal ? false : true;

                        return (
                          <td
                            key={col}
                            className={`
                              px-6 py-4 border-b border-transparent text-[11px] 
                              ${cIdx === 0 && !isGrandTotal ? 'font-black text-[var(--text-primary)] whitespace-nowrap' : 'text-[var(--text-secondary)] font-medium'}
                              ${isNumber ? 'tabular-nums tracking-tight font-mono text-[10px]' : ''}
                              ${cIdx === 0 ? 'relative' : ''}
                              ${columnClasses?.[col] || ''}
                            `}
                          >
                            {(() => {
                              const low = col.toLowerCase();
                              const isEvidence = low.includes('evidence') || low.includes('link');
                              if (!isEvidence) {
                                return showValue ? formatValue(val, col) : '';
                              }
                              if (typeof val === 'string' && val.includes('<a href')) {
                                return <span dangerouslySetInnerHTML={{ __html: val }} />;
                              }
                              const looksUrl = (s: string) => /^https?:\/\//i.test(s);
                              let urls: string[] = [];
                              if (Array.isArray(val)) {
                                urls = (val as unknown[]).map(String).filter(looksUrl);
                              } else if (typeof val === 'string') {
                                const s = val.trim();
                                if (s.startsWith('[') && s.endsWith(']')) {
                                  try {
                                    const arr = JSON.parse(s);
                                    if (Array.isArray(arr)) urls = arr.map(String).filter(looksUrl);
                                  } catch {}
                                }
                                if (urls.length === 0) {
                                  urls = s.split(/[\s,;|\n]+/).filter(Boolean).filter(looksUrl);
                                }
                                if (urls.length === 0 && looksUrl(s)) urls = [s];
                              } else if (val && typeof val === 'object') {
                                const anyVal = val as Record<string, unknown>;
                                const maybe = anyVal['urls'] || anyVal['url'];
                                if (Array.isArray(maybe)) urls = maybe.map(String).filter(looksUrl);
                                else if (typeof maybe === 'string' && looksUrl(maybe)) urls = [maybe];
                              }
                              if (urls.length === 0 && low.includes('urls')) {
                                const alt = row['evidence_url'];
                                if (typeof alt === 'string' && looksUrl(alt)) urls = [alt];
                              }
                              urls = Array.from(new Set(urls));
                              if (urls.length === 0) {
                                return showValue ? formatValue(val, col) : '';
                              }
                              return (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {urls.map((u, i) => (
                                    <a
                                      key={`${u}-${i}`}
                                      href={u}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-full text-[10px] font-black uppercase hover:bg-[var(--brand-primary)] hover:text-white transition-all duration-300"
                                    >
                                      {urls.length > 1 ? `Evidence ${i + 1}` : 'Evidence'}
                                    </a>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                        );
                      })}
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="relative z-10 px-6 py-5 border-t border-[var(--surface-border)]/50 bg-[var(--surface-0)]/50 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em]">
           {filteredRows.length > 0
            ? `SYNCING ${((safeCurrentPage - 1) * pageSize + 1).toString().padStart(3, '0')} — ${Math.min(safeCurrentPage * pageSize, filteredRows.length).toString().padStart(3, '0')} / ${filteredRows.length.toString().padStart(3, '0')} RECORDS`
            : 'NULL SET'}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage === 1}
            className="px-4 py-2 text-[10px] font-black border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-2)] transition-all uppercase tracking-[0.15em] text-[var(--text-secondary)]"
          >
            Start
          </button>
          
          <div className="flex items-center gap-1 bg-[var(--surface-0)] px-4 py-2 rounded-full border border-[var(--surface-border)] shadow-inner-rim">
            <span className="text-[10px] font-black text-[var(--brand-primary)]">{safeCurrentPage}</span>
            <span className="text-[10px] font-black text-[var(--text-tertiary)] mx-1">/</span>
            <span className="text-[10px] font-black text-[var(--text-secondary)]">{MathMaxPage}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="p-2 border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-2)] transition-all text-[var(--text-secondary)]"
            >
              <ChevronLeft size={14} strokeWidth={3} />
            </button>
            <button
            onClick={() => setCurrentPage(p => Math.min(MathMaxPage, p + 1))}
            disabled={safeCurrentPage === MathMaxPage || filteredRows.length === 0}
            className="px-4 py-2 text-[10px] font-black border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-2)] transition-all uppercase tracking-[0.15em] text-[var(--text-secondary)]"
          >
            Next Phase
          </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(MathMaxPage, p + 1))}
              disabled={safeCurrentPage === MathMaxPage || filteredRows.length === 0}
              className="p-2 border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-2)] transition-all text-[var(--text-secondary)]"
            >
              <ChevronRight size={14} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
