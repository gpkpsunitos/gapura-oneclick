'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    FileText, Search, Filter, ChevronDown,
    MapPin, AlertTriangle,
    Plane, Building2
} from 'lucide-react';
import { STATUS_CONFIG, SEVERITY_CONFIG, ReportStatus } from '@/lib/constants/report-status';
import { Report } from '@/types';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { type TimePeriod } from '@/components/dashboard/TimePeriodFilter';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { AISummaryKPICards } from '@/components/dashboard/ai-summary';

export default function AdminReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [stationFilter, setStationFilter] = useState('all');
    const [filter, setFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [stations, setStations] = useState<Array<{ id: string; code: string; name: string }>>([]);
    const [search, setSearch] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [period, setPeriod] = useState<TimePeriod>(null);

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

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filter !== 'all') queryParams.append('status', filter);
            if (stationFilter !== 'all') queryParams.append('station', stationFilter);
            const res = await fetch(`/api/admin/reports?${queryParams.toString()}`);
            const data = await res.json();
            setReports(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [filter, stationFilter]);

    useEffect(() => { fetchReports(); }, [fetchReports]);
    useEffect(() => { fetchStations(); }, [fetchStations]);
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
                await fetchReports();
            } catch {}
        };
        run();
        return () => controller.abort();
    }, [fetchReports]);

    const filteredReports = reports.filter(report => {
        const matchesSearch = 
            report.title?.toLowerCase().includes(search.toLowerCase()) ||
            report.location?.toLowerCase().includes(search.toLowerCase()) ||
            report.users?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            report.stations?.name?.toLowerCase().includes(search.toLowerCase()) ||
            report.id?.toLowerCase().includes(search.toLowerCase()) ||
            report.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
            report.flight_number?.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
        return matchesSearch && matchesSeverity;
    });

    return (
        <div className="space-y-8 stagger-children">
            {/* Header */}
            <DashboardHeader
                title="Kelola Laporan"
                subtitle="Kelola dan tindaklanjuti semua laporan masuk"
                totalReports={reports.length}
                pendingReports={reports.filter(r => r.status === 'OPEN').length}
                resolvedReports={reports.filter(r => r.status === 'CLOSED').length}
                period={period}
                onPeriodChange={(p) => setPeriod(p)}
            />

            {/* AI Summary KPI Cards */}
            <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                <AISummaryKPICards showHeader={true} hideActionIntelligence={true} />
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Cari laporan, nomor kasus, lokasi, pelapor, atau station..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field"
                        style={{ paddingLeft: 'calc(var(--space-lg) + 1.5rem)' }}
                    />
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[160px]">
                        <select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)} className="input-field pl-10 pr-10 cursor-pointer" style={{ background: 'var(--surface-2)' }}>
                            <option value="all">Semua Station</option>
                            {stations.map((s) => (<option key={s.id} value={s.id}>{s.code} - {s.name}</option>))}
                        </select>
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="relative flex-1 min-w-[140px]">
                        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field pl-10 pr-10 cursor-pointer" style={{ background: 'var(--surface-2)' }}>
                            <option value="all">Semua Status</option>
                            <option value="OPEN">Open</option>
                            <option value="ON PROGRESS">On Progress</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="relative flex-1 min-w-[140px]">
                        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="input-field pl-10 pr-10 cursor-pointer" style={{ background: 'var(--surface-2)' }}>
                            <option value="all">Semua Severity</option>
                            <option value="high">🔴 High</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="low">🟢 Low</option>
                        </select>
                        <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                </div>
            </div>

            {/* Reports Table */}
            <div className="card-solid animate-fade-in-up" style={{ padding: 0, overflow: 'hidden', animationDelay: '150ms' }}>
                {/* Table Header */}
                <div 
                    className="flex items-center justify-between" 
                    style={{ padding: 'var(--space-lg) var(--space-xl)', borderBottom: '1px solid var(--surface-4)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: 'oklch(0.55 0.14 160 / 0.12)' }}>
                            <FileText size={18} style={{ color: 'var(--brand-primary)' }} />
                        </div>
                        <div>
                            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Daftar Laporan</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filteredReports.length} laporan</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--surface-4)', borderTopColor: 'var(--brand-primary)' }} />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="py-16 text-center">
                        <FileText size={40} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-4 opacity-50" />
                        <p style={{ color: 'var(--text-muted)' }}>Tidak ada laporan ditemukan</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: 'var(--surface-3)', borderBottom: '1px solid var(--surface-4)' }}>
                                    <th className="text-left py-3 px-5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)', width: '45%' }}>Laporan</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Pelapor</th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Severity</th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</th>
                                    <th className="text-right py-3 px-5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tanggal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.map((report) => {
                                    const severity = SEVERITY_CONFIG[report.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
                                    const status = STATUS_CONFIG[report.status as ReportStatus] || STATUS_CONFIG.OPEN;
                                    const SevIcon = severity.icon;
                                    const StatIcon = status.icon;

                                    return (
                                        <tr
                                            key={report.id}
                                            className="cursor-pointer transition-colors"
                                            style={{ 
                                                borderBottom: '1px solid var(--surface-4)',
                                                borderLeft: `3px solid ${severity.color}`
                                            }}
                                            onClick={() => setSelectedReport(report)}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {/* Report Info */}
                                            <td className="py-4 px-5">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg flex-shrink-0" style={{ background: severity.bg }}>
                                                        <SevIcon size={16} style={{ color: severity.color }} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {report.primary_tag === 'CGO' ? (
                                                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">CGO</span>
                                                            ) : (
                                                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 uppercase">L&A</span>
                                                            )}
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: 'var(--surface-4)', color: 'var(--text-secondary)' }}>
                                                                {report.stations?.code || report.branch || 'N/A'}
                                                            </span>
                                                            {report.flight_number && (
                                                                <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'oklch(0.50 0.12 250)' }}>
                                                                    <Plane size={10} />
                                                                    {report.flight_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="font-semibold truncate max-w-[280px]" style={{ color: 'var(--text-primary)' }}>{report.report || report.title || '(Tanpa Judul)'}</p>
                                                        {report.location && (
                                                            <p className="text-xs flex items-center gap-1 mt-1 truncate max-w-[250px]" style={{ color: 'var(--text-muted)' }}>
                                                                <MapPin size={10} />
                                                                {report.location}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Reporter */}
                                            <td className="py-4 px-4">
                                                <p className="font-medium truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>{report.users?.full_name || report.reporter_name || '-'}</p>
                                            </td>

                                            {/* Severity Badge */}
                                            <td className="py-4 px-4 text-center">
                                                <span 
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                                                    style={{ background: severity.color }}
                                                >
                                                    {severity.label}
                                                </span>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-4 px-4 text-center">
                                                <span 
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                                                    style={{ background: status.bgColor, color: status.color }}
                                                >
                                                    <StatIcon size={12} />
                                                    {status.label}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td className="py-4 px-5 text-right">
                                                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                    {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </p>
                                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                                    {new Date(report.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedReport && (
                <ReportDetailModal
                    report={selectedReport}
                    onClose={() => setSelectedReport(null)}
                    userRole="SUPER_ADMIN"
                    onRefresh={fetchReports}
                />
            )}
        </div>
    );
}
