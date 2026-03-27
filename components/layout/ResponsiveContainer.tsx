'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Responsive container component with consistent spacing
 * Mobile-first: px-3 (12px) on mobile, scales up
 */
export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'full',
  padding = 'md',
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-[1920px]',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-2 sm:px-3 md:px-4',
    md: 'px-3 sm:px-4 md:px-6 lg:px-8',
    lg: 'px-4 sm:px-6 md:px-8 lg:px-12',
  };

  return (
    <div
      className={cn(
        'w-full mx-auto',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Responsive grid component for consistent layouts
 * Mobile-first: single column by default
 */
interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 'md',
}: ResponsiveGridProps) {
  const gapClasses = {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-3 sm:gap-4 lg:gap-6',
    lg: 'gap-4 sm:gap-6 lg:gap-8',
    xl: 'gap-6 sm:gap-8 lg:gap-10',
  };

  const gridClasses = [
    `grid-cols-${cols.default || 1}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('grid', gridClasses, gapClasses[gap], className)}>
      {children}
    </div>
  );
}

/**
 * Responsive section with consistent vertical spacing
 */
interface ResponsiveSectionProps {
  children: ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ResponsiveSection({
  children,
  className,
  spacing = 'md',
}: ResponsiveSectionProps) {
  const spacingClasses = {
    sm: 'py-3 sm:py-4',
    md: 'py-4 sm:py-6 lg:py-8',
    lg: 'py-6 sm:py-8 lg:py-12',
    xl: 'py-8 sm:py-12 lg:py-16',
  };

  return (
    <section className={cn(spacingClasses[spacing], className)}>
      {children}
    </section>
  );
}

/**
 * Touch-friendly wrapper ensuring minimum touch targets
 */
interface TouchFriendlyProps {
  children: ReactNode;
  className?: string;
  minHeight?: 'sm' | 'md' | 'lg';
}

export function TouchFriendly({
  children,
  className,
  minHeight = 'md',
}: TouchFriendlyProps) {
  const heightClasses = {
    sm: 'min-h-[36px]',
    md: 'min-h-[44px]',
    lg: 'min-h-[48px]',
  };

  return (
    <div className={cn('flex items-center', heightClasses[minHeight], className)}>
      {children}
    </div>
  );
}