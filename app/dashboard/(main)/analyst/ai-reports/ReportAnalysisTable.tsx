'use client';

import { useState, useMemo, Fragment, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Download, 
  Maximize2, 
  MoreHorizontal, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  MapPin,
  Plane,
  FileText,
  Link as LinkIcon,
  BarChart2,
  PieChart as PieChartIcon,
  Sparkles,
  ChevronUp,
  Brain,
  Activity,
  Zap,
  Loader2,
  Database,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
// import { InvestigativeAIInsights } from '../chart-detail/InvestigativeAIInsights'; // Optional, maybe later

// --- Types ---
interface AIReport {
  id: string;
  title: string;
  airlines?: string;
  main_category?: string;
  status: string;
  severity?: string;
  created_at: string;
  description?: string;
  branch?: string;
  hub?: string;
  flight_number?: string;
  route?: string;
  [key: string]: any;
}

interface ReportAnalysisTableProps {
  reports: AIReport[];
  title: string;
  className?: string;
  onAnalyze: (report: AIReport) => void;
  analysisResult: any; // The singleAnalysis object from page.tsx
  analyzing: boolean;
  selectedId: string;
}

const GREEN_PALETTE = ['#6b8e3d', '#7cb342', '#558b2f', '#aed581', '#33691e', '#9ccc65', '#689f38', '#c5e1a5', '#43a047', '#81c784'];

type SortDir = 'asc' | 'desc';

// Helper to determine badge color based on severity/category
const getSeverityStyle = (severity?: string) => {
  const s = severity?.toLowerCase() || '';
  if (s.includes('critical') || s.includes('kritis')) return 'bg-red-50 text-red-700 border-red-100 ring-red-500/10';
  if (s.includes('high') || s.includes('tinggi')) return 'bg-orange-50 text-orange-700 border-orange-100 ring-orange-500/10';
  if (s.includes('medium') || s.includes('sedang')) return 'bg-amber-50 text-amber-700 border-amber-100 ring-amber-500/10';
  if (s.includes('low') || s.includes('rendah')) return 'bg-green-50 text-green-700 border-green-100 ring-green-500/10';
  return 'bg-gray-50 text-gray-700 border-gray-100 ring-gray-500/10';
};

const getCategoryIcon = (category: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('pax') || cat.includes('passenger')) return <Activity size={12} />;
  if (cat.includes('bagasi') || cat.includes('baggage')) return <FileText size={12} />; // suitcase icon maybe?
  if (cat.includes('cargo')) return <Database size={12} />;
  return <FileText size={12} />;
};

const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode; className?: string; variant?: 'default' | 'outline' | 'secondary' | 'destructive' }) => {
  const variants = {
    default: 'bg-emerald-100 text-emerald-700',
    outline: 'border border-gray-200 text-gray-700',
    secondary: 'bg-gray-100 text-gray-700',
    destructive: 'bg-red-100 text-red-700'
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-medium", variants[variant], className)}>
      {children}
    </span>
  );
};

export function ReportAnalysisTable({ 
  reports, 
  title, 
  className = '', 
  onAnalyze,
  analysisResult,
  analyzing,
  selectedId
}: ReportAnalysisTableProps) {
  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  
  // Hydration sync
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sync expanded row with selectedId from parent if it changes externally
  useEffect(() => {
    if (selectedId && selectedId !== expandedRowId) {
      setExpandedRowId(selectedId);
    }
  }, [selectedId]);

  // ─── 1. COLUMN DEFINITION ───────────────────────────────────────────────────
  // Hardcoded columns for AI Reports
  const columns = [
    { key: 'created_at', label: 'Tanggal', width: 'w-28' },
    { key: 'flight_number', label: 'Penerbangan', width: 'w-24' },
    // { key: 'route', label: 'Rute', width: 'w-24' },
    { key: 'airlines', label: 'Maskapai', width: 'w-32' },
    { key: 'main_category', label: 'Kategori', width: 'w-32' },
    { key: 'description', label: 'Deskripsi', width: 'w-64' },
    // { key: 'status', label: 'Status', width: 'w-24' },
  ];

  // ─── 2. DATA PROCESSING ─────────────────────────────────────────────────────
  const filteredReports = useMemo(() => {
    let rows = reports || [];
    
    // Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      rows = rows.filter(row => 
        Object.values(row).some(val => String(val).toLowerCase().includes(lowerTerm))
      );
    }
    
    // Sort
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        return sortDir === 'asc' 
          ? String(valA || '').localeCompare(String(valB || ''))
          : String(valB || '').localeCompare(String(valA || ''));
      });
    }

    return rows;
  }, [reports, searchTerm, sortCol, sortDir]);

  // ─── HANDLERS ───────────────────────────────────────────────────────────────
  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const toggleRow = (id: string, report: AIReport) => {
    if (expandedRowId === id) {
      setExpandedRowId(null);
    } else {
      setExpandedRowId(id);
      // Automatically trigger analysis if not already analyzed or if it's a different report
       if (id !== selectedId) {
         onAnalyze(report);
       }
    }
  };

  const handleExport = () => {
    const headers = columns.map(c => c.key).join(',');
    const csvContent = filteredReports.map(row => 
      columns.map(c => `"${String(row[c.key] || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([`${headers}\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_reports_export.csv`;
    a.click();
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* ─── 1. HEADER STRIP ─────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2">
           <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
             <Search size={16} className="text-blue-500" />
             {title} ({filteredReports.length})
           </h3>
        </div>

        <div className="flex items-center gap-2">
           {/* Search */}
           <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari laporan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-40 md:w-64 transition-all"
            />
          </div>

          <button 
            onClick={handleExport}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
            title="Export CSV"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* ─── 2. TABLE BODY ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto custom-scrollbar relative min-h-[400px]">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm shadow-sm">
            <tr>
              <th className="px-3 py-3 text-left w-10" />
              <th className="px-2 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider w-10 text-center">#</th>
              {columns.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} className={`px-3 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none ${col.width} break-words`}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortCol === col.key && <span className="text-indigo-500">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
              ))}
              <th className="px-3 py-3 text-left w-24" />
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-50 bg-white">
            {filteredReports.length === 0 ? (
               <tr>
                 <td colSpan={10} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                   Tidak ada laporan yang cocok dengan pencarian.
                 </td>
               </tr>
            ) : (
              filteredReports.map((row, idx) => {
                const isExpanded = expandedRowId === row.id;
                
                return (
                  <Fragment key={row.id}>
                    <tr 
                      onClick={() => toggleRow(row.id, row)}
                      className={`
                        group transition-all duration-200 cursor-pointer
                        ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}
                      `}
                    >
                      <td className="px-3 py-3 text-center align-top">
                        <button className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'text-gray-300 group-hover:text-gray-500'}`}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="px-2 py-3 text-center text-xs font-mono text-gray-400 group-hover:text-gray-600 align-top">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 align-top">
                         {row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 align-top font-mono">
                         {row.flight_number || '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 align-top font-medium">
                         {row.airlines || '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 align-top">
                         {row.main_category || '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 align-top">
                        <div className="line-clamp-2 leading-relaxed break-words">
                          {row.description || (row as any).report || '-'}
                        </div>
                      </td>
                      
                      <td className="px-3 py-3 text-xs align-top text-right">
                         <span className="text-[10px] text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                           Analisis
                         </span>
                      </td>
                    </tr>

                    {/* ─── EXPANDED DRAWER ─────────────────────────────────── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr key={`${row.id}-expanded`}>
                          <td colSpan={100} className="p-0 border-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeInOut' }}
                              className="overflow-hidden bg-gray-50/50 box-border"
                            >
                              <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-gray-100 shadow-inner">
                                
                                {/* Left: Metadata Grid */}
                                <div className="lg:col-span-3 space-y-6 border-r border-gray-200/50 pr-6">
                                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                     <FileText size={14} /> Detail Laporan
                                  </h4>
                                  <div className="flex flex-col gap-4">
                                    <div className="w-full">
                                       <div className="text-[10px] uppercase text-gray-400 font-semibold mb-0.5">ID Laporan</div>
                                       <div className="text-xs font-mono text-gray-600 break-words">{row.id}</div>
                                    </div>
                                    <div className="w-full">
                                       <div className="text-[10px] uppercase text-gray-400 font-semibold mb-0.5">Branch / Hub</div>
                                       <div className="text-sm font-medium text-gray-800">{row.branch || '-'} / {row.hub || '-'}</div>
                                    </div>
                                    <div className="w-full">
                                       <div className="text-[10px] uppercase text-gray-400 font-semibold mb-0.5">Rute</div>
                                       <div className="text-sm font-medium text-gray-800">{row.route || '-'}</div>
                                    </div>
                                    <div className="w-full">
                                       <div className="text-[10px] uppercase text-gray-400 font-semibold mb-0.5">Status</div>
                                       <div className="text-sm font-medium text-gray-800">{row.status || '-'}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Analysis Content */}
                                <div className="lg:col-span-9 space-y-6 pl-2">
                                  {/* Full Report Text */}
                                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                      <FileText size={14} /> Isi Laporan Lengkap
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                      {row.description || (row as any).report || 'Tidak ada deskripsi.'}
                                    </p>
                                  </div>

                                  {/* AI Analysis Section */}
                                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-100 relative overflow-hidden">
                                     <div className="flex items-center justify-between mb-4 relative z-10">
                                       <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                                         <Brain size={16} /> Analisis AI
                                       </h4>
                                       {analyzing && selectedId === row.id && (
                                         <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium">
                                            <Loader2 size={14} className="animate-spin" />
                                            Sedang menganalisis...
                                         </div>
                                       )}
                                     </div>
                                     
                                     {/* Background Decor */}
                                     <Sparkles className="absolute -top-4 -right-4 w-32 h-32 text-indigo-200/20 rotate-12" />

                                     {/* Analysis Content */}
                                     {selectedId === row.id && analysisResult ? (
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                          {/* Prediction */}
                                          <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-indigo-100 shadow-sm">
                                             <div className="text-xs text-gray-500 mb-1">Prediksi Waktu Penyelesaian</div>
                                             <div className="flex items-baseline gap-2">
                                               <span className="text-2xl font-bold text-indigo-600">
                                                 {analysisResult.analysis.regression?.predictions?.[0]?.predictedDays?.toFixed(1) || '-'}
                                               </span>
                                               <span className="text-sm text-gray-600">hari</span>
                                             </div>
                                             <div className="mt-2 text-[10px] text-gray-400">
                                               Confidence: {analysisResult.analysis.regression?.predictions?.[0]?.confidenceInterval ? 
                                                 `±${(analysisResult.analysis.regression.predictions[0].confidenceInterval[1] - analysisResult.analysis.regression.predictions[0].predictedDays).toFixed(1)} days` : 
                                                 'N/A'}
                                             </div>
                                          </div>

                                          {/* Severity & Sentiment */}
                                          <div className="space-y-3">
                                             <div className="bg-white/80 backdrop-blur rounded-lg p-3 border border-indigo-100 shadow-sm flex items-center justify-between">
                                                <span className="text-xs text-gray-500">Tingkat Keparahan</span>
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityStyle(analysisResult.analysis.nlp?.classifications?.[0]?.severity)}`}>
                                                   {analysisResult.analysis.nlp?.classifications?.[0]?.severity || 'Unknown'}
                                                </span>
                                             </div>
                                             <div className="bg-white/80 backdrop-blur rounded-lg p-3 border border-indigo-100 shadow-sm flex items-center justify-between">
                                                <span className="text-xs text-gray-500">Sentimen</span>
                                                <span className="text-xs font-medium text-gray-700">
                                                   {analysisResult.analysis.nlp?.sentiment?.[0]?.sentiment || '-'}
                                                </span>
                                             </div>
                                          </div>
                                          
                                          {/* AI Summary/Logic */}
                                          <div className="md:col-span-2 bg-white/80 backdrop-blur rounded-lg p-4 border border-indigo-100 shadow-sm">
                                             <div className="text-xs text-gray-500 mb-2">Ringkasan Eksekutif</div>
                                             <p className="text-sm text-gray-700 leading-relaxed">
                                               {(() => {
                                                  const summary = analysisResult.analysis.nlp?.summaries?.[0]?.executiveSummary;
                                                  const reasoning = analysisResult.analysis.nlp?.classifications?.[0]?.reasoning;
                                                  
                                                  if (summary && !summary.startsWith('Unknown')) return summary;
                                                  if (reasoning && !reasoning.startsWith('Unknown')) return reasoning;
                                                  return 'Tidak ada ringkasan tersedia.';
                                                })()}
                                             </p>
                                          </div>

                                           {/* NEW: Similar Reports */}
                                           {analysisResult.similarReports && analysisResult.similarReports.results?.length > 0 && (
                                             <div className="md:col-span-2 space-y-3">
                                               <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 mt-4">
                                                 <LinkIcon size={14} className="text-blue-500" /> Laporan Serupa
                                               </h4>
                                               <div className="space-y-2">
                                                 {analysisResult.similarReports.results.map((sim: any, i: number) => (
                                                   <div key={i} className="p-3 bg-white border border-gray-100 rounded-lg text-xs flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                     <div className="flex-1 min-w-0 pr-4">
                                                       <div className="font-medium text-gray-900 truncate">{(sim.metadata?.airlines || 'Unknown') + ' - ' + (sim.metadata?.main_category || 'Incident')}</div>
                                                       <div className="text-gray-500 truncate">{sim.text}</div>
                                                     </div>
                                                     <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                                                          {(sim.score * 100).toFixed(0)}% Match
                                                        </span>
                                                        <button 
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Logic to switch to this similar report or show detail could go here
                                                          }}
                                                          className="p-1 text-gray-400 hover:text-indigo-600"
                                                        >
                                                          <Maximize2 size={12} />
                                                        </button>
                                                     </div>
                                                   </div>
                                                 ))}
                                               </div>
                                             </div>
                                           )}

                                           {/* NEW: Root Cause Classification */}
                                           {analysisResult.classification && (
                                              <div className="md:col-span-2 bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 mt-4">
                                                 <div className="text-[10px] uppercase text-emerald-600 font-bold mb-2">Automated Root Cause Diagnosis</div>
                                                 <div className="flex flex-wrap gap-2 mb-3">
                                                    <Badge className="bg-emerald-100 text-emerald-800 border-none">
                                                       {analysisResult.classification.primary_category} ({(analysisResult.classification.confidence * 100).toFixed(0)}%)
                                                    </Badge>
                                                 </div>
                                                 <p className="text-[11px] text-emerald-700/80 leading-relaxed italic">
                                                    "{analysisResult.classification.description}"
                                                 </p>
                                              </div>
                                           )}

                                        </div>
                                     ) : (
                                       <div className="text-center py-8 relative z-10">
                                         {analyzing && selectedId === row.id ? (
                                           <div className="text-indigo-400 text-sm">Sedang memproses...</div>
                                         ) : (
                                           <div className="flex flex-col items-center">
                                             <p className="text-gray-500 text-sm mb-4">Laporan ini belum dianalisis.</p>
                                             <button 
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 onAnalyze(row);
                                               }}
                                               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2"
                                             >
                                               <Zap size={14} /> Analisis Sekarang
                                             </button>
                                           </div>
                                         )}
                                       </div>
                                     )}
                                  </div>

                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
