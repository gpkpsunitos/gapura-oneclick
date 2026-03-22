'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { QrCode, ClipboardList, BookOpen, ChevronUp, Menu as MenuIcon, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

type GuestItem = {
  label: string;
  icon: any;
  href?: string;
  action?: () => void;
};

const items: GuestItem[] = [
  {
    label: 'AI Chatbot',
    icon: Bot,
    href: '/auth/ai-chat',
  },
  {
    label: 'Customer Feedback JOUMPA',
    icon: QrCode,
    href: '/auth/joumpa',
  },
  {
    label: 'Survey Penumpang',
    icon: QrCode,
    href: '/auth/survey-penumpang',
  },
  {
    label: 'Staff JOUMPA Report',
    icon: ClipboardList,
    href: 'https://forms.gle/oLyEBoThQKbjPLAk9',
  },
  {
    label: 'Pengisian Inspeksi Report SLA',
    icon: ClipboardList,
    href: '/auth/sla',
  },
  {
    label: 'Handbook SLA',
    icon: BookOpen,
    href: 'https://sis.appsdev.my.id/',
  },
];

export default function GuestNav({ hideSidebar = false, hideMobileNav = false }: { hideSidebar?: boolean; hideMobileNav?: boolean }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      {/* Desktop Sidebar */}
      {!hideSidebar && (
        <aside className="hidden md:flex fixed top-0 left-0 h-screen w-[240px] border-r border-dashed border-gray-200 bg-[var(--surface-1)] z-30">
          <div className="flex flex-col w-full">
            <div className="p-5 border-b border-dashed border-gray-200 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Gapura"
                width={140}
                height={48}
                className="object-contain"
                priority
              />
            </div>
            <div className="px-4 py-5 flex-1 overflow-y-auto">
              <div className="mb-3 px-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Quick Access</h3>
              </div>
              <div className="space-y-2">
                {items.map((item) => {
                  const Icon = item.icon;
                  if (item.href) {
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-start gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <Icon size={16} className="text-[var(--text-muted)] mt-0.5" />
                        <span className="whitespace-normal break-words leading-snug">{item.label}</span>
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-start gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <Icon size={16} className="text-[var(--text-muted)] mt-0.5" />
                      <span className="whitespace-normal break-words leading-snug text-left">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-3 border-t border-dashed border-gray-200 text-center text-[10px] text-[var(--text-muted)]">
              Guest Mode
            </div>
          </div>
        </aside>
      )}

      {/* Mobile Bottom Nav – redesigned dock */}
      {!hideMobileNav && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-50 pointer-events-none">
          <div className="mx-4 mb-[calc(env(safe-area-inset-bottom,0)+0.75rem)] pointer-events-auto">
            <nav
              data-hide-mobile-nav
              className={cn(
                'relative rounded-2xl px-2 py-2',
                'backdrop-blur-xl border border-white/40 shadow-[0_8px_40px_rgba(0,0,0,0.12)]',
                'bg-[linear-gradient(180deg,rgba(255,255,255,0.85)_0%,rgba(250,250,250,0.75)_100%)]'
              )}
              aria-label="Guest Navigation"
            >
              {!expanded ? (
                <button
                  onClick={() => setExpanded(true)}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
                    'bg-white/90 backdrop-blur border border-white/60 shadow-sm',
                    'active:scale-[0.99] transition-all'
                  )}
                  aria-label="Buka MENU"
                >
                  <MenuIcon size={16} className="text-emerald-700" />
                  <span className="text-[12px] font-extrabold tracking-[0.2em] text-emerald-700">MENU</span>
                </button>
              ) : (
                <>
                  <div className="absolute -top-[1px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent pointer-events-none" />
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-[10px] font-black tracking-[0.25em] text-emerald-700">MENU</span>
                    <button
                      onClick={() => setExpanded(false)}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-white/80 ring-1 ring-black/5 active:scale-95 transition-all"
                      aria-label="Tutup MENU"
                    >
                      <ChevronUp size={16} className="text-emerald-700 rotate-0" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 px-1">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        !!item.href && (pathname === item.href || pathname.startsWith(item.href + '/'));
                      const Tile = (
                        <div
                          className={cn(
                            'flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl transition-all',
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-white/80 text-gray-700 ring-1 ring-black/5 hover:ring-gray-300 active:scale-95'
                          )}
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 ring-1 ring-black/5">
                            <Icon size={18} className={cn(isActive ? 'text-emerald-600' : 'text-gray-600')} />
                          </div>
                          <span
                            className="block text-[11px] font-semibold tracking-wide leading-[1.15] text-center whitespace-normal break-words"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                      );
                      if (item.href) {
                        const isExternal = /^https?:\/\//i.test(item.href);
                        if (isExternal) {
                          return (
                            <a key={item.label} href={item.href} className="no-underline">
                              {Tile}
                            </a>
                          );
                        }
                        return (
                          <Link key={item.label} href={item.href} className="no-underline">
                            {Tile}
                          </Link>
                        );
                      }
                      return (
                        <button
                          key={item.label}
                          onClick={item.action}
                          className="appearance-none bg-transparent p-0 border-0"
                        >
                          {Tile}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
