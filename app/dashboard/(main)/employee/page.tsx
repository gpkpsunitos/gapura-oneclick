'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

import { 
    Plus, MapPin, FileText, 
    ArrowUpRight, CheckCircle2, AlertCircle, 
    Search, LayoutDashboard, History, MoreHorizontal, FileType, Eye
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { STATUS_CONFIG, type ReportStatus } from '@/lib/constants/report-status';
import { CreateReportModal } from '@/components/dashboard/CreateReportModal';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { Report } from '@/types';
import { generatePDF, generateWord } from '@/lib/utils/document-generator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function EmployeeDashboard() {
    const [reports, setReports] = useState<Report[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Selamat Pagi';
        if (hour < 15) return 'Selamat Siang';
        if (hour < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    };

    const greeting = getGreeting();

    const fetchReports = useCallback(async () => {
        try {
            const res = await fetch('/api/reports');
            if (res.ok) {
                const data = await res.json();
                setReports(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error:', error);
            setReports([]);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        // re-fetch to update stats
        await fetchReports();
    }, [fetchReports]);

    useEffect(() => {
        const init = async () => {
            await fetchReports();
        };
        init();
    }, [fetchReports]);

    const handleReportClick = (report: Report) => {
        setSelectedReport(report);
    }

    // Derived Stats
    const stats = {
        total: reports.length,
        inProgress: reports.filter(r => r.status === 'ON PROGRESS').length,
        resolved: reports.filter(r => r.status === 'CLOSED').length,
    };

    return (
        <div className="space-y-8 stagger-children p-6 md:p-8 pb-24">
            
            {/* 1. KINETIC HEADER */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in-up">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] animate-pulse" />
                        <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[var(--brand-primary)]">
                            Operasional Stasiun
                        </p>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] font-display">
                        {greeting}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]">Petugas</span>
                    </h1>
                    <p className="text-sm font-medium text-[var(--text-secondary)] mt-2">
                        Kendali Stasiun &bull; Dasbor Operasional
                    </p>
                </div>
                
                {/* Magnetic New Report Action */}
                <div className="hidden md:flex relative group perspective-1000">
                     <motion.div 
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -inset-1 bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-2xl blur-md opacity-20 group-hover:opacity-60 transition-opacity"
                     />
                     <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={() => setShowCreateModal(true)}
                        className="relative w-full md:w-auto bg-white text-[var(--text-primary)] px-6 py-3 rounded-2xl font-bold text-[11px] tracking-widest uppercase shadow-sm hover:shadow-xl hover:shadow-[var(--brand-primary)]/10 border border-gray-100 flex items-center gap-3 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-50/0 via-gray-50/50 to-gray-50/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                        
                        <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                            <Plus size={16} className="text-[var(--brand-primary)]" strokeWidth={2.5} />
                        </div>
                        <span className="relative z-10 font-display">
                            Buat Laporan
                        </span>
                    </motion.button>
                </div>
            </header>

            {/* 2. ASYMMETRIC BENTO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                
                {/* Hero Stat: Total - Span 2 */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="md:col-span-2 bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--aurora-1)] to-transparent opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-1000" />
                    
                    <div className="flex justify-between items-start relative z-10">
                        <p className="text-[10px] font-mono font-bold text-[var(--text-secondary)] tracking-[0.2em] uppercase">
                            Semua Laporan
                        </p>
                        <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-white group-hover:shadow-sm transition-all">
                            <FileText size={20} className="text-[var(--brand-primary)]" />
                        </div>
                    </div>
                    <div className="mt-8 relative z-10">
                        <p className="text-6xl font-display font-bold text-[var(--text-primary)] tracking-tighter">
                            {stats.total}
                        </p>
                        <p className="text-sm font-medium text-[var(--text-muted)] mt-2">
                            Total laporan masuk sistem
                        </p>
                    </div>
                </motion.div>

                {/* Stat: In Progress */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="md:col-span-1 bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group flex flex-col justify-between"
                >
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] font-mono font-bold text-[var(--text-secondary)] tracking-[0.2em] uppercase">
                            Proses
                        </p>
                        <div className="p-2.5 bg-amber-50 rounded-xl">
                            <History size={18} className="text-amber-500" />
                        </div>
                    </div>
                    <div className="mt-6">
                        <p className="text-4xl font-display font-extrabold text-[var(--text-primary)]">
                            {stats.inProgress}
                        </p>
                        <div className="h-1.5 w-full bg-gray-50 rounded-full mt-4 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.total > 0 ? (stats.inProgress/stats.total)*100 : 0}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" 
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Stat: Resolved */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="md:col-span-1 bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group flex flex-col justify-between"
                >
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] font-mono font-bold text-[var(--text-secondary)] tracking-[0.2em] uppercase">
                            Selesai
                        </p>
                        <div className="p-2.5 bg-emerald-50 rounded-xl">
                            <CheckCircle2 size={18} className="text-emerald-500" />
                        </div>
                    </div>
                    <div className="mt-6">
                        <p className="text-4xl font-display font-extrabold text-[var(--text-primary)]">
                            {stats.resolved}
                        </p>
                        <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
                            Berhasil diselesaikan
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* 3. KINETIC DATA NODES (TABLE REDESIGN) */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                    <div>
                        <h3 className="text-xl font-display font-extrabold flex items-center gap-2 text-[var(--text-primary)]">
                            <LayoutDashboard size={20} className="text-[var(--brand-primary)]" />
                            Daftar Laporan
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mt-1 font-medium ml-7">
                            Aktivitas dan status laporan terkini
                        </p>
                    </div>
                    
                    {/* Floating Toolbar */}
                    <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-2 pr-4 border-r border-gray-100">
                            <div className="h-2 w-2 rounded-full bg-[var(--brand-primary)] animate-pulse"/>
                            <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Live</span>
                        </div>
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors">
                                <Search size={14} strokeWidth={3} />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Cari ID, Lokasi..." 
                                className="pl-6 w-full md:w-48 bg-transparent text-sm font-medium focus:outline-none placeholder:text-gray-300 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Data Nodes Container */}
                <div className="flex flex-col gap-3">
                    {reports.length === 0 ? (
                         <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                                <History size={24} className="text-gray-300" />
                            </div>
                            <p className="font-display font-bold text-gray-400">Belum ada laporan yang diajukan</p>
                        </div>
                    ) : (
                        reports.map((report, idx) => {
                            const statusConfig = STATUS_CONFIG[report.status as ReportStatus] || STATUS_CONFIG.OPEN;
                            const severityKey = report.severity || 'medium';
                            
                            // Map severity to Prism Light tokens
                            const priorityColor = 
                                severityKey === 'urgent' ? 'text-[var(--accent-coral)] bg-[var(--accent-coral)]/10 ring-[var(--accent-coral)]/20' : 
                                severityKey === 'high' ? 'text-[var(--accent-amber)] bg-[var(--accent-amber)]/10 ring-[var(--accent-amber)]/20' : 
                                severityKey === 'medium' ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 ring-[var(--brand-primary)]/20' : 
                                'text-emerald-600 bg-emerald-50 ring-emerald-100';

                            return (
                                <motion.div 
                                    key={report.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                                    onClick={() => handleReportClick(report)}
                                    className="group relative bg-white hover:bg-gray-50/50 p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center gap-4 md:gap-6 overflow-hidden"
                                >
                                    {/* Hover Indicator Line */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--brand-primary)] transform scale-y-0 group-hover:scale-y-100 transition-transform origin-center duration-300 rounded-r-full" />

                                    {/* Column 1: ID & Status */}
                                    <div className="flex items-center gap-4 md:w-1/4 shrink-0">
                                        <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px]", statusConfig.textClass?.replace('text-', 'bg-').replace('500', '400'))} />
                                        <div>
                                            <span className="font-mono text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)] transition-colors">
                                                #{report.id.slice(0, 8).toUpperCase()}
                                            </span>
                                            <div className="mt-1.5 flex flex-wrap gap-2">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-widest",
                                                    statusConfig.bgClass, statusConfig.textClass, statusConfig.borderClass
                                                )}>
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide flex items-center gap-1 ring-1 inset-ring", priorityColor)}>
                                                <AlertCircle size={8} strokeWidth={3} />
                                                {severityKey}
                                            </div>
                                        </div>
                                        <p className="font-display font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors truncate text-sm md:text-base">
                                            {report.title}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-1">
                                            <MapPin size={12} className="shrink-0" />
                                            <span className="truncate">{report.location || report.stations?.name}</span>
                                        </div>
                                    </div>

                                    {/* Column 3: Time & Actions */}
                                    <div className="flex items-center justify-between md:justify-end gap-6 md:w-1/4 shrink-0 border-t md:border-t-0 border-gray-50 pt-3 md:pt-0 mt-2 md:mt-0">
                                        <div className="flex flex-col text-left md:text-right">
                                            <span className="font-mono text-xs font-bold text-[var(--text-secondary)]">
                                                {new Date(report.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                                            </span>
                                            <span className="text-[10px] font-medium text-[var(--text-muted)] mt-0.5 uppercase tracking-widest">
                                                {new Date(report.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}
                                            </span>
                                        </div>

                                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--brand-primary)] hover:text-white transition-all duration-300">
                                                        <MoreHorizontal size={16} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-xl border-gray-100">
                                                    <DropdownMenuItem onClick={() => handleReportClick(report)} className="rounded-lg text-xs font-medium cursor-pointer focus:bg-gray-50">
                                                        <Eye className="mr-2 h-4 w-4 text-[var(--text-secondary)]" />
                                                        <span>Lihat Detail</span>
                                                    </DropdownMenuItem>
                                                    <div className="h-px bg-gray-100 my-1 mx-2" />
                                                    <DropdownMenuItem onClick={() => generatePDF(report)} className="rounded-lg text-xs font-medium cursor-pointer focus:bg-red-50 text-red-600">
                                                        <FileType className="mr-2 h-4 w-4" />
                                                        <span>Download PDF</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => generateWord(report)} className="rounded-lg text-xs font-medium cursor-pointer focus:bg-blue-50 text-blue-600">
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        <span>Download Word</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Mobile FAB */}
            <button 
                onClick={() => setShowCreateModal(true)}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[var(--brand-primary)] text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-all"
            >
                <Plus size={24} />
            </button>

            {/* Modals */}
            <ReportDetailModal
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                report={selectedReport}
            />

            <CreateReportModal 
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    fetchReports();
                    fetchStats();
                    setShowCreateModal(false);
                }}
            />
        </div>
    );
}
