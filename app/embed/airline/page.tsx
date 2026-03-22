import { Suspense } from 'react';
import { AirlineDetailContent } from './AirlineDetailContent';

export const revalidate = 300;

export default function AirlineDetailPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AirlineDetailContent />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="embed-loading">
      <div className="embed-spinner" />
      <p style={{ marginTop: '1rem' }}>Memuat data airline...</p>
    </div>
  );
}
