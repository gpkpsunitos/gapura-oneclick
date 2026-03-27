'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Report } from '@/types';
import { clientReportsService } from '@/lib/services/client-reports-service';

interface UseReportsOptions {
    endpoint?: string;
    autoFetch?: boolean;
}

interface UseReportsReturn {
    reports: Report[];
    loading: boolean;
    error: string | null;
    fetchReports: () => Promise<void>;
    updateStatus: (reportId: string, action: string) => Promise<boolean>;
    refresh: () => Promise<void>;
}

/**
 * useReports - Centralized hook for report fetching and status updates
 * Uses ClientReportsService for caching and offline support.
 */
export function useReports(options: UseReportsOptions = {}): UseReportsReturn {
    const { autoFetch = true } = options;
    
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(autoFetch);
    const [error, setError] = useState<string | null>(null);

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
