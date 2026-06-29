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

  // ponytail: sidebar reserves space only at lg+ (matches Sidebar collapseBp),
  // so portrait tablets get full width + bottom nav.
  const collapsePx = 1024;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} division={division} />
      {}
      <main
        className={cn(
          'flex-1 min-h-screen min-w-0 bg-[var(--surface-0)] flex flex-col',
          isEskalasi ? 'pb-0' : 'pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0'
        )}
        style={{ paddingLeft: `clamp(0px, (100vw - ${collapsePx}px) * 999, 240px)`, maxWidth: '100%' }}
      >
        <div className="w-full min-w-0 flex-1 flex flex-col lg:pl-5">
          {children}
        </div>
      </main>
      {!isEskalasi && <MobileNavWrapper role={role} division={division} />}
    </div>
  );
}
