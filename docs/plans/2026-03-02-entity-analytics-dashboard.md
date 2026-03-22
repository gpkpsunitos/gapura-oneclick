# Entity Analytics Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive Entity Analytics Dashboard to AI Reports with cross-entity filtering, interactive visualizations, and real-time performance.

**Architecture:** Client-side data processing with React hooks and memoization. Extract entities from batchResults, aggregate statistics, filter in real-time without API calls. Integration into existing Overview tab as new section.

**Tech Stack:** React 18+, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons

---

## Task 1: Create Type Definitions

**Files:**
- Create: `types/entity-analytics.ts`

**Step 1: Create type definitions file**

```typescript
// types/entity-analytics.ts

export interface AirlineStats {
  name: string;
  count: number;
  severityBreakdown: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  topRoutes: string[];
  avgPredictionDays: number;
  lastIncident: Date | null;
  reports: any[];
}

export interface RouteStats {
  route: string;
  from: string;
  to: string;
  count: number;
  criticalRate: number;
  primaryIssueType: string;
  lastIncident: Date | null;
  reports: any[];
}

export interface HubStats {
  name: string;
  count: number;
  percentage: number;
  severityBreakdown: Record<string, number>;
  topIssueCategory: string;
  topAirlines: string[];
  reports: any[];
}

export interface FlightStats {
  flightNumber: string;
  airline: string;
  count: number;
  avgPredictionDays: number;
  reports: any[];
}

export interface EntityStats {
  airlines: Map<string, AirlineStats>;
  routes: Map<string, RouteStats>;
  hubs: Map<string, HubStats>;
  flightNumbers: Map<string, FlightStats>;
  allReports: any[];
  summary: {
    totalEntities: number;
    totalReports: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    avgPredictionDays: number;
  };
}

export interface FilterState {
  airlines: string[];
  routes: string[];
  hubs: string[];
  severities: ('Critical' | 'High' | 'Medium' | 'Low')[];
  dateRange: { start: Date; end: Date } | null;
}

export interface SelectedEntity {
  type: 'airline' | 'route' | 'hub' | 'flight';
  name: string;
  stats: AirlineStats | RouteStats | HubStats | FlightStats;
}
```

**Step 2: Commit**

```bash
git add types/entity-analytics.ts
git commit -m "feat(entity-analytics): add type definitions for entity analytics"
```

---

## Task 2: Create Entity Processing Utility Functions

**Files:**
- Create: `lib/utils/entity-analytics.ts`

**Step 1: Create entity processing utility file**

```typescript
// lib/utils/entity-analytics.ts

import { EntityStats, AirlineStats, RouteStats, HubStats, FlightStats } from '@/types/entity-analytics';

/**
 * Extract dan aggregate entities dari batch analysis results
 */
export function processEntityData(results: any[]): EntityStats {
  const airlines = new Map<string, AirlineStats>();
  const routes = new Map<string, RouteStats>();
  const hubs = new Map<string, HubStats>();
  const flightNumbers = new Map<string, FlightStats>();

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let totalPredictionDays = 0;

  results.forEach(result => {
    const airline = result.originalData?.airline || 'Unknown Airline';
    const route = result.originalData?.route || 'Unknown Route';
    const hub = result.originalData?.hub || 'Unknown Hub';
    const flightNumber = result.originalData?.flightNumber || 'N/A';
    const severity = result.classification?.severity || 'Low';
    const predictedDays = result.prediction?.predictedDays || 0;

    // Count severities
    if (severity === 'Critical') criticalCount++;
    else if (severity === 'High') highCount++;
    else if (severity === 'Medium') mediumCount++;
    else lowCount++;

    totalPredictionDays += predictedDays;

    // Process airlines
    if (!airlines.has(airline)) {
      airlines.set(airline, {
        name: airline,
        count: 0,
        severityBreakdown: { Critical: 0, High: 0, Medium: 0, Low: 0 },
        topRoutes: [],
        avgPredictionDays: 0,
        lastIncident: null,
        reports: []
      });
    }
    const airlineStats = airlines.get(airline)!;
    airlineStats.count++;
    airlineStats.severityBreakdown[severity] = (airlineStats.severityBreakdown[severity] || 0) + 1;
    airlineStats.reports.push(result);
    if (!airlineStats.topRoutes.includes(route)) {
      airlineStats.topRoutes.push(route);
    }
    const incidentDate = result.originalData?.date ? new Date(result.originalData.date) : null;
    if (incidentDate && (!airlineStats.lastIncident || incidentDate > airlineStats.lastIncident)) {
      airlineStats.lastIncident = incidentDate;
    }

    // Process routes
    if (!routes.has(route)) {
      const [from, to] = route.split('-');
      routes.set(route, {
        route,
        from: from || route,
        to: to || route,
        count: 0,
        criticalRate: 0,
        primaryIssueType: '',
        lastIncident: null,
        reports: []
      });
    }
    const routeStats = routes.get(route)!;
    routeStats.count++;
    routeStats.reports.push(result);
    const routeDate = result.originalData?.date ? new Date(result.originalData.date) : null;
    if (routeDate && (!routeStats.lastIncident || routeDate > routeStats.lastIncident)) {
      routeStats.lastIncident = routeDate;
    }
    const issueType = result.originalData?.issueType || result.classification?.issueType || '';
    if (issueType && !routeStats.primaryIssueType) {
      routeStats.primaryIssueType = issueType;
    }

    // Process hubs
    if (!hubs.has(hub)) {
      hubs.set(hub, {
        name: hub,
        count: 0,
        percentage: 0,
        severityBreakdown: {},
        topIssueCategory: '',
        topAirlines: [],
        reports: []
      });
    }
    const hubStats = hubs.get(hub)!;
    hubStats.count++;
    hubStats.severityBreakdown[severity] = (hubStats.severityBreakdown[severity] || 0) + 1;
    hubStats.reports.push(result);
    if (!hubStats.topAirlines.includes(airline)) {
      hubStats.topAirlines.push(airline);
    }
    const category = result.originalData?.category || '';
    if (category && !hubStats.topIssueCategory) {
      hubStats.topIssueCategory = category;
    }

    // Process flight numbers
    if (flightNumber !== 'N/A') {
      if (!flightNumbers.has(flightNumber)) {
        flightNumbers.set(flightNumber, {
          flightNumber,
          airline,
          count: 0,
          avgPredictionDays: 0,
          reports: []
        });
      }
      const flightStats = flightNumbers.get(flightNumber)!;
      flightStats.count++;
      flightStats.reports.push(result);
    }
  });

  // Calculate averages and percentages
  const totalReports = results.length;

  airlines.forEach(stats => {
    stats.avgPredictionDays = stats.reports.reduce((sum, r) => sum + (r.prediction?.predictedDays || 0), 0) / stats.reports.length;
  });

  routes.forEach(stats => {
    const criticalAndHigh = (stats.severityBreakdown?.Critical || 0) + (stats.severityBreakdown?.High || 0);
    stats.criticalRate = stats.count > 0 ? (criticalAndHigh / stats.count) * 100 : 0;
  });

  hubs.forEach(stats => {
    stats.percentage = totalReports > 0 ? (stats.count / totalReports) * 100 : 0;
  });

  flightNumbers.forEach(stats => {
    stats.avgPredictionDays = stats.reports.reduce((sum, r) => sum + (r.prediction?.predictedDays || 0), 0) / stats.reports.length;
  });

  return {
    airlines,
    routes,
    hubs,
    flightNumbers,
    allReports: results,
    summary: {
      totalEntities: airlines.size + routes.size + hubs.size + flightNumbers.size,
      totalReports,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      avgPredictionDays: totalReports > 0 ? totalPredictionDays / totalReports : 0
    }
  };
}

/**
 * Filter entities berdasarkan kombinasi kriteria
 */
export function filterEntities(
  entityStats: EntityStats,
  filters: FilterState
): EntityStats {
  let filteredReports = [...entityStats.allReports];

  // Apply airline filter
  if (filters.airlines.length > 0) {
    filteredReports = filteredReports.filter(r =>
      filters.airlines.includes(r.originalData?.airline || 'Unknown Airline')
    );
  }

  // Apply route filter
  if (filters.routes.length > 0) {
    filteredReports = filteredReports.filter(r =>
      filters.routes.includes(r.originalData?.route || 'Unknown Route')
    );
  }

  // Apply hub filter
  if (filters.hubs.length > 0) {
    filteredReports = filteredReports.filter(r =>
      filters.hubs.includes(r.originalData?.hub || 'Unknown Hub')
    );
  }

  // Apply severity filter
  if (filters.severities.length > 0) {
    filteredReports = filteredReports.filter(r =>
      filters.severities.includes(r.classification?.severity || 'Low')
    );
  }

  // Apply date range filter
  if (filters.dateRange) {
    filteredReports = filteredReports.filter(r => {
      const reportDate = r.originalData?.date ? new Date(r.originalData.date) : null;
      if (!reportDate) return false;
      return reportDate >= filters.dateRange!.start && reportDate <= filters.dateRange!.end;
    });
  }

  // Re-process filtered data
  return processEntityData(filteredReports);
}

/**
 * Get top N entities dari Map
 */
export function getTopEntities<T extends { count: number }>(
  entityMap: Map<string, T>,
  limit: number = 10
): T[] {
  return Array.from(entityMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Translate severity ke Bahasa Indonesia
 */
export function translateSeverity(severity: string): string {
  const map: Record<string, string> = {
    'Critical': 'Kritis',
    'High': 'Tinggi',
    'Medium': 'Sedang',
    'Low': 'Rendah',
    'critical': 'Kritis',
    'high': 'Tinggi',
    'medium': 'Sedang',
    'low': 'Rendah'
  };
  return map[severity] || severity;
}

/**
 * Get severity color classes
 */
export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    'Critical': 'bg-red-100 text-red-700 border-red-200',
    'High': 'bg-orange-100 text-orange-700 border-orange-200',
    'Medium': 'bg-amber-100 text-amber-700 border-amber-200',
    'Low': 'bg-green-100 text-green-700 border-green-200',
  };
  return map[severity] || 'bg-gray-100 text-gray-700 border-gray-200';
}
```

**Step 2: Commit**

```bash
git add lib/utils/entity-analytics.ts
git commit -m "feat(entity-analytics): add entity processing utility functions"
```

---

## Task 3: Create EntityFilterBar Component

**Files:**
- Create: `components/dashboard/ai-reports/EntityFilterBar.tsx`

**Step 1: Create EntityFilterBar component**

```typescript
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
    const section = sectionId as keyof Pick<FilterState, 'airlines' | 'routes' | 'hubs' | 'severities'>;
    const currentSelection = activeFilters[section];
    const newSelection = currentSelection.includes(option as any)
      ? currentSelection.filter(v => v !== option)
      : [...currentSelection, option as any];

    onFilterChange({
      ...activeFilters,
      [section]: newSelection
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
                  className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                >
                  {section.options.map(option => (
                    <button
                      key={option}
                      onClick={() => toggleOption(section.id, option)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left",
                        section.selected.includes(option as any) && "bg-emerald-50 text-emerald-900"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                          section.selected.includes(option as any)
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-gray-300"
                        )}
                      >
                        {section.selected.includes(option as any) && (
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
```

**Step 2: Commit**

```bash
git add components/dashboard/ai-reports/EntityFilterBar.tsx
git commit -m "feat(entity-analytics): add EntityFilterBar component with multi-select filters"
```

---

## Task 4: Create EntitySummaryStats Component

**Files:**
- Create: `components/dashboard/ai-reports/EntitySummaryStats.tsx`

**Step 1: Create EntitySummaryStats component**

```typescript
// components/dashboard/ai-reports/EntitySummaryStats.tsx

'use client';

import { Database, TrendingUp, Filter, AlertTriangle } from 'lucide-react';
import { EntityStats } from '@/types/entity-analytics';
import { cn } from '@/lib/utils';

interface EntitySummaryStatsProps {
  entityStats: EntityStats;
  filteredStats: EntityStats;
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          {title}
        </p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className={cn('p-3 rounded-xl', color)}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </div>
);

export function EntitySummaryStats({ entityStats, filteredStats }: EntitySummaryStatsProps) {
  // Get most active entity
  const topAirline = Array.from(entityStats.airlines.values())
    .sort((a, b) => b.count - a.count)[0];

  const isFiltered = filteredStats.summary.totalReports !== entityStats.summary.totalReports;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Entitas Unik"
        value={entityStats.summary.totalEntities}
        subtitle={`${entityStats.airlines.size} maskapai, ${entityStats.routes.size} rute, ${entityStats.hubs.size} hub`}
        icon={Database}
        color="bg-blue-500"
      />

      <StatCard
        title="Entitas Paling Aktif"
        value={topAirline?.name || 'N/A'}
        subtitle={topAirline ? `${topAirline.count} laporan` : undefined}
        icon={TrendingUp}
        color="bg-purple-500"
      />

      <StatCard
        title="Hasil Filter"
        value={isFiltered ? filteredStats.summary.totalReports : entityStats.summary.totalReports}
        subtitle={isFiltered ? `dari ${entityStats.summary.totalReports} total` : 'Semua laporan'}
        icon={Filter}
        color="bg-emerald-500"
      />

      <StatCard
        title="Laporan Kritis"
        value={isFiltered ? filteredStats.summary.criticalCount : entityStats.summary.criticalCount}
        subtitle={isFiltered
          ? `${filteredStats.summary.highCount} High, ${filteredStats.summary.mediumCount} Medium`
          : `${entityStats.summary.highCount} High, ${entityStats.summary.mediumCount} Medium`
        }
        icon={AlertTriangle}
        color="bg-red-500"
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/dashboard/ai-reports/EntitySummaryStats.tsx
git commit -m "feat(entity-analytics): add EntitySummaryStats component"
```

---

## Task 5: Create TopAirlinesChart Component

**Files:**
- Create: `components/dashboard/ai-reports/TopAirlinesChart.tsx`

**Step 1: Create TopAirlinesChart component**

```typescript
// components/dashboard/ai-reports/TopAirlinesChart.tsx

'use client';

import { BarChart3 } from 'lucide-react';
import { EntityStats, AirlineStats } from '@/types/entity-analytics';
import { getTopEntities, translateSeverity, getSeverityColor } from '@/lib/utils/entity-analytics';
import { cn } from '@/lib/utils';

interface TopAirlinesChartProps {
  entityStats: EntityStats;
  onAirlineClick?: (airline: string) => void;
}

export function TopAirlinesChart({ entityStats, onAirlineClick }: TopAirlinesChartProps) {
  const topAirlines = getTopEntities(entityStats.airlines, 10);

  if (topAirlines.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          Top Maskapai
        </h3>
        <p className="text-gray-500 text-sm">Tidak ada data maskapai tersedia</p>
      </div>
    );
  }

  const maxCount = Math.max(...topAirlines.map(a => a.count));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          Top 10 Maskapai
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Maskapai dengan insiden terbanyak, di-breakdown berdasarkan tingkat keparahan
        </p>
      </div>

      <div className="space-y-3">
        {topAirlines.map((airline, idx) => {
          const { Critical, High, Medium, Low } = airline.severityBreakdown;
          const total = airline.count;
          const widthPercent = (total / maxCount) * 100;

          return (
            <div
              key={airline.name}
              className={cn(
                "group cursor-pointer transition-all hover:bg-gray-50 rounded-lg p-2 -mx-2",
                onAirlineClick && "hover:shadow-sm"
              )}
              onClick={() => onAirlineClick?.(airline.name)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-mono text-gray-400 w-6">{idx + 1}</span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {airline.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-sm font-bold text-gray-900">{total}</span>
                  <span className="text-xs text-gray-500">
                    {airline.avgPredictionDays.toFixed(1)} hari
                  </span>
                </div>
              </div>

              {/* Stacked bar */}
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
                {Critical > 0 && (
                  <div
                    className="bg-red-500 transition-all group-hover:opacity-80"
                    style={{ width: `${(Critical / total) * widthPercent}%` }}
                    title={`Critical: ${Critical}`}
                  />
                )}
                {High > 0 && (
                  <div
                    className="bg-orange-500 transition-all group-hover:opacity-80"
                    style={{ width: `${(High / total) * widthPercent}%` }}
                    title={`High: ${High}`}
                  />
                )}
                {Medium > 0 && (
                  <div
                    className="bg-amber-500 transition-all group-hover:opacity-80"
                    style={{ width: `${(Medium / total) * widthPercent}%` }}
                    title={`Medium: ${Medium}`}
                  />
                )}
                {Low > 0 && (
                  <div
                    className="bg-green-500 transition-all group-hover:opacity-80"
                    style={{ width: `${(Low / total) * widthPercent}%` }}
                    title={`Low: ${Low}`}
                  />
                )}
              </div>

              {/* Legend on hover */}
              <div className="mt-1 flex gap-3 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                {Critical > 0 && (
                  <span className="text-red-600 font-medium">Kritis: {Critical}</span>
                )}
                {High > 0 && (
                  <span className="text-orange-600 font-medium">Tinggi: {High}</span>
                )}
                {Medium > 0 && (
                  <span className="text-amber-600 font-medium">Sedang: {Medium}</span>
                )}
                {Low > 0 && (
                  <span className="text-green-600 font-medium">Rendah: {Low}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Severity Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-gray-600">Kritis</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded" />
            <span className="text-gray-600">Tinggi</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded" />
            <span className="text-gray-600">Sedang</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-gray-600">Rendah</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/dashboard/ai-reports/TopAirlinesChart.tsx
git commit -m "feat(entity-analytics): add TopAirlinesChart component with severity breakdown"
```

---

## Task 6: Create RouteHeatmap Component

**Files:**
- Create: `components/dashboard/ai-reports/RouteHeatmap.tsx`

**Step 1: Create RouteHeatmap component**

```typescript
// components/dashboard/ai-reports/RouteHeatmap.tsx

'use client';

import { Map, TrendingUp, TrendingDown } from 'lucide-react';
import { EntityStats, RouteStats } from '@/types/entity-analytics';
import { getTopEntities } from '@/lib/utils/entity-analytics';
import { cn } from '@/lib/utils';

interface RouteHeatmapProps {
  entityStats: EntityStats;
  onRouteClick?: (route: string) => void;
}

export function RouteHeatmap({ entityStats, onRouteClick }: RouteHeatmapProps) {
  const topRoutes = getTopEntities(entityStats.routes, 20);

  if (topRoutes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-500" />
          Peta Panas Rute
        </h3>
        <p className="text-gray-500 text-sm">Tidak ada data rute tersedia</p>
      </div>
    );
  }

  const maxCount = Math.max(...topRoutes.map(r => r.count));

  const getHeatColor = (count: number, criticalRate: number) => {
    // Combine count and critical rate for heat intensity
    const intensity = (count / maxCount) * 0.6 + (criticalRate / 100) * 0.4;

    if (intensity > 0.7) return 'bg-red-100 border-red-300 text-red-900';
    if (intensity > 0.5) return 'bg-orange-100 border-orange-300 text-orange-900';
    if (intensity > 0.3) return 'bg-amber-100 border-amber-300 text-amber-900';
    return 'bg-green-100 border-green-300 text-green-900';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-500" />
          Peta Panas Rute
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Rute dengan insiden tertinggi - semakin merah berarti semakin bermasalah
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {topRoutes.slice(0, 10).map((route, idx) => (
          <div
            key={route.route}
            className={cn(
              'flex items-center justify-between p-3 border-2 rounded-lg transition-all cursor-pointer hover:shadow-md',
              getHeatColor(route.count, route.criticalRate)
            )}
            onClick={() => onRouteClick?.(route.route)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xs font-mono opacity-60">#{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{route.route}</div>
                <div className="text-[10px] opacity-75">
                  {route.primaryIssueType}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0 ml-2">
              <div className="text-right">
                <div className="text-sm font-bold">{route.count}</div>
                <div className="text-[10px] opacity-75">insiden</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{route.criticalRate.toFixed(0)}%</div>
                <div className="text-[10px] opacity-75">critical</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Heat Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-200 border-2 border-green-300 rounded" />
            <span>Rendah</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-amber-200 border-2 border-amber-300 rounded" />
            <span>Sedang</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-200 border-2 border-orange-300 rounded" />
            <span>Tinggi</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-200 border-2 border-red-300 rounded" />
            <span>Kritis</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/dashboard/ai-reports/RouteHeatmap.tsx
git commit -m "feat(entity-analytics): add RouteHeatmap component with heat intensity"
```

---

## Task 7: Create HubDistribution Component

**Files:**
- Create: `components/dashboard/ai-reports/HubDistribution.tsx`

**Step 1: Create HubDistribution component**

```typescript
// components/dashboard/ai-reports/HubDistribution.tsx

'use client';

import { PieChart } from 'lucide-react';
import { EntityStats } from '@/types/entity-analytics';
import { getTopEntities } from '@/lib/utils/entity-analytics';
import { cn } from '@/lib/utils';

interface HubDistributionProps {
  entityStats: EntityStats;
  onHubClick?: (hub: string) => void;
}

export function HubDistribution({ entityStats, onHubClick }: HubDistributionProps) {
  const topHubs = getTopEntities(entityStats.hubs, 10);

  if (topHubs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-500" />
          Distribusi Hub
        </h3>
        <p className="text-gray-500 text-sm">Tidak ada data hub tersedia</p>
      </div>
    );
  }

  const totalReports = entityStats.summary.totalReports;
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-red-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500'
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-500" />
          Distribusi Hub
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Proporsi insiden per lokasi hub
        </p>
      </div>

      {/* Visual representation (simple bars instead of pie) */}
      <div className="space-y-3 mb-4">
        {topHubs.slice(0, 5).map((hub, idx) => (
          <div
            key={hub.name}
            className="cursor-pointer group"
            onClick={() => onHubClick?.(hub.name)}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={cn('w-3 h-3 rounded-full', colors[idx])} />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {hub.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-sm font-bold text-gray-900">{hub.count}</span>
                <span className="text-xs text-gray-500">
                  {hub.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all group-hover:opacity-80', colors[idx])}
                style={{ width: `${hub.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Detailed stats */}
      <div className="space-y-2 pt-4 border-t border-gray-100">
        {topHubs.slice(0, 5).map((hub, idx) => (
          <div
            key={hub.name}
            className="flex items-center justify-between text-xs p-2 hover:bg-gray-50 rounded cursor-pointer"
            onClick={() => onHubClick?.(hub.name)}
          >
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', colors[idx])} />
              <span className="font-medium text-gray-700">{hub.name}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <span>{hub.topIssueCategory}</span>
              <span className="font-mono">{hub.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/dashboard/ai-reports/HubDistribution.tsx
git commit -m "feat(entity-analytics): add HubDistribution component with visual breakdown"
```

---

## Task 8: Create EntityAnalyticsDashboard Main Component

**Files:**
- Create: `components/dashboard/ai-reports/EntityAnalyticsDashboard.tsx`

**Step 1: Create EntityAnalyticsDashboard main component**

```typescript
// components/dashboard/ai-reports/EntityAnalyticsDashboard.tsx

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Loader2, Brain } from 'lucide-react';
import { EntityFilterBar } from './EntityFilterBar';
import { EntitySummaryStats } from './EntitySummaryStats';
import { TopAirlinesChart } from './TopAirlinesChart';
import { RouteHeatmap } from './RouteHeatmap';
import { HubDistribution } from './HubDistribution';
import { processEntityData, filterEntities } from '@/lib/utils/entity-analytics';
import { EntityStats, FilterState } from '@/types/entity-analytics';

interface EntityAnalyticsDashboardProps {
  batchResults: any;
}

export function EntityAnalyticsDashboard({ batchResults }: EntityAnalyticsDashboardProps) {
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    airlines: [],
    routes: [],
    hubs: [],
    severities: [],
    dateRange: null
  });

  // Process entity data once when batchResults changes
  const entityStats = useMemo(() => {
    if (!batchResults?.results) return null;
    return processEntityData(batchResults.results);
  }, [batchResults]);

  // Filter entities based on active filters
  const filteredStats = useMemo(() => {
    if (!entityStats) return null;
    return filterEntities(entityStats, activeFilters);
  }, [entityStats, activeFilters]);

  const clearFilters = () => {
    setActiveFilters({
      airlines: [],
      routes: [],
      hubs: [],
      severities: [],
      dateRange: null
    });
  };

  const handleFilterChange = (filters: FilterState) => {
    setActiveFilters(filters);
  };

  // Handle drill-down clicks
  const handleAirlineClick = (airline: string) => {
    setActiveFilters(prev => ({
      ...prev,
      airlines: [airline]
    }));
  };

  const handleRouteClick = (route: string) => {
    setActiveFilters(prev => ({
      ...prev,
      routes: [route]
    }));
  };

  const handleHubClick = (hub: string) => {
    setActiveFilters(prev => ({
      ...prev,
      hubs: [hub]
    }));
  };

  if (!entityStats) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Loader2 size={48} className="animate-spin mb-4 opacity-20" />
        <p className="animate-pulse">Memproses data entity...</p>
      </div>
    );
  }

  if (entityStats.summary.totalReports === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
        <Brain size={48} className="mx-auto mb-4 opacity-50" />
        <p>Tidak ada data entity tersedia untuk dianalisis.</p>
        <p className="text-sm mt-2">Jalankan analisis batch terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Brain className="w-7 h-7 text-emerald-600" />
          Entity Analytics Dashboard
        </h2>
        <p className="text-sm text-gray-600">
          Analisis mendalam terhadap maskapai, rute, dan lokasi dari laporan-laporan insiden.
          Gunakan filter untuk melakukan cross-entity analysis.
        </p>
      </div>

      {/* Filter Bar */}
      <EntityFilterBar
        entityStats={entityStats}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />

      {/* Summary Stats */}
      <EntitySummaryStats
        entityStats={entityStats}
        filteredStats={filteredStats!}
      />

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopAirlinesChart
          entityStats={filteredStats!}
          onAirlineClick={handleAirlineClick}
        />
        <RouteHeatmap
          entityStats={filteredStats!}
          onRouteClick={handleRouteClick}
        />
        <HubDistribution
          entityStats={filteredStats!}
          onHubClick={handleHubClick}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/dashboard/ai-reports/EntityAnalyticsDashboard.tsx
git commit -m "feat(entity-analytics): add main EntityAnalyticsDashboard component with filtering"
```

---

## Task 9: Integrate EntityAnalyticsDashboard into AI Reports Page

**Files:**
- Modify: `app/dashboard/(main)/analyst/ai-reports/page.tsx`

**Step 1: Add EntityAnalyticsDashboard to Overview tab**

Add the import at the top of the file (around line 14):

```typescript
import { EntityAnalyticsDashboard } from '@/components/dashboard/ai-reports/EntityAnalyticsDashboard';
```

Then add the component in the Overview tab section (after the CGO/Non-Cargo summaries, around line 945):

```typescript
{/* Entity Analytics Dashboard */}
{batchResults && (
  <EntityAnalyticsDashboard batchResults={batchResults} />
)}
```

**Step 2: Verify the integration**

The Entity Analytics Dashboard should now appear at the bottom of the Overview tab after batch analysis is complete.

**Step 3: Commit**

```bash
git add app/dashboard/\(main\)/analyst/ai-reports/page.tsx
git commit -m "feat(entity-analytics): integrate EntityAnalyticsDashboard into AI Reports Overview tab"
```

---

## Task 10: Test the Feature

**Step 1: Run the development server**

```bash
npm run dev
```

**Step 2: Navigate to AI Reports page**

1. Open browser to `http://localhost:3000/dashboard/analyst/ai-reports`
2. Click on "Overview" tab
3. Run batch analysis if not already done
4. Verify Entity Analytics Dashboard appears after summaries

**Step 3: Test filtering functionality**

1. Click on filter dropdowns
2. Select multiple filters (e.g., one airline + one severity)
3. Verify visualizations update instantly
4. Click on an airline in TopAirlinesChart
5. Verify it filters to that airline
6. Click "Reset Filter" to clear

**Step 4: Verify performance**

1. Open browser DevTools > Performance
2. Apply various filters
3. Verify filtering takes < 100ms

**Expected Result:**
- ✅ Entity Analytics Dashboard appears in Overview tab
- ✅ All visualizations render correctly
- ✅ Filtering works in real-time
- ✅ Performance is acceptable (< 100ms for filtering)
- ✅ All text is in Bahasa Indonesia

---

## Execution Notes

**Batch Execution:**
- Execute Tasks 1-3 first (types + utils + filter bar)
- Review and get feedback
- Execute Tasks 4-7 (visualizations)
- Review and get feedback
- Execute Tasks 8-10 (integration + testing)

**Stop Conditions:**
- If any TypeScript errors occur, stop and fix before continuing
- If tests fail, stop and debug
- If performance is poor, stop and optimize

**Success Criteria:**
- All components render without errors
- Filtering works in < 100ms
- All text in Bahasa Indonesia
- No console errors
- Responsive on mobile devices

---

**Plan complete. Ready for execution with superpowers:executing-plans.**
