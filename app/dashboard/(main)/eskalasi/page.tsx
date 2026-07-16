'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Inbox,
    AlertTriangle, CheckCircle, Clock, BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { reportsFromPayload } from '@/lib/report-page';
import type { Report } from '@/types';

interface ReportStat {
    total: number;
    open: number;
    onProgress: number;
    closed: number;
}

export default function EskalasiDashboard() {
    const [stats, setStats] = useState<ReportStat>({ total: 0, open: 0, onProgress: 0, closed: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        const fetchStats = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/admin/reports', { signal });
                const reportList = reportsFromPayload<Report>(await res.json());

                setStats({
                    total: reportList.length,
                    open: reportList.filter((r) => r.status === 'OPEN').length,
                    onProgress: reportList.filter((r) => r.status === 'ON PROGRESS').length,
                    closed: reportList.filter((r) => r.status === 'CLOSED').length,
                });
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        return () => controller.abort();
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pusat Eskalasi</h1>
                    <p className="text-gray-500 mt-1">Monitoring laporan</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Reports</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {loading ? '-' : stats.total}
                            </p>
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
                            <p className="text-2xl font-bold text-red-600">
                                {loading ? '-' : stats.open}
                            </p>
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
                            <p className="text-2xl font-bold text-yellow-600">
                                {loading ? '-' : stats.onProgress}
                            </p>
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
                            <p className="text-2xl font-bold text-green-600">
                                {loading ? '-' : stats.closed}
                            </p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Akses Cepat</h2>
                    <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Link
                        href="/dashboard/admin/reports"
                        className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                        <Inbox className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-700">All Reports</span>
                    </Link>
                    <Link
                        href="/dashboard/analyst"
                        className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-700">Dashboard Analyst</span>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
