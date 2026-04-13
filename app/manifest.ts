/**
 * @file
 * Dibuat oleh Claude
 *
 * File ini berisi konfigurasi PWA manifest untuk aplikasi OneClick.
 * Mengikuti standar Google Play Protect dan Web App Manifest spec.
 */

import type { MetadataRoute } from "next";

/**
 * Mengenerate manifest PWA untuk aplikasi OneClick
 * @returns Object manifest dengan konfigurasi PWA
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "OneClick",
    short_name: "OneClick",
    description:
      "Sistem pelaporan & monitoring operasional bandara yang cepat dan bisa offline.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6fbf8",
    theme_color: "#0f766e",
    lang: "id",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/pwa-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/pwa-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/login-install.png",
        sizes: "1440x1080",
        type: "image/png",
        label: "Halaman login Gapura untuk akses cepat dari layar utama.",
        form_factor: "wide",
      },
      {
        src: "/screenshots/public-report-install.png",
        sizes: "1440x1080",
        type: "image/png",
        label: "Form public report untuk pelaporan cepat dari perangkat mobile.",
        form_factor: "wide",
      },
      // Narrow (mobile) screenshots — required by Google Play Store / ChromeOS install UX
      // Buat screenshot mobile 390x844 atau 750x1334 dan taruh di /screenshots/
      {
        src: "/screenshots/login-narrow.png",
        sizes: "750x1334",
        type: "image/png",
        label: "Halaman login Gapura di perangkat mobile.",
        form_factor: "narrow",
      },
      {
        src: "/screenshots/public-report-narrow.png",
        sizes: "750x1334",
        type: "image/png",
        label: "Form pelaporan cepat di perangkat mobile.",
        form_factor: "narrow",
      },
    ],
    shortcuts: [
      {
        name: "Laporkan Insiden",
        short_name: "Lapor",
        url: "/auth/public-report",
        icons: [
          {
            src: "/icons/pwa-192-maskable.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
