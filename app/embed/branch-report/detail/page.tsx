/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman detail branch report dengan Suspense boundary
 * dan filter dinamis untuk analisis performa branch
 */
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BranchReportDetail from '@/components/charts/branch-report/BranchReportDetail';
import { EmbedDetailLayout } from '@/components/EmbedDetailLayout';

/**
 * Interface untuk state filter
 */
interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
  dateFrom: string;
  dateTo: string;
}

/**
 * Komponen konten detail branch report
 * @returns Komponen React
 */
function EmbedBranchReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';
  const sourcePage = searchParams.get('sourcePage') || 'customer-feedback-main';
  
  /**
   * Mendapatkan URL kembali ke dashboard
   * @returns URL dashboard
   */
  const getBackUrl = () => {
    const baseUrl = sourcePage && sourcePage !== 'main' 
      ? `/embed/custom/${sourcePage.toLowerCase().replace(/\s+/g, '-')}`
      : '/embed/custom/customer-feedback-main';
    return `${baseUrl}?${searchParams.toString()}`;
  };
  
  const isStatic = searchParams.get('viewMode') === 'static';
  
  /**
   * State filter branch report
   */
  const filters: FilterState = {
    hub: searchParams.get('hub') || 'all',
    branch: searchParams.get('branch') || 'all',
    airlines: searchParams.get('airlines') || 'all',
    area: searchParams.get('area') || 'all',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    sourceSheet,
  };

  return (
    <EmbedDetailLayout
      title="Branch Report"
      subtitle="Detailed analysis by branch performance & risk profile"
      onBack={() => router.push(getBackUrl())}
      isStatic={isStatic}
      filters={filters}
    >
      <BranchReportDetail filters={filters} hideAnalyzeButton />
    </EmbedDetailLayout>
  );
}

/**
 * Halaman detail branch report dengan Suspense
 * @returns Komponen React
 */
export default function EmbedBranchReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6b8e3d]"></div>
      </div>
    }>
      <EmbedBranchReportContent />
    </Suspense>
  );
}
