'use client';

import { cn } from '@/lib/utils';

interface FilterOption {
    value: string;
    label: string;
}

interface ChartFiltersProps {
    stations?: FilterOption[];
    selectedStation?: string;
    onStationChange?: (value: string) => void;
    severities?: FilterOption[];
    selectedSeverity?: string;
    onSeverityChange?: (value: string) => void;
    categories?: FilterOption[];
    selectedCategory?: string;
    onCategoryChange?: (value: string) => void;
    className?: string;
}

function FilterSelect({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 min-w-[140px]"
            aria-label={label}
        >
            <option value="all">{label}</option>
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

export function ChartFilters({
    stations,
    selectedStation = 'all',
    onStationChange,
    severities,
    selectedSeverity = 'all',
    onSeverityChange,
    categories,
    selectedCategory = 'all',
    onCategoryChange,
    className,
}: ChartFiltersProps) {
    const defaultSeverities: FilterOption[] = [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
    ];

    return (
        <div className={cn('flex items-center gap-3 flex-wrap', className)}>
            {stations && onStationChange && (
                <FilterSelect
                    label="Semua Cabang"
                    options={stations}
                    value={selectedStation}
                    onChange={onStationChange}
                />
            )}
            {onSeverityChange && (
                <FilterSelect
                    label="Semua Severity"
                    options={severities || defaultSeverities}
                    value={selectedSeverity}
                    onChange={onSeverityChange}
                />
            )}
            {categories && onCategoryChange && (
                <FilterSelect
                    label="Semua Kategori"
                    options={categories}
                    value={selectedCategory}
                    onChange={onCategoryChange}
                />
            )}
        </div>
    );
}
