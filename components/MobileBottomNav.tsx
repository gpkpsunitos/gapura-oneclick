'use client';

import { usePathname, useRouter } from 'next/navigation';
import { 
    LayoutDashboard, 
    PlusCircle, 
    Menu, 
    LogOut,
    FileText,
    Brain,
    type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { LINKS_CONFIG, GET_LINKS_KEY, type NavItemConfig } from '@/lib/nav-config';
import { performOptimisticLogout } from '@/lib/auth/client-logout';

interface MobileBottomNavProps {
    role: string;
    onMenuClick?: () => void;
}

interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    isPrimary?: boolean;
    isDanger?: boolean;
}

type MenuSheetItem = NavItemConfig | { href: '#logout'; label: string; icon: LucideIcon; isDanger: true };

export function MobileBottomNav({ role }: MobileBottomNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (ticking) return;
            ticking = true;

            window.requestAnimationFrame(() => {
                const latest = window.scrollY;
                const diff = latest - lastScrollY.current;

                if (latest < 50 || pathname.includes('/new')) {
                    setIsVisible(true);
                } else if (diff > 24) {
                    setIsVisible(false);
                    if (isMenuOpen) setIsMenuOpen(false);
                } else if (diff < -28) {
                    setIsVisible(true);
                }

                lastScrollY.current = latest;
                ticking = false;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMenuOpen]);

    const handleLogout = useCallback(() => {
        performOptimisticLogout();
    }, []);

    const navData = useMemo(() => {
        const configKey = GET_LINKS_KEY(role);
        const groups = LINKS_CONFIG[configKey] || [];
        const allItems = groups.flatMap(group => group.items);
        const mainItems = allItems.slice(0, 4);
        
        return {
            main: mainItems,
            all: [...allItems, { href: '#logout', label: 'Logout', icon: LogOut, isDanger: true }]
        };
    }, [role]);

    const navItems: NavItem[] = useMemo(() => {
        const isStaff = role === 'STAFF_CABANG' || role === 'EMPLOYEE' || role.includes('CABANG');
        
        const items: NavItem[] = [];

        if (isStaff) {
            const reportsHref = role === 'MANAGER_CABANG' ? '/dashboard/employee/reports' : '/dashboard/employee';
            const reportsLabel = role === 'MANAGER_CABANG' ? 'All Reports' : 'Reports';
            // SYMMETRICAL 3-ITEM LAYOUT: Cleanest for Staff
            items.push({ href: reportsHref, label: reportsLabel, icon: FileText });
            items.push({ href: '/dashboard/employee/new', label: 'Create', icon: PlusCircle, isPrimary: true });
            items.push({ href: '#menu', label: 'Menu', icon: Menu });
        } else {
            // Slot 1: Home/Dashboard
            items.push({ href: '/dashboard', label: 'Home', icon: LayoutDashboard });

            // Slot 2: Docs/Reports
            items.push({ href: '/dashboard/employee', label: 'Reports', icon: FileText });

            // Slot 3: Center Action (Primary)
            items.push({ href: '/dashboard/employee/new', label: 'Create', icon: PlusCircle, isPrimary: true });

            // Slot 4: AI — hidden for OP / OS divisi per product request.
            const isOpOrOs = role === 'DIVISI_OP' || role === 'PARTNER_OP'
                || role === 'DIVISI_OS' || role === 'PARTNER_OS';
            if (!isOpOrOs) {
                items.push({ href: '/dashboard/ai-reports', label: 'AI', icon: Brain });
            }

            // Slot 5: Menu
            items.push({ href: '#menu', label: 'Menu', icon: Menu });
        }

        return items;
    }, [role]);

    return (
        <>
            {isMenuOpen && (
                <MenuSheet 
                    items={navData.all} 
                    onClose={() => setIsMenuOpen(false)} 
                    onLogout={handleLogout}
                />
            )}

            <div
                data-hide-mobile-nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-2 sm:px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none"
            >
                    {isVisible && (
                        <nav className="mx-auto max-w-md pointer-events-auto relative">
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
                                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#0F172A] flex items-center justify-center text-white shadow-lg border-4 border-white transition-transform active:scale-90">
                                                        <PlusCircle size={24} strokeWidth={2} className="sm:hidden" />
                                                        <PlusCircle size={28} strokeWidth={2} className="hidden sm:block" />
                                                    </div>
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
                                                <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#E91E63]" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </nav>
                    )}
            </div>
        </>
    );
}

function MenuSheet({ items, onClose, onLogout }: { items: MenuSheetItem[]; onClose: () => void; onLogout: () => void }) {
    const router = useRouter();
    
    return (
        <>
            <div 
                onClick={onClose}
                className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[120]"
            />
            <div
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
                            <button
                                key={item.label + idx}
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
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
