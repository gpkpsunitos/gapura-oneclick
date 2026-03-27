import { Suspense } from 'react';
import { CategoryDetailContent } from './CategoryDetailContent';

export const revalidate = 300;

export default function CategoryDetailPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CategoryDetailContent />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="embed-loading">
      <div className="embed-spinner" />
      <p style={{ marginTop: '1rem' }}>Memuat data kategori...</p>
    </div>
  );
}
