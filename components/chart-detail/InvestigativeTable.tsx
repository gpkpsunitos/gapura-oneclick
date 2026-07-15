'use client';

import { useState, useMemo, Fragment } from 'react';
import { 
  ChevronRight, 
  Search, 
  Download, 
  Maximize2, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  Link as LinkIcon,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QueryResult } from '@/types/builder';
import { formatDisplayValue } from '@/lib/chart-utils';
import { sanitizeTableCell } from '@/lib/security/sanitize';

interface InvestigativeTableProps {
  data: QueryResult;
  title: string;
  className?: string;
  onViewDetail?: () => void;
  rowsPerPage?: number;
  maxRows?: number;
  isLoading?: boolean;
}

type SortDir = 'asc' | 'desc';

const getCategoryBadgeStyle = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('complaint') || cat.includes('komplain')) {
    return 'bg-[oklch(0.98_0.02_25)] border-[oklch(0.9_0.05_25)] text-[oklch(0.45_0.2_25)] shadow-[0_4px_12px_oklch(0.6_0.22_25/0.05)]';
  }
  if (cat.includes('irregularity') || cat.includes('irreg')) {
    return 'bg-[oklch(0.98_0.04_45)] border-[oklch(0.9_0.08_45)] text-[oklch(0.55_0.2_45)] shadow-[0_4px_12px_oklch(0.65_0.25_45/0.05)]';
  }
  if (cat.includes('compliment') || cat.includes('apresiasi')) {
    return 'bg-[var(--surface-1)] border-[oklch(0.9_0.02_160)] text-[var(--brand-emerald-700)] shadow-[0_4px_12px_oklch(0.65_0.18_160/0.05)]';
  }
  return 'bg-[var(--surface-2)]/50 border-[var(--surface-border)] text-[var(--text-secondary)] shadow-sm';
};

const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('complaint')) return <AlertCircle size={12} />;
  if (cat.includes('irregularity')) return <HelpCircle size={12} />;
  if (cat.includes('compliment')) return <CheckCircle2 size={12} />;
  return <FileText size={12} />;
};

  const parseEvidenceLinks = (val: unknown): string[] => {
    if (!val) return [];
    const str = String(val).trim();
    if (!str) return [];

    const urlRegex = /(https?:\/\/[^\s"',<>]+)/g;
    const matches = str.match(urlRegex);
    if (!matches) return [];

    return Array.from(new Set(matches));
  };

export function InvestigativeTable({
  data,
  title,
  className = '',
  onViewDetail,
  rowsPerPage = 10,
  maxRows = 50,
  isLoading = false,
}: InvestigativeTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const allColumns = data.columns;

  const categoryCol = allColumns.find(c => [
    'category', 
    'kategori', 
    'main_category', 
    'report_category', 
    'kategori_laporan', 
    'irregularity_complain_category',
    'complaint_category',
    'jenis_laporan',
    'category_detail',
    'report category'
  ].includes(c.toLowerCase()));
  const dateCol = allColumns.find(c => ['date', 'tanggal', 'created_at', 'flight_date'].includes(c.toLowerCase()));
  const reportCol = allColumns.find(c => ['report', 'laporan', 'description', 'remark', 'remarks', 'short_report'].includes(c.toLowerCase()));
  const rootCauseCol = allColumns.find(c => ['root_cause', 'root cause', 'root caused', 'akar_masalah', 'penyebab'].includes(c.toLowerCase()));
  const actionTakenCol = allColumns.find(c => ['action_taken', 'action taken', 'tindakan', 'action', 'corrective_action'].includes(c.toLowerCase()));
  const preventiveActionCol = allColumns.find(c => ['preventive_action', 'preventive action', 'pencegahan', 'preventif'].includes(c.toLowerCase()));
  const evidenceCol = allColumns.find(c => {
    const l = c.toLowerCase();
    return l.includes('evidence') || l === 'link' || l === 'url' || l.includes('evidence_link');
  });

  const primaryColumns = useMemo(() => {
    return allColumns.filter(c => {
      const lower = c.toLowerCase();

      return !['id', 'count', 'description', 'detail', 'full_report', 'url', 'jumlah', 'total'].includes(lower) && !lower.includes('count');
    });
  }, [allColumns]);

  const prioritizedRows = useMemo(() => {
    const rows = data.rows as Record<string, unknown>[];
    if (rows.length === 0) return rows;

    const isNonEmpty = (value: unknown) => {
      const text = String(value ?? '').trim();
      return text.length > 0 && text !== '-';
    };

    const prioritized = rows.filter((row) => {
      const categoryValue = categoryCol ? String(row[categoryCol] ?? '').toLowerCase() : '';
      const isCriticalCategory = categoryValue.includes('irregularity') || categoryValue.includes('irreg') || categoryValue.includes('complaint');
      const hasInvestigativeContext = [rootCauseCol, actionTakenCol, evidenceCol]
        .filter((col): col is string => Boolean(col))
        .some((col) => isNonEmpty(row[col]));

      return isCriticalCategory || hasInvestigativeContext;
    });

    const candidateRows = prioritized.length > 0 ? prioritized : rows;
    const sortedRows = [...candidateRows];

    if (dateCol) {
      sortedRows.sort((a, b) => {
        const dateA = new Date(String(a[dateCol] ?? '')).getTime();
        const dateB = new Date(String(b[dateCol] ?? '')).getTime();
        const safeA = Number.isNaN(dateA) ? 0 : dateA;
        const safeB = Number.isNaN(dateB) ? 0 : dateB;
        return safeB - safeA;
      });
    }

    return sortedRows.slice(0, maxRows);
  }, [data.rows, categoryCol, rootCauseCol, actionTakenCol, evidenceCol, dateCol, maxRows]);

  const filteredData = useMemo(() => {
    let rows = prioritizedRows as Record<string, unknown>[];

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      rows = rows.filter(row => 
        allColumns.some(col => String(row[col]).toLowerCase().includes(lowerTerm))
      );
    }

    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        return sortDir === 'asc' 
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [prioritizedRows, allColumns, searchTerm, sortCol, sortDir]);

  const stats = useMemo(() => {
    const metricCol = allColumns.find(c => ['count', 'jumlah', 'total', 'record_count', 'frequency'].includes(c.toLowerCase()));

    const sumMetric = (items: Record<string, unknown>[]) => {
      if (!metricCol) return items.length;
      return items.reduce((sum, item) => sum + (Number(item[metricCol]) || 0), 0);
    };

    const total = sumMetric(filteredData);
    const complaints = categoryCol ? sumMetric(filteredData.filter(r => String(r[categoryCol]).toLowerCase().includes('complaint'))) : 0;
    const irregularities = categoryCol ? sumMetric(filteredData.filter(r => String(r[categoryCol]).toLowerCase().includes('irregularity'))) : 0;
    const compliments = categoryCol ? sumMetric(filteredData.filter(r => String(r[categoryCol]).toLowerCase().includes('compliment'))) : 0;

    return { total, complaints, irregularities, compliments };
  }, [filteredData, categoryCol, allColumns]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, safeCurrentPage, rowsPerPage]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setCurrentPage(1);
    setExpandedRowId(null);
  };

  const toggleRow = (idx: number) => {
    setExpandedRowId(curr => curr === idx ? null : idx);
  };

  const handleExport = () => {

    const headers = allColumns.join(',');
    const csvContent = filteredData.map(row => 
      allColumns.map(c => `"${String(row[c] || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([`${headers}\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_export.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
      className={`sr-scope sr-table-card flex h-full min-h-0 min-w-0 flex-col ${className}`}
    >
      {}
      <div className="sr-table-caption">
        <div className="sr-table-caption-title min-w-0">
          <span className="h-6 w-1 bg-[color:var(--sr-gold)]" aria-hidden="true" />
          <div>
            <h3 className="truncate text-[15px] font-bold leading-snug tracking-[-0.02em] text-[color:var(--sr-text)]">
              {title}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           {}
           <div className="flex flex-wrap items-center gap-2">
             {stats.complaints > 0 && (
               <div className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--sr-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--sr-accent-dark)]">
                 <AlertCircle size={12} strokeWidth={2.5} /> {stats.complaints} Cases
               </div>
             )}
             {stats.irregularities > 0 && (
               <div className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--sr-gold-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--sr-gold-strong)]">
                 <HelpCircle size={12} strokeWidth={2.5} /> {stats.irregularities} Events
               </div>
             )}
             {stats.compliments > 0 && (
               <div className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--sr-sunken)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--sr-text-2)]">
                 <CheckCircle2 size={12} strokeWidth={2.5} /> {stats.compliments} Wins
               </div>
             )}
           </div>

           {}
           <div className="flex items-center gap-2 sm:ml-4">
            <div className="relative group/search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] group-focus-within/search:text-[var(--brand-primary)] transition-colors" />
              <input
                type="text"
                placeholder="SEARCH..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                  setExpandedRowId(null);
                }}
                className="w-full rounded-md border border-[color:var(--sr-border)] bg-[color:var(--sr-raised)] py-1.5 pl-8 pr-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--sr-text)] placeholder:text-[color:var(--sr-text-3)] focus:border-[color:var(--sr-accent)] focus:outline-none sm:w-44"
              />
            </div>

            <button 
              onClick={handleExport}
              className="inline-flex h-8 w-8 items-center justify-center border border-[color:var(--sr-border)] bg-[color:var(--sr-raised)] text-[color:var(--sr-text)]" 
              title="Export CSV"
            >
              <Download size={14} strokeWidth={2.5} />
            </button>

            {onViewDetail && (
              <button
                onClick={onViewDetail}
                className="inline-flex h-8 items-center gap-2 rounded-md bg-[color:var(--sr-accent)] px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-white hover:bg-[color:var(--sr-accent-strong)]"
              >
                <Maximize2 size={12} strokeWidth={2.5} />
                <span>Expand</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {}
      <div
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto custom-scrollbar"
      >
        <table className="sr-table text-[12px]" style={{ width: '100%', minWidth: 1080 }}>
          <thead>
            <tr>
              <th className="w-12" />
              {categoryCol && (
                <th onClick={() => handleSort(categoryCol)} className="px-6 py-5 border-b border-[var(--surface-border)] text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] cursor-pointer hover:text-[var(--brand-primary)] transition-colors group select-none text-left bg-transparent">
                  <div className="flex items-center gap-2">
                    {categoryCol} 
                    {sortCol === categoryCol ? (
                      <span className="text-[var(--brand-primary)]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] transition-opacity">▼</span>
                    )}
                  </div>
                </th>
              )}
              {dateCol && (
                <th onClick={() => handleSort(dateCol)} className="px-6 py-5 border-b border-[var(--surface-border)] text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] cursor-pointer hover:text-[var(--brand-primary)] transition-colors group select-none text-left bg-transparent">
                  <div className="flex items-center gap-2">
                    {dateCol} 
                    {sortCol === dateCol ? (
                      <span className="text-[var(--brand-primary)]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] transition-opacity">▼</span>
                    )}
                  </div>
                </th>
              )}
              {primaryColumns.filter(c => c !== categoryCol && c !== dateCol && c !== reportCol).map(col => {
                const isWide = col === rootCauseCol || col === actionTakenCol || col === preventiveActionCol;
                return (
                  <th 
                    key={col} 
                    onClick={() => handleSort(col)} 
                    className={`px-6 py-5 border-b border-[var(--surface-border)] text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] cursor-pointer hover:text-[var(--brand-primary)] transition-colors group select-none text-left bg-transparent ${isWide ? 'min-w-[300px]' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {col.replace(/_/g, ' ')}
                      {sortCol === col ? (
                        <span className="text-[var(--brand-primary)]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] transition-opacity">▼</span>
                      )}
                    </div>
                  </th>
                );
              })}
              {reportCol && (
                <th className="px-6 py-5 border-b border-[var(--surface-border)] text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] text-left bg-transparent min-w-[300px]">
                  {reportCol.replace(/_/g, ' ')}
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--surface-border)]/50">
            {isLoading ? (
              <tr>
                <td colSpan={100} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-[var(--brand-primary)]/20 blur-2xl rounded-full animate-pulse" />
                      <div className="relative w-12 h-12 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <span className="text-[10px] font-black text-[var(--text-primary)] tracking-[0.2em] uppercase italic">SYPHONING DATA...</span>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={100} className="px-6 py-16 text-center text-[var(--text-tertiary)] text-[11px] font-medium italic">
                  Null result set in current query.
                </td>
              </tr>
            ) : (
              <>
                {paginatedData.map((row, idx) => {
                  const absoluteIdx = (safeCurrentPage - 1) * rowsPerPage + idx;
                  const isExpanded = expandedRowId === absoluteIdx;
                  const badges = categoryCol ? getCategoryBadgeStyle(String(row[categoryCol])) : '';
                  const Icon = categoryCol ? getCategoryIcon(String(row[categoryCol])) : <FileText size={12} />;

                  return (
                    <Fragment key={absoluteIdx}>
                      <tr
                        style={{ animationDelay: `${Math.min(idx * 15, 300)}ms` }}
                        onClick={() => toggleRow(absoluteIdx)}
                        className={`
                          tr-enter group/tr cursor-pointer transition-colors duration-300
                          ${isExpanded ? 'bg-[var(--surface-1)] sticky top-[69px] z-30 shadow-[0_8px_32px_rgba(0,0,0,0.05)] border-t border-[var(--brand-primary)]/20' : 'hover:bg-[var(--surface-2)]/40'}
                        `}
                      >
                        <td className="px-6 py-4 text-center w-12 border-b border-transparent">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-[var(--brand-primary)] text-[var(--text-on-brand)] rotate-90 shadow-md' : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] group-hover/tr:bg-[var(--surface-border)] group-hover/tr:text-[var(--text-primary)]'}`}>
                            <ChevronRight size={14} strokeWidth={3} />
                          </div>
                        </td>

                        {categoryCol && (
                          <td className="px-6 py-4 border-b border-transparent">
                             <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border shadow-sm ${badges}`}>
                               {Icon} {String(row[categoryCol]).toUpperCase()}
                             </span>
                          </td>
                        )}

                        {dateCol && (
                          <td className="px-6 py-4 text-[11px] font-black tracking-tight text-[var(--text-secondary)] font-mono border-b border-transparent">
                             <div className="flex items-center gap-2">
                               <Clock size={12} className="text-[var(--text-tertiary)]" />
                               {formatDisplayValue(row[dateCol], dateCol)}
                             </div>
                          </td>
                        )}

                        {primaryColumns.filter(c => c !== categoryCol && c !== dateCol && c !== reportCol).map(col => {
                          const isWide = col === rootCauseCol || col === actionTakenCol || col === preventiveActionCol;
                          const isEvidence = evidenceCol === col || col.toLowerCase().includes('evidence') || col.toLowerCase() === 'link';

                          if (isEvidence) {
                            const urls = parseEvidenceLinks(row[col]);
                            return (
                              <td key={col} className={`px-6 py-4 text-[11px] font-medium text-[var(--text-secondary)] border-b border-transparent ${isWide ? 'min-w-[300px]' : ''}`}>
                                {urls.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {urls.map((url, i) => (
                                      <a 
                                        key={i} 
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition-all duration-300 text-[9px] font-black uppercase tracking-wider shadow-sm"
                                      >
                                        <LinkIcon size={10} strokeWidth={2.5} /> Link {urls.length > 1 ? i + 1 : ''}
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[var(--text-tertiary)]">—</span>
                                )}
                              </td>
                            );
                          }

                          return (
                            <td key={col} className={`px-6 py-4 text-[11px] font-medium text-[var(--text-secondary)] border-b border-transparent ${isWide ? 'min-w-[300px]' : ''}`}>
                              <span dangerouslySetInnerHTML={{ __html: sanitizeTableCell(formatDisplayValue(row[col], col)) }} />
                            </td>
                          );
                        })}

                        {reportCol && (
                          <td className="px-6 py-4 text-[11px] text-[var(--text-secondary)] border-b border-transparent min-w-[300px]">
                            <div className="font-medium italic opacity-90 whitespace-normal leading-relaxed">
                              {String(row[reportCol])}
                            </div>
                          </td>
                        )}
                      </tr>

                      {}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr key={`${absoluteIdx}-expanded`} className="relative z-20">
                            <td colSpan={100} className="p-0 border-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                                className="overflow-hidden bg-[var(--text-primary)] text-[var(--surface-1)] border-y border-[var(--text-primary)] relative isolate group/drawer shadow-inner"
                              >
                                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[var(--brand-primary)]/5 to-transparent pointer-events-none" />

                                <div className="p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
                                  <div className="lg:col-span-4 space-y-8">
                                    <div className="space-y-4">
                                      <h4 className="text-[10px] font-black text-[var(--surface-400)] uppercase tracking-[0.2em] flex items-center gap-2">
                                         <FileText size={14} className="text-[var(--brand-primary)]" /> LOGISTICS METADATA
                                      </h4>
                                      <div className="grid grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner">
                                        {allColumns.map(col => {
                                          const lowerCol = col.toLowerCase();
                                          if (lowerCol === reportCol?.toLowerCase() || 
                                              lowerCol === rootCauseCol?.toLowerCase() || 
                                              lowerCol === actionTakenCol?.toLowerCase() || 
                                              lowerCol.includes('evidence') || 
                                              lowerCol.includes('link')) return null;
                                          return (
                                            <div key={col} className="space-y-1">
                                               <div className="text-[9px] font-black text-[var(--surface-500)] uppercase tracking-widest">{col.replace(/_/g, ' ')}</div>
                                               <div className="text-[11px] font-bold text-[var(--surface-50)]">{String(row[col] || '-')}</div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="lg:col-span-8 space-y-8">
                                    {reportCol && (
                                      <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-[0.2em] flex items-center gap-2">
                                          <FileText size={14} /> NARRATIVE RECORD
                                        </h4>
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner text-[13px] text-[var(--surface-100)] leading-relaxed italic font-medium">
                                          &quot;{String(row[reportCol])}&quot;
                                        </div>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {rootCauseCol && row[rootCauseCol] && (
                                         <div className="space-y-3">
                                          <h4 className="text-[10px] font-black text-[oklch(0.65_0.25_45)] uppercase tracking-[0.2em] flex items-center gap-2">
                                            <AlertCircle size={14} strokeWidth={2.5} /> ROOT CAUSE ANALYSIS
                                          </h4>
                                          <div className="bg-[oklch(0.98_0.04_45)]/10 p-6 rounded-2xl border border-[oklch(0.65_0.25_45)]/20 text-[11px] font-bold text-[oklch(0.9_0.1_45)] leading-relaxed ring-1 ring-[oklch(0.65_0.25_45)]/10 shadow-inner">
                                            {String(row[rootCauseCol])}
                                          </div>
                                        </div>
                                      )}

                                      {actionTakenCol && row[actionTakenCol] && (
                                         <div className="space-y-3">
                                          <h4 className="text-[10px] font-black text-[var(--brand-emerald-400)] uppercase tracking-[0.2em] flex items-center gap-2">
                                            <CheckCircle2 size={14} strokeWidth={2.5} /> REMEDIATION STEPS
                                          </h4>
                                          <div className="bg-[var(--brand-emerald-900)]/20 p-6 rounded-2xl border border-[var(--brand-emerald-500)]/20 text-[11px] font-bold text-[var(--brand-emerald-100)] leading-relaxed ring-1 ring-[var(--brand-emerald-500)]/10 shadow-inner">
                                            {String(row[actionTakenCol])}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {}
                                    {allColumns.filter(c => c.toLowerCase().includes('evidence') || c.toLowerCase().includes('link')).map(col => {
                                      const urls = parseEvidenceLinks(row[col]);
                                      if (urls.length === 0) return null;
                                      return (
                                        <div key={col} className="space-y-3">
                                          <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <LinkIcon size={14} strokeWidth={2.5} /> ATTACHED EVIDENCE
                                          </h4>
                                          <div className="flex flex-wrap gap-3">
                                            {urls.map((url, uIdx) => (
                                              <a key={uIdx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-400/20 text-blue-300 text-[10px] font-black rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-[0_4px_12px_rgba(59,130,246,0.2)] active:scale-95 uppercase tracking-widest">
                                                <Download size={12} strokeWidth={2.5} /> EVIDENCE {urls.length > 1 ? uIdx + 1 : ''}
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {}
      <div className="relative z-10 px-6 py-5 border-t border-[var(--surface-border)]/50 bg-[var(--surface-0)]/50 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em]">
          {filteredData.length > 0
            ? `SYNCING ${((safeCurrentPage - 1) * rowsPerPage + 1).toString().padStart(3, '0')} — ${Math.min(safeCurrentPage * rowsPerPage, filteredData.length).toString().padStart(3, '0')} / ${filteredData.length.toString().padStart(3, '0')} RECORDS`
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
            <span className="text-[10px] font-black text-[var(--text-secondary)]">{totalPages}</span>
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
            disabled={safeCurrentPage === totalPages}
            className="px-4 py-2 text-[10px] font-black border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-2)] transition-all uppercase tracking-[0.15em] text-[var(--text-secondary)]"
          >
            Next Phase
          </button>
        </div>
      </div>
    </motion.div>
  );
}
