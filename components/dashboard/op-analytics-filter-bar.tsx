'use client';

import { useCallback, useState, useMemo } from 'react';
import { Calendar, MapPin, Plane, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared filter state for all OP sub-pages.
 * Shape mirrors `ReportAnalyticsFilters` from op-shortcut-analytics.ts
 */
export interface OpFilterState {
  dateFrom?: string;
  dateTo?: string;
  hub?: string;
  branch?: string;
  area?: string;
  airlines?: string;
  sourceSheet?: 'all' | 'NON CARGO' | 'CGO';
}

interface OpAnalyticsFilterBarProps {
  filters: OpFilterState;
  onFiltersChange: (filters: OpFilterState) => void;
  /** Unique dropdown option sets — populated from data */
  hubOptions?: string[];
  branchOptions?: string[];
  areaOptions?: string[];
  airlineOptions?: string[];
  /** Show area filter */
  showAreaFilter?: boolean;
  /** Show source sheet toggle (hide for SLA/Joumpa pages) */
  showSourceSheetToggle?: boolean;
  /** Additional className for the container */
  className?: string;
}

/** Preset time ranges */
const TIME_PRESETS = [
  { key: '30d', label: '30 Hari' },
  { key: '90d', label: '90 Hari' },
  { key: '6m', label: '6 Bulan' },
  { key: '1y', label: '1 Tahun' },
  { key: 'all', label: 'Semua' },
] as const;

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  icon: Icon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  icon: React.ElementType;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-bold text-slate-700 transition-all hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
      >
        <option value="all">Semua {label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

export function OpAnalyticsFilterBar({
  filters,
  onFiltersChange,
  hubOptions = [],
  branchOptions = [],
  areaOptions = [],
  airlineOptions = [],
  showAreaFilter = false,
  showSourceSheetToggle = true,
  className,
}: OpAnalyticsFilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.hub && filters.hub !== 'all') count++;
    if (filters.branch && filters.branch !== 'all') count++;
    if (filters.area && filters.area !== 'all') count++;
    if (filters.airlines && filters.airlines !== 'all') count++;
    if (filters.sourceSheet && filters.sourceSheet !== 'all') count++;
    return count;
  }, [filters]);

  const updateFilter = useCallback(
    (key: keyof OpFilterState, value: string) => {
      onFiltersChange({
        ...filters,
        [key]: value === 'all' ? undefined : value,
      });
    },
    [filters, onFiltersChange]
  );

  const applyPreset = useCallback(
    (key: string) => {
      const now = new Date();
      let dateFrom: string | undefined;
      if (key === '30d') dateFrom = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
      else if (key === '90d') dateFrom = new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0];
      else if (key === '6m') dateFrom = new Date(now.getTime() - 180 * 86400000).toISOString().split('T')[0];
      else if (key === '1y') dateFrom = new Date(now.getTime() - 365 * 86400000).toISOString().split('T')[0];
      else dateFrom = undefined;

      onFiltersChange({
        ...filters,
        dateFrom,
        dateTo: key === 'all' ? undefined : now.toISOString().split('T')[0],
      });
    },
    [filters, onFiltersChange]
  );

  const clearFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  return (
    <div className={cn('rounded-2xl border border-slate-200/60 bg-white/90 p-3 shadow-sm', className)}>
      {/* Row 1: Time presets + source toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-1.5 py-1">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Periode</span>
        </div>
        {TIME_PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() => applyPreset(preset.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all',
              (!filters.dateFrom && preset.key === 'all') || (filters.dateFrom && preset.key !== 'all')
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {preset.label}
          </button>
        ))}
        {showSourceSheetToggle && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sumber</span>
            {(['all', 'NON CARGO', 'CGO'] as const).map((sheet) => (
              <button
                key={sheet}
                onClick={() => updateFilter('sourceSheet', sheet)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all',
                  (filters.sourceSheet ?? 'all') === sheet
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {sheet === 'all' ? 'Semua' : sheet}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expandable entity filters */}
      {expanded && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {hubOptions.length > 0 && (
            <FilterSelect
              id="hub-filter"
              label="Hub"
              value={filters.hub ?? 'all'}
              onChange={(v) => updateFilter('hub', v)}
              options={hubOptions}
              icon={MapPin}
            />
          )}
          {branchOptions.length > 0 && (
            <FilterSelect
              id="branch-filter"
              label="Cabang"
              value={filters.branch ?? 'all'}
              onChange={(v) => updateFilter('branch', v)}
              options={branchOptions}
              icon={MapPin}
            />
          )}
          {showAreaFilter && areaOptions.length > 0 && (
            <FilterSelect
              id="area-filter"
              label="Area"
              value={filters.area ?? 'all'}
              onChange={(v) => updateFilter('area', v)}
              options={areaOptions}
              icon={MapPin}
            />
          )}
          {airlineOptions.length > 0 && (
            <FilterSelect
              id="airline-filter"
              label="Maskapai"
              value={filters.airlines ?? 'all'}
              onChange={(v) => updateFilter('airlines', v)}
              options={airlineOptions}
              icon={Plane}
            />
          )}
        </div>
      )}

      {/* Expand/collapse + clear */}
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-700"
        >
          <Filter className="h-3 w-3" />
          {expanded ? 'Sembunyikan' : 'Tampilkan Filter'}
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-cyan-100 px-1.5 py-0.5 text-cyan-700">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rose-500 transition-colors hover:text-rose-700"
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to extract unique values from report data for filter dropdowns.
 */
export function useFilterOptions(reports: Record<string, unknown>[]) {
  return useMemo(() => {
    const hubs = [...new Set(reports.map((r) => String(r.hub || '').trim()).filter(Boolean))].sort();
    const branches = [...new Set(reports.map((r) => String(r.branch || r.reporting_branch || '').trim()).filter(Boolean))].sort();
    const areas = [
      ...new Set(
        reports
          .map((r) => String(r.area || r.terminal_area_category || r.apron_area_category || r.general_category || '').trim())
          .filter(Boolean),
      ),
    ].sort();
    const airlines = [...new Set(reports.map((r) => String(r.airlines || r.airline || '').trim()).filter(Boolean))].sort();
    return { hubOptions: hubs, branchOptions: branches, areaOptions: areas, airlineOptions: airlines };
  }, [reports]);
}
