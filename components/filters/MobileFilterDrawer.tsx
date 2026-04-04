/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi komponen laci filter (drawer) untuk tampilan mobile menggunakan Sheet dari shadcn/ui
 */

'use client';

import { ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props untuk komponen MobileFilterDrawer
 * @interface MobileFilterDrawerProps
 * @property {ReactNode} children - Konten filter yang akan ditampilkan di dalam drawer
 * @property {string} [title='Filter'] - Judul untuk drawer filter
 * @property {number} [activeFilterCount=0] - Jumlah filter yang sedang aktif
 * @property {Function} [onApply] - Fungsi yang dipanggil saat tombol Terapkan ditekan
 * @property {Function} [onClear] - Fungsi yang dipanggil saat tombol Reset ditekan
 * @property {string} [triggerClassName] - Kelas CSS tambahan untuk tombol trigger
 * @property {boolean} [showApplyButton=true] - Apakah menampilkan tombol Terapkan
 * @property {boolean} [showClearButton=true] - Apakah menampilkan tombol Reset
 */
interface MobileFilterDrawerProps {
  children: ReactNode;
  title?: string;
  activeFilterCount?: number;
  onApply?: () => void;
  onClear?: () => void;
  triggerClassName?: string;
  showApplyButton?: boolean;
  showClearButton?: boolean;
}

/**
 * Komponen drawer filter untuk tampilan mobile
 * Menggunakan komponen Sheet dari shadcn/ui untuk menampilkan filter dari bawah layar
 * 
 * @param {MobileFilterDrawerProps} props - Props untuk konfigurasi drawer filter
 * @returns {JSX.Element} Element React yang berisi drawer filter mobile
 * 
 * @example
 * ```tsx
 * <MobileFilterDrawer
 *   title="Filter Laporan"
 *   activeFilterCount={3}
 *   onApply={handleApply}
 *   onClear={handleClear}
 * >
 *   <FilterSection title="Tanggal">
 *     <DateFilter />
 *   </FilterSection>
 * </MobileFilterDrawer>
 * ```
 */
export function MobileFilterDrawer({
  children,
  title = 'Filter',
  activeFilterCount = 0,
  onApply,
  onClear,
  triggerClassName,
  showApplyButton = true,
  showClearButton = true,
}: MobileFilterDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full sm:w-auto flex items-center justify-center gap-2',
            'min-h-[44px] px-4',
            triggerClassName
          )}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">{title}</span>
          <span className="sm:hidden">Filter</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="bottom" 
        className="h-[85vh] sm:h-auto sm:max-w-lg sm:mx-auto sm:rounded-t-xl"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center justify-between">
            <span>{title}</span>
            {activeFilterCount > 0 && (
              <span className="text-sm font-normal text-gray-500">
                {activeFilterCount} aktif
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        
        {/* Filter Content */}
        <div className="py-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {children}
        </div>
        
        {/* Footer Actions */}
        {(showApplyButton || showClearButton) && (
          <SheetFooter className="border-t pt-4 gap-3">
            {showClearButton && onClear && (
              <SheetClose asChild>
                <Button
                  variant="outline"
                  onClick={onClear}
                  className="flex-1 min-h-[48px]"
                >
                  Reset
                </Button>
              </SheetClose>
            )}
            {showApplyButton && onApply && (
              <SheetClose asChild>
                <Button
                  onClick={onApply}
                  className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700"
                >
                  Terapkan
                </Button>
              </SheetClose>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Props untuk komponen FilterSection
 * @interface FilterSectionProps
 * @property {string} title - Judul bagian filter
 * @property {ReactNode} children - Konten filter dalam bagian ini
 * @property {string} [className] - Kelas CSS tambahan untuk styling
 */
interface FilterSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Komponen bagian filter (section) di dalam drawer
 * Menampilkan sekumpulan filter terkait dalam satu bagian dengan judul
 * 
 * @param {FilterSectionProps} props - Props untuk konfigurasi bagian filter
 * @returns {JSX.Element} Element React yang berisi bagian filter
 * 
 * @example
 * ```tsx
 * <FilterSection title="Status">
 *   <CheckboxFilter label="Aktif" />
 *   <CheckboxFilter label="Nonaktif" />
 * </FilterSection>
 * ```
 */
export function FilterSection({ title, children, className }: FilterSectionProps) {
  return (
    <div className={cn('mb-6 last:mb-0', className)}>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

/**
 * Props untuk komponen FilterChip
 * @interface FilterChipProps
 * @property {string} label - Label/nama filter
 * @property {string} value - Nilai filter yang ditampilkan
 * @property {Function} onRemove - Fungsi yang dipanggil saat filter dihapus
 */
interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
}

/**
 * Komponen chip untuk menampilkan filter yang dipilih
 * Menampilkan filter sebagai chip dengan tombol hapus
 * 
 * @param {FilterChipProps} props - Props untuk konfigurasi chip filter
 * @returns {JSX.Element} Element React yang berisi chip filter
 * 
 * @example
 * ```tsx
 * <FilterChip
 *   label="Status"
 *   value="Aktif"
 *   onRemove={() => removeFilter('status')}
 * />
 * ```
 */
export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2.5 py-1.5 rounded-full">
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 hover:bg-blue-100 rounded-full transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
