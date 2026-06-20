'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { MobileNavWrapper } from '@/components/MobileNavWrapper';

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
        className="flex-1 min-h-screen min-w-0 overflow-x-hidden bg-[var(--surface-0)] flex flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0"
        style={{ paddingLeft: 'clamp(0px, (100vw - 768px) * 999, 240px)', maxWidth: '100%' }}
      >
        <div className="w-full min-w-0 flex-1 flex flex-col lg:pl-5">
          {children}
        </div>
      </main>
      <MobileNavWrapper role={role} />
    </div>
  );
}
