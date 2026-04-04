/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman overview dengan Suspense boundary
 * untuk loading skeleton saat data dimuat
 */
import { Suspense } from 'react';
import { OverviewContent } from './OverviewContent';

export const revalidate = 300;

/**
 * Halaman overview dengan Suspense
 * @returns Komponen React
 */
export default function OverviewPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <OverviewContent />
    </Suspense>
  );
}

/**
 * Komponen loading skeleton untuk overview
 * @returns Komponen React
 */
function LoadingSkeleton() {
  return (
    <div className="embed-loading">
      <div className="embed-spinner" />
      <p style={{ marginTop: '1rem' }}>Memuat data...</p>
    </div>
  );
}
