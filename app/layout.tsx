/**
 * @file
 * 
 * File ini berisi layout utama aplikasi dengan konfigurasi metadata dan PWA
 */

import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

import Providers from '@/components/Providers';
import PerformanceTelemetry from '@/components/PerformanceTelemetry';

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ['latin'],
    display: 'swap',
    preload: true,
    adjustFontFallback: true,
    variable: '--font-plus-jakarta',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400'],
    display: 'swap',
    preload: false,
    adjustFontFallback: true,
    variable: '--font-jetbrains-mono',
});

const metadataBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000');

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
    metadataBase: new URL(metadataBaseUrl),
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
        <html lang="id" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
            <body>
                <Providers>
                    {children}
                </Providers>
                <PerformanceTelemetry />
            </body>
        </html>
    );
}
