/**
 * @file
 * 
 * File ini berisi React hook untuk pengelolaan laporan,
 * termasuk fetching, update status, dan refresh data
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Report } from '@/types';
import { clientReportsService } from '@/lib/services/client-reports-service';

/**
 * Opsi konfigurasi untuk useReports
 */
interface UseReportsOptions {
    /** Endpoint kustom untuk fetching laporan */
    endpoint?: string;
    /** Otomatis fetch saat mount component */
    autoFetch?: boolean;
}

/**
 * Nilai kembalian dari useReports hook
 */
interface UseReportsReturn {
    /** Daftar laporan */
    reports: Report[];
    /** Status loading */
    loading: boolean;
    /** Pesan error jika ada */
    error: string | null;
    /** Fungsi untuk fetch laporan */
    fetchReports: () => Promise<void>;
    /** Fungsi untuk update status laporan */
    updateStatus: (reportId: string, action: string) => Promise<boolean>;
    /** Fungsi untuk refresh data laporan */
    refresh: () => Promise<void>;
}

/**
 * useReports - Centralized hook for report fetching and status updates
 * Uses ClientReportsService for caching and offline support.
 * 
 * @param options - Opsi konfigurasi hook
 * @returns Object berisi state dan fungsi untuk pengelolaan laporan
 */
export function useReports(options: UseReportsOptions = {}): UseReportsReturn {
    const { autoFetch = true } = options;
    
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(autoFetch);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch laporan dari server dengan caching
     */
    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Use client service which handles caching
            const data = await clientReportsService.getReports();
            setReports(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load reports. Using cached data if available.');
            // Even on error, we might have stale data from service fallback
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Update status laporan
     * 
     * @param reportId - ID laporan yang akan diupdate
     * @param action - Aksi yang akan dilakukan (start, close, dll)
     * @returns Promise boolean true jika berhasil, false jika gagal
     */
    const updateStatus = useCallback(async (reportId: string, action: string): Promise<boolean> => {
        try {
            const res = await fetch(`/api/reports/${reportId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            
            if (res.ok) {
                // Invalidate cache and refetch
                clientReportsService.clearCache(); // Or optimistic update
                await fetchReports();
                return true;
            } else {
                const err = await res.json();
                console.error('Failed to update status:', err);
                return false;
            }
        } catch (error) {
            console.error('Error updating status:', error);
            return false;
        }
    }, [fetchReports]);

    useEffect(() => {
        if (autoFetch) {
            fetchReports();
        }
    }, [autoFetch, fetchReports]);

    return {
        reports,
        loading,
        error,
        fetchReports,
        updateStatus,
        refresh: fetchReports
    };
}

/**
 * mapStatusToAction - Maps status string to API action
 * 
 * @param status - String status yang akan di-mapping
 * @returns String aksi API atau null jika tidak ditemukan
 */
export function mapStatusToAction(status: string): string | null {
    const actionMap: Record<string, string> = {
        ACKNOWLEDGED: 'acknowledge',
        ON_PROGRESS: 'start',
        WAITING_VALIDATION: 'submit_evidence',
        CLOSED: 'validate',
        RETURNED: 'return',
    };
    return actionMap[status] || null;
}
