'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SummarySectionCardProps {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SummarySectionCard({
  title,
  subtitle,
  toolbar,
  children,
  className,
  bodyClassName,
}: SummarySectionCardProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-[oklch(0.9_0.01_90_/_0.7)] bg-[oklch(0.99_0.005_90_/_0.8)] backdrop-blur-2xl shadow-[0_12px_36px_-18px_oklch(0.2_0.03_250_/_0.18)]',
        className
      )}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay" style={{ backgroundImage: `url('/noise.svg')` }} />
      <div className="relative z-10 border-b border-[oklch(0.9_0.01_90_/_0.75)] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">

            <h2 className="font-display text-lg font-black tracking-[-0.03em] text-[var(--text-primary)] sm:text-[1.35rem]">
              {title}
            </h2>
            {subtitle ? (
              <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {toolbar ? <div className="flex shrink-0 items-center gap-2">{toolbar}</div> : null}
        </div>
      </div>
      <div className={cn('relative z-10 p-5 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  );
}
