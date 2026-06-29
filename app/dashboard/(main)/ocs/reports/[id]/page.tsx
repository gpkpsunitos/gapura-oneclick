'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, AlertCircle, Loader2
} from 'lucide-react';
import { Report, User } from '@/types';
import { ReportDetailView, type StatusUpdateDetails } from '@/components/dashboard/ReportDetailView';

export default function OSReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const reportId = params.id as string;

    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState<User | null>(null);

    const fetchReport = useCallback(async () => {
        try {
            const res = await fetch(`/api/reports/${reportId}`);
            if (!res.ok) throw new Error('Failed to load report');
            const data = await res.json();
            setReport(data);
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
        }
    }, [reportId]);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        const fetchInitialData = async () => {

            const [userRes, reportRes] = await Promise.allSettled([
                fetch('/api/auth/me', { signal }),
                fetch(`/api/reports/${reportId}`, { signal }),
            ]);

            if (userRes.status === 'fulfilled' && userRes.value.ok) {
                try { setUser(await userRes.value.json()); } catch {}
            }

            if (reportRes.status === 'fulfilled') {
                if (reportRes.value.ok) {
                    try { setReport(await reportRes.value.json()); } catch {}
                } else {
                    setError('Failed to load report');
                }
            }
            setLoading(false);
        };

        fetchInitialData().catch((err) => {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
        });

        return () => controller.abort();
    }, [reportId]);

    const handleStatusUpdate = async (id: string, status: string, notes?: string, evidenceUrl?: string, details?: StatusUpdateDetails) => {
        try {
            const body: Record<string, string | undefined> = {
                reportId: id,
                status,
                notes,
                kps_remarks: details?.finalRemarks,
                final_remarks: details?.finalRemarks,
                remarks_by: details?.remarksBy,
            };
            if (evidenceUrl) body.resolution_evidence_url = evidenceUrl;

            const res = await fetch('/api/admin/reports', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                await fetchReport();
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('A system error occurred');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h2 className="text-xl font-bold">Error Loading Report</h2>
                <p className="text-gray-500">{error}</p>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-[var(--brand-primary)] font-bold hover:underline"
                >
                    <ArrowLeft size={16} /> Back
                </button>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-4rem)] md:h-screen bg-[var(--surface-1)] overflow-hidden -mx-4 -mb-6 md:-mx-8 md:-mb-8 -mt-16 md:-mt-8" style={{ width: 'calc(100% + 2rem)', maxWidth: 'none' }}>
            <ReportDetailView
                report={report}
                onUpdateStatus={handleStatusUpdate}
                onRefresh={fetchReport}
                onClose={() => router.push('/dashboard/ocs/reports')}
                userRole={user?.role || 'DIVISI_OS'}
                isModal={false}
                currentUserId={user?.id}
            />
        </div>
    );
}
