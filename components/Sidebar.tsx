/**
 * @file
 * 
 * File ini berisi komponen Sidebar untuk navigasi utama aplikasi dengan dukungan responsive dan mobile
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { LogOut, Menu, Undo2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo, memo, useCallback } from 'react';

import { LINKS_CONFIG, GET_LINKS_KEY, type NavGroupConfig as NavGroup } from '@/lib/nav-config';
import { performOptimisticLogout } from '@/lib/auth/client-logout';
import { useStaticData } from '@/lib/swr';

declare global {
    interface Window {
        toggleMobileSidebar: () => void;
    }
}
/**
 * Props untuk komponen NavContent
 * @interface NavContentProps
 */
interface NavContentProps {
    /** Array grup navigasi */
    groups: NavGroup[];
    /** Current pathname */
    pathname: string;
    /** Current search params */
    searchParams: URLSearchParams;
    /** Role user saat ini */
    role: string;
    /** Handler saat logout */
    onLogout: () => void;
    /** Handler saat kembali ke akun asal */
    onReturnToOrigin: () => void;
    /** Flag apakah bisa kembali ke akun asal */
    canReturnToOrigin: boolean;
    /** Status loading logout */
    loading: boolean;
    /** Status switching origin */
    switchingOrigin: boolean;
    /** Setter untuk state mobile sidebar open */
    setMobileOpen: (value: boolean) => void;
}


// Maps raw DB role strings to human-readable display names
// Complexity: Time O(1) | Space O(1)
const ROLE_DISPLAY: Record<string, string> = {
    DIVISI_OS: 'Unit Service',
    PARTNER_OS: 'Unit Service',
    DIVISI_OP: 'Operational Service',
    PARTNER_OP: 'Operational Service',
    DIVISI_HT: 'HT Division',
    PARTNER_HT: 'HT Division',
    DIVISI_HC: 'Employee',
    PARTNER_HC: 'Employee',
    DIVISI_ESKALASI: 'Escalation',
    MANAGER_CABANG: 'Branch Manager',
    STAFF_CABANG: 'Branch Staff',
    SUPER_ADMIN: 'Super Admin',
    ANALYST: 'Analyst',
};

/**
 * Mendapatkan nama display role yang human-readable
 * @param role - Role string dari database
 * @returns Nama role yang sudah diformat
 * @example
 * ```tsx
 * const displayName = resolveRoleDisplayName('DIVISI_OS');
 * // returns: 'Unit Service'
 * ```
 */
function resolveRoleDisplayName(role: string): string {
    const upper = role.toUpperCase();
    return ROLE_DISPLAY[upper] ?? role.replace(/_/g, ' ');
}

/**
 * Komponen konten navigasi untuk sidebar
 * Menampilkan logo, menu navigasi, dan user info
 * @param props - Props untuk NavContent
 * @returns JSX element konten navigasi
 */
const NavContent = memo(function NavContent({
    groups,
    pathname,
    searchParams,
    role,
    onLogout,
    onReturnToOrigin,
    canReturnToOrigin,
    loading,
    switchingOrigin,
    setMobileOpen
}: NavContentProps) {
    return (<div className="flex flex-col h-full bg-[var(--surface-1)] text-[var(--text-primary)]">
        <div className="p-4 border-b border-dashed border-gray-200 flex justify-center md:p-6 md:pb-6">
             <Image
                src="/logo.png"
                alt="Gapura Logo"
                width={180}
                height={60}
                className="object-contain w-[120px] md:w-[140px]"
                style={{ width: 'auto', height: 'auto' }}
                priority
            />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 md:px-4 md:py-6 touch-scroll hide-scrollbar">
            <div className="space-y-6 md:space-y-8">
                {groups.map((group) => (
                    <div key={group.title} className="relative">
                        <div className="flex items-center gap-2 px-2 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] opacity-50" />
                            <h3 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                {group.title}
                            </h3>
                        </div>

                        <div className="relative pl-2.5 ml-1 border-l border-dashed border-gray-200 space-y-0.5 md:space-y-1">
                            {group.items.map((link, index) => {
                                const isExternal = link.external || /^https?:\/\//.test(link.href);
                                let isActive = !isExternal && pathname === link.href;
                                if (!isActive && !isExternal && pathname === '/dashboard/op' && link.href === '/dashboard/op/reports' && searchParams.get('view') === 'reports') {
                                    isActive = true;
                                }
                                if (isActive && !isExternal && pathname === '/dashboard/op' && link.href === '/dashboard/op' && searchParams.get('view') === 'reports') {
                                    isActive = false;
                                }
                                const Icon = link.icon;
                                const itemKey = `${group.title}:${link.label}:${link.href}:${index}`;
                                if (link.comingSoon) {
                                    return (
                                        <button
                                            key={itemKey}
                                            type="button"
                                            onClick={() => {
                                                setMobileOpen(false);
                                                alert('Feature is in development');
                                            }}
                                            className="block w-full text-left relative group pl-4"
                                        >
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-200 group-hover:bg-gray-400 transition-colors" />
                                            <div
                                                className={cn(
                                                    "relative flex items-center gap-2 md:gap-3 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200",
                                                    "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-secondary)]",
                                                    "hover:translate-x-1"
                                                )}
                                            >
                                                <Icon size={14} className="shrink-0 text-[var(--text-muted)] md:size-4" />
                                                <span className="flex-1">{link.label}</span>
                                                <span className="rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                                    Soon
                                                </span>
                                            </div>
                                        </button>
                                    );
                                }
                                return isExternal ? (
                                    <a
                                        key={itemKey}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setMobileOpen(false)}
                                        className="block relative group pl-4"
                                    >
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-200 group-hover:bg-gray-400 transition-colors" />
                                        <div
                                            className={cn(
                                                "relative flex items-center gap-2 md:gap-3 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200",
                                                "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                                                "hover:translate-x-1"
                                            )}
                                        >
                                            <Icon size={14} className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] md:size-4" />
                                            <span className="flex-1">{link.label}</span>
                                        </div>
                                    </a>
                                ) : (
                                    <Link
                                        key={itemKey}
                                        href={link.href}
                                        onClick={() => setMobileOpen(false)}
                                        className="block relative group pl-4"
                                    >
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-200 group-hover:bg-gray-400 transition-colors" />

                                        <div
                                            className={cn(
                                                "relative flex items-center gap-2 md:gap-3 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200",
                                                isActive
                                                    ? "bg-[var(--surface-2)] text-[var(--text-primary)] shadow-sm ring-1 ring-gray-200"
                                                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                                                "hover:translate-x-1"
                                            )}
                                        >
                                            <Icon size={14} className={cn(
                                                "shrink-0 md:size-4",
                                                isActive ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                                            )} />

                                            <span className="flex-1">{link.label}</span>

                                            {link.count && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-3)] text-[9px] md:text-[10px] font-bold text-[var(--text-secondary)]">
                                                    {link.count}
                                                </span>
                                            )}

                                            {isActive && (
                                                 <div
                                                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]"
                                                 />
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </nav>

        <div className="p-3 border-t border-dashed border-gray-200 bg-[var(--surface-1)] md:p-4">
             <div className="bg-[var(--surface-2)] rounded-xl p-2.5 md:p-3 border border-gray-100 shadow-sm relative">
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 group/user">
                     <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] md:text-xs font-bold text-white border border-emerald-400">
                         {resolveRoleDisplayName(role).charAt(0).toUpperCase()}
                     </div>
                     <div className="min-w-0 flex-1">
                         <p className="text-[10px] md:text-xs font-bold text-[var(--text-primary)] truncate group-hover/user:text-[var(--brand-primary)] italic transition-colors uppercase">
                            {resolveRoleDisplayName(role)}
                        </p>
                         <p className="text-[9px] md:text-[10px] text-[var(--text-muted)] truncate">Active Account</p>
                     </div>
                </div>

                {canReturnToOrigin && (
                    <button
                        onClick={onReturnToOrigin}
                        disabled={switchingOrigin || loading}
                        className="w-full flex items-center justify-center gap-1.5 md:gap-2 py-1.5 mb-1.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-[var(--brand-primary)] hover:bg-emerald-50 active:bg-emerald-100 transition-colors"
                    >
                        <Undo2 size={12} />
                        {switchingOrigin ? '...' : 'Back to Escalation'}
                    </button>
                )}

                <button
                    onClick={onLogout}
                    disabled={loading || switchingOrigin}
                    className="w-full flex items-center justify-center gap-1.5 md:gap-2 py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                >
                    <LogOut size={12} />
                    {loading ? '...' : 'Sign Out'}
                </button>
             </div>
        </div>
    </div>
);
});

/**
 * Komponen Sidebar utama untuk navigasi aplikasi
 * Mendukung tampilan desktop dan mobile dengan animasi smooth
 * @param props - Props untuk Sidebar
 * @param props.role - Role user untuk menentukan menu navigasi
 * @returns JSX element sidebar responsive
 * @example
 * ```tsx
 * <Sidebar role="DIVISI_OS" />
 * ```
 */
export default function Sidebar({ role }: { role: string }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [switchingOrigin, setSwitchingOrigin] = useState(false);

    // Use SWR for bundle info — cached, deduplicated, no re-fetch on pathname change
    const { data: bundleInfo } = useStaticData<{
        active: string | null;
        origin: string | null;
        accounts: Array<{
            id: string;
            role: string;
            isCurrent: boolean;
            isOrigin: boolean;
        }>;
    } | null>(role ? '/api/auth/bundle' : null);

    const configKey = GET_LINKS_KEY(role || '');
    const groups = LINKS_CONFIG[configKey];

    const handleLogout = useCallback(() => {
        setLoading(true);
        performOptimisticLogout();
    }, []);

    const handleReturnToOrigin = useCallback(async () => {
        if (!bundleInfo?.origin) return;

        try {
            setSwitchingOrigin(true);
            const res = await fetch('/api/auth/switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: bundleInfo.origin }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'Failed to switch back to escalation');
            }

            router.push('/dashboard/eskalasi/select');
            router.refresh();
        } catch (error) {
            console.error('Failed to switch back to eskalasi:', error);
            setSwitchingOrigin(false);
            window.alert(error instanceof Error ? error.message : 'Failed to switch back to escalation');
        }
    }, [bundleInfo?.origin, router]);

    const canReturnToOrigin = Boolean(
        bundleInfo?.origin &&
        bundleInfo?.active &&
        bundleInfo.origin !== bundleInfo.active
    );

    const navContentProps = useMemo(() => ({
        groups,
        pathname,
        searchParams,
        role,
        onLogout: handleLogout,
        onReturnToOrigin: handleReturnToOrigin,
        canReturnToOrigin,
        loading,
        switchingOrigin,
        setMobileOpen
    }), [groups, pathname, searchParams, role, handleLogout, handleReturnToOrigin, canReturnToOrigin, loading, switchingOrigin]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.toggleMobileSidebar = () => setMobileOpen(prev => !prev);
        }
    }, []);

    return (
        <>
            <div className="md:hidden fixed top-4 left-4 z-50 pointer-events-none opacity-0">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2.5 bg-white rounded-xl shadow-md border border-gray-200 text-[var(--text-primary)] active:scale-95 transition-transform"
                >
                    <Menu size={20} />
                </button>
            </div>

            {/* Mobile drawer overlay — CSS transitions replace framer-motion */}
            <div
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setMobileOpen(false)}
            />
            <div
                className={`fixed inset-y-0 left-0 w-[280px] max-w-[85vw] z-50 shadow-2xl md:hidden transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                 <NavContent {...navContentProps} />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-3 right-3 p-1.5 bg-[var(--surface-2)] rounded-lg text-[var(--text-muted)] active:bg-[var(--surface-3)]"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="hidden md:block fixed top-0 left-0 h-screen w-[240px] lg:w-[260px] z-40 border-r border-dashed border-gray-200 shadow-[2px_0_24px_rgba(0,0,0,0.02)]">
                <NavContent {...navContentProps} />
            </div>
        </>
    );
}
