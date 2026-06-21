'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { MobileNavWrapper } from '@/components/MobileNavWrapper';
import { cn } from '@/lib/utils';

export function DashboardFrame({ role, children }: { role: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = pathname === '/dashboard/eskalasi/select';

  if (hideSidebar) {
    return (
      <div className="flex min-h-screen">
        <main className="flex-1 min-h-screen min-w-0 overflow-x-hidden bg-[var(--surface-0)] flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  const isEskalasi = role === 'DIVISI_ESKALASI';
  // Eskalasi's bottom nav has no equivalent links for this role, so it relies on the
  // sidebar's own drawer (collapses at `lg` instead of `md` to also cover iPad widths).
  const collapsePx = isEskalasi ? 1024 : 768;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      {/*
        The sidebar is `position: fixed` so it takes no block space.
        We reserve its width explicitly via padding-left to prevent
        a layout shift (CLS) when Tailwind's md:pl-[240px] class resolves
        after hydration. Using inline style ensures it is applied on
        server render before any JS runs.
      */}
      <main
        className={cn(
          'flex-1 min-h-screen min-w-0 overflow-x-hidden bg-[var(--surface-0)] flex flex-col',
          isEskalasi ? 'pb-0' : 'pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0'
        )}
        style={{ paddingLeft: `clamp(0px, (100vw - ${collapsePx}px) * 999, 240px)`, maxWidth: '100%' }}
      >
        <div className="w-full min-w-0 flex-1 flex flex-col lg:pl-5">
          {children}
        </div>
      </main>
      {!isEskalasi && <MobileNavWrapper role={role} />}
    </div>
  );
}
