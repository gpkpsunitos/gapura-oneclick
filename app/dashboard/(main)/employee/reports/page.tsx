'use client';

import { useState, useEffect } from 'react';
import { type Report, type UserRole } from '@/types';
import { ReportMasterDetail } from '@/components/dashboard/ReportMasterDetail';
import { canExportBranchData } from '@/lib/permissions';
import { AISummaryKPICards } from '@/components/dashboard/ai-summary';

interface UserSession {
    id: string;
    role: UserRole;
    full_name: string;
    station_id?: string;
}

export default function EmployeeReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [userSession, setUserSession] = useState<UserSession | null>(null);

    // Fetch current user session with station info
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const userData = await res.json();
                    if (userData.id) {
                        setUserSession({
                            id: userData.id,
                            role: userData.role,
                            full_name: userData.full_name,
                            station_id: userData.station_id,
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch session:', error);
            }
        };
        fetchSession();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports');
            if (res.ok) {
                const data = await res.json();
                // API now handles all filtering server-side for security
                // No client-side filtering needed
                setReports(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!userSession) return;
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
            } catch {}
            await fetchReports();
        };
        run();
        return () => controller.abort();
    }, [userSession]);

    // Determine user role for ReportDetailView
    // ReportDetailView uses simplified role strings, but we pass the actual role
    // and it will need to handle MANAGER_CABANG and STAFF_CABANG
    const displayRole = userSession?.role || 'STAFF_CABANG';

    return (
        <div className="space-y-6">
            {/* AI Summary KPI Cards */}
            <AISummaryKPICards showHeader={true} hideActionIntelligence={true} />
            
            {/* Reports Master Detail */}
            <ReportMasterDetail
                title="Laporan Saya"
                reports={reports}
                loading={loading}
                // Pass actual role so export buttons can be conditionally shown based on canExportBranchData
                userRole={displayRole}
                currentUserId={userSession?.id}
                currentUserStationId={userSession?.station_id}
            />
        </div>
    );
}
