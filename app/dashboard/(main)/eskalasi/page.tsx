'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Inbox, FolderOpen,
    AlertTriangle, CheckCircle, Clock, BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { DIVISIONS } from '@/lib/constants/divisions';

interface DivisionStat {
    code: string;
    name: string;
    total: number;
    open: number;
    onProgress: number;
    closed: number;
    color: string;
}

export default function EskalasiDashboard() {
    const [stats, setStats] = useState<DivisionStat[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [switchError, setSwitchError] = useState<string | null>(null);
    const [switchingCode, setSwitchingCode] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        const fetchStats = async () => {
            try {
                const res = await fetch('/api/admin/reports', { signal });
                const data = await res.json();
                const reports = data.reports || [];

                const divisionStats: DivisionStat[] = Object.values(DIVISIONS).map(div => {
                    const divReports = reports.filter((r: any) => r.target_division === div.code);
                    return {
                        code: div.code,
                        name: div.name,
                        total: divReports.length,
                        open: divReports.filter((r: any) => r.status === 'OPEN').length,
                        onProgress: divReports.filter((r: any) => r.status === 'ON PROGRESS').length,
                        closed: divReports.filter((r: any) => r.status === 'CLOSED').length,
                        color: div.color,
                    };
                });

                setStats(divisionStats);
                setTotalCount(reports.length);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                console.error('Failed to fetch stats:', error);
            }
        };

        fetchStats();

        return () => controller.abort();
    }, []);

    const handleOpenDivision = async (code: string) => {
        try {
            setSwitchError(null);
            setSwitchingCode(code);

            const res = await fetch('/api/auth/switch-division', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ divisionCode: code }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error || `Gagal switch ke Divisi ${code}`);
            }

            window.location.assign(data?.redirectPath || `/dashboard/${code.toLowerCase()}`);
        } catch (error) {
            console.error('Failed to switch division:', error);
            setSwitchError(error instanceof Error ? error.message : 'Gagal switch ke akun divisi');
            setSwitchingCode(null);
        }
    };

    const totalOpen = stats.reduce((acc, s) => acc + s.open, 0);
    const totalOnProgress = stats.reduce((acc, s) => acc + s.onProgress, 0);
    const totalClosed = stats.reduce((acc, s) => acc + s.closed, 0);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pusat Eskalasi Divisi</h1>
                    <p className="text-gray-500 mt-1">Monitoring laporan dari semua divisi</p>
                </div>
            </div>

            {switchError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {switchError}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Laporan</p>
                            <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <Inbox className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Open</p>
                            <p className="text-2xl font-bold text-red-600">{totalOpen}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">On Progress</p>
                            <p className="text-2xl font-bold text-yellow-600">{totalOnProgress}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Closed</p>
                            <p className="text-2xl font-bold text-green-600">{totalClosed}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Laporan Per Divisi</h2>
                        <BarChart3 className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="space-y-3">
                        {stats.map((stat) => (
                            <button
                                key={stat.code}
                                onClick={() => handleOpenDivision(stat.code)}
                                disabled={Boolean(switchingCode)}
                                className="w-full flex items-center justify-between p-3 rounded-lg text-left hover:bg-gray-50 transition-colors group disabled:opacity-60"
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: stat.color }}
                                    />
                                    <span className="font-medium text-gray-700 group-hover:text-gray-900">
                                        Divisi {stat.code}
                                    </span>
                                    <span className="text-sm text-gray-500">({stat.name})</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm">
                                        <span className="text-red-500">{stat.open}</span>
                                        <span className="text-gray-300 mx-1">/</span>
                                        <span className="text-yellow-500">{stat.onProgress}</span>
                                        <span className="text-gray-300 mx-1">/</span>
                                        <span className="text-green-500">{stat.closed}</span>
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                        {switchingCode === stat.code ? '...' : stat.total}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                >
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Akses Cepat</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            href="/dashboard/eskalasi/laporan-divisi"
                            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                            <Inbox className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-gray-700">Semua Laporan</span>
                        </Link>
                        {Object.values(DIVISIONS).map(div => (
                            <button
                                key={div.code}
                                onClick={() => handleOpenDivision(div.code)}
                                disabled={Boolean(switchingCode)}
                                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
                            >
                                <FolderOpen className="w-5 h-5" style={{ color: div.color }} />
                                <span className="font-medium text-gray-700">
                                    {switchingCode === div.code ? `Membuka ${div.code}...` : `Divisi ${div.code}`}
                                </span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
