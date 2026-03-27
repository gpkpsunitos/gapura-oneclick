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
        <main className="flex-1 min-h-screen overflow-x-hidden bg-[var(--surface-0)] flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <main className="flex-1 min-h-screen overflow-x-hidden bg-[var(--surface-0)] flex flex-col pb-24 md:pb-0 md:pl-[240px] lg:pl-[260px]">
        {children}
      </main>
      <MobileNavWrapper role={role} />
    </div>
  );
}
