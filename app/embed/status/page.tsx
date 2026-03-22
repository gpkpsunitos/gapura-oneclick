import { Suspense } from 'react';
import { StatusDetailContent } from './StatusDetailContent';

export const revalidate = 300;

export default function StatusDetailPage() {
  return (
    <Suspense fallback={<div className="embed-loading"><div className="embed-spinner" /></div>}>
      <StatusDetailContent />
    </Suspense>
  );
}
