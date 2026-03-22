'use client';

import { ReactNode } from 'react';
import { Brain, RefreshCw, Loader2 } from 'lucide-react';
import { useViewport } from '@/hooks/useViewport';
import { cn } from '@/lib/utils';

interface ResponsiveAIHeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * Responsive AI Header Component
 * Header with title, refresh button optimized for mobile
 * Touch targets min 44px, mobile-optimized layout
 */
export function ResponsiveAIHeader({
  title = 'Laporan AI',
  subtitle = 'Analisis Cerdas dengan Kecerdasan Buatan',
  onRefresh,
  isRefreshing = false,
  children,
  className,
}: ResponsiveAIHeaderProps) {
  const { isMobile } = useViewport();

  return (
    <div className={cn(
      'bg-white border-b border-gray-200 sticky top-0 z-10',
      className
    )}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Title Section */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <div className={cn(
              'p-1.5 sm:p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl shrink-0',
              'min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center'
            )}>
              <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-2 shrink-0">
            {children}
            
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className={cn(
                  'flex items-center justify-center gap-1.5 sm:gap-2',
                  'px-3 sm:px-4 py-2 sm:py-2.5',
                  'text-sm font-medium rounded-lg',
                  'border border-gray-300 text-gray-700',
                  'hover:bg-gray-50 active:bg-gray-100',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors',
                  'min-h-[44px] min-w-[44px]'
                )}
                aria-label="Refresh cache"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span className="hidden sm:inline ml-1">Refresh</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResponsiveAIHeader;
