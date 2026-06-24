'use client';

import { useState, useMemo } from 'react';
import {
  Search, Filter, ChevronDown,
  AlertTriangle, RefreshCw, LucideIcon, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { normalizeSeverityLevel, isHighSeverityLevel } from '@/lib/constants/report-status';
import { Report } from '@/types';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { type StatusUpdateDetails } from '@/components/dashboard/ReportDetailView';
import { useReportsData } from '@/hooks/use-reports-cache';
import { ReportsDetailTable } from '@/components/dashboard/analyst/ReportsDetailTable';
import { cn } from '@/lib/utils';

interface DivisionConfig {
  code: string;
  name: string;
  color: string;
  subtitle: string;
  icon: LucideIcon;
  userRole: string;
  basePath: string;
  apiEndpoint?: string;
  lockedBranch?: {
    value: string;
    label?: string;
  };
}

function resolveSeverityLevel(report: Report): string {
  const raw = (report as Record<string, unknown>)['severity_level']
    || (report as Record<string, unknown>)['Severity Level']
    || (report as Record<string, unknown>)['Severity_Level']
    || report.severity;
  return normalizeSeverityLevel(raw);
}

function matchesSeverityFilter(report: Report, filter: string): boolean {
  if (filter === 'all') return true;
  const severity = resolveSeverityLevel(report);

  if (filter === 'high') return isHighSeverityLevel(severity);
  if (filter === 'medium') return severity === 'MEDIUM';
  if (filter === 'low') return severity === 'LOW';

  return severity === filter;
}

export function DivisionReportsPage({ config }: { config: DivisionConfig }) {
  const endpoint = config.apiEndpoint ?? '/api/admin/reports';
  const { reports: allReports, isLoading: loading, refresh } = useReportsData(endpoint);
  const lockedBranch = config.lockedBranch?.value ? config.lockedBranch : null;

  const [filter, setFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filteredReports = useMemo(() => {
    const lowerSearch = search.toLowerCase();

    return allReports.filter(report => {
      if (filter !== 'all' && report.status !== filter) return false;
      if (!matchesSeverityFilter(report, severityFilter)) return false;

      if (!lowerSearch) return true;

      return (report.title || '').toLowerCase().includes(lowerSearch) ||
        (report.description || '').toLowerCase().includes(lowerSearch) ||
        (report.location || '').toLowerCase().includes(lowerSearch) ||
        (report.users?.full_name || report.reporter_name || '').toLowerCase().includes(lowerSearch) ||
        (report.stations?.name || '').toLowerCase().includes(lowerSearch) ||
        report.id.toLowerCase().includes(lowerSearch) ||
        (report.reference_number || '').toLowerCase().includes(lowerSearch) ||
        (report.flight_number || '').toLowerCase().includes(lowerSearch);
    });
  }, [allReports, filter, severityFilter, search]);

  const stats = useMemo(() => ({
    total: filteredReports.length,
    pending: filteredReports.filter(r => r.status === 'OPEN').length,
    resolved: filteredReports.filter(r => r.status === 'CLOSED').length
  }), [filteredReports]);

  const handleUpdateStatus = async (reportId: string, status: string, notes?: string, evidenceUrl?: string, details?: StatusUpdateDetails) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          action_taken: notes,
          evidence_urls: evidenceUrl ? [evidenceUrl] : undefined,
          kps_remarks: details?.finalRemarks,
          final_remarks: details?.finalRemarks,
          remarks_by: details?.remarksBy,
        })
      });
      if (!res.ok) throw new Error('Failed to update status');
      await handleRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Gagal mengupdate status laporan');
    }
  };

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-[var(--surface-0)] pb-24 overflow-x-hidden">
      {}
      <div
        className="relative overflow-hidden rounded-b-[48px] px-4 md:px-8 pt-12 pb-24"
        style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}cc, ${config.color}99)` }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-white/30 rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 space-y-8 max-w-[1700px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 text-white/70 font-bold uppercase tracking-[0.2em] text-[10px]"
              >
                <Icon size={14} />
                Divisi {config.code}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter"
              >
                {config.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-white/60 font-medium md:text-lg max-w-xl"
              >
                {config.subtitle}
              </motion.p>
            </div>

            {}
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'Total', value: stats.total },
                { label: 'Pending', value: stats.pending },
                { label: 'Selesai', value: stats.resolved }
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="bg-white/10 backdrop-blur-2xl border border-white/20 p-4 rounded-[24px] min-w-[124px] shadow-xl shadow-black/5"
                >
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/50 mb-1">{stat.label}</p>
                  <p className="text-2xl font-display font-black text-white">{stat.value.toLocaleString()}</p>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {}
      <div className="max-w-[1700px] mx-auto px-4 md:px-8 -mt-12 relative z-20">
        <div className="bg-white p-4 rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] border border-gray-100 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {}
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
              <input
                type="text"
                placeholder="Cari laporan, nomor kasus, lokasi, pelapor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-14 pl-14 pr-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-700 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[150px]">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full h-12 pl-10 pr-8 appearance-none bg-gray-50 rounded-2xl border border-transparent hover:bg-gray-100 transition-colors outline-none font-bold text-[11px] uppercase tracking-wide text-slate-600"
                >
                  <option value="all">Semua Status</option>
                  <option value="OPEN">Open</option>
                  <option value="ON PROGRESS">On Progress</option>
                  <option value="CLOSED">Closed</option>
                </select>
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-500" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              {}
              <div className="relative flex-1 min-w-[150px]">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full h-12 pl-10 pr-8 appearance-none bg-gray-50 rounded-2xl border border-transparent hover:bg-gray-100 transition-colors outline-none font-bold text-[11px] uppercase tracking-wide text-slate-600"
                >
                  <option value="all">Semua Severity</option>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
                <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              {lockedBranch && (
                <div className="relative flex-1 min-w-[180px]">
                  <select
                    value={lockedBranch.value}
                    disabled
                    className="w-full h-12 pl-10 pr-8 appearance-none bg-gray-50 rounded-2xl border border-transparent outline-none font-bold text-[11px] uppercase tracking-wide text-slate-600 disabled:cursor-not-allowed disabled:opacity-80"
                  >
                    <option value={lockedBranch.value}>{lockedBranch.label || lockedBranch.value}</option>
                  </select>
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              )}

              {}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-14 w-14 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 text-slate-500 transition-all active:scale-95"
              >
                <RefreshCw size={20} className={cn(refreshing && "animate-spin")} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {}
      <main className="max-w-[1700px] mx-auto px-4 md:px-8 mt-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: config.color }} />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Daftar Laporan</h2>
          </div>
          <p className="text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-3)] px-3 py-1 rounded-full uppercase tracking-tighter">
            {filteredReports.length} laporan
          </p>
        </div>

        <ReportsDetailTable
          reports={filteredReports}
          onReportClick={setSelectedReport}
          onStatusUpdate={handleUpdateStatus}
          loading={loading}
          fullHeight
        />
      </main>

      {}
      <AnimatePresence>
        {selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            userRole={config.userRole}
            onUpdateStatus={handleUpdateStatus}
            onRefresh={handleRefresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
