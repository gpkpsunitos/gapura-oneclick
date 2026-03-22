'use client';

import { useState, useEffect } from 'react';
import { Layers, Search, Table2, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BuilderTab = 'fields' | 'query' | 'preview' | 'dashboard';

interface MobileBuilderTabsProps {
  activeTab: BuilderTab;
  onTabChange: (tab: BuilderTab) => void;
  className?: string;
}

interface TabConfig {
  id: BuilderTab;
  label: string;
  icon: typeof Layers;
  badge?: number;
}

const TABS: TabConfig[] = [
  { id: 'fields', label: 'Fields', icon: Layers },
  { id: 'query', label: 'Query', icon: Search },
  { id: 'preview', label: 'Preview', icon: Table2 },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
];

export function MobileBuilderTabs({
  activeTab,
  onTabChange,
  className,
}: MobileBuilderTabsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[var(--surface-4)] shadow-lg",
        "transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "translate-y-full",
        className
      )}
    >
      {/* Safe area padding for iOS */}
      <div className="pb-safe">
        <nav className="flex items-center justify-around px-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 py-2 px-1",
                  "transition-all duration-200",
                  "active:scale-95"
                )}
                style={{ minHeight: '56px' }}
              >
                {/* Active indicator background */}
                <div
                  className={cn(
                    "absolute inset-x-2 top-1 bottom-1 rounded-xl transition-all duration-200",
                    isActive ? "bg-[var(--brand-primary)]/10" : "bg-transparent"
                  )}
                />

                {/* Icon */}
                <div className="relative z-10 mb-1">
                  <Icon
                    size={20}
                    className={cn(
                      "transition-colors duration-200",
                      isActive
                        ? "text-[var(--brand-primary)]"
                        : "text-[var(--text-muted)]"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "relative z-10 text-[10px] font-medium transition-colors duration-200",
                    isActive
                      ? "text-[var(--brand-primary)]"
                      : "text-[var(--text-muted)]"
                  )}
                >
                  {tab.label}
                </span>

                {/* Badge */}
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute top-1 right-1/4 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}

                {/* Active indicator line */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--brand-primary)] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// Alternative: Segmented control style for tablet
interface TabletBuilderTabsProps {
  activeTab: BuilderTab;
  onTabChange: (tab: BuilderTab) => void;
  className?: string;
}

export function TabletBuilderTabs({
  activeTab,
  onTabChange,
  className,
}: TabletBuilderTabsProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-[var(--surface-2)] rounded-lg", className)}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all",
              "active:scale-95",
              isActive
                ? "bg-white text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
            )}
            style={{ minHeight: '36px' }}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Pill-style floating tabs for dashboard view
interface FloatingDashboardTabsProps {
  activeTab: 'edit' | 'preview';
  onTabChange: (tab: 'edit' | 'preview') => void;
  className?: string;
}

export function FloatingDashboardTabs({
  activeTab,
  onTabChange,
  className,
}: FloatingDashboardTabsProps) {
  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
        "flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-xl border border-[var(--surface-4)]",
        className
      )}
    >
      <button
        onClick={() => onTabChange('edit')}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-full transition-all",
          "active:scale-95",
          activeTab === 'edit'
            ? "bg-[var(--brand-primary)] text-white"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        )}
        style={{ minHeight: '40px' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>Edit</span>
      </button>
      <button
        onClick={() => onTabChange('preview')}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-full transition-all",
          "active:scale-95",
          activeTab === 'preview'
            ? "bg-[var(--brand-primary)] text-white"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        )}
        style={{ minHeight: '40px' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span>Preview</span>
      </button>
    </div>
  );
}
