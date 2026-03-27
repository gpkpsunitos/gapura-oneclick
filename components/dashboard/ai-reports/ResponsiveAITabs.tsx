'use client';

import { cn } from '@/lib/utils';
import { useViewport } from '@/hooks/useViewport';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface ResponsiveAITabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * Responsive AI Tabs Component
 * Tab navigation that works on mobile with scrollable tabs
 * Active state indicators, touch-friendly targets
 */
export function ResponsiveAITabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: ResponsiveAITabsProps) {
  const { isMobile, isTablet } = useViewport();

  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden',
      className
    )}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div 
          className={cn(
            'flex',
            (isMobile || isTablet) && 'overflow-x-auto scrollbar-hide'
          )}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative flex items-center justify-center gap-1.5 sm:gap-2',
                'px-3 sm:px-4 lg:px-6 py-3 sm:py-4',
                'text-xs sm:text-sm font-medium',
                'border-b-2 transition-all duration-200',
                'whitespace-nowrap shrink-0',
                'min-h-[44px]',
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
              )}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.icon && (
                <span className="shrink-0">{tab.icon}</span>
              )}
              <span>{tab.label}</span>
              
              {/* Active indicator dot for mobile */}
              {activeTab === tab.id && isMobile && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Content is rendered by parent */}
      </div>
    </div>
  );
}

/**
 * Standalone Tab Button for custom layouts
 */
interface TabButtonProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export function TabButton({ tab, isActive, onClick, className }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 sm:gap-2',
        'px-3 sm:px-4 py-2.5 sm:py-3',
        'text-xs sm:text-sm font-medium rounded-lg',
        'transition-all duration-200',
        'min-h-[44px]',
        isActive
          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        className
      )}
    >
      {tab.icon && <span className="shrink-0">{tab.icon}</span>}
      <span className="whitespace-nowrap">{tab.label}</span>
    </button>
  );
}

export default ResponsiveAITabs;
