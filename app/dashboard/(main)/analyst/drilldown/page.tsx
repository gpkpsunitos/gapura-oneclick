'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { type Report } from '@/types';
import { DrilldownDetailView } from '@/components/dashboard/DrilldownDetailView';

const TITLE_MAP: Record<string, string> = {
    category: 'Laporan berdasarkan Kategori',
    station: 'Laporan berdasarkan Stasiun',
    month: 'Laporan berdasarkan Bulan',
    status: 'Laporan berdasarkan Status',
    airline: 'Laporan berdasarkan Maskapai',
    area: 'Laporan berdasarkan Area',
    severity: 'Laporan berdasarkan Severity',
};

export default function AnalystDrilldownPage() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type') || '';
    const value = searchParams.get('value') || '';
    const period = searchParams.get('period') || 'all';

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
        // Apply date range filter first
        let filtered = allReports;
        if (period !== 'all') {
            const now = new Date();
            const daysMap: Record<string, number> = { week: 7, month: 30 };
            const daysBack = daysMap[period] || 0;
            if (daysBack > 0) {
                const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(r => new Date(r.created_at) >= cutoff);
            }
        }

        // Apply type-specific filter
        switch (type) {
            case 'category':
                return filtered.filter(r => r.category === value);
            case 'station':
                return filtered.filter(r => r.stations?.code === value);
            case 'month': {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return filtered.filter(r => {
                    const date = new Date(r.created_at);
                    const m = months[date.getMonth()];
                    const y = date.getFullYear().toString().slice(-2);
                    const monYY = `${m} ${y}`;
                    return m === value || monYY === value;
                });
            }
            case 'status':
                return filtered.filter(r => r.status === value);
            case 'airline':
                return filtered.filter(r => r.airlines === value);
            case 'area':
                return filtered.filter(r => (r.area || 'General') === value);
            case 'severity':
                if (value === 'all') return filtered;
                return filtered.filter(r => r.severity === value);
            default:
                return filtered;
        }
    }, [allReports, type, value, period]);

    const title = useMemo(() => {
        const base = TITLE_MAP[type] || 'Detail Laporan';
        return `${base}: ${value}`;
    }, [type, value]);

    return (
        <DrilldownDetailView
            title={title}
            subtitle={period !== 'all' ? `Periode: ${period === 'week' ? '7 Hari Terakhir' : '30 Hari Terakhir'}` : undefined}
            backHref="/dashboard/analyst"
            reports={filteredReports}
            loading={loading}
            userRole="ANALYST"
        />
    );
}
