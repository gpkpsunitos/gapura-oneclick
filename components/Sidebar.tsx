'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, LogOut, Plane, Menu, X, ClipboardList, Users, ChevronRight, Hash, FolderOpen, Shield, Brain, Inbox, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logoutWithPwaCleanup } from '@/lib/pwa/logout';

import { LINKS_CONFIG, GET_LINKS_KEY, type NavGroupConfig as NavGroup, type NavItemConfig as NavItem } from '@/lib/nav-config';

declare global {
    interface Window {
        toggleMobileSidebar: () => void;
    }
}
interface NavContentProps {
    groups: NavGroup[];
    pathname: string;
    role: string;
    onLogout: () => void;
    loading: boolean;
    setMobileOpen: (value: boolean) => void;
}

const NavContent = ({ 
    groups, 
    pathname, 
    role, 
    onLogout, 
    loading,
    setMobileOpen 
}: NavContentProps) => (
    <div className="flex flex-col h-full bg-[var(--surface-1)] text-[var(--text-primary)]">
        <div className="p-4 border-b border-dashed border-gray-200 flex justify-center md:p-6 md:pb-6">
             <Image
                src="/logo.png"
                alt="Gapura Logo"
                width={180}
                height={60}
                className="object-contain w-[120px] md:w-[140px] h-auto"
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
                            {group.items.map((link) => {
                                const isExternal = link.external || /^https?:\/\//.test(link.href);
                                const isActive = !isExternal && pathname === link.href;
                                const Icon = link.icon;
                                return isExternal ? (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setMobileOpen(false)}
                                        className="block relative group pl-4"
                                    >
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-200 group-hover:bg-gray-400 transition-colors" />
                                        <motion.div
                                            className={cn(
                                                "relative flex items-center gap-2 md:gap-3 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200",
                                                "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                                            )}
                                            whileHover={{ x: 4 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        >
                                            <Icon size={14} className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] md:size-4" />
                                            <span className="flex-1">{link.label}</span>
                                        </motion.div>
                                    </a>
                                ) : (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMobileOpen(false)}
                                        className="block relative group pl-4"
                                    >
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-200 group-hover:bg-gray-400 transition-colors" />

                                        <motion.div
                                            className={cn(
                                                "relative flex items-center gap-2 md:gap-3 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200",
                                                isActive 
                                                    ? "bg-[var(--surface-2)] text-[var(--text-primary)] shadow-sm ring-1 ring-gray-200"
                                                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                                            )}
                                            whileHover={{ x: 4 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
                                                 <motion.div
                                                    layoutId="active-indicator"
                                                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]"
                                                 />
                                            )}
                                        </motion.div>
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
                         {role.charAt(0)}
                     </div>
                     <div className="min-w-0 flex-1">
                         <p className="text-[10px] md:text-xs font-bold text-[var(--text-primary)] truncate group-hover/user:text-[var(--brand-primary)] italic transition-colors uppercase">
                            {role.replace('_', ' ')}
                        </p>
                         <p className="text-[9px] md:text-[10px] text-[var(--text-muted)] truncate">Active Account</p>
                     </div>
                </div>

                <button
                    onClick={onLogout}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-1.5 md:gap-2 py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                >
                    <LogOut size={12} />
                    {loading ? '...' : 'Sign Out'}
                </button>
             </div>
        </div>
    </div>
);

export default function Sidebar({ role }: { role: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const configKey = GET_LINKS_KEY(role || '', pathname);
    const groups = LINKS_CONFIG[configKey];

    const handleLogout = async () => {
        setLoading(true);
        await logoutWithPwaCleanup();
    };

    const navContentProps = {
        groups,
        pathname,
        role,
        onLogout: handleLogout,
        loading,
        setMobileOpen
    };

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

            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 350, damping: 35 }}
                            className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] z-50 shadow-2xl md:hidden"
                        >
                             <NavContent {...navContentProps} />
                              <button 
                                onClick={() => setMobileOpen(false)}
                                className="absolute top-3 right-3 p-1.5 bg-[var(--surface-2)] rounded-lg text-[var(--text-muted)] active:bg-[var(--surface-3)]"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="hidden md:block fixed top-0 left-0 h-screen w-[240px] lg:w-[260px] z-40 border-r border-dashed border-gray-200 shadow-[2px_0_24px_rgba(0,0,0,0.02)]">
                <NavContent {...navContentProps} />
            </div>
        </>
    );
}
