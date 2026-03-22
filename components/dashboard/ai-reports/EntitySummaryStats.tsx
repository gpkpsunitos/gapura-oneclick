// components/dashboard/ai-reports/EntitySummaryStats.tsx

'use client';

import React, { useMemo } from 'react';
import { Database, TrendingUp, Filter, AlertTriangle, LucideIcon } from 'lucide-react';
import { EntityStats } from '@/types/entity-analytics';
import { cn } from '@/lib/utils';

interface EntitySummaryStatsProps {
  entityStats: EntityStats;
  filteredStats: EntityStats;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color
}: StatCardProps) => (
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
  const topAirline = useMemo(() => {
    if (!entityStats.airlines.size) return null;
    return Array.from(entityStats.airlines.values())
      .sort((a, b) => b.count - a.count)[0];
  }, [entityStats.airlines]);

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
