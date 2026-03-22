'use client';

// --- Imports --- (Existing imports slightly expanded)
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FileText, Search, Filter, ChevronDown,
  MapPin, AlertTriangle, Building2, Plane,
  LayoutDashboard, Clock, CheckCircle2,
  Calendar, RefreshCw, Loader2, Plus, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STATUS_CONFIG, SEVERITY_CONFIG, ReportStatus } from '@/lib/constants/report-status';
import { Report } from '@/types';
import { type TimePeriod } from '@/components/dashboard/TimePeriodFilter';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { useReportsData } from '@/hooks/use-reports-cache';
import { ReportsList } from '@/components/dashboard/analyst/ReportsList';
import { cn } from '@/lib/utils';
import { AISummaryKPICards } from '@/components/dashboard/ai-summary';

export default function AnalystReportsPage() {
  // --- Data Fetching ---
  const { reports: allReports, isLoading: loading, refresh } = useReportsData('/api/admin/reports');
  
  // --- State ---
  const [stationFilter, setStationFilter] = useState('all');
  const [filter, setFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [stations, setStations] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [period, setPeriod] = useState<TimePeriod>(null);
  const [refreshing, setRefreshing] = useState(false);

  // --- Effects ---
  const fetchStations = useCallback(async () => {
    try {
      const res = await fetch('/api/master-data?type=stations');
      const data = await res.json();
      if (Array.isArray(data)) setStations(data);
      else if (data.stations) setStations(data.stations);
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  }, []);

  useEffect(() => { fetchStations(); }, [fetchStations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        await fetch('/api/reports/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        await fetch('/api/admin/sync-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        await refresh();
      } catch {}
    };
    run();
    return () => controller.abort();
  }, [refresh]);

  // --- Filtering Logic ---
  const filteredReports = useMemo(() => {
    return allReports.filter(report => {
      if (filter !== 'all' && report.status !== filter) return false;
      if (stationFilter !== 'all' && report.station_id !== stationFilter) return false;
      if (severityFilter !== 'all' && report.severity !== severityFilter) return false;

      const matchesSearch = (report.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (report.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (report.location || '').toLowerCase().includes(search.toLowerCase()) ||
        (report.users?.full_name || report.reporter_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (report.stations?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        report.id.toLowerCase().includes(search.toLowerCase()) ||
        (report.reference_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (report.flight_number || '').toLowerCase().includes(search.toLowerCase());
      
      return matchesSearch;
    });
  }, [allReports, filter, stationFilter, severityFilter, search]);

  const stats = useMemo(() => ({
    total: filteredReports.length,
    pending: filteredReports.filter(r => r.status === 'OPEN').length,
    resolved: filteredReports.filter(r => r.status === 'CLOSED').length
  }), [filteredReports]);

  const handleUpdateStatus = async (reportId: string, status: string, notes?: string, evidenceUrl?: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, action_taken: notes, evidence_urls: evidenceUrl ? [evidenceUrl] : undefined })
      });
      if (!res.ok) throw new Error('Failed to update status');
      await handleRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Gagal mengupdate status laporan');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-0)] pb-24 overflow-x-hidden">
      {/* 1. Kinetic Hero Header */}
      <div className="relative overflow-hidden rounded-b-[48px] px-4 md:px-8 pt-12 pb-24 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400">
        {/* Abstract Background Noise & Depth */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-teal-200 rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 space-y-8 max-w-[1700px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 text-emerald-100 font-bold uppercase tracking-[0.2em] text-[10px]"
              >
                <Sparkles size={14} />
                Analyst Dashboard
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter"
              >
                Kelola Laporan
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-emerald-50/70 font-medium md:text-lg max-w-xl"
              >
                Monitoring dan validasi laporan Divisi Analyst secara real-time
              </motion.p>
            </div>

            {/* Quick Stats Grid */}
            <div className="flex flex-wrap gap-4">
               {[
                 { label: 'Total', value: stats.total, color: 'emerald' },
                 { label: 'Pending', value: stats.pending, color: 'amber' },
                 { label: 'Selesai', value: stats.resolved, color: 'teal' }
               ].map((stat, idx) => (
                 <motion.div
                   key={stat.label}
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.3 + idx * 0.1 }}
                   className="bg-white/10 backdrop-blur-2xl border border-white/20 p-4 rounded-[24px] min-w-[124px] shadow-xl shadow-black/5"
                 >
                    <p className="text-[10px] uppercase font-black tracking-widest text-emerald-100/60 mb-1">{stat.label}</p>
                    <p className="text-2xl font-display font-black text-white">{stat.value.toLocaleString()}</p>
                 </motion.div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Unified Filter Bar - Integrated & Elevated */}
      <div className="max-w-[1700px] mx-auto px-4 md:px-8 -mt-12 relative z-20">
        <div className="bg-white p-4 rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] border border-gray-100 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
             {/* Search */}
             <div className="relative flex-1 w-full group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                <input
                  type="text"
                  placeholder="Cari laporan, nomor kasus, lokasi, pelapor, atau station..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-14 pl-14 pr-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-700 outline-none"
                />
             </div>

             <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Station Filter */}
                <div className="relative flex-1 min-w-[180px]">
                  <select 
                    value={stationFilter} 
                    onChange={(e) => setStationFilter(e.target.value)}
                    className="w-full h-14 pl-12 pr-10 appearance-none bg-gray-50 rounded-2xl border border-transparent hover:bg-gray-100 transition-colors outline-none font-bold text-xs uppercase tracking-widest text-slate-600"
                  >
                    <option value="all">Semua Station</option>
                    {stations.map((s) => (<option key={s.id} value={s.id}>{s.code} - {s.name}</option>))}
                  </select>
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>

                {/* Status Filter */}
                <div className="relative flex-1 min-w-[160px]">
                  <select 
                    value={filter} 
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full h-14 pl-12 pr-10 appearance-none bg-gray-50 rounded-2xl border border-transparent hover:bg-gray-100 transition-colors outline-none font-bold text-xs uppercase tracking-widest text-slate-600"
                  >
                    <option value="all">Semua Status</option>
                    <option value="OPEN">Open</option>
                    <option value="ON PROGRESS">Dalam Proses</option>
                    <option value="CLOSED">Selesai</option>
                  </select>
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500" />
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>

                <div className="flex gap-2">
                   <button 
                     onClick={handleRefresh}
                     disabled={refreshing}
                     className="h-14 w-14 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 text-slate-500 transition-all active:scale-95"
                   >
                     <RefreshCw size={20} className={cn(refreshing && "animate-spin")} />
                   </button>
                   <button className="h-14 px-6 sm:inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-emerald-500)] text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">
                      <Plus size={18} />
                      <span className="hidden sm:inline">Laporan</span>
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* 2.5. AI Summary KPI Cards */}
      <div className="max-w-[1700px] mx-auto px-4 md:px-8 mt-6">
        <AISummaryKPICards showHeader={true} hideActionIntelligence={true} />
      </div>

      {/* 3. Main Content: Kinetic Reports List */}
      <main className="max-w-[1700px] mx-auto px-4 md:px-8 mt-12">
        <div className="mb-6 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Live Reports Stream</h2>
           </div>
           <p className="text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-3)] px-3 py-1 rounded-full uppercase tracking-tighter">
             Showing {filteredReports.length} results
           </p>
        </div>

        <ReportsList 
          reports={filteredReports} 
          onReportClick={setSelectedReport}
          loading={loading}
        />
      </main>

      {/* 4. Modals */}
      <AnimatePresence>
        {selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            userRole="ANALYST"
            onUpdateStatus={handleUpdateStatus}
            onRefresh={handleRefresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
// Complexity: Time O(n) | Space O(m)
// Design: PRISM PROTOCOL V3 - High Contrast / High Motion
