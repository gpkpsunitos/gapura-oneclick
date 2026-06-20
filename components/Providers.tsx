'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { SWRConfig } from 'swr';
import type { SWRConfiguration } from 'swr';
import { fetcher as sharedFetcher, swrCache } from '@/lib/swr';

const PWAProvider = dynamic(() => import('@/components/PWAProvider'), {
    ssr: false,
    loading: () => null,
});

const onErrorRetry: NonNullable<SWRConfiguration['onErrorRetry']> = (_error, _key, _config, revalidate, options) => {
    if (options.retryCount >= 3) return;
    setTimeout(() => revalidate({ retryCount: options.retryCount }), Math.min(options.retryCount * 2000, 10000));
};

const swrConfig: SWRConfiguration = {
    fetcher: sharedFetcher,
    provider: () => swrCache as any,
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    onErrorRetry,
};

export default function Providers({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLightweightRoute = pathname.startsWith('/auth/') || pathname.startsWith('/embed/') || pathname === '/offline';

    if (isLightweightRoute) {
        return (
            <SWRConfig value={swrConfig}>
                {children}
            </SWRConfig>
        );
    }

    return (
        <SWRConfig value={swrConfig}>
            <PWAProvider>
                {children}
            </PWAProvider>
        </SWRConfig>
    );
}
