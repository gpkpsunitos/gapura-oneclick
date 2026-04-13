/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi layout utama aplikasi dengan konfigurasi metadata dan PWA
 */

import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@fontsource/bricolage-grotesque/latin.css';
import '@fontsource/jetbrains-mono/latin.css';

import Providers from '@/components/Providers';

/**
 * Konfigurasi viewport untuk responsivitas
 */
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: '#0f766e',
};

/**
 * Metadata aplikasi untuk SEO dan PWA
 */
export const metadata: Metadata = {
    title: 'Gapura OneClick',
    applicationName: 'OneClick',
    description: 'Gapura OneClick - Sistem Pelaporan & Monitoring Operasional Bandara',
    manifest: '/manifest.webmanifest',
    icons: {
        icon: '/icons/pwa-192.png',
        shortcut: '/icons/pwa-192.png',
        apple: '/icons/pwa-192.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'OneClick',
    },
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    openGraph: {
        type: 'website',
        siteName: 'OneClick',
        title: 'Gapura OneClick',
        description: 'Sistem Pelaporan & Monitoring Operasional Bandara',
        images: [
            {
                url: '/icons/pwa-512.png',
                width: 512,
                height: 512,
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Gapura OneClick',
        description: 'Sistem Pelaporan & Monitoring Operasional Bandara',
        images: [
            {
                url: '/icons/pwa-512.png',
                width: 512,
                height: 512,
            },
        ],
    },
    robots: {
        index: true,
        follow: true,
    },
    // TODO: Tambahkan google verification code setelah daftar Google Search Console
    // verification: {
    //     google: 'ACTUAL_VERIFICATION_CODE',
    // },
};

/**
 * Komponen layout utama aplikasi
 * Membungkus konten aplikasi dengan PWAProvider untuk PWA support
 * @param children - Child components yang akan dirender
 * @returns JSX element dengan children dibungkus PWAProvider
 */
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="id">
            <body>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
