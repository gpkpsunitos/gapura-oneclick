'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Plane, 
  ChevronRight, 
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { STATUS_CONFIG, SEVERITY_CONFIG, ReportStatus } from '@/lib/constants/report-status';
import { Report } from '@/types';
import { cn } from '@/lib/utils';

interface ReportsListProps {
  reports: Report[];
  onReportClick: (report: Report) => void;
  loading?: boolean;
  disableAnimation?: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24
    }
  }
};

export function ReportsList({ reports, onReportClick, loading, disableAnimation = false }: ReportsListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4 py-12">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 w-full rounded-2xl bg-[var(--surface-3)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="py-24 text-center">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="inline-flex p-6 rounded-full bg-[var(--surface-2)] mb-6"
        >
          <FileText size={48} className="text-[var(--text-muted)] opacity-30" />
        </motion.div>
        <p className="text-xl font-display font-bold text-[var(--text-secondary)]">Tidak ada laporan ditemukan</p>
        <p className="text-sm text-[var(--text-muted)] mt-2">Coba sesuaikan filter Anda untuk melihat hasil lain.</p>
      </div>
    );
  }

  if (disableAnimation) {
    return (
      <div className="space-y-4">
        {reports.map((report) => {
          const severity = SEVERITY_CONFIG[report.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
          const status = STATUS_CONFIG[report.status as ReportStatus] || STATUS_CONFIG.OPEN;
          const SevIcon = severity.icon;
          const StatIcon = status.icon;
          return (
            <div
              key={report.id}
              onClick={() => onReportClick(report)}
              className={cn(
                 "group relative flex items-center gap-6 p-5 rounded-3xl cursor-pointer transition-all duration-300",
                 "bg-[var(--surface-0)] border border-[var(--surface-4)]",
                 "hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:scale-[1.01] hover:border-[var(--brand-emerald-300)]",
                 "active:scale-[0.99]"
              )}
            >
              <div 
                className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full opacity-80" 
                style={{ backgroundColor: severity.color, boxShadow: `0 0 12px ${severity.color}40` }}
              />
              <div 
                 className="hidden sm:flex items-center justify-center h-14 w-14 rounded-2xl flex-shrink-0"
                 style={{ backgroundColor: `${severity.color}15` }}
              >
                 <SevIcon size={24} style={{ color: severity.color }} />
              </div>
              <div className="flex-1 min-w-0">
                 <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                      report.primary_tag === 'CGO' 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-blue-50 text-blue-700 border-blue-100"
                    )}>
                      {report.primary_tag === 'CGO' ? 'Cargo' : 'Land & Air'}
                    </span>
                     {report.stations?.code && report.stations.code !== '#N/A' && (
                       <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest bg-[var(--surface-3)] px-2 py-0.5 rounded-md">
                         {report.stations.code}
                       </span>
                     )}
                     {(!report.stations?.code || report.stations.code === '#N/A') && report.branch && report.branch !== '#N/A' && (
                       <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest bg-[var(--surface-3)] px-2 py-0.5 rounded-md">
                         {report.branch}
                       </span>
                     )}
                     {report.flight_number && report.flight_number !== '#N/A' && (
                       <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600/70 bg-blue-50/50 px-2 py-0.5 rounded-md">
                         <Plane size={10} strokeWidth={3} />
                         {report.flight_number}
                       </span>
                     )}
                  </div>
                  <h3 className="text-lg font-display font-extrabold text-[var(--text-primary)] truncate">
                    {report.report || report.title || '(Tanpa Judul)'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2">
                    {report.location && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                        <MapPin size={12} className="text-[var(--brand-emerald-500)]" />
                        {report.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                      <FileText size={12} className="text-blue-500" />
                      {report.users?.full_name || report.reporter_name || 'Anonymous'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: `${status.bgColor}`, color: status.color }}
                  >
                    <StatIcon size={12} strokeWidth={3} />
                    {status.label}
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-black text-[var(--text-primary)]">
                      {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)]">
                      {new Date(report.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {reports.map((report) => {
        const severity = SEVERITY_CONFIG[report.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
        const status = STATUS_CONFIG[report.status as ReportStatus] || STATUS_CONFIG.OPEN;
        const SevIcon = severity.icon;
        const StatIcon = status.icon;

        return (
          <motion.div
            key={report.id}
            variants={item}
            onClick={() => onReportClick(report)}
            className={cn(
               "group relative flex items-center gap-6 p-5 rounded-3xl cursor-pointer transition-all duration-300",
               "bg-[var(--surface-0)] border border-[var(--surface-4)]",
               "hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:scale-[1.01] hover:border-[var(--brand-emerald-300)]",
               "active:scale-[0.99]"
            )}
          >
            {/* Magnetic Border/Glow effect */}
            <div 
              className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all duration-300 group-hover:w-1.5 opacity-80" 
              style={{ backgroundColor: severity.color, boxShadow: `0 0 12px ${severity.color}40` }}
            />

            {/* Severity Icon Block */}
            <div 
               className="hidden sm:flex items-center justify-center h-14 w-14 rounded-2xl flex-shrink-0 transition-transform duration-300 group-hover:rotate-6"
               style={{ backgroundColor: `${severity.color}15` }}
            >
               <SevIcon size={24} style={{ color: severity.color }} />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
               <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                    report.primary_tag === 'CGO' 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                      : "bg-blue-50 text-blue-700 border-blue-100"
                  )}>
                    {report.primary_tag === 'CGO' ? 'Cargo' : 'Land & Air'}
                  </span>
                   {report.stations?.code && report.stations.code !== '#N/A' && (
                     <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest bg-[var(--surface-3)] px-2 py-0.5 rounded-md">
                       {report.stations.code}
                     </span>
                   )}
                   {(!report.stations?.code || report.stations.code === '#N/A') && report.branch && report.branch !== '#N/A' && (
                     <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest bg-[var(--surface-3)] px-2 py-0.5 rounded-md">
                       {report.branch}
                     </span>
                   )}
                   {report.flight_number && report.flight_number !== '#N/A' && (
                     <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600/70 bg-blue-50/50 px-2 py-0.5 rounded-md">
                       <Plane size={10} strokeWidth={3} />
                       {report.flight_number}
                     </span>
                   )}
                </div>

               <h3 className="text-lg font-display font-extrabold text-[var(--text-primary)] truncate group-hover:text-[var(--brand-emerald-700)] transition-colors">
                  {report.report || report.title || '(Tanpa Judul)'}
               </h3>

               <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2">
                  {report.location && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                      <MapPin size={12} className="text-[var(--brand-emerald-500)]" />
                      {report.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                    <FileText size={12} className="text-blue-500" />
                    {report.users?.full_name || report.reporter_name || 'Anonymous'}
                  </div>
               </div>
            </div>

            {/* Status & Actions */}
            <div className="flex flex-col items-end gap-3 flex-shrink-0">
               <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider"
                  style={{ backgroundColor: `${status.bgColor}`, color: status.color }}
               >
                  <StatIcon size={12} strokeWidth={3} />
                  {status.label}
               </div>
               
               <div className="flex items-center gap-4 text-right">
                  <div className="hidden sm:block">
                     <p className="text-xs font-black text-[var(--text-primary)]">
                        {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                     </p>
                     <p className="text-[10px] font-bold text-[var(--text-muted)]">
                        {new Date(report.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                     </p>
                  </div>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--text-muted)] group-hover:bg-[var(--brand-emerald-500)] group-hover:text-white transition-all duration-300">
                     <ChevronRight size={18} />
                  </div>
               </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// Complexity: Time O(n) | Space O(k) where n is reports and k is DOM nodes
// Design: Spatial Kinetic List (Prism Protocol)
