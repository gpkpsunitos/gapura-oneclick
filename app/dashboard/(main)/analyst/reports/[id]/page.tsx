'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, AlertCircle, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Report, User } from '@/types';
import { ReportDetailView } from '@/components/dashboard/ReportDetailView';

export default function AnalystReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const reportId = params.id as string;

    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState<User | null>(null);

    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            }
        } catch (err) {
            console.error('Error fetching user:', err);
        }
    }, []);

    const fetchReport = useCallback(async (updatedData?: Report) => {
        if (updatedData) {
            setReport(updatedData);
            return;
        }
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
        fetchUser();
        fetchReport();
        // Subscribe to realtime updates for comments
        const channel = supabase
            .channel(`report-${reportId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'comments', 
                filter: `report_id=eq.${reportId}` 
            }, () => {
                fetchReport(); // Refresh full data to get updated comments
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [reportId, fetchReport, fetchUser]);

    const handleStatusUpdate = async (id: string, status: string, notes?: string, evidenceUrl?: string) => {
        setActionLoading(true);
        try {
            const body: Record<string, string | undefined> = { reportId: id, status, notes };
            if (evidenceUrl) body.resolution_evidence_url = evidenceUrl;
            
            // Analyst uses same endpoint as Admin for status updates
            const res = await fetch('/api/admin/reports', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                await fetchReport();
            } else {
                alert('Gagal mengubah status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Terjadi kesalahan sistem');
        } finally {
            setActionLoading(false);
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
                    <ArrowLeft size={16} /> Kembali
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[var(--surface-1)] overflow-hidden">
            <ReportDetailView 
                report={report} 
                onUpdateStatus={handleStatusUpdate}
                onRefresh={fetchReport}
                onClose={() => router.push('/dashboard/analyst/reports')}
                userRole={user?.role || 'ANALYST'}
                isModal={false}
                divisionColor="#10b981"
                currentUserId={user?.id}
            />
        </div>
    );
}
