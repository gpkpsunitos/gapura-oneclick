import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@fontsource/bricolage-grotesque/latin.css';
import '@fontsource/jetbrains-mono/latin.css';

import PWAProvider from '@/components/PWAProvider';

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#10b981' },
        { media: '(prefers-color-scheme: dark)', color: '#0ea5a2' }
    ],
};

export const metadata: Metadata = {
    title: 'Gapura OneClick',
    applicationName: 'OneClick',
    description: 'Gapura OneClick - Sistem Pelaporan & Monitoring Operasional Bandara',
    manifest: '/manifest.webmanifest',
    icons: {
        icon: [
            { url: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
        shortcut: '/icons/pwa-192.png',
        apple: [
            { url: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
        ],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'OneClick',
    },
    formatDetection: {
        telephone: false,
    },
    openGraph: {
        type: 'website',
        siteName: 'OneClick',
        title: 'Gapura OneClick',
        description: 'Sistem Pelaporan & Monitoring Operasional Bandara',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Gapura OneClick',
        description: 'Sistem Pelaporan & Monitoring Operasional Bandara',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="id">
            <body>
                <PWAProvider>
                    {children}
                </PWAProvider>
            </body>
        </html>
    );
}
