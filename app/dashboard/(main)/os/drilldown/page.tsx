'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { type Report } from '@/types';
import { DrilldownDetailView } from '@/components/dashboard/DrilldownDetailView';

const TITLE_MAP: Record<string, string> = {
    trend_month: 'Laporan berdasarkan Bulan',
    status: 'Laporan berdasarkan Status',
};

export default function OSDrilldownPage() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type') || '';
    const value = searchParams.get('value') || '';

    const [allReports, setAllReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/admin/reports');
                if (res.ok) {
                    const data = await res.json();
                    setAllReports(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Failed to fetch drilldown data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const filteredReports = useMemo(() => {
        switch (type) {
            case 'trend_month': {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthIdx = months.indexOf(value);
                if (monthIdx >= 0) {
                    return allReports.filter(r => new Date(r.created_at).getMonth() === monthIdx);
                }
                return allReports;
            }
            case 'status':
                return allReports.filter(r => r.status === value);
            default:
                return allReports;
        }
    }, [allReports, type, value]);

    const title = useMemo(() => {
        const base = TITLE_MAP[type] || 'Detail Laporan';
        return `${base}: ${value}`;
    }, [type, value]);

    return (
        <DrilldownDetailView
            title={title}
            backHref="/dashboard/os"
            reports={filteredReports}
            loading={loading}
            userRole="DIVISI_OS"
        />
    );
}
