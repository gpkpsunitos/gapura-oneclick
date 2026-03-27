import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "OneClick",
    short_name: "OneClick",
    description:
      "Sistem pelaporan dan monitoring operasional OneClick yang dapat diinstal sebagai aplikasi web progresif.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6fbf8",
    theme_color: "#0f766e",
    lang: "id",
    categories: ["business", "productivity", "utilities"],
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
      },
      {
        src: "/screenshots/public-report-install.png",
        sizes: "1440x1080",
        type: "image/png",
        label: "Form public report untuk pelaporan cepat dari perangkat mobile.",
      },
    ],
  };
}
