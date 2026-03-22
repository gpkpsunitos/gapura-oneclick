'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeWithLogo } from '@/components/ui/QRCodeWithLogo';

export default function WSNPage() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const links = useMemo(
    () => ({
      monitor: {
        title: 'Monitoring WSN Dashboard',
        url: 'https://lookerstudio.google.com/reporting/55737b14-c27a-4ed8-b65c-336317790314/page/p_ufv08vzhsd',
        short: `${origin}/dashboard/os/wsn?open=monitor`,
      },
      weekly: {
        title: 'Weekly Service Notice Dashboard',
        url: 'https://lookerstudio.google.com/reporting/55737b14-c27a-4ed8-b65c-336317790314/page/p_1swzqz7usd',
        short: `${origin}/dashboard/os/wsn?open=weekly`,
      },
    }),
    [origin]
  );

  useEffect(() => {
    const open = searchParams.get('open');
    if (open === 'monitor') {
      window.location.replace(links.monitor.url);
    } else if (open === 'weekly') {
      window.location.replace(links.weekly.url);
    }
  }, [searchParams, links]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[var(--surface-0)]">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-16 space-y-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">WSN Dashboard</h1>
        <div className="grid gap-4">
          {(['monitor', 'weekly'] as const).map((k) => (
            <div key={k} className="p-6 rounded-2xl border border-[var(--surface-4)] bg-white flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-[var(--text-primary)]">{links[k].title}</p>
                  <a href={links[k].url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                    {links[k].url}
                  </a>
                </div>
                <div className="flex items-center justify-center p-3 rounded-xl border border-[var(--surface-4)] bg-[var(--surface-1)]">
                  <QRCodeWithLogo value={links[k].short} size={156} fgColor="#0ea5a6" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Short Link</span>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={links[k].short}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--surface-4)] bg-[var(--surface-1)] text-sm"
                  />
                  <button
                    onClick={() => copy(links[k].short, k)}
                    className="px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-bold active:scale-95"
                  >
                    {copied === k ? 'Tersalin' : 'Copy'}
                  </button>
                  <a
                    href={links[k].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-primary)] text-sm font-bold border border-[var(--surface-4)] active:scale-95"
                  >
                    Buka
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
