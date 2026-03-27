import { Suspense } from 'react';
import { SeverityDetailContent } from './SeverityDetailContent';

export const revalidate = 300;

export default function SeverityDetailPage() {
  return (
    <Suspense fallback={<div className="embed-loading"><div className="embed-spinner" /></div>}>
      <SeverityDetailContent />
    </Suspense>
  );
}
