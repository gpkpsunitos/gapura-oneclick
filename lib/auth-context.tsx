'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthUser {
    id: string;
    email: string;
    role: string;
    full_name?: string;
    division?: string;
    station_id?: string;
    status?: string;
    avatar_url?: string;
    phone?: string;
    nik?: string;
    station?: { id: string; code: string; name: string };
    unit?: { name: string };
    position?: { name: string };
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            if (path.startsWith('/auth/') || path.startsWith('/embed/')) {
                setLoading(false);
                return;
            }
        }
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return (
        <AuthContext.Provider value={{ user, loading, refresh: fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    return useContext(AuthContext);
}
