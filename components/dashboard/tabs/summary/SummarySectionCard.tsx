'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SummarySectionCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SummarySectionCard({
  title,
  subtitle,
  badge,
  toolbar,
  children,
  className,
  bodyClassName,
}: SummarySectionCardProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[30px] border border-[oklch(0.9_0.01_90_/_0.7)] bg-[linear-gradient(180deg,oklch(0.995_0.006_90_/_0.96),oklch(0.982_0.01_145_/_0.94))] backdrop-blur-2xl shadow-[0_20px_56px_-28px_oklch(0.22_0.04_250_/_0.22)]',
        className
      )}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay" style={{ backgroundImage: `url('/noise.svg')` }} />
      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,oklch(0.82_0.14_154_/_0.18),transparent_56%)] pointer-events-none" />
      <div className="relative z-10 border-b border-[oklch(0.9_0.01_90_/_0.75)] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.28em] text-[var(--brand-emerald-700)]">
              {badge ?? 'Summary Report'}
            </p>
            <h2 className="font-display text-lg font-black tracking-[-0.03em] text-[var(--text-primary)] sm:text-[1.35rem]">
              {title}
            </h2>
            {subtitle ? (
              <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {toolbar ? <div className="flex shrink-0 items-center gap-2 self-start">{toolbar}</div> : null}
        </div>
      </div>
      <div className={cn('relative z-10 p-5 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  );
}
