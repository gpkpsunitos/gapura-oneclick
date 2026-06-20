'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const DivisionAIReportsDashboard = dynamic(
  () => import('@/components/dashboard/ai-reports/DivisionAIReportsDashboard'),
  { loading: () => <div className="h-96 animate-pulse bg-gray-100 rounded-xl" /> }
);

export default function OPAIReportsPage() {
  return (
    <div className="space-y-4 px-4 py-6 md:px-6">
      <Link
        href="/dashboard/op"
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to OP Dashboard
      </Link>

      <DivisionAIReportsDashboard division="OP" />
    </div>
  );
}
