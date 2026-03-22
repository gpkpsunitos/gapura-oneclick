'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { type Report } from '@/types';
import { DrilldownDetailView } from '@/components/dashboard/DrilldownDetailView';

const TITLE_MAP: Record<string, Record<string, string>> = {
    severity: {
        high: 'Laporan Severity: High (Accident)',
        medium: 'Laporan Severity: Medium (Incident)',
        low: 'Laporan Severity: Low (Hazard)',
    },
    trend: {
        today: 'Laporan Hari Ini',
        thisWeek: 'Laporan Minggu Ini',
        thisMonth: 'Laporan Bulan Ini',
    },
    location: {},
};

function getDateRange(trendValue: string): { from: string; to: string } {
    const now = new Date();
    const to = now.toISOString();

    if (trendValue === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { from: start.toISOString(), to };
    }
    if (trendValue === 'thisWeek') {
        const dayOfWeek = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        return { from: start.toISOString(), to };
    }
    // thisMonth
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString(), to };
}

export default function AdminDrilldownPage() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type') || '';
    const value = searchParams.get('value') || '';

    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();

                if (type === 'severity') {
                    params.set('severity', value);
                } else if (type === 'trend') {
                    const { from, to } = getDateRange(value);
                    params.set('from', from);
                    params.set('to', to);
                } else if (type === 'location') {
                    params.set('search', value);
                }

                const res = await fetch(`/api/admin/reports?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setReports(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Failed to fetch drilldown data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (type && value) fetchReports();
    }, [type, value]);

    const title = useMemo(() => {
        if (type === 'location') return `Laporan di Lokasi: ${value}`;
        return TITLE_MAP[type]?.[value] || `Detail: ${value}`;
    }, [type, value]);

    return (
        <DrilldownDetailView
            title={title}
            subtitle={`Filter: ${type} = ${value}`}
            backHref="/dashboard/admin"
            reports={reports}
            loading={loading}
            userRole="SUPER_ADMIN"
        />
    );
}
