import { Suspense } from 'react';
import { OverviewContent } from './OverviewContent';

export const revalidate = 300;

export default function OverviewPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <OverviewContent />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="embed-loading">
      <div className="embed-spinner" />
      <p style={{ marginTop: '1rem' }}>Memuat data...</p>
    </div>
  );
}
