'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
    LayoutDashboard, 
    PlusCircle, 
    Menu, 
    LogOut,
    X,
    FolderOpen,
    FileText,
    Brain,
    Inbox,
    Hash,
    Users,
    Shield,
    Calendar,
    Plane,
    ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { LINKS_CONFIG, GET_LINKS_KEY, type NavItemConfig } from '@/lib/nav-config';
import { logoutWithPwaCleanup } from '@/lib/pwa/logout';

interface MobileBottomNavProps {
    role: string;
    onMenuClick?: () => void;
}

interface NavItem {
    href: string;
    label: string;
    icon: any;
    isPrimary?: boolean;
    isDanger?: boolean;
}

export function MobileBottomNav({ role, onMenuClick }: MobileBottomNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const { scrollY } = useScroll();
    const lastScrollY = useRef(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    useMotionValueEvent(scrollY, "change", (latest) => {
        if (!mounted) return;
        const diff = latest - lastScrollY.current;
        if (latest < 50) {
            setIsVisible(true);
        } else if (diff > 20) {
            setIsVisible(false);
            if (isMenuOpen) setIsMenuOpen(false);
        } else if (diff < -25) {
            setIsVisible(true);
        }
        lastScrollY.current = latest;
    });

    const handleLogout = useCallback(() => {
        void logoutWithPwaCleanup();
    }, []);

    const navData = useMemo(() => {
        const configKey = GET_LINKS_KEY(role);
        const groups = LINKS_CONFIG[configKey] || [];
        const allItems = groups.flatMap(group => group.items);
        const mainItems = allItems.slice(0, 4);
        
        return {
            main: mainItems,
            all: [...allItems, { href: '#logout', label: 'Keluar', icon: LogOut, isDanger: true }]
        };
    }, [role]);

    const navItems: NavItem[] = useMemo(() => {
        const dashboard = navData.main.find(i => i.label === 'Dashboard') || navData.main[0];
        const reports = navData.main.find(i => i.label === 'Laporan Divisi' || i.label === 'Laporan Saya') || navData.main[1];
        const ai = navData.main.find(i => i.label === 'AI Reports' || i.label === 'AI Analytics') || navData.main[2];
        
        return [
            dashboard || { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
            reports || { href: '/dashboard/reports', label: 'Docs', icon: FileText },
            { href: '/dashboard/employee/new', label: 'Add', icon: PlusCircle, isPrimary: true },
            ai || { href: '/dashboard/ai-reports', label: 'AI', icon: Brain },
            { href: '#menu', label: 'Menu', icon: Menu }
        ];
    }, [navData, pathname]);

    if (!mounted) return null;

    return (
        <>
            <AnimatePresence>
                {isMenuOpen && (
                    <MenuSheet 
                        items={navData.all} 
                        onClose={() => setIsMenuOpen(false)} 
                        onLogout={handleLogout}
                    />
                )}
            </AnimatePresence>

            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-2 sm:px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none">
                <AnimatePresence>
                    {isVisible && (
                        <motion.nav
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            className="mx-auto max-w-md pointer-events-auto relative"
                        >
                            <div className="absolute inset-0 rounded-[2rem] sm:rounded-[3rem] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100/50" />
                            
                            <div className="relative flex items-center justify-between px-1 sm:px-2 h-[3.75rem] sm:h-[4.5rem]">
                                {navItems.map((item, idx) => {
                                    const Icon = item.icon;
                                    const isMatch = item.href !== '#menu' && (pathname === item.href || pathname.startsWith(item.href + '/'));
                                    const isBestMatch = isMatch && !navItems.some(other => 
                                        other !== item && 
                                        other.href !== '#menu' && 
                                        (pathname === other.href || pathname.startsWith(other.href + '/')) &&
                                        other.href.length > item.href.length
                                    );
                                    const isActive = isBestMatch;
                                    if (item.isPrimary) {
                                        return (
                                            <div key="primary" className="relative -top-2 sm:-top-3 px-1 sm:px-2">
                                                <button onClick={() => router.push(item.href)}>
                                                    <motion.div
                                                        whileTap={{ scale: 0.9 }}
                                                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#0F172A] flex items-center justify-center text-white shadow-lg border-4 border-white"
                                                    >
                                                        <PlusCircle size={24} strokeWidth={2} className="sm:hidden" />
                                                        <PlusCircle size={28} strokeWidth={2} className="hidden sm:block" />
                                                    </motion.div>
                                                </button>
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            key={item.href + idx}
                                            onClick={() => {
                                                if (item.href === '#menu') setIsMenuOpen(true);
                                                else router.push(item.href);
                                            }}
                                            className="flex-1 flex flex-col items-center justify-center relative group py-1"
                                        >
                                            <Icon 
                                                size={18} 
                                                strokeWidth={isActive ? 2.5 : 1.5}
                                                className={cn(
                                                    "transition-all duration-300 sm:size-[22px]",
                                                    isActive ? "text-[#E91E63]" : "text-slate-400 group-active:scale-90"
                                                )}
                                            />
                                            
                                            <span className={cn(
                                                "text-[9px] sm:text-[10px] font-semibold mt-0.5 tracking-tight transition-colors duration-300",
                                                isActive ? "text-[#E91E63]" : "text-slate-400"
                                            )}>
                                                {item.label}
                                            </span>
                                            
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="active-dot"
                                                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#E91E63]"
                                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.nav>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

function MenuSheet({ items, onClose, onLogout }: { items: any[], onClose: () => void, onLogout: () => void }) {
    const router = useRouter();
    
    return (
        <>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[120]"
            />
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-[130] bg-[#F8FAFC] rounded-t-[2rem] px-4 sm:px-6 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[85vh] overflow-y-auto touch-scroll"
            >
                <div className="sticky top-0 bg-[#F8FAFC] z-10 pt-3 sm:pt-4 pb-2">
                    <div className="w-10 sm:w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-y-6 sm:gap-y-8 gap-x-3 sm:gap-x-4 mt-6 sm:mt-8 pb-4 sm:pb-8">
                    {items.map((item, idx) => {
                        const Icon = item.icon;
                        const isLogout = item.href === '#logout';
                        
                        return (
                            <motion.button
                                key={item.label + idx}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: idx * 0.03 }}
                                onClick={() => {
                                    if (isLogout) onLogout();
                                    else if (item.href.startsWith('http')) {
                                         window.open(item.href, '_blank');
                                    } else {
                                        onClose();
                                        router.push(item.href);
                                    }
                                }}
                                className="flex flex-col items-center gap-2 sm:gap-3 active:scale-95 transition-transform"
                            >
                                <div className={cn(
                                    "w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm border border-white",
                                    isLogout ? "bg-red-50 text-red-500 border-red-100" : "bg-white text-slate-600"
                                )}>
                                    <Icon size={20} className="sm:hidden" />
                                    <Icon size={24} className="hidden sm:block" />
                                </div>
                                <span className={cn(
                                    "text-[10px] sm:text-xs font-semibold text-center whitespace-pre-wrap px-1 overflow-hidden transition-colors",
                                    isLogout ? "text-red-500" : "text-slate-500 group-active:text-slate-800"
                                )}>
                                    {item.label}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
            </motion.div>
        </>
    );
}
