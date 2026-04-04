/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman embed detail untuk kategori area apron
 * Menampilkan analisis ramp dan airside category dengan filter dan navigasi
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import AreaSubCategoryDetail from '@/components/charts/area-sub-category/AreaSubCategoryDetail';

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
}

/**
 * Komponen konten utama untuk halaman embed detail kategori area apron
 * Menangani logika navigasi, filter, dan menampilkan detail analisis
 * @returns JSX element berisi layout halaman detail dengan filter dan chart
 */
function EmbedApronAreaCategoryContent() {
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
  
  /** State untuk menyimpan nilai filter saat ini */
  const [filters, setFilters] = useState<FilterState>({
    hub: searchParams.get('hub') || 'all',
    branch: searchParams.get('branch') || 'all',
    airlines: searchParams.get('airlines') || 'all',
    area: searchParams.get('area') || 'all',
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
                <h1 className="text-xl font-black text-gray-900 tracking-tight">Apron Area Category</h1>
                <p className="text-xs text-gray-500">Ramp and airside category analysis</p>
              </div>
            </div>
          </div>
          

        </header>
      )}

      <main className={cn("w-full px-4 sm:px-6 py-6", isStatic && "p-0")}>
        <div className={cn("max-w-[1800px] mx-auto", isStatic && "max-w-none")}>
          <AreaSubCategoryDetail
            filters={filters}
            categoryField="apron_area_category"
            title="Apron Area Category Detail"
            subtitle="Which apron categories dominate, where they occur, and what drives them."
          />
        </div>
      </main>
    </div>
  );
}

/**
 * Komponen halaman default untuk embed detail kategori area apron
 * Membungkus konten dengan Suspense untuk menampilkan loading state
 * @returns JSX element ber Suspense wrapper dan komponen konten utama
 */
export default function EmbedApronAreaCategoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6b8e3d]"></div>
      </div>
    }>
      <EmbedApronAreaCategoryContent />
    </Suspense>
  );
}
