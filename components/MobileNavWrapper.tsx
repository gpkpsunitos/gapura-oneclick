'use client';

import dynamic from 'next/dynamic';

const MobileBottomNavContent = dynamic(
    () => import('./MobileBottomNav').then(mod => mod.MobileBottomNav),
    { ssr: false }
);

export function MobileNavWrapper({ role }: { role: string }) {
    return <MobileBottomNavContent role={role} />;
}
