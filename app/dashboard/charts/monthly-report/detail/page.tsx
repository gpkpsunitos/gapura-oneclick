'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import MonthlyReportDetail from '@/components/charts/monthly-report/MonthlyReportDetail';
import DetailFilterHeader from '@/components/chart-detail/DetailFilterHeader';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  month: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

export default function MonthlyReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';
  const sourcePage = searchParams.get('sourcePage') || 'customer-feedback-main';
  
  const [filters, setFilters] = useState<FilterState>({
    hub: searchParams.get('hub') || 'all',
    branch: searchParams.get('branch') || 'all',
    airlines: searchParams.get('airlines') || 'all',
    area: searchParams.get('area') || 'all',
    month: 'all',
    sourceSheet,
  });

  return (
    <div className="min-h-screen bg-[var(--surface-0)] overflow-x-hidden relative">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--aurora-1)] blur-[120px] opacity-30 animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-[var(--aurora-2)] blur-[100px] opacity-20" />
      </div>

      <DetailFilterHeader 
        title="Monthly Report"
        subtitle="Trend & Anomaly Analysis"
        filters={filters}
        setFilters={setFilters}
        sourcePage={sourcePage}
        extraFilters={
          <div className="relative group">
            <select
              value={filters.month}
              onChange={(e) => setFilters(f => ({ ...f, month: e.target.value }))}
              className="appearance-none pl-4 pr-10 py-2.5 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-emerald-500)]/20 focus:border-[var(--brand-emerald-500)] min-w-[160px] shadow-inner cursor-pointer"
            >
              <option value="all">All Months</option>
              <option value="2026-02">February 2026</option>
              <option value="2026-01">January 2026</option>
              <option value="2025-12">December 2025</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        }
      />

      <motion.main 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
        className="relative z-10 w-full px-6 py-32"
      >
        <div className="max-w-[1600px] mx-auto space-y-12">
          <MonthlyReportDetail filters={filters} />
        </div>
      </motion.main>
    </div>
  );
}
