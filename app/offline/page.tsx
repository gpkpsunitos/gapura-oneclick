'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-8 bg-emerald-50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-emerald-100 shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="Gapura" width={64} height={64} className="object-contain" />
        </div>
        <h1 className="text-xl font-bold text-emerald-800">Anda sedang offline</h1>
        <p className="text-emerald-700/80 mt-2">
          Koneksi internet tidak tersedia. Beberapa halaman masih bisa dibuka, silakan coba lagi nanti.
        </p>
        <Link href="/" className="inline-flex mt-6 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
