/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi komponen header filter dinamis dengan opsi filter otomatis
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { PrismSelect } from '@/components/ui/PrismSelect';

/**
 * Opsi select untuk filter
 * @interface SelectOption
 * @property {string} value - Nilai opsi
 * @property {string} label - Label opsi
 */
interface SelectOption {
  value: string;
  label: string;
}

/**
 * Data filter untuk dashboard
 * @interface FilterData
 * @property {string} [hub] - Filter hub
 * @property {string} [branch] - Filter cabang
 * @property {string} [maskapai] - Filter maskapai (Travel type)
 * @property {string} [airline] - Filter nama airlines
 * @property {string} [main_category] - Filter kategori utama
 * @property {string} [area] - Filter area
 * @property {string} [target_division] - Filter divisi target
 */
export interface FilterData {
  hub?: string;
  branch?: string;
  maskapai?: string; // Travel type (Jenis Maskapai)
  airline?: string;  // Actual Airline Name
  main_category?: string;
  area?: string;
  target_division?: string;
}

/**
 * State opsi filter
 * @interface FilterOptionsState
 * @property {SelectOption[]} hub - Opsi hub
 * @property {SelectOption[]} branch - Opsi cabang
 * @property {SelectOption[]} airline - Opsi airlines
 * @property {SelectOption[]} airline_type - Opsi tipe maskapai
 * @property {SelectOption[]} main_category - Opsi kategori utama
 * @property {SelectOption[]} area - Opsi area
 */
interface FilterOptionsState {
  hub: SelectOption[];
  branch: SelectOption[];
  airline: SelectOption[];
  airline_type: SelectOption[];
  main_category: SelectOption[];
  area: SelectOption[];
}

/**
 * Props untuk komponen DynamicFilterHeader
 * @interface DynamicFilterHeaderProps
 * @property {Function} onFilterChange - Fungsi saat filter berubah
 * @property {FilterData} [initialFilters] - Filter awal
 * @property {'default' | 'white'} [variant='default'] - Variasi tampilan
 */
interface DynamicFilterHeaderProps {
  onFilterChange: (filters: FilterData) => void;
  initialFilters?: FilterData;
  variant?: 'default' | 'white';
}

/**
 * Komponen header filter dinamis
 * Menampilkan dropdown filter yang diambil secara otomatis dari API
 * Mendukung filter untuk hub, branch, maskapai, airlines, kategori, dan area
 * 
 * @param {DynamicFilterHeaderProps} props - Props untuk konfigurasi header filter
 * @returns {JSX.Element} Element React yang berisi header filter dinamis
 * 
 * @example
 * ```tsx
 * <DynamicFilterHeader
 *   onFilterChange={handleFilterChange}
 *   initialFilters={{ hub: 'CGK', branch: 'all' }}
 *   variant="default"
 * />
 * ```
 */
export function DynamicFilterHeader({ onFilterChange, initialFilters, variant = 'default' }: DynamicFilterHeaderProps) {
  const current = useMemo(() => ({
    hub: initialFilters?.hub || 'all',
    branch: initialFilters?.branch || 'all',
    maskapai: initialFilters?.maskapai || 'all',
    airline: initialFilters?.airline || 'all',
    main_category: initialFilters?.main_category || 'all',
    area: initialFilters?.area || 'all',
  }), [initialFilters]);

  const [options, setOptions] = useState<FilterOptionsState>({
    hub: [{ value: 'all', label: 'HUB: All' }],
    branch: [{ value: 'all', label: 'Branch: All' }],
    airline: [{ value: 'all', label: 'Airlines: All' }],
    airline_type: [{ value: 'all', label: 'Maskapai: All' }],
    main_category: [{ value: 'all', label: 'Category: All' }],
    area: [{ value: 'all', label: 'Area: All' }]
  });

  /**
   * Mengambil opsi filter dari API
   * @async function fetchFilters
   * @returns {Promise<void>}
   */
  useEffect(() => {
    async function fetchFilters() {
      try {
        const fields = ['hub', 'branch', 'airline', 'airline_type', 'main_category', 'area'].join(',');
        const res = await fetch(`/api/dashboards/filter-options?fields=${fields}`);
        const data = await res.json();
        
        const mapToOptions = (vals: string[]) => [
          { value: 'all', label: 'All' },
          ...(vals || []).map(v => ({ value: v, label: v }))
        ];

        setOptions({
          hub: mapToOptions(data.hub),
          branch: mapToOptions(data.branch),
          airline: mapToOptions(data.airline),
          airline_type: mapToOptions(data.airline_type),
          main_category: mapToOptions(data.main_category),
          area: mapToOptions(data.area)
        });
      } catch (err) {
        console.error('Error loading filters:', err);
      }
    }
    fetchFilters();
  }, []);

  /**
   * Menggabungkan filter parsial dan mengirim perubahan
   * @function mergeAndChange
   * @param {Partial<FilterData>} partial - Update parsial untuk filter
   * @returns {void}
   */
  const mergeAndChange = (partial: Partial<FilterData>) => {
    onFilterChange({ ...(initialFilters || {}), ...partial });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.hub} 
          value={current.hub} 
          onChange={(v) => mergeAndChange({ hub: v })} 
          placeholder="HUB" 
          variant={variant}
          label="HUB Area"
        />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.branch} 
          value={current.branch} 
          onChange={(v) => mergeAndChange({ branch: v })} 
          placeholder="Branch" 
          variant={variant}
          label="Branch / Station"
        />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.airline_type} 
          value={current.maskapai} 
          onChange={(v) => mergeAndChange({ maskapai: v })} 
          placeholder="Maskapai" 
          variant={variant}
          label="Full Service Airlines / LCC Airlines"
        />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.airline} 
          value={current.airline} 
          onChange={(v) => mergeAndChange({ airline: v })} 
          placeholder="Airlines" 
          variant={variant}
          label="Airlines Name"
        />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.main_category} 
          value={current.main_category} 
          onChange={(v) => mergeAndChange({ main_category: v })} 
          placeholder="Category" 
          variant={variant}
          label="Case Category"
        />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.area} 
          value={current.area} 
          onChange={(v) => mergeAndChange({ area: v })} 
          placeholder="Area" 
          variant={variant}
          label="Ops. Area"
        />
      </div>
    </div>
  );
}
