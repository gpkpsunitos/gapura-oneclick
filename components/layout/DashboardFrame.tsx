'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { MobileNavWrapper } from '@/components/MobileNavWrapper';
import { cn } from '@/lib/utils';

const SIDEBAR_HIDDEN_PATHS = new Set([
  '/dashboard/eskalasi/select',
  '/dashboard/eskalasi/performance-links',
  '/dashboard/eskalasi/documents',
]);

export function DashboardFrame({ role, division, children }: { role: string; division?: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = SIDEBAR_HIDDEN_PATHS.has(pathname ?? '');

  if (hideSidebar) {
    return (
      <div className="flex min-h-screen">
        <main className="flex-1 min-h-screen min-w-0 bg-[var(--surface-0)] flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  const isEskalasi = role === 'DIVISI_ESKALASI';

  // ponytail: sidebar reserves space only at xl+ (matches Sidebar collapseBp),
  // so portrait tablets (incl. iPad Pro 12.9" @ 1024px) get full width + bottom nav.
  const collapsePx = 1280;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} division={division} />
      {}
      <main
        className={cn(
          'flex-1 min-h-screen min-w-0 bg-[var(--surface-0)] flex flex-col',
          isEskalasi ? 'pb-0' : 'pb-[calc(6.5rem+env(safe-area-inset-bottom))] xl:pb-0'
        )}
        // Sidebar's `xl:block` triggers at 100vw >= collapsePx (inclusive), so the
        // padding step must flip on the same boundary — using collapsePx directly
        // left padding at 0 at exactly 1280px while the fixed sidebar was already
        // visible, covering the first 240px of content.
        style={{ paddingLeft: `clamp(0px, (100vw - ${collapsePx - 1}px) * 999, 240px)`, maxWidth: '100%' }}
      >
        <div className="w-full min-w-0 flex-1 flex flex-col xl:pl-5">
          {children}
        </div>
      </main>
      {!isEskalasi && <MobileNavWrapper role={role} division={division} />}
    </div>
  );
}
