'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Report, User } from '@/types';
import { ReportDetailView } from '@/components/dashboard/ReportDetailView';

const DIVISION = { code: 'OT', name: 'Teknik (GSE)', color: '#f59e0b' };

export default function OTReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const reportId = params.id as string;

    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) setUser(await res.json());
            } catch (err) { console.error('Error fetching user:', err); }
        };

        const fetchReport = async () => {
            try {
                const res = await fetch(`/api/reports/${reportId}`);
                if (!res.ok) throw new Error('Failed to load report');
                setReport(await res.json());
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
        fetchReport();
    }, [reportId]);

    const fetchReport = async () => {
        try {
            const res = await fetch(`/api/reports/${reportId}`);
            if (!res.ok) throw new Error('Failed to load report');
            setReport(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: string, notes?: string, evidenceUrl?: string) => {
        try {
            const body: { reportId: string; status: string; notes?: string; resolution_evidence_url?: string } = { reportId: id, status, notes };
            if (evidenceUrl) body.resolution_evidence_url = evidenceUrl;
            
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
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: DIVISION.color }} />
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h2 className="text-xl font-bold">Error Loading Report</h2>
                <p className="text-gray-500">{error}</p>
                <button onClick={() => router.back()} className="flex items-center gap-2 font-bold hover:underline" style={{ color: DIVISION.color }}>
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
                onClose={() => router.push('/dashboard/ot/reports')}
                userRole={user?.role || 'OT_ADMIN'}
                isModal={false}
                divisionColor={DIVISION.color}
                currentUserId={user?.id}
            />
        </div>
    );
}
