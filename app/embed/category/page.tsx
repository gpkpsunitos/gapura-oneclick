/**
 * @file
 * 
 * File ini berisi halaman detail kategori dengan Suspense boundary
 * untuk loading skeleton saat data dimuat
 */
import { Suspense } from 'react';
import { CategoryDetailContent } from './CategoryDetailContent';

export const revalidate = 300;

/**
 * Halaman detail kategori dengan Suspense
 * @returns Komponen React
 */
export default function CategoryDetailPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CategoryDetailContent />
    </Suspense>
  );
}

/**
 * Komponen loading skeleton untuk category detail
 * @returns Komponen React
 */
function LoadingSkeleton() {
  return (
    <div className="embed-loading">
      <div className="embed-spinner" />
      <p style={{ marginTop: '1rem' }}>Memuat data kategori...</p>
    </div>
  );
}
