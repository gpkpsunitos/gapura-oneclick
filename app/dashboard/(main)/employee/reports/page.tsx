/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman daftar laporan untuk employee dengan fitur filter dan AI summary
 */

'use client';

import { useState, useEffect } from 'react';
import { type Report, type UserRole } from '@/types';
import { ReportMasterDetail } from '@/components/dashboard/ReportMasterDetail';
import { AISummaryKPICards } from '@/components/dashboard/ai-summary';

/**
 * Interface untuk data session user
 */
interface UserSession {
    /** ID unik user */
    id: string;
    /** Role user (contoh: MANAGER_CABANG, STAFF_CABANG) */
    role: UserRole;
    /** Nama lengkap user */
    full_name: string;
    /** ID stasiun tempat user bertugas (opsional) */
    station_id?: string;
}

/**
 * Komponen halaman daftar laporan employee
 * Menampilkan AI Summary KPI dan daftar laporan dengan filter
 * @returns JSX element halaman laporan employee
 */
export default function EmployeeReportsPage() {
    /** State untuk menyimpan daftar laporan */
    const [reports, setReports] = useState<Report[]>([]);
    /** State untuk indikator loading */
    const [loading, setLoading] = useState(true);
    /** State untuk menyimpan data session user */
    const [userSession, setUserSession] = useState<UserSession | null>(null);

    // Fetch current user session with station info
    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        /**
         * Mengambil data session user saat ini dari API
         * Menyimpan informasi user termasuk role dan stasiun
         * @throws {Error} Jika terjadi kesalahan saat mengambil data session
         */
        const fetchSession = async () => {
            try {
                const res = await fetch('/api/auth/me', { signal });
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
                if (error instanceof DOMException && error.name === 'AbortError') return;
                console.error('Failed to fetch session:', error);
            }
        };
        fetchSession();

        return () => controller.abort();
    }, []);

    /**
     * Mengambil daftar laporan dari API
     * @throws {Error} Jika terjadi kesalahan saat mengambil data laporan
     */
    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports');
            if (res.ok) {
                const data = await res.json();
                setReports(Array.isArray(data) ? data : (data?.reports || []));
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Fetch laporan setelah user session tersedia
     * Mengambil laporan hanya jika session user sudah berhasil diambil
     */
    useEffect(() => {
        if (!userSession) return;
        void fetchReports();
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
                userRole={displayRole}
                currentUserId={userSession?.id}
                currentUserStationId={userSession?.station_id}
            />
        </div>
    );
}
