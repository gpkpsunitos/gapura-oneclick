'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { type Report } from '@/types';
import { reportsFromPayload } from '@/lib/report-page';
import { DrilldownDetailView } from '@/components/dashboard/DrilldownDetailView';

const TITLE_MAP: Record<string, string> = {
    trend_month: 'Reports by Month',
    status: 'Reports by Status',
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
                const params = new URLSearchParams();
                if (type === 'status') params.set('status', value);
                if (type === 'trend_month') {
                    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(value);
                    if (monthIndex >= 0) {
                        const year = new Date().getFullYear();
                        params.set('from', new Date(Date.UTC(year, monthIndex, 1)).toISOString());
                        params.set('to', new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)).toISOString());
                    }
                }
                const res = await fetch(`/api/admin/reports?${params.toString()}`);
                if (res.ok) {
                    setAllReports(reportsFromPayload<Report>(await res.json()));
                }
            } catch (err) {
                console.error('Failed to fetch drilldown data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [type, value]);

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
        const base = TITLE_MAP[type] || 'Report Details';
        return `${base}: ${value}`;
    }, [type, value]);

    return (
        <DrilldownDetailView
            title={title}
            backHref="/dashboard/ocs"
            reports={filteredReports}
            loading={loading}
            userRole="DIVISI_OCS"
        />
    );
}
