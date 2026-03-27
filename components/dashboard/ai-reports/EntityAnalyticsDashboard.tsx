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
