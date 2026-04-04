/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi komponen prompt update PWA untuk memberitahu pengguna
 * tentang ketersediaan versi baru aplikasi.
 */

'use client';

import { RefreshCw, X } from 'lucide-react';

/**
 * Props untuk komponen PWAUpdatePrompt
 * @interface PWAUpdatePromptProps
 */
interface PWAUpdatePromptProps {
  /** Apakah prompt visible */
  visible: boolean;
  /** Apakah sedang dalam proses update */
  updating: boolean;
  /** Callback saat tombol reload diklik */
  onReload: () => void;
  /** Callback saat tombol dismiss diklik */
  onDismiss: () => void;
}

/**
 * Komponen prompt update PWA
 * Menampilkan banner notifikasi saat versi baru tersedia
 * @param PWAUpdatePromptProps - Props komponen
 * @returns JSX element prompt update atau null jika tidak visible
 * @example
 * ```tsx
 * <PWAUpdatePrompt
 *   visible={showUpdate}
 *   updating={isUpdating}
 *   onReload={() => window.location.reload()}
 *   onDismiss={() => setShowUpdate(false)}
 * />
 * ```
 */
export default function PWAUpdatePrompt({
  visible,
  updating,
  onReload,
  onDismiss,
}: PWAUpdatePromptProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[110] md:left-auto md:max-w-md">
      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl shadow-emerald-950/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-900">Versi baru tersedia</p>
            <p className="mt-1 text-sm text-emerald-800/80">
              Muat ulang untuk memakai aset dan perbaikan terbaru.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-emerald-700/60 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
            aria-label="Tutup notifikasi update"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onReload}
          disabled={updating}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
          {updating ? 'Memuat ulang...' : 'Muat ulang sekarang'}
        </button>
      </div>
    </div>
  );
}
