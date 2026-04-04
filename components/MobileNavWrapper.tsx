/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi wrapper untuk mobile bottom navigation dengan dynamic import
 */

'use client';

import dynamic from 'next/dynamic';

/**
 * Mobile bottom navigation dengan dynamic import
 * @constant MobileBottomNavContent
 */
const MobileBottomNavContent = dynamic(
    () => import('./MobileBottomNav').then(mod => mod.MobileBottomNav),
    { ssr: false }
);

/**
 * Wrapper untuk mobile bottom navigation dengan dynamic import
 * Mencegah render mobile navigation di server-side
 * @param props - Props untuk MobileNavWrapper
 * @param props.role - Role user
 * @returns JSX element mobile bottom navigation
 * @example
 * ```tsx
 * <MobileNavWrapper role="STAFF_CABANG" />
 * ```
 */
export function MobileNavWrapper({ role }: { role: string }) {
    return <MobileBottomNavContent role={role} />;
}
