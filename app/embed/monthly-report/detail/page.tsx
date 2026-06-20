/**
 * @file
 * 
 * File ini berisi halaman embed detail untuk laporan bulanan
 * Menampilkan analisis time series dan trend forecasting dengan filter dan navigasi
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MonthlyReportDetail from '@/components/charts/monthly-report/MonthlyReportDetail';
import { EmbedDetailLayout } from '@/components/EmbedDetailLayout';

/**
 * Interface untuk state filter
 * Menyimpan semua parameter filter yang digunakan untuk memfilter data laporan
 */
interface FilterState {
  /** ID atau nama hub */
  hub: string;
  /** ID atau nama cabang */
  branch: string;
  /** ID atau nama maskapai penerbangan */
  airlines: string;
  /** ID atau nama area */
  area: string;
  /** Tipe sumber data (NON CARGO atau CGO) */
  sourceSheet: 'NON CARGO' | 'CGO';
  /** Tanggal mulai filter */
  dateFrom: string;
  /** Tanggal akhir filter */
  dateTo: string;
}

/**
 * Komponen konten utama untuk halaman embed detail laporan bulanan
 * Menangani logika navigasi, filter, dan menampilkan detail analisis
 * @returns JSX element berisi layout halaman detail dengan filter dan chart
 */
function EmbedMonthlyReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';
  const sourcePage = searchParams.get('sourcePage') || 'customer-feedback-main';
  
  /**
   * Menghasilkan URL untuk navigasi kembali
   * @returns URL string untuk navigasi ke halaman sebelumnya dengan filter yang sama
   */
  const getBackUrl = () => {
    const baseUrl = sourcePage && sourcePage !== 'main' 
      ? `/embed/custom/${sourcePage.toLowerCase().replace(/\s+/g, '-')}`
      : '/embed/custom/customer-feedback-main';
    return `${baseUrl}?${searchParams.toString()}`;
  };
  
  /** Menentukan apakah halaman ditampilkan dalam mode statis (tanpa header) */
  const isStatic = searchParams.get('viewMode') === 'static';
  
  /** Filter yang digunakan untuk mengambil data laporan */
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
      title="Monthly Report"
      subtitle="Time series analysis & trend forecasting"
      onBack={() => router.push(getBackUrl())}
      isStatic={isStatic}
      filters={filters}
    >
      <MonthlyReportDetail filters={filters} />
    </EmbedDetailLayout>
  );
}

/**
 * Komponen halaman default untuk embed detail laporan bulanan
 * Membungkus konten dengan Suspense untuk menampilkan loading state
 * @returns JSX element ber Suspense wrapper dan komponen konten utama
 */
export default function EmbedMonthlyReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6b8e3d]"></div>
      </div>
    }>
      <EmbedMonthlyReportContent />
    </Suspense>
  );
}
