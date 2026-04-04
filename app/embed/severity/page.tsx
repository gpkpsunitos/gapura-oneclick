/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman detail severity dengan Suspense boundary
 * untuk loading spinner saat data dimuat
 */
import { Suspense } from 'react';
import { SeverityDetailContent } from './SeverityDetailContent';

export const revalidate = 300;

/**
 * Halaman detail severity dengan Suspense
 * @returns Komponen React
 */
export default function SeverityDetailPage() {
  return (
    <Suspense fallback={<div className="embed-loading"><div className="embed-spinner" /></div>}>
      <SeverityDetailContent />
    </Suspense>
  );
}
