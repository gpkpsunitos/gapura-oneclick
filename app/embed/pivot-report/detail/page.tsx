'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import PivotReportDetail from '@/components/charts/pivot-report/PivotReportDetail';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
  dateFrom: string;
  dateTo: string;
}

function EmbedPivotReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';
  const sourcePage = searchParams.get('sourcePage') || 'customer-feedback-main';
  
  const getBackUrl = () => {
    const baseUrl = sourcePage && sourcePage !== 'main' 
      ? `/embed/custom/${sourcePage.toLowerCase().replace(/\s+/g, '-')}`
      : '/embed/custom/customer-feedback-main';
    return `${baseUrl}?${searchParams.toString()}`;
  };
  
  const isStatic = searchParams.get('viewMode') === 'static';
  
  const [filters, setFilters] = useState<FilterState>({
    hub: searchParams.get('hub') || 'all',
    branch: searchParams.get('branch') || 'all',
    airlines: searchParams.get('airlines') || 'all',
    area: searchParams.get('area') || 'all',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    sourceSheet,
  });

  return (
    <div className={cn("min-h-screen bg-[#f5f5f5] embed-detail-page", isStatic && "bg-white")}>
      {!isStatic && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push(getBackUrl())}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-[#6b8e3d]"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">Pivot Report</h1>
                <p className="text-xs text-gray-500">Multi-dimensional analysis & pivot tables</p>
              </div>
            </div>
          </div>
          

        </header>
      )}

      <main className={cn("w-full px-4 sm:px-6 py-6", isStatic && "p-0")}>
        <div className={cn("max-w-[1800px] mx-auto", isStatic && "max-w-none")}>
          <PivotReportDetail filters={filters} />
        </div>
      </main>
    </div>
  );
}

export default function EmbedPivotReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6b8e3d]"></div>
      </div>
    }>
      <EmbedPivotReportContent />
    </Suspense>
  );
}
