/**
 * @file
 * 
 * File ini berisi halaman daftar laporan untuk employee dengan fitur filter
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type Report, type UserRole } from '@/types';
import { ReportMasterDetail } from '@/components/dashboard/ReportMasterDetail';

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
    /** Detail stasiun user */
    station?: { id: string; code: string; name: string } | null;
}

/**
 * Komponen halaman daftar laporan employee
 * Menampilkan daftar laporan dengan filter
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
                            station: userData.station || null,
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
        if (userSession.role === 'MANAGER_CABANG') return;
        void fetchReports();
    }, [userSession]);

    if (!userSession) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-slate-500">
                Memuat data laporan...
            </div>
        );
    }

    // Determine user role for ReportDetailView
    // ReportDetailView uses simplified role strings, but we pass the actual role
    // and it will need to handle MANAGER_CABANG and STAFF_CABANG
    const displayRole = userSession.role || 'STAFF_CABANG';

    if (userSession.role === 'MANAGER_CABANG') {
        return <ManagerReportsRedirect />;
    }

    return (
        <div className="space-y-6">
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

function ManagerReportsRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/manager/reports');
    }, [router]);
    return (
        <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-slate-500">
            Mengarahkan ke All Reports Cabang...
        </div>
    );
}
