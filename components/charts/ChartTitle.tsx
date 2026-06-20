/**
 * @file
 * 
 * File ini berisi komponen ChartTitle untuk menampilkan judul chart
 * Komponen reusable untuk judul chart dengan dukungan subtitle
 */

'use client';

import { cn } from '@/lib/utils';

/**
 * Props untuk komponen ChartTitle
 * @interface ChartTitleProps
 */
interface ChartTitleProps {
  /** Judul utama chart */
  title: string;
  /** Subtitle atau keterangan tambahan */
  subtitle?: string;
  /** Class CSS tambahan */
  className?: string;
}

/**
 * Komponen ChartTitle
 * Menampilkan judul chart dengan opsional subtitle
 * Menggunakan typography yang konsisten untuk semua chart
 * 
 * @param {ChartTitleProps} props - Props untuk judul chart
 * @returns {JSX.Element} Element React judul chart
 * 
 * @example
 * ```tsx
 * <ChartTitle 
 *   title="Tren Penjualan"
 *   subtitle="Periode 2024"
 * />
 * 
 * <ChartTitle 
 *   title="Distribusi Laporan"
 *   className="mt-4"
 * />
 * ```
 */
export function ChartTitle({ title, subtitle, className }: ChartTitleProps) {
  return (
    <div className={cn('mb-6', className)}>
      <h3 className="font-display font-bold text-lg sm:text-xl text-text-primary tracking-tight">
        {title}
        {subtitle && (
          <span className="font-body font-medium text-sm sm:text-base text-text-secondary tracking-normal ml-2">
            — {subtitle}
          </span>
        )}
      </h3>
    </div>
  );
}
