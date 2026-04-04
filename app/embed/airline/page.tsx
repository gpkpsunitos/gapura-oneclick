/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman detail airline dengan Suspense boundary
 * untuk loading skeleton saat data dimuat
 */
import { Suspense } from 'react';
import { AirlineDetailContent } from './AirlineDetailContent';

export const revalidate = 300;

/**
 * Halaman detail airline dengan Suspense
 * @returns Komponen React
 */
export default function AirlineDetailPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AirlineDetailContent />
    </Suspense>
  );
}

/**
 * Komponen loading skeleton untuk airline detail
 * @returns Komponen React
 */
function LoadingSkeleton() {
  return (
    <div className="embed-loading">
      <div className="embed-spinner" />
      <p style={{ marginTop: '1rem' }}>Memuat data airline...</p>
    </div>
  );
}
