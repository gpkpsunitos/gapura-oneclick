'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import ReportByCaseCategoryDetail from '@/components/charts/report-by-case-category/ReportByCaseCategoryDetail';
import DetailFilterHeader from '@/components/chart-detail/DetailFilterHeader';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

export default function ReportByCaseCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';
  const sourcePage = searchParams.get('sourcePage') || searchParams.get('originSlug') || 'customer-feedback-main';
  
  // Check if filters should be hidden (from filtered dashboard)
  const hideFilters = searchParams.get('hideFilters') === 'true';
  const dateFromParam = searchParams.get('dateFrom');
  const dateToParam = searchParams.get('dateTo');
  
  const [filters, setFilters] = useState<FilterState>({
    hub: searchParams.get('hub') || 'all',
    branch: searchParams.get('branch') || 'all',
    airlines: searchParams.get('airlines') || 'all',
    area: searchParams.get('area') || 'all',
    sourceSheet,
  });

  const dateRange = {
    from: dateFromParam || '',
    to: dateToParam || '',
  };

  return (
    <div className="min-h-screen bg-[var(--surface-0)] overflow-x-hidden relative">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--aurora-1)] blur-[120px] opacity-30 animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-[var(--aurora-2)] blur-[100px] opacity-20" />
      </div>

      <DetailFilterHeader 
        title="Category Insights"
        subtitle="Irregularity, Complaint & Compliment Analysis"
        filters={filters}
        setFilters={setFilters}
        sourcePage={sourcePage}
        hideFilters={hideFilters}
        extraHeaderInfo={hideFilters && (
          <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full w-fit">
            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
              Scoped View {dateRange.from && dateRange.to ? `(${dateRange.from} - ${dateRange.to})` : ''}
            </span>
          </div>
        )}
      />

      <motion.main 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
        className="relative z-10 w-full px-6 py-32"
      >
        <div className="max-w-[1600px] mx-auto space-y-12">
          <ReportByCaseCategoryDetail filters={filters} dateRange={hideFilters ? dateRange : undefined} />
        </div>
      </motion.main>
    </div>
  );
}
