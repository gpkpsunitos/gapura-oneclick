// components/dashboard/ai-reports/EntityFilterBar.tsx

'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FilterState, EntityStats } from '@/types/entity-analytics';

interface EntityFilterBarProps {
  entityStats: EntityStats;
  activeFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export function EntityFilterBar({
  entityStats,
  activeFilters,
  onFilterChange,
  onClearFilters
}: EntityFilterBarProps) {
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);

  const hasActiveFilters =
    activeFilters.airlines.length > 0 ||
    activeFilters.routes.length > 0 ||
    activeFilters.hubs.length > 0 ||
    activeFilters.severities.length > 0;

  const filterSections = [
    {
      id: 'airlines',
      label: 'Maskapai',
      options: Array.from(entityStats.airlines.keys()).sort(),
      selected: activeFilters.airlines
    },
    {
      id: 'routes',
      label: 'Rute',
      options: Array.from(entityStats.routes.keys()).sort(),
      selected: activeFilters.routes
    },
    {
      id: 'hubs',
      label: 'Hub',
      options: Array.from(entityStats.hubs.keys()).sort(),
      selected: activeFilters.hubs
    },
    {
      id: 'severities',
      label: 'Tingkat Keparahan',
      options: ['Critical', 'High', 'Medium', 'Low'],
      selected: activeFilters.severities
    }
  ];

  const toggleOption = (sectionId: string, option: string) => {
    const sectionKey = sectionId as keyof Pick<FilterState, 'airlines' | 'routes' | 'hubs' | 'severities'>;
    const currentSelection = activeFilters[sectionKey];
    const newSelection = currentSelection.includes(option as never)
      ? currentSelection.filter(v => v !== option)
      : [...currentSelection, option as never];

    onFilterChange({
      ...activeFilters,
      [sectionKey]: newSelection
    });
  };

  const totalActiveFilters = Object.values(activeFilters).flat().filter(v => v !== null).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <h3 className="font-bold text-gray-900">Filter Entity</h3>
          {totalActiveFilters > 0 && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
              {totalActiveFilters} aktif
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <RotateCcw size={14} />
            Reset Filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {filterSections.map(section => (
          <div key={section.id} className="relative">
            <button
              onClick={() => setExpandedFilter(expandedFilter === section.id ? null : section.id)}
              aria-expanded={expandedFilter === section.id}
              aria-controls={`dropdown-${section.id}`}
              aria-haspopup="listbox"
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 border rounded-lg transition-colors text-left",
                section.selected.length > 0
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
              )}
            >
              <span className="text-sm font-medium">
                {section.label}
                {section.selected.length > 0 && ` (${section.selected.length})`}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  "transition-transform",
                  expandedFilter === section.id && "rotate-180"
                )}
              />
            </button>

            <AnimatePresence>
              {expandedFilter === section.id && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  id={`dropdown-${section.id}`}
                  role="listbox"
                  aria-label={section.label}
                  className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                >
                  {section.options.map(option => (
                    <button
                      key={option}
                      onClick={() => toggleOption(section.id, option)}
                      role="option"
                      aria-selected={section.selected.includes(option as never)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left",
                        section.selected.includes(option as never) && "bg-emerald-50 text-emerald-900"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                          section.selected.includes(option as never)
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-gray-300"
                        )}
                      >
                        {section.selected.includes(option as never) && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12">
                            <path
                              fill="currentColor"
                              d="M10.28 2.28L4 8.56 1.72 6.28a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l7-7a.75.75 0 00-1.06-1.06z"
                            />
                          </svg>
                        )}
                      </div>
                      <span>{option}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilters.airlines.map(airline => (
            <span
              key={`airline-${airline}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs"
            >
              {airline}
              <button
                onClick={() => toggleOption('airlines', airline)}
                className="hover:text-emerald-900"
                aria-label={`Hapus filter: ${airline}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {activeFilters.routes.map(route => (
            <span
              key={`route-${route}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs"
            >
              {route}
              <button
                onClick={() => toggleOption('routes', route)}
                className="hover:text-blue-900"
                aria-label={`Hapus filter: ${route}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {activeFilters.hubs.map(hub => (
            <span
              key={`hub-${hub}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs"
            >
              {hub}
              <button
                onClick={() => toggleOption('hubs', hub)}
                className="hover:text-purple-900"
                aria-label={`Hapus filter: ${hub}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {activeFilters.severities.map(severity => (
            <span
              key={`severity-${severity}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs"
            >
              {severity}
              <button
                onClick={() => toggleOption('severities', severity)}
                className="hover:text-amber-900"
                aria-label={`Hapus filter: ${severity}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
