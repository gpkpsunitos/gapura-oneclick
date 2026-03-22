'use client';

import { useState } from 'react';
import { QRCodeWithLogo } from '@/components/ui/QRCodeWithLogo';

const HANDBOOK_URL = 'https://sis.appsdev.my.id/';

export default function SLAHandbookPage() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(HANDBOOK_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[var(--surface-0)]">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-16 space-y-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">SLA Handbook</h1>
        <div className="grid gap-4">
          <div className="p-6 rounded-2xl border border-[var(--surface-4)] bg-white flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-[var(--text-primary)]">SLA Handbook</p>
                <a
                  href={HANDBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {HANDBOOK_URL}
                </a>
              </div>
              <div className="flex items-center justify-center p-3 rounded-xl border border-[var(--surface-4)] bg-[var(--surface-1)]">
                <QRCodeWithLogo value={HANDBOOK_URL} size={156} fgColor="#0ea5a6" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Link</span>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={HANDBOOK_URL}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--surface-4)] bg-[var(--surface-1)] text-sm"
                />
                <button
                  onClick={copy}
                  className="px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-bold active:scale-95"
                >
                  {copied ? 'Tersalin' : 'Copy'}
                </button>
                <a
                  href={HANDBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-primary)] text-sm font-bold border border-[var(--surface-4)] active:scale-95"
                >
                  Buka
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

