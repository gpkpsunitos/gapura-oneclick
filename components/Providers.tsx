'use client';

import { SWRConfig } from 'swr';
import { AuthProvider } from '@/lib/auth-context';
import PWAProvider from '@/components/PWAProvider';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
    return res.json();
};

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SWRConfig value={{
            fetcher,
            revalidateOnFocus: false,
            dedupingInterval: 30000,
            onErrorRetry: (error: any, _key: string, _config: any, revalidate: any, { retryCount }: { retryCount: number }) => {
                if (retryCount >= 3) return;
                setTimeout(() => revalidate({ retryCount }), Math.min(retryCount * 2000, 10000));
            },
        }}>
            <AuthProvider>
                <PWAProvider>
                    {children}
                </PWAProvider>
            </AuthProvider>
        </SWRConfig>
    );
}
