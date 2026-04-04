/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi React hook terpusat untuk autentikasi,
 * termasuk pengecekan status login, fetch data user, dan redirect otomatis
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { fetchWithDemo } from '@/lib/utils';

/**
 * Nilai kembalian dari useAuth hook
 */
interface UseAuthReturn {
    /** Data user yang sedang login */
    user: User | null;
    /** Status loading */
    loading: boolean;
    /** Apakah user sudah terautentikasi */
    isAuthenticated: boolean;
    /** Fungsi untuk refresh data user */
    refresh: () => Promise<void>;
}

/**
 * useAuth - Centralized authentication hook
 * Eliminates duplicate fetchUser logic across dashboards
 * Auto-redirects to /login if unauthorized
 * Complexity: Time O(1) | Space O(1)
 * 
 * @param redirectOnFail - Apakah redirect ke login jika gagal (default: true)
 * @returns Object berisi state dan fungsi autentikasi
 */
export function useAuth(redirectOnFail: boolean = true): UseAuthReturn {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    /**
     * Fetch data user dari API
     */
    const fetchUser = useCallback(async () => {
        try {
            const res = await fetchWithDemo('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else if (redirectOnFail) {
                router.push('/auth/login');
            }
        } catch (error) {
            console.error('Auth error:', error);
            if (redirectOnFail) {
                router.push('/auth/login');
            }
        } finally {
            setLoading(false);
        }
    }, [router, redirectOnFail]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return {
        user,
        loading,
        isAuthenticated: !!user,
        refresh: fetchUser
    };
}
