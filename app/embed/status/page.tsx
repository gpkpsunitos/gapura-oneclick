/**
 * @file
 * 
 * File ini berisi halaman detail status dengan Suspense boundary
 * untuk loading spinner saat data dimuat
 */
import { Suspense } from 'react';
import { StatusDetailContent } from './StatusDetailContent';

export const revalidate = 300;

/**
 * Halaman detail status dengan Suspense
 * @returns Komponen React
 */
export default function StatusDetailPage() {
  return (
    <Suspense fallback={<div className="embed-loading"><div className="embed-spinner" /></div>}>
      <StatusDetailContent />
    </Suspense>
  );
}
